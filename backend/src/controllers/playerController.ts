import { Request, Response } from 'express';
import Player from '../models/Player';

export async function createPlayer(req: Request, res: Response) {
  try {
    const { username, wallets } = req.body;
    const player = new Player({ username, wallets });
    await player.save();
    res.json(player);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
} 