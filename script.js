class UNOGame {
    constructor() {
        this.socket = null;
        this.username = '';
        this.roomCode = '';
        this.peer = null;
        this.currentCall = null;
        this.isVoiceActive = false;
        this.cards = [];
        this.players = [];
        this.gameState = {};
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.initStickers();
        this.connectSocket();
    }

    bindEvents() {
        // Home screen
        document.getElementById('createRoom').onclick = () => this.createRoom();
        document.getElementById('joinRoom').onclick = () => this.joinRoom();
        document.getElementById('backToHome').onclick = () => this.showScreen('homeScreen');
        
        // Room screen
        document.getElementById('copyRoomCode').onclick = () => this.copyRoomCode();
        document.getElementById('startGame').onclick = () => this.startGame();
        
        // Game screen
        document.getElementById('drawCard').onclick = () => this.sendAction('draw');
        document.getElementById('sayUno').onclick = () => this.sayUno();
        document.getElementById('chatInput').onkeypress = (e) => {
            if (e.key === 'Enter') this.sendChat();
        };
        
        // Voice & Stickers
        document.getElementById('voiceToggle').onclick = () => this.toggleVoice();
        document.getElementById('stickerBtn').onclick = () => this.toggleStickerModal();
    }

    connectSocket() {
        this.socket = io();
        
        this.socket.on('roomCreated', (data) => {
            this.roomCode = data.roomCode;
            this.updateRoomScreen();
        });
        
        this.socket.on('roomJoined', (data) => {
            this.roomCode = data.roomCode;
            this.players = data.players;
            this.updateRoomScreen();
        });
        
        this.socket.on('playerJoined', (data) => {
            this.players = data.players;
            this.updateRoomScreen();
        });
        
        this.socket.on('gameStarted', (data) => {
            this.gameState = data;
            this.showScreen('gameScreen');
            this.initPeerJS();
            this.dealCards(data.cards);
        });
        
        this.socket.on('gameUpdate', (data) => {
            this.gameState = data;
            this.updateGameDisplay();
        });
        
        this.socket.on('chatMessage', (data) => {
            this.addChatMessage(data);
        });
    }

    createRoom() {
        this.username = document.getElementById('username').value || 'Jugador';
        this.socket.emit('createRoom', { username: this.username });
    }

    joinRoom() {
        this.username = document.getElementById('username').value || 'Jugador';
        const roomCode = document.getElementById('roomCode').value;
        if (roomCode) {
            this.socket.emit('joinRoom', { 
                username: this.username, 
                roomCode 
            });
        } else {
            alert('Ingresa el código de la sala');
        }
    }

    updateRoomScreen() {
        document.getElementById('roomCodeDisplay').textContent = this.roomCode;
        document.getElementById('roomTitle').textContent = `Sala: ${this.roomCode}`;
        
        const grid = document.getElementById('playersGrid');
        grid.innerHTML = '';
        
        this.players.forEach((player, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.className = `player-card ${player.isOwner ? 'owner' : ''}`;
            playerDiv.innerHTML = `
                <div style="font-size: 1.2rem; font-weight: bold;">${player.username}</div>
                <div style="font-size: 0.9rem; opacity: 0.8;">#${index + 1}</div>
                ${player.isOwner ? '<div style="color: gold;">👑 Creador</div>' : ''}
            `;
            grid.appendChild(playerDiv);
        });
        
        const startBtn = document.getElementById('startGame');
        const owner = this.players.find(p => p.isOwner);
        startBtn.disabled = !owner || owner.username !== this.username || this.players.length < 2;
    }

    startGame() {
        this.socket.emit('startGame');
    }

    copyRoomCode() {
        navigator.clipboard.writeText(this.roomCode);
        alert('¡Código copiado! Compártelo con tus amigos');
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    initPeerJS() {
        this.peer = new Peer();
        this.peer.on('call', (call) => {
            navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
                call.answer(stream);
                call.on('stream', (remoteStream) => {
                    // Manejar stream de audio remoto
                });
            });
        });
    }

    toggleVoice() {
        this.isVoiceActive = !this.isVoiceActive;
        const btn = document.getElementById('voiceToggle');
        btn.style.background = this.isVoiceActive ? '#ff4757' : '';
        // Implementar lógica de WebRTC aquí
    }

    dealCards(cards) {
        this.cards = cards;
        this.renderHand();
    }

    renderHand() {
        const container = document.getElementById('handContainer');
        container.innerHTML = '';
        
        this.cards.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = `card ${card.color} ${this.isPlayable(card) ? 'playable' : ''}`;
            cardEl.innerHTML = this.getCardSymbol(card);
            cardEl.onclick = () => this.playCard(index);
            container.appendChild(cardEl);
        });
    }

    isPlayable(card) {
        const centerCard = this.gameState.centerCard;
        return card.color === centerCard.color || 
               card.value === centerCard.value || 
               card.special;
    }

    playCard(index) {
        if (this.isPlayable(this.cards[index])) {
            this.socket.emit('playCard', { index });
        }
    }

    sayUno() {
        this.socket.emit('sayUno');
    }

   
