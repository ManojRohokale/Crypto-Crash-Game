"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startGameEngine = startGameEngine;
exports.placeBet = placeBet;
exports.cashOut = cashOut;
const Round_1 = __importDefault(require("../models/Round"));
const crypto_1 = __importDefault(require("crypto"));
const server_1 = require("../server");
const GROWTH_FACTOR = 0.00006; // Exponential growth factor for multiplier
const ROUND_INTERVAL = 10000; // 10 seconds between rounds
const MULTIPLIER_UPDATE_INTERVAL = 100; // 100ms
let state = {
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
    return crypto_1.default.randomBytes(16).toString('hex');
}
function getCrashPoint(seed, roundNumber) {
    // Provably fair: hash(seed + roundNumber), map to crash multiplier
    const hash = crypto_1.default.createHash('sha256').update(seed + roundNumber).digest('hex');
    const hex = hash.slice(0, 16);
    const intVal = parseInt(hex, 16);
    // Map to [1.01, 100] (never below 1.01)
    const crash = Math.max(1.01, (intVal % 9900) / 100 + 1.01);
    return parseFloat(crash.toFixed(2));
}
function getMultiplier(timeElapsed) {
    // Exponential growth: multiplier = 1 + (time_elapsed * growth_factor)
    return 1 + timeElapsed * GROWTH_FACTOR;
}
let roundTimer = null;
let multiplierTimer = null;
function startGameEngine() {
    startNewRound();
}
function startNewRound() {
    state.isCrashed = false;
    state.multiplier = 1;
    state.startTime = Date.now();
    state.bets = [];
    state.priceSeed = generateSeed();
    state.priceHash = crypto_1.default.createHash('sha256').update(state.priceSeed + state.roundNumber).digest('hex');
    state.crashPoint = getCrashPoint(state.priceSeed, state.roundNumber);
    state.priceAtBet = {};
    server_1.io.emit('round_start', {
        roundNumber: state.roundNumber,
        hash: state.priceHash,
        crashPoint: null,
        startTime: state.startTime,
    });
    multiplierTimer = setInterval(() => {
        if (state.isCrashed)
            return;
        const elapsed = (Date.now() - state.startTime) / 1000;
        state.multiplier = getMultiplier(elapsed);
        server_1.io.emit('multiplier_update', { multiplier: state.multiplier });
        if (state.multiplier >= state.crashPoint) {
            crashRound();
        }
    }, MULTIPLIER_UPDATE_INTERVAL);
}
function crashRound() {
    state.isCrashed = true;
    if (multiplierTimer)
        clearInterval(multiplierTimer);
    server_1.io.emit('round_crash', {
        roundNumber: state.roundNumber,
        crashPoint: state.crashPoint,
        bets: state.bets,
    });
    // Save round to DB
    const round = new Round_1.default({
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
function placeBet(bet, priceAtBet) {
    if (state.isCrashed || state.multiplier > 1.01)
        throw new Error('Betting closed');
    state.bets.push(bet);
    state.priceAtBet[bet.playerId] = priceAtBet;
}
function cashOut(playerId) {
    if (state.isCrashed)
        throw new Error('Round crashed');
    const bet = state.bets.find(b => b.playerId === playerId && !b.cashedOut);
    if (!bet)
        throw new Error('No active bet');
    bet.cashedOut = true;
    bet.cashoutMultiplier = state.multiplier;
    bet.cashoutAmount = bet.cryptoAmount * state.multiplier;
    server_1.io.emit('player_cashout', {
        playerId,
        cashoutMultiplier: bet.cashoutMultiplier,
        cashoutAmount: bet.cashoutAmount,
    });
    return Object.assign(Object.assign({}, bet), { priceAtBet: state.priceAtBet[playerId] });
}
