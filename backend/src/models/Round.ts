import mongoose, { Document, Schema } from 'mongoose';

export interface IBet {
  playerId: string;
  usdAmount: number;
  cryptoAmount: number;
  currency: string;
  cashedOut: boolean;
  cashoutMultiplier?: number;
  cashoutAmount?: number;
}

export interface IRound extends Document {
  roundNumber: number;
  crashPoint: number;
  seed: string;
  hash: string;
  bets: IBet[];
  startedAt: Date;
  endedAt: Date;
}

const BetSchema = new Schema<IBet>({
  playerId: { type: String, required: true },
  usdAmount: { type: Number, required: true },
  cryptoAmount: { type: Number, required: true },
  currency: { type: String, required: true },
  cashedOut: { type: Boolean, default: false },
  cashoutMultiplier: { type: Number },
  cashoutAmount: { type: Number },
});

const RoundSchema = new Schema<IRound>({
  roundNumber: { type: Number, required: true, unique: true },
  crashPoint: { type: Number, required: true },
  seed: { type: String, required: true },
  hash: { type: String, required: true },
  bets: { type: [BetSchema], default: [] },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, required: true },
});

export default mongoose.model<IRound>('Round', RoundSchema); 