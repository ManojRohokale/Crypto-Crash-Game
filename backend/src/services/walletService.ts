import Player from '../models/Player';
import Transaction from '../models/Transaction';
import { getCryptoPrice } from './cryptoPriceService';
import crypto from 'crypto';
import mongoose from 'mongoose';

// Helper function to find or create player
async function findOrCreatePlayer(playerId: string) {
  let player;
  
  // Try to find by MongoDB ObjectId first
  if (mongoose.Types.ObjectId.isValid(playerId)) {
    player = await Player.findById(playerId);
  }
  
  // If not found by ID, try to find by username
  if (!player) {
    player = await Player.findOne({ username: playerId });
  }
  
  // If still not found, create new player
  if (!player) {
    player = new Player({
      username: playerId,
      wallets: new Map([
        ['BTC', 0.01], // Starting balance: 0.01 BTC
        ['ETH', 0.5]   // Starting balance: 0.5 ETH
      ])
    });
    await player.save();
    console.log(`Created new player: ${playerId} with starting balances`);
  }
  
  return player;
}

export async function getWallet(playerId: string) {
  const player = await findOrCreatePlayer(playerId);
  
  const balances: Record<string, { crypto: number; usd: number }> = {};
  
  for (const currency of player.wallets.keys()) {
    if (currency !== 'BTC' && currency !== 'ETH') continue; // Only process supported currencies
    const amount = player.wallets.get(currency) || 0;
    const price = await getCryptoPrice(currency as 'BTC' | 'ETH');
    balances[currency] = { crypto: amount, usd: amount * price };
  }
  
  return balances;
}

export async function placeBet(playerId: string, usdAmount: number, currency: 'BTC' | 'ETH') {
  const player = await findOrCreatePlayer(playerId);
  
  const price = await getCryptoPrice(currency);
  const cryptoAmount = usdAmount / price;
  
  // Debug log for balance check
  console.log(`DEBUG: Player ${playerId} has ${player.wallets.get(currency) || 0} ${currency}, needs ${cryptoAmount} ${currency} for bet`);
  
  if ((player.wallets.get(currency) || 0) < cryptoAmount) {
    throw new Error('Insufficient balance');
  }
  
  player.wallets.set(currency, (player.wallets.get(currency) || 0) - cryptoAmount);
  await player.save();
  
  const transactionHash = crypto.randomBytes(16).toString('hex');
  await Transaction.create({
    playerId: player._id, // Use MongoDB ObjectId for transactions
    usdAmount,
    cryptoAmount,
    currency,
    transactionType: 'bet',
    transactionHash,
    priceAtTime: price,
    timestamp: new Date(),
  });
  
  return { cryptoAmount, price, transactionHash };
}

export async function cashOut(playerId: string, cryptoAmount: number, currency: 'BTC' | 'ETH', multiplier: number, priceAtBet: number) {
  const player = await findOrCreatePlayer(playerId);
  
  const payoutCrypto = cryptoAmount * multiplier;
  player.wallets.set(currency, (player.wallets.get(currency) || 0) + payoutCrypto);
  await player.save();
  
  const transactionHash = crypto.randomBytes(16).toString('hex');
  await Transaction.create({
    playerId: player._id, // Use MongoDB ObjectId for transactions
    usdAmount: payoutCrypto * priceAtBet,
    cryptoAmount: payoutCrypto,
    currency,
    transactionType: 'cashout',
    transactionHash,
    priceAtTime: priceAtBet,
    timestamp: new Date(),
  });
  
  return { payoutCrypto, transactionHash };
}