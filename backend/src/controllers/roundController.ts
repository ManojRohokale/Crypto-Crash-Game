import { Request, Response } from 'express';
import Round from '../models/Round';

export async function getRoundHistory(req: Request, res: Response) {
  try {
    const rounds = await Round.find().sort({ roundNumber: -1 }).limit(20);
    res.json(rounds);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
} 