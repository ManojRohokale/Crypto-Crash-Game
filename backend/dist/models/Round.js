"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const BetSchema = new mongoose_1.Schema({
    playerId: { type: String, required: true },
    usdAmount: { type: Number, required: true },
    cryptoAmount: { type: Number, required: true },
    currency: { type: String, required: true },
    cashedOut: { type: Boolean, default: false },
    cashoutMultiplier: { type: Number },
    cashoutAmount: { type: Number },
});
const RoundSchema = new mongoose_1.Schema({
    roundNumber: { type: Number, required: true, unique: true },
    crashPoint: { type: Number, required: true },
    seed: { type: String, required: true },
    hash: { type: String, required: true },
    bets: { type: [BetSchema], default: [] },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
});
exports.default = mongoose_1.default.model('Round', RoundSchema);
