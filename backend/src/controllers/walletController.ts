import { Request, Response } from 'express';
import * as walletService from '../services/walletService';
import { placeBet as gamePlaceBet, cashOut as gameCashOut } from '../services/gameEngine';

export async function getWallet(req: Request, res: Response) {
  try {
    const { playerId } = req.params;
    const balances = await walletService.getWallet(playerId);
    res.json(balances);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function placeBet(req: Request, res: Response) {
  try {
    const { playerId, usdAmount, currency } = req.body;
    const { cryptoAmount, price, transactionHash } = await walletService.placeBet(playerId, usdAmount, currency);
    gamePlaceBet({ playerId, usdAmount, cryptoAmount, currency, cashedOut: false }, price);
    res.json({ cryptoAmount, price, transactionHash });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function cashOut(req: Request, res: Response) {
  try {
    const { playerId } = req.body;
    const betResult = gameCashOut(playerId);
    const payout = await walletService.cashOut(
      playerId,
      betResult.cryptoAmount,
      betResult.currency as 'BTC' | 'ETH',
      betResult.cashoutMultiplier!,
      betResult.priceAtBet
    );
    res.json({ ...betResult, ...payout });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
} 