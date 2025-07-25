"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWallet = getWallet;
exports.placeBet = placeBet;
exports.cashOut = cashOut;
const Player_1 = __importDefault(require("../models/Player"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const cryptoPriceService_1 = require("./cryptoPriceService");
const crypto_1 = __importDefault(require("crypto"));
function getWallet(playerId) {
    return __awaiter(this, void 0, void 0, function* () {
        const player = yield Player_1.default.findById(playerId);
        if (!player)
            throw new Error('Player not found');
        const balances = {};
        for (const currency in player.wallets) {
            const amount = player.wallets[currency];
            const price = yield (0, cryptoPriceService_1.getCryptoPrice)(currency);
            balances[currency] = { crypto: amount, usd: amount * price };
        }
        return balances;
    });
}
function placeBet(playerId, usdAmount, currency) {
    return __awaiter(this, void 0, void 0, function* () {
        const player = yield Player_1.default.findById(playerId);
        if (!player)
            throw new Error('Player not found');
        const price = yield (0, cryptoPriceService_1.getCryptoPrice)(currency);
        const cryptoAmount = usdAmount / price;
        if ((player.wallets[currency] || 0) < cryptoAmount)
            throw new Error('Insufficient balance');
        player.wallets[currency] = (player.wallets[currency] || 0) - cryptoAmount;
        yield player.save();
        const transactionHash = crypto_1.default.randomBytes(16).toString('hex');
        yield Transaction_1.default.create({
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
    });
}
function cashOut(playerId, cryptoAmount, currency, multiplier, priceAtBet) {
    return __awaiter(this, void 0, void 0, function* () {
        const player = yield Player_1.default.findById(playerId);
        if (!player)
            throw new Error('Player not found');
        const payoutCrypto = cryptoAmount * multiplier;
        player.wallets[currency] = (player.wallets[currency] || 0) + payoutCrypto;
        yield player.save();
        const transactionHash = crypto_1.default.randomBytes(16).toString('hex');
        yield Transaction_1.default.create({
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
    });
}
