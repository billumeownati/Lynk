// public/script.js
document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    const setupArea = document.getElementById('setup-area');
    const chatArea = document.getElementById('chat-area');
    const tabJoin = document.getElementById('tab-join');
    const tabCreate = document.getElementById('tab-create');
    const actionButton = document.getElementById('action-button');
    const roomInputContainer = document.getElementById('room-input-container');
    const createRoomUi = document.getElementById('create-room-ui');
    const passwordContainer = document.getElementById('password-container');
    const passwordInput = document.getElementById('password-input');
    
    const shareButton = document.getElementById('share-button');
    const toggleCodeBtn = document.getElementById('toggle-code-btn');
    const roomCodeDisplay = document.getElementById('room-code-display');
    const eyeIcon = document.getElementById('eye-icon');
    
    // Theme Elements
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');

    const usernameInput = document.getElementById('username-input');
    const roomInput = document.getElementById('room-input');
    const requirePasswordCheck = document.getElementById('require-password');

    const messagesContainer = document.getElementById('messages-container');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const leaveButton = document.getElementById('leave-button');

    // Modal Elements
    const globalModal = document.getElementById('global-modal');
    const globalModalContent = document.getElementById('global-modal-content');
    const modalMessage = document.getElementById('modal-message');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalOkBtn = document.getElementById('modal-ok-btn');

    let currentMode = 'join'; 
    let currentUsername = null;
    let currentRoom = null;
    let encryptionKey = null; 
    let isCodeVisible = false;

    // --- Funny Name Generator ---
    const adjectives = ["Sneaky", "Grumpy", "Happy", "Sleepy", "Clumsy", "Dizzy", "Hungry", "Jumpy", "Cyber", "Neon", "Cosmic"];
    const nouns = ["Potato", "Ninja", "Panda", "Unicorn", "Goblin", "Penguin", "Waffle", "Pirate", "Cactus", "Muffin", "Ghost"];
    function generateFunnyName() {
        return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
    }

    // --- Modal Logic ---
    function showModal(message) {
        modalMessage.textContent = message;
        globalModal.classList.remove('hidden');
        void globalModal.offsetWidth;
        globalModal.classList.remove('opacity-0');
        globalModalContent.classList.remove('scale-95');
        globalModalContent.classList.add('scale-100');
    }

    function closeModal() {
        globalModal.classList.add('opacity-0');
        globalModalContent.classList.remove('scale-100');
        globalModalContent.classList.add('scale-95');
        setTimeout(() => globalModal.classList.add('hidden'), 300);
    }

    closeModalBtn.addEventListener('click', closeModal);
    modalOkBtn.addEventListener('click', closeModal);

    // --- Theme Logic ---
    function applyTheme(isDark) {
        document.documentElement.classList.toggle('dark', isDark);
        document.body.classList.toggle('dark', isDark);
        document.body.classList.toggle('light', !isDark);
        
        if (isDark) {
            themeIcon.classList.replace('fa-sun', 'fa-moon');
            themeText.textContent = 'Dark Mode';
            localStorage.setItem('theme', 'dark');
        } else {
            themeIcon.classList.replace('fa-moon', 'fa-sun');
            themeText.textContent = 'Light Mode';
            localStorage.setItem('theme', 'light');
        }
    }

    // Default to dark unless explicitly saved as light
    let currentIsDark = localStorage.getItem('theme') !== 'light';
    applyTheme(currentIsDark);

    themeToggleBtn.addEventListener('click', () => {
        currentIsDark = !document.documentElement.classList.contains('dark');
        applyTheme(currentIsDark);
    });

    function setMode(mode) {
        currentMode = mode;
        if (mode === 'join') {
            tabJoin.classList.add('text-brand-600', 'border-brand-600');
            tabJoin.classList.remove('text-gray-400', 'dark:text-gray-500', 'border-transparent');
            tabCreate.classList.remove('text-brand-600', 'border-brand-600');
            tabCreate.classList.add('text-gray-400', 'dark:text-gray-500', 'border-transparent');
            
            roomInputContainer.classList.remove('hidden');
            createRoomUi.classList.add('hidden');
            passwordContainer.classList.remove('hidden');
            passwordInput.placeholder = "Password (if any)";
        } else {
            tabCreate.classList.add('text-brand-600', 'border-brand-600');
            tabCreate.classList.remove('text-gray-400', 'dark:text-gray-500', 'border-transparent');
            tabJoin.classList.remove('text-brand-600', 'border-brand-600');
            tabJoin.classList.add('text-gray-400', 'dark:text-gray-500', 'border-transparent');
            
            roomInputContainer.classList.add('hidden');
            createRoomUi.classList.remove('hidden');
            passwordInput.placeholder = "Password (required if checked)";
            togglePasswordVisibility();
        }
    }

    function togglePasswordVisibility() {
        if (currentMode === 'create') {
            passwordContainer.classList.toggle('hidden', !requirePasswordCheck.checked);
        }
    }

    tabJoin.addEventListener('click', () => setMode('join'));
    tabCreate.addEventListener('click', () => setMode('create'));
    requirePasswordCheck.addEventListener('change', togglePasswordVisibility);

    function resetActionButton() {
        actionButton.disabled = false;
        actionButton.innerHTML = 'Enter Lynk';
    }

    // --- Core Action Button ---
    actionButton.addEventListener('click', () => {
        try {
            if (!socket.connected) {
                return showModal('Connecting to secure server... Please wait a moment.');
            }

            let username = usernameInput.value.trim() || generateFunnyName();
            let password = passwordInput.value;
            let roomCode;

            if (currentMode === 'join') {
                roomCode = roomInput.value.trim();
                if (!roomCode || roomCode.length !== 6) return showModal('Please enter a valid 6-digit numeric code to join.');
            } else {
                roomCode = Math.floor(100000 + Math.random() * 900000).toString();
                if (requirePasswordCheck.checked) {
                    if (!password) return showModal('You opted to protect this room. Please enter a password.');
                } else {
                    password = ''; 
                }
            }

            actionButton.disabled = true;
            actionButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Securing...';

            encryptionKey = password ? password : roomCode; 
            let passwordHash = password ? CryptoJS.SHA256(password).toString() : null;

            if (currentMode === 'create') {
                socket.emit('createRoom', { roomCode, username, passwordHash });
            } else {
                socket.emit('joinRoom', { roomCode, username, passwordHash });
            }

            setTimeout(() => {
                if (actionButton.disabled && setupArea.classList.contains('hidden') === false) {
                    resetActionButton();
                    showModal('Server connection timed out. Please try again.');
                }
            }, 5000);

        } catch (error) {
            console.error("Client Error:", error);
            resetActionButton();
            showModal('An unexpected error occurred processing your request.');
        }
    });

    socket.on('roomError', (msg) => {
        resetActionButton();
        showModal(msg); 
    });

    toggleCodeBtn.addEventListener('click', () => {
        isCodeVisible = !isCodeVisible;
        if (isCodeVisible) {
            roomCodeDisplay.textContent = currentRoom;
            eyeIcon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            roomCodeDisplay.textContent = '••••••';
            eyeIcon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });

    function displayMessage(type, user, text, isMe = false) {
        const wrapper = document.createElement('div');
        wrapper.className = `flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-[fadeIn_0.3s_ease-out]`;

        if (type === 'system') {
            wrapper.className = 'flex flex-col items-center w-full my-3';
            wrapper.innerHTML = `<span class="bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-500 dark:text-gray-300 text-[10px] sm:text-[11px] uppercase tracking-wider py-1.5 px-4 rounded-full font-bold shadow-sm"><i class="fa-solid fa-shield-halved mr-1 text-brand-500"></i> ${text}</span>`;
        } else {
            const bubble = document.createElement('div');
            
            // UPDATED: Increased text size for messages (text-base sm:text-lg)
            bubble.className = `max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 shadow-md text-base sm:text-lg leading-relaxed ${
                isMe ? 'bg-gradient-to-r from-brand-500 to-pink-500 text-white rounded-tr-sm' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-600 rounded-tl-sm'
            }`;
            
            const displayName = isMe ? 'You' : user;
            const nameSpan = document.createElement('span');
            
            // UPDATED: Changed the color of the other person's name to highly contrasting Pink 
            nameSpan.className = `block text-xs uppercase tracking-wider font-extrabold mb-1 ${isMe ? 'text-white/90 text-right' : 'text-pink-600 dark:text-pink-400 text-left'}`;
            nameSpan.textContent = displayName;
            
            const textSpan = document.createElement('span');
            textSpan.className = "block font-medium break-words";
            textSpan.textContent = text;
            
            bubble.appendChild(nameSpan);
            bubble.appendChild(textSpan);
            wrapper.appendChild(bubble);
        }

        messagesContainer.appendChild(wrapper);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    const style = document.createElement('style');
    style.innerHTML = `@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`;
    document.head.appendChild(style);

    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const msg = messageInput.value.trim();
        if (msg && currentRoom) {
            try {
                const encryptedMsg = CryptoJS.AES.encrypt(msg, encryptionKey).toString();
                socket.emit('chatMessage', encryptedMsg);
                displayMessage('chat', currentUsername, msg, true);
                messageInput.value = '';
            } catch (err) {
                console.error("Encryption error:", err);
                showModal("Failed to encrypt message.");
            }
        }
    });

    shareButton.addEventListener('click', () => {
        const url = `${window.location.origin}/?room=${currentRoom}`;
        navigator.clipboard.writeText(url).then(() => {
            const originalHTML = shareButton.innerHTML;
            shareButton.innerHTML = '<i class="fa-solid fa-check text-green-500"></i>';
            setTimeout(() => shareButton.innerHTML = originalHTML, 2000);
        });
    });

    leaveButton.addEventListener('click', () => window.location.search = '');

    socket.on('roomJoined', ({ roomCode, username }) => {
        resetActionButton();
        currentRoom = roomCode;
        currentUsername = username;
        isCodeVisible = false; 
        roomCodeDisplay.textContent = '••••••';
        eyeIcon.classList.replace('fa-eye-slash', 'fa-eye');
        
        setupArea.classList.add('hidden');
        chatArea.classList.remove('hidden');
        chatArea.classList.add('flex');
        
        setTimeout(() => messageInput.focus(), 100);
    });

    socket.on('message', (data) => {
        if (data.type === 'system') {
            displayMessage('system', null, data.text);
        } else if (data.type === 'chat' && data.user !== currentUsername) {
            try {
                const bytes = CryptoJS.AES.decrypt(data.text, encryptionKey);
                const originalText = bytes.toString(CryptoJS.enc.Utf8);
                if(!originalText) throw new Error('Decryption empty');
                displayMessage('chat', data.user, originalText);
            } catch (e) {
                displayMessage('chat', data.user, "🔒 [Encrypted Message - Unreadable]");
            }
        }
    });

    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
        roomInput.value = roomFromUrl.replace(/[^0-9]/g, ''); 
        setMode('join');
    } else {
        setMode('join');
    }
});