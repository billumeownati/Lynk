// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app); // Create HTTP server using Express app
const io = socketIo(server);          // Attach Socket.IO to the HTTP server

const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

console.log("Realtime Chat Server");
console.log("Serving static files from:", path.join(__dirname, 'public'));

// Keep track of users in rooms { roomCode: [socketId1, socketId2, ...] }
const rooms = {};

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // --- Room Handling ---
    socket.on('joinRoom', ({ roomCode, username }) => {
        if (!roomCode || !username) {
            socket.emit('errorJoining', 'Room code and username are required.');
            return;
        }

        // Leave previous room if any (optional, prevents user being in multiple rooms)
        if (socket.currentRoom) {
            socket.leave(socket.currentRoom);
            // Notify old room
             socket.to(socket.currentRoom).emit('message', {
                 user: 'System',
                 text: `${socket.username || 'A user'} has left the room.`
             });
             // Remove user from old room tracking
             if (rooms[socket.currentRoom]) {
                 rooms[socket.currentRoom] = rooms[socket.currentRoom].filter(id => id !== socket.id);
                 if (rooms[socket.currentRoom].length === 0) {
                     delete rooms[socket.currentRoom]; // Clean up empty room
                 }
             }
        }


        // Join the new room
        socket.join(roomCode);
        socket.currentRoom = roomCode; // Store room code on the socket object
        socket.username = username; // Store username on the socket object

        // Add user to room tracking
        if (!rooms[roomCode]) {
            rooms[roomCode] = [];
        }
        rooms[roomCode].push(socket.id);


        console.log(`User ${socket.id} (${username}) joined room: ${roomCode}`);

        // Send confirmation back to the user who just joined
        socket.emit('roomJoined', { roomCode, username });
        socket.emit('message', {
            user: 'System',
            text: `Welcome to room "${roomCode}", ${username}!`
        });

        // Notify others in the room that a new user has joined
        // 'socket.to(roomCode)' sends to everyone in the room EXCEPT the sender
        socket.to(roomCode).emit('message', {
            user: 'System',
            text: `${username} has joined the chat.`
        });
    });

    // --- Chat Message Handling ---
    socket.on('chatMessage', (msg) => {
        // Ensure user is in a room and has sent a message
        if (socket.currentRoom && msg && socket.username) {
             console.log(`Message from ${socket.username} in room ${socket.currentRoom}: ${msg}`);
             // Broadcast the message to everyone IN THAT ROOM (including sender)
             io.to(socket.currentRoom).emit('message', { user: socket.username, text: msg });
        } else {
            console.log(`Message attempt failed: User ${socket.id} not in a room or message empty.`);
             // Optionally send an error back to the user
             // socket.emit('errorSending', 'You must be in a room to send messages.');
        }
    });

    // --- Disconnect Handling ---
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        // Notify the room if the user was in one
        if (socket.currentRoom && socket.username) {
            socket.to(socket.currentRoom).emit('message', {
                user: 'System',
                text: `${socket.username} has left the chat.`
            });

             // Remove user from room tracking
             if (rooms[socket.currentRoom]) {
                 rooms[socket.currentRoom] = rooms[socket.currentRoom].filter(id => id !== socket.id);
                 if (rooms[socket.currentRoom].length === 0) {
                     delete rooms[socket.currentRoom]; // Clean up empty room
                     console.log(`Room ${socket.currentRoom} is now empty and removed.`);
                 }
             }
        }
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Access the app at http://localhost:${PORT}`);
});