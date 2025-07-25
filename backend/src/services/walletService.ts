import Player from '../models/Player';
import Transaction from '../models/Transaction';
import { getCryptoPrice } from './cryptoPriceService';
import crypto from 'crypto';

export async function getWallet(playerId: string) {
  const player = await Player.findById(playerId);
  if (!player) throw new Error('Player not found');
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
  // Debug log to print all players in the database
  console.log('DEBUG: All players in DB:', await Player.find({}));
  const player = await Player.findById(playerId);
  if (!player) throw new Error('Player not found');
  const price = await getCryptoPrice(currency);
  const cryptoAmount = usdAmount / price;
  // Debug log for balance check
  console.log(`DEBUG: Player ${playerId} has ${player.wallets.get(currency) || 0} ${currency}, needs ${cryptoAmount} ${currency} for bet`);
  if ((player.wallets.get(currency) || 0) < cryptoAmount) throw new Error('Insufficient balance');
  player.wallets.set(currency, (player.wallets.get(currency) || 0) - cryptoAmount);
  await player.save();
  const transactionHash = crypto.randomBytes(16).toString('hex');
  await Transaction.create({
    playerId,
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
  const player = await Player.findById(playerId);
  if (!player) throw new Error('Player not found');
  const payoutCrypto = cryptoAmount * multiplier;
  player.wallets.set(currency, (player.wallets.get(currency) || 0) + payoutCrypto);
  await player.save();
  const transactionHash = crypto.randomBytes(16).toString('hex');
  await Transaction.create({
    playerId,
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