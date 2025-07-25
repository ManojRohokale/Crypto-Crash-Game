import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  playerId: string;
  usdAmount: number;
  cryptoAmount: number;
  currency: string;
  transactionType: 'bet' | 'cashout';
  transactionHash: string;
  priceAtTime: number;
  timestamp: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  playerId: { type: String, required: true },
  usdAmount: { type: Number, required: true },
  cryptoAmount: { type: Number, required: true },
  currency: { type: String, required: true },
  transactionType: { type: String, enum: ['bet', 'cashout'], required: true },
  transactionHash: { type: String, required: true },
  priceAtTime: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model<ITransaction>('Transaction', TransactionSchema); 