import mongoose, { Document, Schema } from 'mongoose';

export interface IPlayer extends Document {
  username: string;
  wallets: Map<string, number>;
}

const PlayerSchema = new Schema<IPlayer>({
  username: { type: String, required: true, unique: true },
  wallets: { type: Map, of: Number, default: {} },
});

export default mongoose.model<IPlayer>('Player', PlayerSchema); 