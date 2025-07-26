import express from 'express';
import cors, { CorsOptions } from 'cors';
import dotenv from 'dotenv';
import * as walletController from './controllers/walletController';
import * as roundController from './controllers/roundController';
import * as playerController from './controllers/playerController';

dotenv.config();

const app = express();

// CORS configuration for production
const corsOptions: CorsOptions = {
  origin: [
    'http://localhost:3000', // for local development
    'https://candid-squirrel-ba9a5d.netlify.app', // Your actual Netlify URL
    process.env.FRONTEND_URL || '' // Provide fallback to avoid undefined
  ].filter((url): url is string => Boolean(url)), // Type-safe filter
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint (useful for Render)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.get('/api/wallet/:playerId', walletController.getWallet);
app.post('/api/bet', walletController.placeBet);
app.post('/api/cashout', walletController.cashOut);
app.get('/api/rounds', roundController.getRoundHistory);
app.post('/api/player', playerController.createPlayer);

// 404 handler - FIXED: Removed problematic '*' pattern
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;