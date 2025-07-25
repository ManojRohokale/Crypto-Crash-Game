"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const app_1 = __importDefault(require("./app"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const gameEngine_1 = require("./services/gameEngine");
dotenv_1.default.config();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto_crash';
const server = http_1.default.createServer(app_1.default);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
exports.io = io;
// WebSocket: handle cashout requests from clients
io.on('connection', (socket) => {
    socket.on('cashout', ({ playerId }) => {
        try {
            const result = (0, gameEngine_1.cashOut)(playerId);
            socket.emit('cashout_success', result);
        }
        catch (err) {
            socket.emit('cashout_error', { error: err.message });
        }
    });
});
mongoose_1.default.connect(MONGODB_URI)
    .then(() => {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        (0, gameEngine_1.startGameEngine)();
    });
})
    .catch((err) => {
    console.error('MongoDB connection error:', err);
});
