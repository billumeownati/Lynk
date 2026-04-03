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
    const usernameInput = document.getElementById('username-input');
    const roomInput = document.getElementById('room-input');
    const requirePasswordCheck = document.getElementById('require-password');

    const shareButton = document.getElementById('share-button');
    const toggleCodeBtn = document.getElementById('toggle-code-btn');
    const roomCodeDisplay = document.getElementById('room-code-display');
    const eyeIcon = document.getElementById('eye-icon');
    
    const usersSidebar = document.getElementById('users-sidebar');
    const usersList = document.getElementById('users-list');
    const userCountDisplay = document.getElementById('user-count');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const mobileOnlineToggle = document.getElementById('mobile-online-toggle');

    const joinVcBtn = document.getElementById('join-vc-btn');
    const vcActiveControls = document.getElementById('vc-active-controls');
    const vcModeBtn = document.getElementById('vc-mode-btn');
    const vcCamBtn = document.getElementById('vc-cam-btn');
    const vcMicBtn = document.getElementById('vc-mic-btn');
    const vcDeafenBtn = document.getElementById('vc-deafen-btn');
    const vcShareBtn = document.getElementById('vc-share-btn');
    const screenQuality = document.getElementById('screen-quality');
    const screenShareContainer = document.getElementById('screen-share-container');
    const sharedVideo = document.getElementById('shared-video');
    const screenFsBtn = document.getElementById('screen-fullscreen-btn');
    const leaveVcBtn = document.getElementById('leave-vc-btn');
    const vcUsersList = document.getElementById('vc-users-list');
    const audioContainer = document.getElementById('audio-container');
    const videoGrid = document.getElementById('video-grid');

    const textChatView = document.getElementById('text-chat-view');
    const videoChatView = document.getElementById('video-chat-view');

    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');
    const soundSelect = document.getElementById('sound-select');
    const camSelect = document.getElementById('cam-select');
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

    let currentMode = 'join'; 
    let currentUsername = null;
    let currentRoom = null;
    let encryptionKey = null; 
    let isCodeVisible = false;
    let typingTimeout = null;

    let localStream = null;
    let localCamStream = null;
    let screenStream = null;
    let peerConnections = {}; 
    let isInVC = false;
    let isMicMuted = false;
    let isDeafened = false;
    let isCamOn = false;
    let currentChatMode = 'text'; 
    let activeScreenStreamId = null;
    let pinnedUserId = null;

    const iceConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

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

    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
        void settingsModal.offsetWidth; 
        settingsModal.classList.remove('opacity-0');
        settingsModal.firstElementChild.classList.remove('scale-95');
        populateDevices(); 
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('opacity-0');
        settingsModal.firstElementChild.classList.add('scale-95');
        setTimeout(() => settingsModal.classList.add('hidden'), 300);
    });

    async function populateDevices() {
        try {
            const tempAudio = await navigator.mediaDevices.getUserMedia({ audio: true });
            tempAudio.getTracks().forEach(t => t.stop());
        } catch(err) { console.warn("Audio perm missing/denied", err); }

        try {
            const tempVideo = await navigator.mediaDevices.getUserMedia({ video: true });
            tempVideo.getTracks().forEach(t => t.stop());
        } catch(err) { console.warn("Video perm missing/denied", err); }

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            micSelect.innerHTML = '';
            speakerSelect.innerHTML = '';
            camSelect.innerHTML = '';

            let hasMic = false, hasCam = false, hasSpeaker = false;

            devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `${device.kind} (${device.deviceId.slice(0,5)})`;
                option.className = "text-gray-800 bg-white dark:bg-gray-800 dark:text-white";

                if (device.kind === 'audioinput') { micSelect.appendChild(option); hasMic = true; }
                else if (device.kind === 'audiooutput') { speakerSelect.appendChild(option); hasSpeaker = true; }
                else if (device.kind === 'videoinput') { camSelect.appendChild(option); hasCam = true; }
            });

            if (!hasMic) micSelect.innerHTML = '<option>No Microphone Found</option>';
            if (!hasSpeaker) speakerSelect.innerHTML = '<option>Default Speaker</option>';
            if (!hasCam) camSelect.innerHTML = '<option>No Camera Found</option>';

            if (localStorage.getItem('lynkMic') && [...micSelect.options].some(o => o.value === localStorage.getItem('lynkMic'))) {
                micSelect.value = localStorage.getItem('lynkMic');
            }
            if (localStorage.getItem('lynkSpeaker') && [...speakerSelect.options].some(o => o.value === localStorage.getItem('lynkSpeaker'))) {
                speakerSelect.value = localStorage.getItem('lynkSpeaker');
            }
            if (localStorage.getItem('lynkCam') && [...camSelect.options].some(o => o.value === localStorage.getItem('lynkCam'))) {
                camSelect.value = localStorage.getItem('lynkCam');
            }
        } catch (err) {
            console.error("Error enumerating devices.", err);
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

    camSelect.addEventListener('change', async (e) => {
        const deviceId = e.target.value;
        localStorage.setItem('lynkCam', deviceId);
        if (isCamOn && localCamStream) {
            try {
                const newStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
                const newTrack = newStream.getVideoTracks()[0];
                
                localCamStream.getVideoTracks().forEach(t => t.stop());
                localCamStream = newStream;
                
                for (let id in peerConnections) {
                    const sender = peerConnections[id].getSenders().find(s => s.track && s.track.kind === 'video' && (!screenStream || s.track !== screenStream.getVideoTracks()[0]));
                    if (sender) sender.replaceTrack(newTrack);
                }
                const localVideoEl = document.getElementById(`video-cam-${socket.id}`);
                if (localVideoEl) localVideoEl.srcObject = localCamStream;
            } catch (err) {
                console.error("Failed to swap cam", err);
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

    vcModeBtn.addEventListener('click', () => {
        if (currentChatMode === 'text') {
            currentChatMode = 'video';
            textChatView.classList.add('hidden');
            videoChatView.classList.remove('hidden');
            vcModeBtn.innerHTML = '<i class="fa-solid fa-message text-sm"></i>';
            vcModeBtn.title = "Switch to Text View";
        } else {
            currentChatMode = 'text';
            videoChatView.classList.add('hidden');
            textChatView.classList.remove('hidden');
            vcModeBtn.innerHTML = '<i class="fa-solid fa-border-all text-sm"></i>';
            vcModeBtn.title = "Switch to Video View";
        }
    });

    // Screen Share Fullscreen Handling
    screenFsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!document.fullscreenElement) {
            if (screenShareContainer.requestFullscreen) screenShareContainer.requestFullscreen();
            else if (screenShareContainer.webkitRequestFullscreen) screenShareContainer.webkitRequestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
    });

    document.addEventListener('fullscreenchange', () => {
        const isFs = !!document.fullscreenElement;
        const icon = screenFsBtn.querySelector('i');
        const overlay = document.getElementById('screen-share-overlay');
        
        if (isFs) {
            icon.className = 'fa-solid fa-compress text-xs';
            screenShareContainer.classList.replace('h-24', 'h-full');
            sharedVideo.classList.replace('opacity-60', 'opacity-100');
            sharedVideo.classList.replace('blur-[1px]', 'blur-none');
            overlay.classList.add('hidden');
        } else {
            icon.className = 'fa-solid fa-expand text-xs';
            screenShareContainer.classList.replace('h-full', 'h-24');
            sharedVideo.classList.replace('opacity-100', 'opacity-60');
            sharedVideo.classList.replace('blur-none', 'blur-[1px]');
            overlay.classList.remove('hidden');
        }
    });

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
        
        if (isCamOn) vcCamBtn.click();
        
        // Stop screen share completely
        if (screenStream) {
            screenStream.getTracks().forEach(t => t.stop());
            screenStream = null;
            socket.emit('stopScreenShare');
            vcShareBtn.classList.replace('text-brand-500', 'text-gray-700');
            vcShareBtn.classList.replace('dark:text-brand-400', 'dark:text-gray-200');
            screenShareContainer.classList.add('hidden');
            sharedVideo.srcObject = null;
        }
        
        if (localCamStream) {
            localCamStream.getTracks().forEach(t => t.stop());
            localCamStream = null;
        }
        
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
        
        if (currentChatMode === 'video') vcModeBtn.click();
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

    vcCamBtn.addEventListener('click', async () => {
        if (!isInVC) return;
        isCamOn = !isCamOn;

        if (isCamOn) {
            try {
                const savedCam = localStorage.getItem('lynkCam');
                const constraints = savedCam ? { video: { deviceId: { exact: savedCam } } } : { video: true };
                localCamStream = await navigator.mediaDevices.getUserMedia(constraints);
                
                const videoTrack = localCamStream.getVideoTracks()[0];
                for (let id in peerConnections) {
                    peerConnections[id].addTrack(videoTrack, localCamStream);
                }
                
                vcCamBtn.innerHTML = '<i class="fa-solid fa-video text-sm"></i>';
                vcCamBtn.classList.replace('text-red-500', 'text-brand-500');
                vcCamBtn.classList.replace('dark:text-red-400', 'dark:text-brand-400');
                
                const localVideoEl = document.getElementById(`video-cam-${socket.id}`);
                if (localVideoEl) localVideoEl.srcObject = localCamStream;
                
                socket.emit('toggleCamState', true);
                if (currentChatMode === 'text') vcModeBtn.click();
                
            } catch (err) {
                console.error(err);
                isCamOn = false;
                showModal("Camera access denied or unavailable.");
            }
        } else {
            if (localCamStream) {
                const videoTrack = localCamStream.getVideoTracks()[0];
                videoTrack.stop();
                for (let id in peerConnections) {
                    const sender = peerConnections[id].getSenders().find(s => s.track && s.track.kind === 'video' && s.track === videoTrack);
                    if (sender) peerConnections[id].removeTrack(sender);
                }
                localCamStream = null;
            }
            
            vcCamBtn.innerHTML = '<i class="fa-solid fa-video-slash text-sm"></i>';
            vcCamBtn.classList.replace('text-brand-500', 'text-red-500');
            vcCamBtn.classList.replace('dark:text-brand-400', 'dark:text-red-400');
            
            socket.emit('toggleCamState', false);
        }
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

    vcShareBtn.addEventListener('click', async () => {
        if (!isInVC) return;

        if (screenStream) {
            // STOP SHARING manually
            const tracks = screenStream.getTracks();
            tracks.forEach(t => t.stop());
            for (let id in peerConnections) {
                const senders = peerConnections[id].getSenders();
                tracks.forEach(track => {
                    const sender = senders.find(s => s.track === track);
                    if (sender) peerConnections[id].removeTrack(sender);
                });
            }
            screenStream = null;
            socket.emit('stopScreenShare');
            vcShareBtn.classList.replace('text-brand-500', 'text-gray-700');
            vcShareBtn.classList.replace('dark:text-brand-400', 'dark:text-gray-200');
            // Hide is handled by socket.on('screenShareStopped')
        } else {
            try {
                const idealHeight = parseInt(screenQuality.value) || 1080;
                screenStream = await navigator.mediaDevices.getDisplayMedia({ 
                    video: { height: { ideal: idealHeight }, frameRate: { ideal: 30 } }, 
                    audio: true 
                });
                socket.emit('startScreenShare', screenStream.id);
                
                vcShareBtn.classList.replace('text-gray-700', 'text-brand-500');
                vcShareBtn.classList.replace('dark:text-gray-200', 'dark:text-brand-400');

                screenShareContainer.classList.remove('hidden');
                sharedVideo.srcObject = screenStream;
                document.getElementById('screen-share-label').innerHTML = '<i class="fa-solid fa-desktop mr-1.5 text-brand-500"></i> You are sharing';

                screenStream.getTracks().forEach(track => {
                    for (let id in peerConnections) {
                        peerConnections[id].addTrack(track, screenStream);
                    }
                });

                screenStream.getVideoTracks()[0].onended = () => {
                    if (screenStream) vcShareBtn.click();
                };

            } catch (err) {
                console.error("Screen share cancelled or failed:", err);
            }
        }
    });

    socket.on('screenShareActive', (data) => activeScreenStreamId = data.streamId);
    
    socket.on('screenShareStopped', () => {
        activeScreenStreamId = null;
        screenShareContainer.classList.add('hidden');
        sharedVideo.srcObject = null;
        if (document.fullscreenElement && document.fullscreenElement === screenShareContainer) {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    });
    
    socket.on('forceStopShare', () => {
        if (screenStream) {
            const tracks = screenStream.getTracks();
            tracks.forEach(t => t.stop());
            for (let id in peerConnections) {
                const senders = peerConnections[id].getSenders();
                tracks.forEach(track => {
                    const sender = senders.find(s => s.track === track);
                    if (sender) peerConnections[id].removeTrack(sender);
                });
            }
            screenStream = null;
            vcShareBtn.classList.replace('text-brand-500', 'text-gray-700');
            vcShareBtn.classList.replace('dark:text-brand-400', 'dark:text-gray-200');
            showModal("Someone else started sharing their screen.");
            // We intentionally do NOT hide the container here. The socket.on('screenShareActive') 
            // from the new user will route their video right into the existing player perfectly.
        }
    });

    function createPeerConnection(targetId, isInitiator) {
        const pc = new RTCPeerConnection(iceConfig);
        peerConnections[targetId] = pc;

        if (localStream) localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        if (localCamStream) localCamStream.getTracks().forEach(track => pc.addTrack(track, localCamStream));
        if (screenStream) screenStream.getTracks().forEach(track => pc.addTrack(track, screenStream));

        pc.onicecandidate = (event) => {
            if (event.candidate) socket.emit('webrtc-ice-candidate', { target: targetId, candidate: event.candidate });
        };

        pc.ontrack = (event) => {
            if (event.track.kind === 'video') {
                if (event.streams[0] && event.streams[0].id === activeScreenStreamId) {
                    screenShareContainer.classList.remove('hidden');
                    sharedVideo.srcObject = event.streams[0];
                    document.getElementById('screen-share-label').innerHTML = '<i class="fa-solid fa-eye text-brand-500 mr-1.5"></i> Viewing Stream';
                } else {
                    let camVideoEl = document.getElementById(`video-cam-${targetId}`);
                    if (camVideoEl) camVideoEl.srcObject = event.streams[0];
                }
            } else if (event.track.kind === 'audio') {
                let audioId = `audio-${targetId}-${event.track.id}`; 
                let audioEl = document.getElementById(audioId);
                if (!audioEl) {
                    audioEl = document.createElement('audio');
                    audioEl.id = audioId;
                    audioEl.autoplay = true;
                    audioEl.muted = isDeafened; 
                    
                    const savedSpeaker = localStorage.getItem('lynkSpeaker');
                    if (savedSpeaker && typeof audioEl.setSinkId === 'function') {
                        audioEl.setSinkId(savedSpeaker).catch(console.error);
                    }
                    audioContainer.appendChild(audioEl);
                }
                audioEl.srcObject = new MediaStream([event.track]);
            }
        };

        pc.makingOffer = false;
        pc.onnegotiationneeded = async () => {
            try {
                pc.makingOffer = true;
                const offer = await pc.createOffer();
                if (pc.signalingState !== "stable") return; // Abort if state crashed
                await pc.setLocalDescription(offer);
                socket.emit('webrtc-offer', { target: targetId, offer: offer });
            } catch (err) {
                console.error("Renegotiation error:", err);
            } finally {
                pc.makingOffer = false;
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                document.querySelectorAll(`audio[id^="audio-${targetId}"]`).forEach(el => el.remove());
                if (peerConnections[targetId]) peerConnections[targetId].close();
                delete peerConnections[targetId];
            }
        };

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

        document.querySelectorAll(`audio[id^="audio-${targetId}"]`).forEach(el => el.remove());
    });

    socket.on('webrtc-offer', async ({ sender, offer }) => {
        if (!isInVC) return;
        let pc = peerConnections[sender];
        const isReceiver = !pc; 
        
        if (!pc) pc = createPeerConnection(sender, false);

        const offerCollision = (pc.signalingState !== "stable") || pc.makingOffer;
        if (offerCollision && !isReceiver) return; 

        try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc-answer', { target: sender, answer: answer });
        } catch (err) {
            console.error("Offer error:", err);
        }
    });

    socket.on('webrtc-answer', async ({ sender, answer }) => {
        const pc = peerConnections[sender];
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('webrtc-ice-candidate', async ({ sender, candidate }) => {
        const pc = peerConnections[sender];
        if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    function updateVideoGrid() {
        const tiles = document.querySelectorAll('.video-tile');
        
        if (!pinnedUserId) {
            // Default Equal Grid Layout
            videoGrid.className = 'w-full h-full grid gap-3 auto-rows-fr grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 relative transition-all';
            tiles.forEach(t => {
                t.className = 'video-tile relative bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center border border-white/10 shadow-lg group transition-all h-full min-h-[150px]';
                const btn = t.querySelector('.pin-btn i');
                if (btn) btn.className = 'fa-solid fa-expand text-xs';
            });
        } else {
            // Pinned Dynamic Layout (1 Large, Others Small)
            videoGrid.className = 'w-full h-full grid gap-3 grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 auto-rows-min relative transition-all';
            tiles.forEach(t => {
                const btn = t.querySelector('.pin-btn i');
                if (t.dataset.userId === pinnedUserId) {
                    t.className = 'video-tile relative bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center border border-white/10 shadow-lg group transition-all col-span-full h-[50vh] sm:h-[60vh]';
                    if (btn) btn.className = 'fa-solid fa-compress text-xs';
                } else {
                    t.className = 'video-tile relative bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center border border-white/10 shadow-lg group transition-all h-24 sm:h-32';
                    if (btn) btn.className = 'fa-solid fa-expand text-xs';
                }
            });
        }
    }

    window.togglePin = function(userId) {
        if (pinnedUserId === userId) pinnedUserId = null;
        else pinnedUserId = userId;
        updateVideoGrid();
    };

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

        const existingTiles = Array.from(videoGrid.children).map(c => c.dataset.userId);

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

            if (u.inVC) {
                vcUsersList.innerHTML += badgeHtml;
                
                if (!existingTiles.includes(u.id)) {
                    const tile = document.createElement('div');
                    tile.dataset.userId = u.id;
                    tile.className = 'video-tile relative bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center border border-white/10 shadow-lg group transition-all';
                    
                    const video = document.createElement('video');
                    video.id = `video-cam-${u.id}`;
                    video.autoplay = true;
                    video.playsInline = true;
                    video.className = 'w-full h-full object-cover ' + (u.camOn ? '' : 'hidden');
                    if (isMe) {
                        video.muted = true;
                        video.classList.add('scale-x-[-1]');
                        if (localCamStream) video.srcObject = localCamStream;
                    }
                    
                    const avatar = document.createElement('img');
                    avatar.id = `avatar-cam-${u.id}`;
                    avatar.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`;
                    avatar.className = 'w-20 h-20 rounded-full object-cover shadow-md ' + (u.camOn ? 'hidden' : '');
                    
                    const label = document.createElement('div');
                    label.id = `label-cam-${u.id}`;
                    label.className = 'absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1.5 z-10';
                    label.innerHTML = `<span>${u.username}</span> <i class="fa-solid ${u.micMuted ? 'fa-microphone-slash text-red-500' : 'fa-microphone text-green-500'}"></i>`;
                    
                    const pinBtn = document.createElement('button');
                    pinBtn.className = 'pin-btn absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white w-8 h-8 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10';
                    pinBtn.innerHTML = '<i class="fa-solid fa-expand text-xs"></i>';
                    pinBtn.onclick = () => window.togglePin(u.id);
                    
                    tile.appendChild(video);
                    tile.appendChild(avatar);
                    tile.appendChild(label);
                    tile.appendChild(pinBtn);
                    videoGrid.appendChild(tile);
                } else {
                    const video = document.getElementById(`video-cam-${u.id}`);
                    const avatar = document.getElementById(`avatar-cam-${u.id}`);
                    const label = document.getElementById(`label-cam-${u.id}`);
                    if (video) video.classList.toggle('hidden', !u.camOn);
                    if (avatar) avatar.classList.toggle('hidden', u.camOn);
                    if (label) label.innerHTML = `<span>${u.username}</span> <i class="fa-solid ${u.micMuted ? 'fa-microphone-slash text-red-500' : 'fa-microphone text-green-500'}"></i>`;
                }
            } else {
                usersList.innerHTML += badgeHtml;
            }
        });

        Array.from(videoGrid.children).forEach(tile => {
            if (!users.find(u => u.id === tile.dataset.userId && u.inVC)) {
                tile.remove();
                if (pinnedUserId === tile.dataset.userId) window.togglePin(pinnedUserId);
            }
        });

        updateVideoGrid(); // Enforces proper grid layout dynamically
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