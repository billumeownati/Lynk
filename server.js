const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.get("/health", (req, res) => res.status(200).send("ok"));
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
                    if (rooms[roomCode].activeScreenSharer === socket.id) {
                        rooms[roomCode].activeScreenSharer = null;
                        rooms[roomCode].activeScreenStreamId = null;
                        io.to(roomCode).emit('screenShareStopped');
                    }
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
        rooms[roomCode] = { passwordHash: passwordHash || null, users: [], activeScreenSharer: null, activeScreenStreamId: null };
        joinRoomInternal(socket, roomCode, username);
    });

    socket.on('joinRoom', ({ roomCode, username, passwordHash }) => {
        if (!rooms[roomCode]) return socket.emit('roomError', 'No room found with this code.');
        
        // 1. Room HAS a password, but they got it wrong
        if (rooms[roomCode].passwordHash && rooms[roomCode].passwordHash !== passwordHash) {
            return socket.emit('roomError', 'Incorrect password for this room.');
        }
        
        // 2. Room DOES NOT have a password, but they typed one anyway
        if (!rooms[roomCode].passwordHash && passwordHash) {
            return socket.emit('roomError', 'This room is not password protected. Leave the password field empty.');
        }

        leaveCurrentRoom();
        joinRoomInternal(socket, roomCode, username);
    });

    function joinRoomInternal(socket, roomCode, username) {
        socket.join(roomCode);
        socket.currentRoom = roomCode;
        socket.username = username;
        rooms[roomCode].users.push({ id: socket.id, username: username, inVC: false, micMuted: false, camOn: false });
        io.to(roomCode).emit('roomUsersUpdate', rooms[roomCode].users);

        socket.emit('roomJoined', { roomCode, username });
        socket.emit('message', { type: 'system', text: `Welcome to Lynk, ${username}. Connection is End-to-End Encrypted.`});
        socket.to(roomCode).emit('message', { type: 'system', text: `${username} joined.` });
        
        if (rooms[roomCode].activeScreenSharer && rooms[roomCode].activeScreenStreamId) {
            socket.emit('screenShareActive', { sharerId: rooms[roomCode].activeScreenSharer, streamId: rooms[roomCode].activeScreenStreamId });
        }
    }

    socket.on('joinVC', () => {
        if (!socket.currentRoom || !rooms[socket.currentRoom]) return;
        const user = rooms[socket.currentRoom].users.find(u => u.id === socket.id);
        if (user) {
            user.inVC = true;
            user.micMuted = false;
            user.camOn = false;
            io.to(socket.currentRoom).emit('roomUsersUpdate', rooms[socket.currentRoom].users);
            socket.to(socket.currentRoom).emit('userJoinedVC', socket.id);
        }
    });

    socket.on('leaveVC', () => {
        if (!socket.currentRoom || !rooms[socket.currentRoom]) return;
        const room = rooms[socket.currentRoom];
        const user = room.users.find(u => u.id === socket.id);
        if (user) {
            user.inVC = false;
            user.camOn = false;
            
            // NEW: Clears screen share if the user just leaves the VC
            if (room.activeScreenSharer === socket.id) {
                room.activeScreenSharer = null;
                room.activeScreenStreamId = null;
                io.to(socket.currentRoom).emit('screenShareStopped');
            }

            io.to(socket.currentRoom).emit('roomUsersUpdate', room.users);
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

    socket.on('toggleCamState', (isCamOn) => {
        if (!socket.currentRoom || !rooms[socket.currentRoom]) return;
        const user = rooms[socket.currentRoom].users.find(u => u.id === socket.id);
        if (user && user.inVC) {
            user.camOn = isCamOn;
            io.to(socket.currentRoom).emit('roomUsersUpdate', rooms[socket.currentRoom].users);
        }
    });

    socket.on('startScreenShare', (streamId) => {
        if (!socket.currentRoom || !rooms[socket.currentRoom]) return;
        const room = rooms[socket.currentRoom];
        
        if (room.activeScreenSharer && room.activeScreenSharer !== socket.id) {
            io.to(room.activeScreenSharer).emit('forceStopShare');
        }
        
        room.activeScreenSharer = socket.id;
        room.activeScreenStreamId = streamId;
        io.to(socket.currentRoom).emit('screenShareActive', { sharerId: socket.id, streamId });
    });

    socket.on('stopScreenShare', () => {
        if (!socket.currentRoom || !rooms[socket.currentRoom]) return;
        const room = rooms[socket.currentRoom];
        if (room.activeScreenSharer === socket.id) {
            room.activeScreenSharer = null;
            room.activeScreenStreamId = null;
            io.to(socket.currentRoom).emit('screenShareStopped');
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