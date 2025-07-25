const mongoose = require('mongoose');
const Player = require('./dist/models/Player').default;
const Round = require('./dist/models/Round').default;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto_crash';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  await Player.deleteMany({});
  await Round.deleteMany({});

  const players = [
    { username: 'alice', wallets: { BTC: 0.01, ETH: 0.5 } },
    { username: 'bob', wallets: { BTC: 0.02, ETH: 0.3 } },
    { username: 'carol', wallets: { BTC: 0.005, ETH: 0.7 } },
    { username: 'dave', wallets: { BTC: 0.015, ETH: 0.1 } },
  ];
  await Player.insertMany(players);

  const rounds = [
    { roundNumber: 1, crashPoint: 2.5, seed: 'seed1', hash: 'hash1', bets: [], startedAt: new Date(), endedAt: new Date() },
    { roundNumber: 2, crashPoint: 5.1, seed: 'seed2', hash: 'hash2', bets: [], startedAt: new Date(), endedAt: new Date() },
    { roundNumber: 3, crashPoint: 1.8, seed: 'seed3', hash: 'hash3', bets: [], startedAt: new Date(), endedAt: new Date() },
  ];
  await Round.insertMany(rounds);

  console.log('Sample data inserted');
  process.exit();
}

seed(); 