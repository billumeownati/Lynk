// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// --- Health check (Render wake-up ping) ---
app.get("/health", (req, res) => {
    res.status(200).send("ok");
});

// --- Static files ---
app.use(express.static(path.join(__dirname, 'public')));

console.log("Realtime Chat Server");
console.log("Serving static files from:", path.join(__dirname, 'public'));

// --- Serve splash screen first ---
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "loading.html"));
});

// --- Serve real chat app ---
app.get("/chat", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- Room tracking ---
const rooms = {};

// --- Socket.IO handling ---
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('joinRoom', ({ roomCode, username }) => {
        if (!roomCode || !username) {
            socket.emit('errorJoining', 'Room code and username are required.');
            return;
        }

        if (socket.currentRoom) {
            socket.leave(socket.currentRoom);

            socket.to(socket.currentRoom).emit('message', {
                user: 'System',
                text: `${socket.username || 'A user'} has left the room.`
            });

            if (rooms[socket.currentRoom]) {
                rooms[socket.currentRoom] =
                    rooms[socket.currentRoom].filter(id => id !== socket.id);

                if (rooms[socket.currentRoom].length === 0) {
                    delete rooms[socket.currentRoom];
                }
            }
        }

        socket.join(roomCode);
        socket.currentRoom = roomCode;
        socket.username = username;

        if (!rooms[roomCode]) {
            rooms[roomCode] = [];
        }
        rooms[roomCode].push(socket.id);

        console.log(`User ${socket.id} (${username}) joined room: ${roomCode}`);

        socket.emit('roomJoined', { roomCode, username });
        socket.emit('message', {
            user: 'System',
            text: `Welcome to room "${roomCode}", ${username}!`
        });

        socket.to(roomCode).emit('message', {
            user: 'System',
            text: `${username} has joined the chat.`
        });
    });

    socket.on('chatMessage', (msg) => {
        if (socket.currentRoom && msg && socket.username) {
            console.log(`Message from ${socket.username} in ${socket.currentRoom}: ${msg}`);

            io.to(socket.currentRoom).emit('message', {
                user: socket.username,
                text: msg
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);

        if (socket.currentRoom && socket.username) {
            socket.to(socket.currentRoom).emit('message', {
                user: 'System',
                text: `${socket.username} has left the chat.`
            });

            if (rooms[socket.currentRoom]) {
                rooms[socket.currentRoom] =
                    rooms[socket.currentRoom].filter(id => id !== socket.id);

                if (rooms[socket.currentRoom].length === 0) {
                    delete rooms[socket.currentRoom];
                    console.log(`Room ${socket.currentRoom} is now empty and removed.`);
                }
            }
        }
    });
});

// --- Start server ---
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Access the app at http://localhost:${PORT}`);
});
