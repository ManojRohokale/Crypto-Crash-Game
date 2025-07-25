let socket;
let currentMultiplier = '-';
let roundActive = false;
let betPlaced = false;
let roundStartTime = null;
let roundInterval = 20000; // ms, must match backend
let bettingTimerInterval = null;

function log(msg) {
  const logDiv = document.getElementById('log');
  const entry = document.createElement('div');
  entry.innerHTML = msg;
  entry.className = 'log-entry';
  logDiv.appendChild(entry);
  setTimeout(() => {
    entry.style.background = 'none';
  }, 600);
  setTimeout(() => {
    logDiv.scrollTop = logDiv.scrollHeight;
  }, 30);
}

function fetchBalance(playerId) {
  fetch(`http://localhost:5000/api/wallet/${playerId}`)
    .then(res => res.json())
    .then(data => {
      document.getElementById('balanceSection').style.display = 'flex';
      document.getElementById('btcBalance').textContent = `BTC: ${data.BTC ? data.BTC.crypto.toFixed(4) : '-'}`;
      document.getElementById('ethBalance').textContent = `ETH: ${data.ETH ? data.ETH.crypto.toFixed(4) : '-'}`;
      document.getElementById('usdBalance').textContent = `USD: $${((data.BTC ? data.BTC.usd : 0) + (data.ETH ? data.ETH.usd : 0)).toFixed(2)}`;
    })
    .catch(() => {
      document.getElementById('balanceSection').style.display = 'none';
    });
}

function startBettingTimer(startTime) {
  if (bettingTimerInterval) clearInterval(bettingTimerInterval);
  bettingTimerInterval = setInterval(() => {
    const now = Date.now();
    const elapsed = now - startTime;
    const left = Math.max(0, roundInterval - elapsed);
    document.getElementById('bettingTimer').textContent = left > 0 ? `Betting closes in ${(left/1000).toFixed(1)}s` : 'Betting closed';
    if (left <= 0) clearInterval(bettingTimerInterval);
  }, 100);
}

function connectWS() {
  const playerId = document.getElementById('playerId').value.trim();
  if (!playerId) return alert('Enter playerId');
  socket = io('http://localhost:5000');
  log('<b>Connecting as</b> ' + playerId + '...');
  document.getElementById('controls').style.display = 'block';
  document.getElementById('roundStatus').textContent = 'Waiting for round...';
  document.getElementById('multiplierDisplay').textContent = '-';
  fetchBalance(playerId);
  socket.on('connect', () => log('<b>Connected!</b>'));
  socket.on('round_start', data => {
    log('<b>Round Start:</b> ' + JSON.stringify(data));
    document.getElementById('roundStatus').textContent = 'Betting Open!';
    roundActive = true;
    betPlaced = false;
    document.getElementById('cashoutBtn').disabled = true;
    document.getElementById('multiplierDisplay').textContent = '1.00';
    roundStartTime = data.startTime;
    startBettingTimer(roundStartTime);
  });
  socket.on('multiplier_update', data => {
    log('<b>Multiplier:</b> ' + data.multiplier.toFixed(2));
    document.getElementById('multiplierDisplay').textContent = data.multiplier.toFixed(2);
    currentMultiplier = data.multiplier;
    if (betPlaced) document.getElementById('cashoutBtn').disabled = false;
  });
  socket.on('player_cashout', data => {
    log('<b>Player Cashout:</b> ' + JSON.stringify(data));
    if (data.playerId === document.getElementById('playerId').value.trim()) {
      document.getElementById('cashoutBtn').disabled = true;
      fetchBalance(playerId);
    }
  });
  socket.on('round_crash', data => {
    log('<b>Round Crash:</b> ' + JSON.stringify(data));
    document.getElementById('roundStatus').textContent = 'Round crashed!';
    document.getElementById('cashoutBtn').disabled = true;
    roundActive = false;
    betPlaced = false;
    document.getElementById('multiplierDisplay').textContent = '-';
    if (bettingTimerInterval) clearInterval(bettingTimerInterval);
    fetchBalance(playerId);
  });
  socket.on('cashout_success', data => {
    log('<b>Cashout Success:</b> ' + JSON.stringify(data));
    document.getElementById('cashoutBtn').disabled = true;
    fetchBalance(playerId);
  });
  socket.on('cashout_error', data => {
    log('<b>Cashout Error:</b> ' + data.error);
  });
}

function placeBet(e) {
  e.preventDefault();
  const playerId = document.getElementById('playerId').value.trim();
  const usdAmount = parseFloat(document.getElementById('betAmount').value);
  const currency = document.getElementById('betCurrency').value;
  if (!playerId || !usdAmount || !currency) return alert('Fill all bet fields');
  fetch('http://localhost:5000/api/bet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, usdAmount, currency })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      log('<b>Bet Error:</b> ' + data.error);
    } else {
      log('<b>Bet Placed:</b> ' + JSON.stringify(data));
      betPlaced = true;
      document.getElementById('cashoutBtn').disabled = false;
      fetchBalance(playerId);
    }
  })
  .catch(err => log('<b>Bet Error:</b> ' + err));
}

function sendCashout() {
  const playerId = document.getElementById('playerId').value.trim();
  if (!playerId) return alert('Enter playerId');
  socket.emit('cashout', { playerId });
  log('<b>Sent cashout request for</b> ' + playerId);
  document.getElementById('cashoutBtn').disabled = true;
}

document.getElementById('connectBtn').onclick = connectWS;
document.getElementById('betForm').onsubmit = placeBet;
document.getElementById('cashoutBtn').onclick = sendCashout; 