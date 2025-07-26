import Round, { IRound, IBet } from '../models/Round';
import crypto from 'crypto';
import { io } from '../server';

interface GameState {
  currentRound: IRound | null;
  multiplier: number;
  isCrashed: boolean;
  startTime: number;
  crashPoint: number;
  priceSeed: string;
  priceHash: string;
  bets: IBet[];
  roundNumber: number;
  priceAtBet: Record<string, number>;
}

const GROWTH_FACTOR = 0.00006; // Exponential growth factor for multiplier
const ROUND_INTERVAL = 20000; // 20 seconds between rounds (easier testing)
const MULTIPLIER_UPDATE_INTERVAL = 200; // 200ms

let state: GameState = {
  currentRound: null,
  multiplier: 1,
  isCrashed: false,
  startTime: 0,
  crashPoint: 0,
  priceSeed: '',
  priceHash: '',
  bets: [],
  roundNumber: 1,
  priceAtBet: {},
};

function generateSeed() {
  return crypto.randomBytes(16).toString('hex');
}

function getCrashPoint(seed: string, roundNumber: number): number {
  // Provably fair: hash(seed + roundNumber), map to crash multiplier
  const hash = crypto.createHash('sha256').update(seed + roundNumber).digest('hex');
  const hex = hash.slice(0, 16);
  const intVal = parseInt(hex, 16);
  // Map to [1.01, 100] (never below 1.01)
  const crash = Math.max(1.01, (intVal % 9900) / 100 + 1.01);
  return parseFloat(crash.toFixed(2));
}

function getMultiplier(timeElapsed: number) {
  // Exponential growth: multiplier = 1 + (time_elapsed * growth_factor)
  return 1 + timeElapsed * GROWTH_FACTOR;
}

let roundTimer: NodeJS.Timeout | null = null;
let multiplierTimer: NodeJS.Timeout | null = null;

export function startGameEngine() {
  startNewRound();
}

function startNewRound() {
  state.isCrashed = false;
  state.multiplier = 1;
  state.startTime = Date.now();
  state.bets = [];
  state.priceSeed = generateSeed();
  state.priceHash = crypto.createHash('sha256').update(state.priceSeed + state.roundNumber).digest('hex');
  state.crashPoint = getCrashPoint(state.priceSeed, state.roundNumber);
  state.priceAtBet = {};

  io.emit('round_start', {
    roundNumber: state.roundNumber,
    hash: state.priceHash,
    crashPoint: null,
    startTime: state.startTime,
  });

  multiplierTimer = setInterval(() => {
    if (state.isCrashed) return;
    const elapsed = (Date.now() - state.startTime) / 1000;
    state.multiplier = getMultiplier(elapsed);
    io.emit('multiplier_update', { multiplier: state.multiplier });
    if (state.multiplier >= state.crashPoint) {
      crashRound();
    }
  }, MULTIPLIER_UPDATE_INTERVAL);
}

function crashRound() {
  state.isCrashed = true;
  if (multiplierTimer) clearInterval(multiplierTimer);
  io.emit('round_crash', {
    roundNumber: state.roundNumber,
    crashPoint: state.crashPoint,
    bets: state.bets,
  });
  // Save round to DB
  const round = new Round({
    roundNumber: state.roundNumber,
    crashPoint: state.crashPoint,
    seed: state.priceSeed,
    hash: state.priceHash,
    bets: state.bets,
    startedAt: new Date(state.startTime),
    endedAt: new Date(),
  });
  round.save();
  // Start next round after interval
  roundTimer = setTimeout(() => {
    state.roundNumber++;
    startNewRound();
  }, ROUND_INTERVAL);
}

export function placeBet(bet: IBet, priceAtBet: number) {
  if (state.isCrashed || state.multiplier > 1.01) throw new Error('Betting closed');
  state.bets.push(bet);
  state.priceAtBet[bet.playerId] = priceAtBet;
}

export function cashOut(playerId: string) {
  if (state.isCrashed) throw new Error('Round crashed');
  const bet = state.bets.find(b => b.playerId === playerId && !b.cashedOut);
  if (!bet) throw new Error('No active bet');
  bet.cashedOut = true;
  bet.cashoutMultiplier = state.multiplier;
  bet.cashoutAmount = bet.cryptoAmount * state.multiplier;
  io.emit('player_cashout', {
    playerId,
    cashoutMultiplier: bet.cashoutMultiplier,
    cashoutAmount: bet.cashoutAmount,
  });
  return { ...bet, priceAtBet: state.priceAtBet[playerId] };
} 