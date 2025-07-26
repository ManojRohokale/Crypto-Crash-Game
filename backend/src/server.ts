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
    origin: [
      'http://localhost:3000', // for local development
      'https://candid-squirrel-ba9a5d.netlify.app', // Your actual Netlify URL
      process.env.FRONTEND_URL || '' // Provide fallback to avoid undefined
    ].filter((url): url is string => Boolean(url)), // Type-safe filter
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// WebSocket: handle cashout requests from clients
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('cashout', ({ playerId }) => {
    try {
      const result = cashOut(playerId);
      socket.emit('cashout_success', result);
    } catch (err: any) {
      socket.emit('cashout_error', { error: err.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      startGameEngine();
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit on database connection failure
  });

export { io };