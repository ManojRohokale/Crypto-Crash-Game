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
  bettingPhaseActive: boolean;
}

const GROWTH_FACTOR = 0.00006; // Exponential growth factor for multiplier
const ROUND_INTERVAL = 20000; // 20 seconds between rounds (easier testing)
const MULTIPLIER_UPDATE_INTERVAL = 200; // 200ms
const BETTING_PHASE_DURATION = 8000; // 8 seconds for betting phase

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
  bettingPhaseActive: false,
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
let bettingTimer: NodeJS.Timeout | null = null;

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
  state.bettingPhaseActive = true;

  // Emit round start with betting phase info
  io.emit('round_start', {
    roundNumber: state.roundNumber,
    hash: state.priceHash,
    crashPoint: null,
    startTime: state.startTime,
    bettingPhase: true,
    bettingDuration: BETTING_PHASE_DURATION,
  });

  // Start betting phase countdown
  let bettingTimeLeft = BETTING_PHASE_DURATION;
  const bettingCountdown = setInterval(() => {
    bettingTimeLeft -= 1000;
    io.emit('betting_countdown', { timeLeft: bettingTimeLeft });
    
    if (bettingTimeLeft <= 0) {
      clearInterval(bettingCountdown);
    }
  }, 1000);

  // End betting phase and start multiplier growth
  bettingTimer = setTimeout(() => {
    state.bettingPhaseActive = false;
    io.emit('betting_closed');
    
    // Start multiplier updates
    multiplierTimer = setInterval(() => {
      if (state.isCrashed) return;
      
      const elapsed = (Date.now() - state.startTime - BETTING_PHASE_DURATION) / 1000;
      state.multiplier = getMultiplier(elapsed);
      
      io.emit('multiplier_update', { multiplier: state.multiplier });
      
      if (state.multiplier >= state.crashPoint) {
        crashRound();
      }
    }, MULTIPLIER_UPDATE_INTERVAL);
    
  }, BETTING_PHASE_DURATION);
}

function crashRound() {
  state.isCrashed = true;
  state.bettingPhaseActive = false;
  
  if (multiplierTimer) clearInterval(multiplierTimer);
  if (bettingTimer) clearTimeout(bettingTimer);
  
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
  // Allow betting only during betting phase
  if (state.isCrashed) {
    throw new Error('Round has crashed');
  }
  
  if (!state.bettingPhaseActive) {
    throw new Error('Betting closed');
  }
  
  // Double check timing
  const timeSinceStart = Date.now() - state.startTime;
  if (timeSinceStart > BETTING_PHASE_DURATION) {
    state.bettingPhaseActive = false;
    throw new Error('Betting closed');
  }
  
  state.bets.push(bet);
  state.priceAtBet[bet.playerId] = priceAtBet;
  
  // Emit bet placed event
  io.emit('bet_placed', {
    playerId: bet.playerId,
    amount: bet.usdAmount,
    currency: bet.currency,
  });
}

export function cashOut(playerId: string) {
  if (state.isCrashed) throw new Error('Round crashed');
  if (state.bettingPhaseActive) throw new Error('Cannot cash out during betting phase');
  
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

// Export current game state for debugging
export function getGameState() {
  return {
    ...state,
    timeSinceStart: Date.now() - state.startTime,
    bettingTimeLeft: Math.max(0, BETTING_PHASE_DURATION - (Date.now() - state.startTime)),
  };
}