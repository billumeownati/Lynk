// public/script.js
document.addEventListener('DOMContentLoaded', () => {
    const socket = io(); // Connect to the Socket.IO server

    // --- DOM Elements ---
    const roomSelectionDiv = document.getElementById('room-selection');
    const chatAreaDiv = document.getElementById('chat-area');

    const usernameInput = document.getElementById('username-input');
    const roomInput = document.getElementById('room-input');
    const joinButton = document.getElementById('join-button');
    const joinErrorP = document.getElementById('join-error');

    const roomTitleH2 = document.getElementById('room-title').querySelector('span');
    const welcomeMessageP = document.getElementById('welcome-message');
    const messagesUl = document.getElementById('messages');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    // const sendButton = document.getElementById('send-button'); // Implicit in form submit
    const leaveButton = document.getElementById('leave-button');

    let currentUsername = null;
    let currentRoom = null;

    // --- Functions ---
    function displayMessage(data) {
        const item = document.createElement('li');

        const userTag = document.createElement('span');
        userTag.classList.add('user-tag');

        if (data.user === 'System') {
            item.classList.add('system-message');
            item.textContent = data.text; // System messages don't show a user tag usually
        } else {
             userTag.textContent = (data.user === currentUsername) ? 'You' : data.user;
             item.appendChild(userTag); // Add user tag first
             item.appendChild(document.createTextNode(data.text)); // Then the message text

            if (data.user === currentUsername) {
                 item.classList.add('my-message');
            } else {
                 item.classList.add('other-message');
            }
        }

        messagesUl.appendChild(item);
        // Auto-scroll to the bottom
        messagesUl.parentElement.scrollTop = messagesUl.parentElement.scrollHeight;
    }

    function showChatArea(roomCode, username) {
        currentUsername = username;
        currentRoom = roomCode;
        roomTitleH2.textContent = roomCode;
        welcomeMessageP.textContent = `You are chatting as: ${username}`;
        roomSelectionDiv.style.display = 'none';
        chatAreaDiv.style.display = 'flex'; // Use flex for column layout
        messageInput.focus();
        joinErrorP.textContent = ''; // Clear any previous errors
    }

    function showRoomSelection() {
        currentUsername = null;
        currentRoom = null;
        roomSelectionDiv.style.display = 'flex';
        chatAreaDiv.style.display = 'none';
        messagesUl.innerHTML = ''; // Clear previous messages
        roomInput.value = ''; // Clear room input
        // Keep username input filled for convenience? Optional.
        // usernameInput.value = '';
        usernameInput.focus();
    }

    // --- Event Listeners ---
    joinButton.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        const roomCode = roomInput.value.trim();

        if (username && roomCode) {
            socket.emit('joinRoom', { roomCode, username });
            joinErrorP.textContent = ''; // Clear error on attempt
        } else {
            joinErrorP.textContent = 'Please enter both username and room code.';
        }
    });

     // Allow joining with Enter key in room input
     roomInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinButton.click();
        }
    });
     usernameInput.addEventListener('keypress', (e) => {
         if (e.key === 'Enter') {
             roomInput.focus(); // Move focus to room input
         }
     });


    messageForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent page reload
        const message = messageInput.value.trim();
        if (message && currentRoom) {
            socket.emit('chatMessage', message);
            messageInput.value = ''; // Clear input field
        }
    });

    leaveButton.addEventListener('click', () => {
        // Optionally tell the server we are leaving cleanly (though disconnect handles it too)
        // socket.emit('leaveRoom'); // You'd need to implement this server-side if desired

        // For simplicity, we just reload the page to go back to room selection
        // A more sophisticated app might just disconnect/reconnect or manage state differently
        window.location.reload();
        // Alternatively, implement state management to show room selection without reload:
        // showRoomSelection();
        // socket.disconnect(); // Manually disconnect if not reloading
        // socket.connect(); // Reconnect for potential new room join
    });


    // --- Socket.IO Event Handlers ---
    socket.on('connect', () => {
        console.log('Connected to server with ID:', socket.id);
        showRoomSelection(); // Start at room selection on connect/reconnect
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        displayMessage({ user: 'System', text: 'You have been disconnected. Attempting to reconnect...' });
        // Optionally disable chat input here
    });

    socket.on('roomJoined', ({ roomCode, username }) => {
        console.log(`Successfully joined room "${roomCode}" as ${username}`);
        showChatArea(roomCode, username);
    });

    socket.on('errorJoining', (errorMessage) => {
        console.error('Error joining room:', errorMessage);
        joinErrorP.textContent = errorMessage;
    });

    socket.on('message', (data) => {
        // data should be like { user: 'nickname', text: 'hello' }
        console.log('Message received:', data);
        displayMessage(data);
    });

    // Handle potential server errors during operation (optional)
     socket.on('error', (error) => {
         console.error('Socket error:', error);
         displayMessage({ user: 'System', text: `An error occurred: ${error.message || error}` });
     });

     socket.on('connect_error', (err) => {
        console.error("Connection failed:", err.message);
        displayMessage({ user: 'System', text: `Connection failed: ${err.message}. Please check the server.` });
        // Could implement retry logic here
    });


}); // End DOMContentLoaded