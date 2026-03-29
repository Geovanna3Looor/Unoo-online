const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Estado de las salas
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    socket.on('createRoom', (data) => {
        const roomCode = uuidv4().slice(0, 6).toUpperCase();
        rooms.set(roomCode, {
            players: [{
                id: socket.id,
                username: data.username,
                isOwner: true,
                cards: [],
                score: 0
            }],
            gameState: {
                started: false,
                currentPlayer: 0,
                direction: 1,
                centerCard: null,
                unoCalled: []
            }
        });
        
        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode });
    });

    socket.on('joinRoom', (data) => {
        const room = rooms.get(data.roomCode);
        if (room && room.players.length < 12) {
            room.players.push({
                id: socket.id,
                username: data.username,
                isOwner: false,
                cards: [],
                score: 0
            });
            
            socket.join(data.roomCode);
            socket.emit('roomJoined', { roomCode: data.roomCode, players: room.players });
            socket.to(data.roomCode).emit('playerJoined', { players: room.players });
        } else {
            socket.emit('error', { message: 'Sala no encontrada o llena' });
        }
    });

    socket.on('startGame', () => {
        const roomCode = Array.from(socket.rooms).find(room => room !== socket.id);
        const room = rooms.get(roomCode);
        
        if (room && room.players.find(p => p.id === socket.id)?.isOwner) {
            // Inicializar juego
            room.gameState.started = true;
            room.gameState.centerCard = generateRandomCard();
            
            room.players.forEach(player => {
                player.cards = generateHand();
            });
            
            io.to(roomCode).emit('gameStarted', {
                players: room.players,
                centerCard: room.gameState.centerCard,
                cards: room.players.find(p => p.id === socket.id)?.cards || []
            });
        }
    });

    socket.on('playCard', (data) => {
        // Lógica del juego UNO aquí (simplificada)
        const roomCode = Array.from(socket.rooms).find(room => room !== socket.id);
        const room = rooms.get(roomCode);
        if (room) {
            // Validar jugada y actualizar estado
            io.to(roomCode).emit('gameUpdate', room.gameState);
        }
    });

    socket.on('chatMessage', (data) => {
        const roomCode = Array.from(socket.rooms).find(room => room !== socket.id);
        socket.to(roomCode).emit('chatMessage', data);
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
        // Limpiar jugador de todas las salas
    });
});

// Funciones del juego
function generateRandomCard() {
    const colors = ['red', 'blue', 'green', 'yellow'];
    const values = ['0','1','2','3','4','5','6','7','8','9','skip','reverse','draw2'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const value = values[Math.floor(Math.random() * values.length)];
    return { color, value, special: ['skip','reverse','draw2'].includes(value) };
}

function generateHand() {
    const hand = [];
    for (let i = 0; i < 7; i++) {
        hand.push(generateRandomCard());
    }
    return hand;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor UNO corriendo en puerto ${PORT}`);
});
