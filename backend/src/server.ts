import app from './app';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { startGameEngine, cashOut } from './services/gameEngine';

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto_crash';

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// WebSocket: handle cashout requests from clients
io.on('connection', (socket) => {
  socket.on('cashout', ({ playerId }) => {
    try {
      const result = cashOut(playerId);
      socket.emit('cashout_success', result);
    } catch (err: any) {
      socket.emit('cashout_error', { error: err.message });
    }
  });
});

mongoose.connect(MONGODB_URI)
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      startGameEngine();
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

export { io }; 