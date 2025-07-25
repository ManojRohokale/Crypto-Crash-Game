# Crypto Crash Backend

## Setup Instructions

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Configure environment variables in `.env`:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/crypto_crash
   ```
3. Build and run the server:
   ```bash
   npm run build
   npm start
   # or for development
   npm run dev
   ```
4. Populate sample data:
   ```bash
   npm run build
   node sample_data.js
   ```

## API Endpoints

- `POST /api/player` — Create a player
  - Body: `{ "username": string, "wallets": { BTC: number, ETH: number } }`
- `GET /api/wallet/:playerId` — Get wallet balances
- `POST /api/bet` — Place a bet
  - Body: `{ "playerId": string, "usdAmount": number, "currency": "BTC"|"ETH" }`
- `POST /api/cashout` — Cash out winnings
  - Body: `{ "playerId": string }`
- `GET /api/rounds` — Get recent round history

## WebSocket Events

- `round_start` — { roundNumber, hash, startTime }
- `multiplier_update` — { multiplier }
- `player_cashout` — { playerId, cashoutMultiplier, cashoutAmount }
- `round_crash` — { roundNumber, crashPoint, bets }
- Client emits `cashout` — { playerId }

## Provably Fair Algorithm
- Crash point is generated as:
  - `hash = sha256(seed + roundNumber)`
  - `crash = max(1.01, (int(hash[0:16], 16) % 9900) / 100 + 1.01)`
- The server provides the hash at round start for verification.

## USD-to-Crypto Conversion
- Uses CoinGecko API for real-time BTC/ETH prices.
- Bets in USD are converted to crypto at the price at bet time.
- Cashouts use the multiplier and the original bet price for payout.

## Sample Data
- Run `node sample_data.js` after build to insert 3-5 players and 3 rounds.

## Postman Collection
- See `postman_collection.json` (to be provided).

## WebSocket Client
- See `../frontend/index.html` for a simple test client. 