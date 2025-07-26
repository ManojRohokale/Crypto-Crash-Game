import { Request, Response } from 'express';
import * as walletService from '../services/walletService';
import { placeBet as gamePlaceBet, cashOut as gameCashOut } from '../services/gameEngine';

export async function getWallet(req: Request, res: Response) {
  try {
    console.log('getWallet called with playerId:', req.params.playerId);
    const { playerId } = req.params;
    const balances = await walletService.getWallet(playerId);
    console.log('getWallet success:', balances);
    res.json(balances);
  } catch (err: any) {
    console.error('getWallet error:', err);
    res.status(400).json({ error: err.message });
  }
}

export async function placeBet(req: Request, res: Response) {
  try {
    console.log('placeBet called with body:', req.body);
    const { playerId, usdAmount, currency } = req.body;
    
    // Validate input
    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({ error: 'valid usdAmount is required' });
    }
    if (!currency || !['BTC', 'ETH'].includes(currency)) {
      return res.status(400).json({ error: 'currency must be BTC or ETH' });
    }
    
    const { cryptoAmount, price, transactionHash } = await walletService.placeBet(playerId, usdAmount, currency);
    gamePlaceBet({ playerId, usdAmount, cryptoAmount, currency, cashedOut: false }, price);
    
    console.log('placeBet success:', { cryptoAmount, price, transactionHash });
    res.json({ cryptoAmount, price, transactionHash });
  } catch (err: any) {
    console.error('placeBet error:', err);
    res.status(400).json({ error: err.message });
  }
}

export async function cashOut(req: Request, res: Response) {
  try {
    console.log('cashOut called with body:', req.body);
    const { playerId } = req.body;
    const betResult = gameCashOut(playerId);
    const payout = await walletService.cashOut(
      playerId,
      betResult.cryptoAmount,
      betResult.currency as 'BTC' | 'ETH',
      betResult.cashoutMultiplier!,
      betResult.priceAtBet
    );
    console.log('cashOut success:', { ...betResult, ...payout });
    res.json({ ...betResult, ...payout });
  } catch (err: any) {
    console.error('cashOut error:', err);
    res.status(400).json({ error: err.message });
  }
}