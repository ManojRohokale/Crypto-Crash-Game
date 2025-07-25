import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as walletController from './controllers/walletController';
import * as roundController from './controllers/roundController';
import * as playerController from './controllers/playerController';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// TODO: Add routes here
app.get('/api/wallet/:playerId', walletController.getWallet);
app.post('/api/bet', walletController.placeBet);
app.post('/api/cashout', walletController.cashOut);
app.get('/api/rounds', roundController.getRoundHistory);
app.post('/api/player', playerController.createPlayer);

export default app; 