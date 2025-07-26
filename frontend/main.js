// Configuration for different environments
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://crypto-crash-game-maoz.onrender.com'; // Updated with your actual Render URL

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
  fetch(`${API_BASE_URL}/api/wallet/${playerId}`)
    .then(res => res.json())
    .then(data => {
      const balanceSection = document.getElementById('balanceSection');
      balanceSection.classList.remove('d-none');
      
      // Update BTC balance with animation
      const btcElement = document.getElementById('btcBalance');
      const ethElement = document.getElementById('ethBalance');
      const usdElement = document.getElementById('usdBalance');
      
      const btcValue = data.BTC ? data.BTC.crypto.toFixed(4) : '-';
      const ethValue = data.ETH ? data.ETH.crypto.toFixed(4) : '-';
      const totalUsd = ((data.BTC ? data.BTC.usd : 0) + (data.ETH ? data.ETH.usd : 0)).toFixed(2);
      
      // Add highlight animation if balance changed
      if (btcElement.textContent !== `BTC: ${btcValue}`) {
        btcElement.style.color = '#28a745';
        btcElement.style.fontWeight = 'bold';
        setTimeout(() => {
          btcElement.style.color = '';
          btcElement.style.fontWeight = '';
        }, 2000);
      }
      
      if (ethElement.textContent !== `ETH: ${ethValue}`) {
        ethElement.style.color = '#28a745';
        ethElement.style.fontWeight = 'bold';
        setTimeout(() => {
          ethElement.style.color = '';
          ethElement.style.fontWeight = '';
        }, 2000);
      }
      
      btcElement.textContent = `BTC: ${btcValue}`;
      ethElement.textContent = `ETH: ${ethValue}`;
      usdElement.textContent = `USD: ${totalUsd}`;
      
      // Add pulse animation to USD total
      usdElement.style.transform = 'scale(1.1)';
      usdElement.style.transition = 'transform 0.3s ease';
      setTimeout(() => {
        usdElement.style.transform = 'scale(1)';
      }, 300);
    })
    .catch(() => {
      document.getElementById('balanceSection').classList.add('d-none');
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
  socket = io(API_BASE_URL);
  log('<b>Connecting as</b> ' + playerId + '...');
  document.getElementById('controls').classList.remove('d-none');
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
      betPlaced = false;
      
      // Show personal cashout details
      if (data.winnings && data.currency) {
        log(`<b>Your Cashout:</b> Won ${data.winnings.toFixed(4)} ${data.currency} at ${data.multiplier}x`);
      }
      
      // Update balance with a slight delay to ensure backend processing
      setTimeout(() => fetchBalance(document.getElementById('playerId').value.trim()), 200);
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
    
    // Update balance after crash to reflect any losses
    setTimeout(() => fetchBalance(document.getElementById('playerId').value.trim()), 500);
  });
  
  socket.on('cashout_success', data => {
    log('<b>Cashout Success:</b> ' + JSON.stringify(data));
    document.getElementById('cashoutBtn').disabled = true;
    betPlaced = false;
    
    // Show cashout details in log
    if (data.winnings && data.currency) {
      log(`<b>Winnings:</b> ${data.winnings.toFixed(4)} ${data.currency} (${data.multiplier}x multiplier)`);
    }
    
    // Update balance immediately
    setTimeout(() => fetchBalance(playerId), 100);
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
  
  fetch(`${API_BASE_URL}/api/bet`, {
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

// Event listeners
document.getElementById('connectBtn').onclick = connectWS;
document.getElementById('betForm').onsubmit = placeBet;
document.getElementById('cashoutBtn').onclick = sendCashout;