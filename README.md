# Crypto Crash Game

A real-time multiplayer betting game where players bet on how long a multiplier will rise before it crashes. Bet with BTC or ETH (simulated), cash out before the crash, and try to win big!

---

## Features
- Real-time crash game with provably fair algorithm
- Bet in USD, auto-converted to BTC/ETH at live prices
- Cash out before the crash to win
- WebSocket-powered live updates (multiplier, round status, cashouts)
- Modern, responsive frontend UI
- REST API for player, wallet, bet, and round management
- MongoDB for persistent storage

---

## Tech Stack
- **Frontend:** HTML, CSS, JavaScript (Vanilla), Socket.IO
- **Backend:** Node.js, Express, TypeScript, Socket.IO
- **Database:** MongoDB (Mongoose)

---

## Setup Instructions

### 1. Clone the Repo
```bash
git clone https://github.com/ManojRohokale/Crypto-Crash-Game.git
cd Crypto-Crash-Game
```

### 2. Backend Setup
```bash
cd backend
npm install
```
- Create a `.env` file:
  ```env
  PORT=5000
  MONGODB_URI=mongodb://localhost:27017/crypto_crash
  ```
- Start MongoDB (locally or use MongoDB Atlas)
- (Optional) Seed sample data:
  ```bash
  npm run build
  node sample_data.js
  ```
- Start the backend:
  ```bash
  npm run dev
  ```

### 3. Frontend Setup
- No build step needed. Just open `frontend/index.html` in your browser, or serve with a static server:
  ```bash
  npx serve frontend
  # or
  npx http-server frontend
  ```

---

## Deployment
- **Frontend:** Deploy the `frontend` folder to Netlify, Vercel, or any static host.
- **Backend:** Deploy the `backend` folder to Render, Railway, Heroku, or any Node.js host. Set environment variables as needed.
- **MongoDB:** Use MongoDB Atlas for cloud database.
- **Update API URLs:** In `frontend/main.js`, set the backend URL to your deployed backend.

---

## Usage Guide
1. **Connect:** Enter your Player ID and connect.
2. **Bet:** Place a bet in USD (choose BTC or ETH) during "Betting Open!" phase.
3. **Watch:** See the multiplier rise in real time.
4. **Cash Out:** Click "Cashout" before the round crashes to win.
5. **Repeat:** Play more rounds and try your luck!

---

## License
MIT 