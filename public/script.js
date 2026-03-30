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
    
    // Sidebar & Users Elements
    const usersSidebar = document.getElementById('users-sidebar');
    const usersList = document.getElementById('users-list');
    const userCountDisplay = document.getElementById('user-count');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const mobileOnlineToggle = document.getElementById('mobile-online-toggle');

    // Theme & Audio Elements
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');
    const muteToggle = document.getElementById('mute-toggle');
    const muteIcon = document.getElementById('mute-icon');

    const usernameInput = document.getElementById('username-input');
    const roomInput = document.getElementById('room-input');
    const requirePasswordCheck = document.getElementById('require-password');

    const messagesContainer = document.getElementById('messages-container');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const leaveButton = document.getElementById('leave-button');
    const typingIndicator = document.getElementById('typing-indicator');

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
    let typingTimeout = null;

    // --- Audio Setup ---
    const soundSelect = document.getElementById('sound-select');
    const savedSound = localStorage.getItem('lynksound') || '/notification.mp3';
    const popSound = new Audio(savedSound);
    if(soundSelect) soundSelect.value = savedSound; 

    if(soundSelect) {
        soundSelect.addEventListener('change', (e) => {
            const newSound = e.target.value;
            popSound.src = newSound;
            localStorage.setItem('lynksound', newSound);
            if (!isMuted) popSound.play().catch(() => {}); 
        });
    }

    let isMuted = localStorage.getItem('lynkmuted') === 'true';
    function updateMuteUI() {
        muteIcon.className = isMuted ? 'fa-solid fa-volume-xmark text-red-500' : 'fa-solid fa-volume-high';
    }
    updateMuteUI();
    muteToggle.addEventListener('click', () => {
        isMuted = !isMuted;
        localStorage.setItem('lynkmuted', isMuted);
        updateMuteUI();
    });

    // --- Funny Name Generator ---
    const adjectives = ["Sneaky", "Grumpy", "Happy", "Sleepy", "Clumsy", "Dizzy", "Hungry", "Cyber", "Neon", "Cosmic"];
    const nouns = ["Potato", "Ninja", "Panda", "Unicorn", "Goblin", "Penguin", "Waffle", "Pirate", "Muffin", "Ghost"];
    const generateFunnyName = () => `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;

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
        if (themeIcon) {
            themeIcon.classList.replace(isDark ? 'fa-sun' : 'fa-moon', isDark ? 'fa-moon' : 'fa-sun');
            if(themeText) themeText.textContent = isDark ? 'Dark Mode' : 'Light Mode';
        }
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }
    let currentIsDark = localStorage.getItem('theme') !== 'light';
    applyTheme(currentIsDark);
    if(themeToggleBtn){
        themeToggleBtn.addEventListener('click', () => applyTheme(!document.documentElement.classList.contains('dark')));
    }

    // --- Sidebar Toggle Logic ---
    const toggleSidebar = () => usersSidebar.classList.toggle('translate-x-full');
    toggleSidebarBtn.addEventListener('click', toggleSidebar);
    closeSidebarBtn.addEventListener('click', toggleSidebar);
    mobileOnlineToggle.addEventListener('click', toggleSidebar); // Clicking the "1 Online" opens sidebar too

    function setMode(mode) {
        currentMode = mode;
        const isJoin = mode === 'join';
        tabJoin.classList.toggle('text-brand-600', isJoin);
        tabJoin.classList.toggle('border-brand-600', isJoin);
        tabJoin.classList.toggle('text-gray-400', !isJoin);
        tabJoin.classList.toggle('border-transparent', !isJoin);
        
        tabCreate.classList.toggle('text-brand-600', !isJoin);
        tabCreate.classList.toggle('border-brand-600', !isJoin);
        tabCreate.classList.toggle('text-gray-400', isJoin);
        tabCreate.classList.toggle('border-transparent', isJoin);
        
        roomInputContainer.classList.toggle('hidden', !isJoin);
        createRoomUi.classList.toggle('hidden', isJoin);
        passwordContainer.classList.toggle('hidden', !isJoin && !requirePasswordCheck.checked);
        passwordInput.placeholder = isJoin ? "Password (if any)" : "Password (required if checked)";
    }
    tabJoin.addEventListener('click', () => setMode('join'));
    tabCreate.addEventListener('click', () => setMode('create'));
    requirePasswordCheck.addEventListener('change', () => passwordContainer.classList.toggle('hidden', !requirePasswordCheck.checked));

    function resetActionButton() {
        actionButton.disabled = false;
        actionButton.innerHTML = 'Enter Lynk';
    }

    // --- Markdown Formatting Tools ---
    function insertFormatting(prefix, suffix) {
        const start = messageInput.selectionStart;
        const end = messageInput.selectionEnd;
        const text = messageInput.value;
        messageInput.value = text.substring(0, start) + prefix + text.substring(start, end) + suffix + text.substring(end);
        messageInput.focus();
        messageInput.selectionStart = start + prefix.length;
        messageInput.selectionEnd = end + prefix.length;
    }
    document.getElementById('format-bold').addEventListener('click', () => insertFormatting('**', '**'));
    document.getElementById('format-italic').addEventListener('click', () => insertFormatting('*', '*'));
    document.getElementById('format-code').addEventListener('click', () => insertFormatting('`', '`'));


    // --- Core Action Button ---
    actionButton.addEventListener('click', () => {
        try {
            if (!socket.connected) return showModal('Connecting to secure server...');

            let username = usernameInput.value.trim() || generateFunnyName();
            let password = passwordInput.value;
            let roomCode;

            if (currentMode === 'join') {
                roomCode = roomInput.value.trim();
                if (!roomCode || roomCode.length !== 6) return showModal('Enter valid 6-digit code.');
            } else {
                roomCode = Math.floor(100000 + Math.random() * 900000).toString();
                if (requirePasswordCheck.checked) {
                    if (!password) return showModal('Password required for protected room.');
                } else { password = ''; }
            }

            actionButton.disabled = true;
            actionButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Securing...';

            encryptionKey = password ? password : roomCode; 
            let passwordHash = password ? CryptoJS.SHA256(password).toString() : null;

            if (currentMode === 'create') socket.emit('createRoom', { roomCode, username, passwordHash });
            else socket.emit('joinRoom', { roomCode, username, passwordHash });

            setTimeout(() => {
                if (actionButton.disabled && !setupArea.classList.contains('hidden')) {
                    resetActionButton();
                    showModal('Connection timed out.');
                }
            }, 5000);

        } catch (error) {
            console.error("Client Error:", error);
            resetActionButton();
            showModal('Unexpected error processing request.');
        }
    });

    socket.on('roomError', (msg) => {
        resetActionButton();
        showModal(msg); 
    });

    // --- Sidebar Population ---
    socket.on('roomUsersUpdate', (users) => {
        userCountDisplay.textContent = `${users.length} Online`;
        usersList.innerHTML = '';
        users.forEach(u => {
            const li = document.createElement('li');
            const isMe = u.id === socket.id;
            li.className = `flex items-center gap-3 p-2.5 rounded-xl border ${isMe ? 'bg-brand-50/50 dark:bg-brand-900/30 border-brand-200 dark:border-brand-800' : 'bg-white/50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'}`;
            li.innerHTML = `
                <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-pink-500 text-white font-bold shadow-sm">
                    ${u.username.charAt(0).toUpperCase()}
                    <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></span>
                </div>
                <div class="flex flex-col">
                    <span class="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[140px]">${u.username}</span>
                    ${isMe ? `<span class="text-[10px] text-brand-500 font-bold uppercase tracking-wider">You</span>` : `<span class="text-[10px] text-gray-400 font-medium">Active now</span>`}
                </div>
            `;
            usersList.appendChild(li);
        });
    });

    toggleCodeBtn.addEventListener('click', () => {
        isCodeVisible = !isCodeVisible;
        roomCodeDisplay.textContent = isCodeVisible ? currentRoom : '••••••';
        eyeIcon.classList.replace(isCodeVisible ? 'fa-eye' : 'fa-eye-slash', isCodeVisible ? 'fa-eye-slash' : 'fa-eye');
    });

    messageInput.addEventListener('input', () => {
        socket.emit('typing', true);
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => socket.emit('typing', false), 2000);
    });

    socket.on('userTyping', ({ user, isTyping }) => {
        typingIndicator.textContent = isTyping ? `${user} is typing...` : '';
        typingIndicator.style.opacity = isTyping ? '1' : '0';
    });

    // --- Message Display ---
    function displayMessage(type, user, text, isMe = false) {
        const wrapper = document.createElement('div');
        wrapper.className = `flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-[fadeIn_0.3s_ease-out]`;

        if (type === 'system') {
            wrapper.className = 'flex flex-col items-center w-full my-3';
            wrapper.innerHTML = `<span class="bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-500 dark:text-gray-300 text-[10px] sm:text-[11px] uppercase tracking-wider py-1.5 px-4 rounded-full font-bold shadow-sm"><i class="fa-solid fa-shield-halved mr-1 text-brand-500"></i> ${text}</span>`;
        } else {
            const bubble = document.createElement('div');
            bubble.className = `max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 shadow-md text-base sm:text-lg leading-relaxed ${
                isMe ? 'bg-gradient-to-r from-brand-500 to-pink-500 text-white rounded-tr-sm' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-600 rounded-tl-sm'
            }`;
            
            const nameSpan = document.createElement('span');
            nameSpan.className = `block text-xs uppercase tracking-wider font-extrabold mb-1 ${isMe ? 'text-white/90 text-right' : 'text-pink-600 dark:text-pink-400 text-left'}`;
            nameSpan.textContent = isMe ? 'You' : user;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = "markdown-content break-words";
            contentDiv.innerHTML = DOMPurify.sanitize(marked.parseInline(text));
            
            bubble.appendChild(nameSpan);
            bubble.appendChild(contentDiv);
            wrapper.appendChild(bubble);
        }

        messagesContainer.appendChild(wrapper);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const msg = messageInput.value.trim();
        if (msg && currentRoom) {
            try {
                const encryptedMsg = CryptoJS.AES.encrypt(msg, encryptionKey).toString();
                socket.emit('chatMessage', encryptedMsg);
                displayMessage('chat', currentUsername, msg, true);
                
                messageInput.value = '';
                socket.emit('typing', false); 
            } catch (err) {
                console.error("Encryption error:", err);
                showModal("Failed to encrypt message.");
            }
        }
    });

    shareButton.addEventListener('click', () => {
        navigator.clipboard.writeText(`${window.location.origin}/?room=${currentRoom}`).then(() => {
            const old = shareButton.innerHTML;
            shareButton.innerHTML = '<i class="fa-solid fa-check text-green-500"></i>';
            setTimeout(() => shareButton.innerHTML = old, 2000);
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
                
                if (!isMuted) popSound.play().catch(e => console.log("Audio blocked."));
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