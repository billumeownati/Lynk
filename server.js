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
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "loading.html")));
app.get("/chat", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

const rooms = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    const leaveCurrentRoom = () => {
        try {
            if (socket.currentRoom) {
                socket.leave(socket.currentRoom);
                socket.to(socket.currentRoom).emit('message', {
                    type: 'system',
                    text: `${socket.username} has left.`
                });

                if (rooms[socket.currentRoom]) {
                    rooms[socket.currentRoom].users = rooms[socket.currentRoom].users.filter(id => id !== socket.id);
                    if (rooms[socket.currentRoom].users.length === 0) {
                        delete rooms[socket.currentRoom];
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
        rooms[roomCode].users.push(socket.id);

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

    socket.on('chatMessage', (encryptedMsg) => {
        if (socket.currentRoom && encryptedMsg && socket.username) {
            io.to(socket.currentRoom).emit('message', {
                type: 'chat',
                user: socket.username,
                text: encryptedMsg 
            });
        }
    });

    socket.on('disconnect', () => leaveCurrentRoom());
});

server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));