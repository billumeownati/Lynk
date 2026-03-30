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
app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};
const userMessageLog = {}; // For Rate Limiting

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

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
                    // Remove user from the tracking array
                    rooms[roomCode].users = rooms[roomCode].users.filter(u => u.id !== socket.id);
                    
                    if (rooms[roomCode].users.length === 0) {
                        delete rooms[roomCode];
                    } else {
                        // Broadcast updated FULL user list
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
        try {
            if (rooms[roomCode]) {
                return socket.emit('roomError', 'This room code is already active. Try again.');
            }
            leaveCurrentRoom();
            rooms[roomCode] = { passwordHash: passwordHash || null, users: [] };
            joinRoomInternal(socket, roomCode, username);
        } catch (err) {
            console.error("Error creating room:", err);
            socket.emit('roomError', 'Internal server error while creating room.');
        }
    });

    socket.on('joinRoom', ({ roomCode, username, passwordHash }) => {
        try {
            if (!rooms[roomCode]) {
                return socket.emit('roomError', 'No room found with this code.');
            }
            if (rooms[roomCode].passwordHash && rooms[roomCode].passwordHash !== passwordHash) {
                return socket.emit('roomError', 'Incorrect password for this room.');
            }
            
            leaveCurrentRoom();
            joinRoomInternal(socket, roomCode, username);
        } catch (err) {
            console.error("Error joining room:", err);
            socket.emit('roomError', 'Internal server error while joining room.');
        }
    });

    function joinRoomInternal(socket, roomCode, username) {
        socket.join(roomCode);
        socket.currentRoom = roomCode;
        socket.username = username;
        
        // Track the user object containing ID and name
        rooms[roomCode].users.push({ id: socket.id, username: username });

        // Broadcast the full list of users in the room
        io.to(roomCode).emit('roomUsersUpdate', rooms[roomCode].users);

        socket.emit('roomJoined', { roomCode, username });
        socket.emit('message', {
            type: 'system',
            text: `Welcome to Lynk, ${username}. Connection is End-to-End Encrypted.`
        });
        socket.to(roomCode).emit('message', {
            type: 'system',
            text: `${username} joined.`
        });
    }

    socket.on('typing', (isTyping) => {
        if (socket.currentRoom) {
            socket.to(socket.currentRoom).emit('userTyping', { user: socket.username, isTyping });
        }
    });

    socket.on('chatMessage', (encryptedMsg) => {
        if (socket.currentRoom && encryptedMsg && socket.username) {
            
            // --- Rate Limiting (Spam Protection) ---
            const now = Date.now();
            if (!userMessageLog[socket.id]) userMessageLog[socket.id] = [];
            userMessageLog[socket.id] = userMessageLog[socket.id].filter(t => now - t < 3000);
            
            if (userMessageLog[socket.id].length >= 5) {
                return socket.emit('roomError', 'Spam protection: Slow down!');
            }
            userMessageLog[socket.id].push(now);

            io.to(socket.currentRoom).emit('message', {
                type: 'chat',
                user: socket.username,
                text: encryptedMsg 
            });
        }
    });

    socket.on('disconnect', () => {
        delete userMessageLog[socket.id]; 
        leaveCurrentRoom();
    });
});

server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));