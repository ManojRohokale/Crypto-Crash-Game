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
exports.getCryptoPrice = getCryptoPrice;
const axios_1 = __importDefault(require("axios"));
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';
const SUPPORTED_CURRENCIES = ['bitcoin', 'ethereum'];
const SYMBOL_TO_ID = { BTC: 'bitcoin', ETH: 'ethereum' };
let priceCache = {};
const CACHE_DURATION = 10 * 1000; // 10 seconds
function getCryptoPrice(symbol) {
    return __awaiter(this, void 0, void 0, function* () {
        const id = SYMBOL_TO_ID[symbol];
        const now = Date.now();
        if (priceCache[symbol] && now - priceCache[symbol].timestamp < CACHE_DURATION) {
            return priceCache[symbol].price;
        }
        const url = `${COINGECKO_API}?ids=${id}&vs_currencies=usd`;
        const response = yield axios_1.default.get(url);
        const price = response.data[id].usd;
        priceCache[symbol] = { price, timestamp: now };
        return price;
    });
}
