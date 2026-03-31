// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.get("/health", (req, res) => res.status(200).send("ok"));

// --- NEW LINE: Serve the chat app when users go to /chat ---
app.get("/chat", (req, res) => res.sendFile(path.join(__dirname, 'public', 'chat.html')));

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};
const userMessageLog = {}; 

io.on('connection', (socket) => {
    
    const leaveCurrentRoom = () => {
        try {
            if (socket.currentRoom) {
                const roomCode = socket.currentRoom;
                socket.leave(roomCode);
                
                socket.to(roomCode).emit('message', {
                    type: 'system',
                    text: `${socket.username || 'Anonymous'} has left.`
                });

                if (rooms[roomCode]) {
                    rooms[roomCode].users = rooms[roomCode].users.filter(u => u.id !== socket.id);
                    if (rooms[roomCode].users.length === 0) {
                        delete rooms[roomCode];
                    } else {
                        io.to(roomCode).emit('roomUsersUpdate', rooms[roomCode].users);
                    }
                }
                socket.currentRoom = null;
            }
        } catch (err) {
            console.error("Error leaving room:", err);
        }
    };

    socket.on('createRoom', ({ roomCode, username, passwordHash }) => {
        if (rooms[roomCode]) return socket.emit('roomError', 'This room code is already active. Try again.');
        leaveCurrentRoom();
        rooms[roomCode] = { passwordHash: passwordHash || null, users: [] };
        joinRoomInternal(socket, roomCode, username);
    });

    socket.on('joinRoom', ({ roomCode, username, passwordHash }) => {
        if (!rooms[roomCode]) return socket.emit('roomError', 'No room found with this code.');
        if (rooms[roomCode].passwordHash && rooms[roomCode].passwordHash !== passwordHash) {
            return socket.emit('roomError', 'Incorrect password for this room.');
        }
        leaveCurrentRoom();
        joinRoomInternal(socket, roomCode, username);
    });

    function joinRoomInternal(socket, roomCode, username) {
        socket.join(roomCode);
        socket.currentRoom = roomCode;
        socket.username = username;
        rooms[roomCode].users.push({ id: socket.id, username: username, inVC: false, micMuted: false });
        io.to(roomCode).emit('roomUsersUpdate', rooms[roomCode].users);

        socket.emit('roomJoined', { roomCode, username });
        socket.emit('message', { type: 'system', text: `Welcome to Lynk, ${username}. Connection is End-to-End Encrypted.`});
        socket.to(roomCode).emit('message', { type: 'system', text: `${username} joined.` });
    }

    socket.on('joinVC', () => {
        if (!socket.currentRoom || !rooms[socket.currentRoom]) return;
        const user = rooms[socket.currentRoom].users.find(u => u.id === socket.id);
        if (user) {
            user.inVC = true;
            user.micMuted = false;
            io.to(socket.currentRoom).emit('roomUsersUpdate', rooms[socket.currentRoom].users);
            socket.to(socket.currentRoom).emit('userJoinedVC', socket.id);
        }
    });

    socket.on('leaveVC', () => {
        if (!socket.currentRoom || !rooms[socket.currentRoom]) return;
        const user = rooms[socket.currentRoom].users.find(u => u.id === socket.id);
        if (user) {
            user.inVC = false;
            io.to(socket.currentRoom).emit('roomUsersUpdate', rooms[socket.currentRoom].users);
            socket.to(socket.currentRoom).emit('userLeftVC', socket.id);
        }
    });

    socket.on('toggleMicState', (isMuted) => {
        if (!socket.currentRoom || !rooms[socket.currentRoom]) return;
        const user = rooms[socket.currentRoom].users.find(u => u.id === socket.id);
        if (user && user.inVC) {
            user.micMuted = isMuted;
            io.to(socket.currentRoom).emit('roomUsersUpdate', rooms[socket.currentRoom].users);
        }
    });

    socket.on('webrtc-offer', ({ target, offer }) => io.to(target).emit('webrtc-offer', { sender: socket.id, offer }));
    socket.on('webrtc-answer', ({ target, answer }) => io.to(target).emit('webrtc-answer', { sender: socket.id, answer }));
    socket.on('webrtc-ice-candidate', ({ target, candidate }) => io.to(target).emit('webrtc-ice-candidate', { sender: socket.id, candidate }));

    socket.on('typing', (isTyping) => {
        if (socket.currentRoom) socket.to(socket.currentRoom).emit('userTyping', { user: socket.username, isTyping });
    });

    socket.on('chatMessage', (encryptedMsg) => {
        if (socket.currentRoom && encryptedMsg && socket.username) {
            const now = Date.now();
            if (!userMessageLog[socket.id]) userMessageLog[socket.id] = [];
            userMessageLog[socket.id] = userMessageLog[socket.id].filter(t => now - t < 3000);
            if (userMessageLog[socket.id].length >= 5) return socket.emit('roomError', 'Spam protection: Slow down!');
            userMessageLog[socket.id].push(now);

            io.to(socket.currentRoom).emit('message', { type: 'chat', user: socket.username, text: encryptedMsg });
        }
    });

    socket.on('disconnect', () => {
        delete userMessageLog[socket.id]; 
        if (socket.currentRoom) socket.to(socket.currentRoom).emit('userLeftVC', socket.id);
        leaveCurrentRoom();
    });
});

server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));