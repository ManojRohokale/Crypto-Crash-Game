import mongoose, { Document, Schema } from 'mongoose';

export interface IPlayer extends Document {
  username: string;
  wallets: Map<string, number>;
}

const PlayerSchema = new Schema<IPlayer>({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true // Remove whitespace
  },
  wallets: { 
    type: Map, 
    of: Number, 
    default: () => new Map([
      ['BTC', 0.01], // Default starting balance
      ['ETH', 0.5]   // Default starting balance
    ])
  },
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Add index for better performance on username lookups
PlayerSchema.index({ username: 1 });

export default mongoose.model<IPlayer>('Player', PlayerSchema);