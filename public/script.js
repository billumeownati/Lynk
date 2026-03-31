// public/script.js
document.addEventListener('DOMContentLoaded', () => {
    // Connect to the same server that served this HTML file
    const socket = io();

    // DOM Elements
    const setupArea = document.getElementById('setup-area');
    const chatArea = document.getElementById('chat-area');
    const tabJoin = document.getElementById('tab-join');
    const tabCreate = document.getElementById('tab-create');
    const actionButton = document.getElementById('action-button');
    const roomInputContainer = document.getElementById('room-input-container');
    const createRoomUi = document.getElementById('create-room-ui');
    const passwordContainer = document.getElementById('password-container');
    const passwordInput = document.getElementById('password-input');
    const usernameInput = document.getElementById('username-input');
    const roomInput = document.getElementById('room-input');
    const requirePasswordCheck = document.getElementById('require-password');

    const shareButton = document.getElementById('share-button');
    const toggleCodeBtn = document.getElementById('toggle-code-btn');
    const roomCodeDisplay = document.getElementById('room-code-display');
    const eyeIcon = document.getElementById('eye-icon');
    
    // Sidebar Elements
    const usersSidebar = document.getElementById('users-sidebar');
    const usersList = document.getElementById('users-list');
    const userCountDisplay = document.getElementById('user-count');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const mobileOnlineToggle = document.getElementById('mobile-online-toggle');

    // Voice Chat Elements
    const joinVcBtn = document.getElementById('join-vc-btn');
    const vcActiveControls = document.getElementById('vc-active-controls');
    const vcMicBtn = document.getElementById('vc-mic-btn');
    const vcDeafenBtn = document.getElementById('vc-deafen-btn');
    const leaveVcBtn = document.getElementById('leave-vc-btn');
    const vcUsersList = document.getElementById('vc-users-list');
    const audioContainer = document.getElementById('audio-container');

    // Settings Modal Elements
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');
    const soundSelect = document.getElementById('sound-select');
    const micSelect = document.getElementById('mic-select');
    const speakerSelect = document.getElementById('speaker-select');
    const muteToggle = document.getElementById('mute-toggle');
    const muteIcon = document.getElementById('mute-icon');

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

    // State Variables
    let currentMode = 'join'; 
    let currentUsername = null;
    let currentRoom = null;
    let encryptionKey = null; 
    let isCodeVisible = false;
    let typingTimeout = null;

    // --- Audio Setup ---
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

    // --- Settings Modal Logic ---
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
        void settingsModal.offsetWidth; // trigger reflow
        settingsModal.classList.remove('opacity-0');
        settingsModal.firstElementChild.classList.remove('scale-95');
        populateDevices(); 
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('opacity-0');
        settingsModal.firstElementChild.classList.add('scale-95');
        setTimeout(() => settingsModal.classList.add('hidden'), 300);
    });

    // --- Device Enumeration for WebRTC ---
    async function populateDevices() {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            micSelect.innerHTML = '';
            speakerSelect.innerHTML = '';

            devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `${device.kind} (${device.deviceId.slice(0,5)})`;
                option.className = "text-gray-800 bg-white dark:bg-gray-800 dark:text-white";

                if (device.kind === 'audioinput') {
                    micSelect.appendChild(option);
                } else if (device.kind === 'audiooutput') {
                    speakerSelect.appendChild(option);
                }
            });

            if (localStorage.getItem('lynkMic') && [...micSelect.options].some(o => o.value === localStorage.getItem('lynkMic'))) {
                micSelect.value = localStorage.getItem('lynkMic');
            }
            if (localStorage.getItem('lynkSpeaker') && [...speakerSelect.options].some(o => o.value === localStorage.getItem('lynkSpeaker'))) {
                speakerSelect.value = localStorage.getItem('lynkSpeaker');
            }
        } catch (err) {
            console.error("Error fetching devices.", err);
            micSelect.innerHTML = '<option>Permission Denied/Unavailable</option>';
            speakerSelect.innerHTML = '<option>Permission Denied/Unavailable</option>';
        }
    }

    micSelect.addEventListener('change', async (e) => {
        const deviceId = e.target.value;
        localStorage.setItem('lynkMic', deviceId);
        
        if (isInVC && localStream) {
            try {
                const newStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId } } });
                const newTrack = newStream.getAudioTracks()[0];
                newTrack.enabled = !isMicMuted;
                
                localStream.getAudioTracks().forEach(t => t.stop());
                localStream = newStream;
                
                for (let id in peerConnections) {
                    const sender = peerConnections[id].getSenders().find(s => s.track && s.track.kind === 'audio');
                    if (sender) sender.replaceTrack(newTrack);
                }
            } catch (err) {
                console.error("Failed to swap mic", err);
            }
        }
    });

    speakerSelect.addEventListener('change', (e) => {
        const deviceId = e.target.value;
        localStorage.setItem('lynkSpeaker', deviceId);
        document.querySelectorAll('audio').forEach(audioEl => {
            if (typeof audioEl.setSinkId === 'function') {
                audioEl.setSinkId(deviceId).catch(console.error);
            }
        });
    });


    // --- WebRTC Voice Chat Logic ---
    let localStream = null;
    let peerConnections = {}; 
    let isInVC = false;
    let isMicMuted = false;
    let isDeafened = false;

    const iceConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

    joinVcBtn.addEventListener('click', async () => {
        try {
            joinVcBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            
            const savedMic = localStorage.getItem('lynkMic');
            const constraints = savedMic ? { audio: { deviceId: { exact: savedMic } } } : { audio: true };
            
            localStream = await navigator.mediaDevices.getUserMedia(constraints);
            isInVC = true;
            
            joinVcBtn.classList.add('hidden');
            vcActiveControls.classList.remove('hidden');
            vcActiveControls.classList.add('flex');
            
            socket.emit('joinVC');
        } catch (err) {
            joinVcBtn.innerHTML = 'Join VC';
            showModal("Microphone access denied. Please allow mic permissions or check Settings.");
            console.error("Mic Error:", err);
        }
    });

    leaveVcBtn.addEventListener('click', () => {
        isInVC = false;
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        for (let id in peerConnections) {
            peerConnections[id].close();
            delete peerConnections[id];
        }
        audioContainer.innerHTML = '';
        
        joinVcBtn.classList.remove('hidden');
        joinVcBtn.innerHTML = 'Join VC';
        vcActiveControls.classList.remove('flex');
        vcActiveControls.classList.add('hidden');
        
        socket.emit('leaveVC');
    });

    vcMicBtn.addEventListener('click', () => {
        if (!localStream) return;
        isMicMuted = !isMicMuted;
        localStream.getAudioTracks()[0].enabled = !isMicMuted;
        
        if(isMicMuted) {
            vcMicBtn.innerHTML = '<i class="fa-solid fa-microphone-slash text-sm"></i>';
            vcMicBtn.classList.replace('text-gray-700', 'text-red-500');
            vcMicBtn.classList.replace('dark:text-gray-200', 'dark:text-red-400');
        } else {
            vcMicBtn.innerHTML = '<i class="fa-solid fa-microphone text-sm"></i>';
            vcMicBtn.classList.replace('text-red-500', 'text-gray-700');
            vcMicBtn.classList.replace('dark:text-red-400', 'dark:text-gray-200');
        }
        socket.emit('toggleMicState', isMicMuted);
    });

    vcDeafenBtn.addEventListener('click', () => {
        if (!isInVC) return;
        isDeafened = !isDeafened;
        
        document.querySelectorAll('#audio-container audio').forEach(audioEl => {
            audioEl.muted = isDeafened;
        });
        
        if (isDeafened) {
            vcDeafenBtn.innerHTML = '<i class="fa-solid fa-ear-deaf text-sm"></i>';
            vcDeafenBtn.classList.replace('text-gray-700', 'text-red-500');
            vcDeafenBtn.classList.replace('dark:text-gray-200', 'dark:text-red-400');
        } else {
            vcDeafenBtn.innerHTML = '<i class="fa-solid fa-headphones text-sm"></i>';
            vcDeafenBtn.classList.replace('text-red-500', 'text-gray-700');
            vcDeafenBtn.classList.replace('dark:text-red-400', 'dark:text-gray-200');
        }
    });

    function createPeerConnection(targetId, isInitiator) {
        const pc = new RTCPeerConnection(iceConfig);
        peerConnections[targetId] = pc;

        if (localStream) {
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('webrtc-ice-candidate', { target: targetId, candidate: event.candidate });
            }
        };

        pc.ontrack = (event) => {
            let audioEl = document.getElementById(`audio-${targetId}`);
            if (!audioEl) {
                audioEl = document.createElement('audio');
                audioEl.id = `audio-${targetId}`;
                audioEl.autoplay = true;
                audioEl.muted = isDeafened; 
                
                const savedSpeaker = localStorage.getItem('lynkSpeaker');
                if (savedSpeaker && typeof audioEl.setSinkId === 'function') {
                    audioEl.setSinkId(savedSpeaker).catch(console.error);
                }
                
                audioContainer.appendChild(audioEl);
            }
            audioEl.srcObject = event.streams[0];
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                const audioEl = document.getElementById(`audio-${targetId}`);
                if (audioEl) audioEl.remove();
                if (peerConnections[targetId]) peerConnections[targetId].close();
                delete peerConnections[targetId];
            }
        };

        if (isInitiator) {
            pc.createOffer().then(offer => {
                pc.setLocalDescription(offer);
                socket.emit('webrtc-offer', { target: targetId, offer: offer });
            });
        }
        return pc;
    }

    socket.on('userJoinedVC', (newUserId) => {
        if (isInVC) createPeerConnection(newUserId, true);
    });

    socket.on('userLeftVC', (targetId) => {
        if (peerConnections[targetId]) {
            peerConnections[targetId].close();
            delete peerConnections[targetId];
        }
        const audioEl = document.getElementById(`audio-${targetId}`);
        if(audioEl) audioEl.remove();
    });

    socket.on('webrtc-offer', async ({ sender, offer }) => {
        if (!isInVC) return;
        const pc = createPeerConnection(sender, false);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc-answer', { target: sender, answer: answer });
    });

    socket.on('webrtc-answer', async ({ sender, answer }) => {
        const pc = peerConnections[sender];
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('webrtc-ice-candidate', async ({ sender, candidate }) => {
        const pc = peerConnections[sender];
        if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });


    // --- General Logic ---
    const generateFunnyName = () => `${["Sneaky", "Grumpy", "Happy", "Sleepy", "Clumsy"][Math.floor(Math.random()*5)]} ${["Potato", "Ninja", "Panda", "Unicorn", "Goblin"][Math.floor(Math.random()*5)]}`;

    function showModal(message) {
        modalMessage.textContent = message;
        globalModal.classList.remove('hidden');
        void globalModal.offsetWidth;
        globalModal.classList.remove('opacity-0');
        globalModalContent.classList.remove('scale-95');
    }
    function closeModal() {
        globalModal.classList.add('opacity-0');
        globalModalContent.classList.add('scale-95');
        setTimeout(() => globalModal.classList.add('hidden'), 300);
    }
    closeModalBtn.addEventListener('click', closeModal);
    modalOkBtn.addEventListener('click', closeModal);

    function applyTheme(isDark) {
        document.documentElement.classList.toggle('dark', isDark);
        document.body.classList.toggle('dark', isDark);
        document.body.classList.toggle('light', !isDark);
        if (themeIcon) themeIcon.classList.replace(isDark ? 'fa-sun' : 'fa-moon', isDark ? 'fa-moon' : 'fa-sun');
        if (themeText) themeText.textContent = isDark ? 'Dark Mode' : 'Light Mode';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }
    let currentIsDark = localStorage.getItem('theme') !== 'light';
    applyTheme(currentIsDark);
    if(themeToggleBtn) themeToggleBtn.addEventListener('click', () => applyTheme(!document.documentElement.classList.contains('dark')));

    const toggleSidebar = () => usersSidebar.classList.toggle('translate-x-full');
    toggleSidebarBtn.addEventListener('click', toggleSidebar);
    closeSidebarBtn.addEventListener('click', toggleSidebar);
    mobileOnlineToggle.addEventListener('click', toggleSidebar);

    function setMode(mode) {
        currentMode = mode;
        const isJoin = mode === 'join';
        tabJoin.classList.toggle('text-brand-600', isJoin);
        tabJoin.classList.toggle('border-brand-600', isJoin);
        tabJoin.classList.toggle('text-gray-500', !isJoin);
        tabJoin.classList.toggle('border-transparent', !isJoin);
        
        tabCreate.classList.toggle('text-brand-600', !isJoin);
        tabCreate.classList.toggle('border-brand-600', !isJoin);
        tabCreate.classList.toggle('text-gray-500', isJoin);
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

    actionButton.addEventListener('click', () => {
        if (!socket.connected) return showModal('Connecting to secure server...');
        let username = usernameInput.value.trim() || generateFunnyName();
        let password = passwordInput.value;
        let roomCode;

        if (currentMode === 'join') {
            roomCode = roomInput.value.trim();
            if (!roomCode || roomCode.length !== 6) return showModal('Enter valid 6-digit code.');
        } else {
            roomCode = Math.floor(100000 + Math.random() * 900000).toString();
            if (requirePasswordCheck.checked && !password) return showModal('Password required for protected room.');
            if (!requirePasswordCheck.checked) password = '';
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
    });

    socket.on('roomError', (msg) => { resetActionButton(); showModal(msg); });

    socket.on('roomUsersUpdate', (users) => {
        userCountDisplay.textContent = `${users.length} Online`;
        usersList.innerHTML = '';
        vcUsersList.innerHTML = '';

        users.forEach(u => {
            const isMe = u.id === socket.id;
            
            let badgeHtml = `
                <li class="flex items-center gap-3 p-2.5 rounded-xl border ${isMe ? 'bg-brand-50/30 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800' : 'bg-white/30 dark:bg-black/20 border-white/30 dark:border-white/5'}">
                    <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-pink-500 text-white text-sm font-bold shadow-sm shrink-0">
                        ${u.username.charAt(0).toUpperCase()}
                        <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></span>
                    </div>
                    <div class="flex flex-col overflow-hidden w-full">
                        <div class="flex justify-between items-center w-full">
                            <span class="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">${u.username}</span>
                            ${u.inVC ? (u.micMuted ? '<i class="fa-solid fa-microphone-slash text-red-500 text-xs"></i>' : '<i class="fa-solid fa-microphone text-green-500 text-xs"></i>') : ''}
                        </div>
                        ${isMe ? `<span class="text-[10px] text-brand-500 font-bold uppercase tracking-wider leading-none mt-1">You</span>` : ''}
                    </div>
                </li>
            `;

            if (u.inVC) vcUsersList.innerHTML += badgeHtml;
            else usersList.innerHTML += badgeHtml;
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

    function displayMessage(type, user, text, isMe = false) {
        const wrapper = document.createElement('div');
        wrapper.className = `flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-[fadeIn_0.3s_ease-out]`;

        if (type === 'system') {
            wrapper.className = 'flex flex-col items-center w-full my-3';
            wrapper.innerHTML = `<span class="bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-500 dark:text-gray-300 text-[10px] sm:text-[11px] uppercase tracking-wider py-1.5 px-4 rounded-full font-bold shadow-sm"><i class="fa-solid fa-shield-halved mr-1 text-brand-500"></i> ${text}</span>`;
        } else {
            const bubble = document.createElement('div');
            bubble.className = `max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 shadow-md text-base sm:text-lg leading-relaxed ${
                isMe ? 'bg-gradient-to-r from-brand-500 to-pink-500 text-white rounded-tr-sm' : 'bg-white/70 dark:bg-black/40 text-gray-800 dark:text-gray-100 border border-white/50 dark:border-white/10 rounded-tl-sm backdrop-blur-md'
            }`;
            
            const nameSpan = document.createElement('span');
            nameSpan.className = `block text-xs uppercase tracking-wider font-extrabold mb-1 ${isMe ? 'text-white/90 text-right' : 'text-brand-600 dark:text-brand-400 text-left'}`;
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
        navigator.clipboard.writeText(`${window.location.origin}/chat?room=${currentRoom}`).then(() => {
            const old = shareButton.innerHTML;
            shareButton.innerHTML = '<i class="fa-solid fa-check text-green-500"></i>';
            setTimeout(() => shareButton.innerHTML = old, 2000);
        });
    });

    leaveButton.addEventListener('click', () => window.location.href = '/chat');

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