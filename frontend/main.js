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
let bettingPhaseActive = false;
let bettingDuration = 8000; // Default betting duration

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

function startBettingTimer(startTime, duration) {
  if (bettingTimerInterval) clearInterval(bettingTimerInterval);
  
  bettingTimerInterval = setInterval(() => {
    const now = Date.now();
    const elapsed = now - startTime;
    const left = Math.max(0, duration - elapsed);
    
    if (left > 0) {
      document.getElementById('bettingTimer').textContent = `Betting closes in ${(left/1000).toFixed(1)}s`;
      document.getElementById('roundStatus').textContent = 'Betting Open!';
    } else {
      document.getElementById('bettingTimer').textContent = 'Betting closed';
      document.getElementById('roundStatus').textContent = 'Multiplier Growing...';
      clearInterval(bettingTimerInterval);
    }
  }, 100);
}

function updateBetButtonState() {
  const betButton = document.querySelector('#betForm button[type="submit"]');
  if (betButton) {
    betButton.disabled = !bettingPhaseActive || betPlaced;
    betButton.textContent = bettingPhaseActive ? (betPlaced ? 'Bet Placed' : 'Place Bet') : 'Betting Closed';
  }
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
    roundActive = true;
    betPlaced = false;
    bettingPhaseActive = data.bettingPhase || true;
    bettingDuration = data.bettingDuration || 8000;
    
    document.getElementById('roundStatus').textContent = 'Betting Open!';
    document.getElementById('cashoutBtn').disabled = true;
    document.getElementById('multiplierDisplay').textContent = '1.00';
    
    roundStartTime = data.startTime;
    startBettingTimer(roundStartTime, bettingDuration);
    updateBetButtonState();
  });
  
  // New event: Betting countdown
  socket.on('betting_countdown', data => {
    const timeLeft = Math.max(0, data.timeLeft / 1000);
    document.getElementById('bettingTimer').textContent = `Betting closes in ${timeLeft.toFixed(1)}s`;
  });
  
  // New event: Betting closed
  socket.on('betting_closed', () => {
    log('<b>Betting Phase Ended</b> - Multiplier starting...');
    bettingPhaseActive = false;
    document.getElementById('roundStatus').textContent = 'Multiplier Growing...';
    document.getElementById('bettingTimer').textContent = 'Betting closed';
    updateBetButtonState();
  });
  
  // New event: Bet placed confirmation
  socket.on('bet_placed', data => {
    if (data.playerId === document.getElementById('playerId').value.trim()) {
      log(`<b>Bet Confirmed:</b> $${data.amount} in ${data.currency}`);
    } else {
      log(`<b>Player Bet:</b> ${data.playerId} placed $${data.amount} in ${data.currency}`);
    }
  });
  
  socket.on('multiplier_update', data => {
    const multiplier = data.multiplier.toFixed(2);
    document.getElementById('multiplierDisplay').textContent = multiplier + 'x';
    currentMultiplier = data.multiplier;
    
    // Only enable cashout if we have a bet and multiplier is growing
    if (betPlaced && !bettingPhaseActive) {
      document.getElementById('cashoutBtn').disabled = false;
    }
    
    // Log less frequently to avoid spam
    if (data.multiplier % 0.1 < 0.01) { // Log every 0.1x increase
      log(`<b>Multiplier:</b> ${multiplier}x`);
    }
  });
  
  socket.on('player_cashout', data => {
    log('<b>Player Cashout:</b> ' + JSON.stringify(data));
    if (data.playerId === document.getElementById('playerId').value.trim()) {
      document.getElementById('cashoutBtn').disabled = true;
      betPlaced = false;
      updateBetButtonState();
      
      // Show personal cashout details
      if (data.cashoutAmount && data.cashoutMultiplier) {
        log(`<b>Your Cashout:</b> Won ${data.cashoutAmount.toFixed(4)} at ${data.cashoutMultiplier.toFixed(2)}x`);
      }
      
      // Update balance with a slight delay to ensure backend processing
      setTimeout(() => fetchBalance(document.getElementById('playerId').value.trim()), 200);
    }
  });
  
  socket.on('round_crash', data => {
    log('<b>Round Crash:</b> Crashed at ' + data.crashPoint + 'x');
    document.getElementById('roundStatus').textContent = `Round crashed at ${data.crashPoint}x!`;
    document.getElementById('cashoutBtn').disabled = true;
    roundActive = false;
    betPlaced = false;
    bettingPhaseActive = false;
    document.getElementById('multiplierDisplay').textContent = data.crashPoint + 'x (CRASHED)';
    
    if (bettingTimerInterval) clearInterval(bettingTimerInterval);
    document.getElementById('bettingTimer').textContent = 'Round ended';
    updateBetButtonState();
    
    // Update balance after crash to reflect any losses
    setTimeout(() => fetchBalance(document.getElementById('playerId').value.trim()), 500);
    
    // Show next round countdown
    setTimeout(() => {
      document.getElementById('roundStatus').textContent = 'Next round starting soon...';
      document.getElementById('multiplierDisplay').textContent = '-';
    }, 2000);
  });
  
  socket.on('cashout_success', data => {
    log('<b>Cashout Success:</b> ' + JSON.stringify(data));
    document.getElementById('cashoutBtn').disabled = true;
    betPlaced = false;
    updateBetButtonState();
    
    // Show cashout details in log
    if (data.payoutCrypto && data.currency) {
      log(`<b>Winnings:</b> ${data.payoutCrypto.toFixed(4)} ${data.currency}`);
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
  
  if (!bettingPhaseActive) {
    log('<b>Bet Error:</b> Betting is closed');
    return;
  }
  
  if (betPlaced) {
    log('<b>Bet Error:</b> You already have an active bet');
    return;
  }
  
  const playerId = document.getElementById('playerId').value.trim();
  const usdAmount = parseFloat(document.getElementById('betAmount').value);
  const currency = document.getElementById('betCurrency').value;
  
  if (!playerId || !usdAmount || !currency) {
    return alert('Fill all bet fields');
  }
  
  if (usdAmount <= 0) {
    return alert('Bet amount must be greater than 0');
  }
  
  // Disable bet button immediately to prevent double betting
  updateBetButtonState();
  
  fetch(`${API_BASE_URL}/api/bet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, usdAmount, currency })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      log('<b>Bet Error:</b> ' + data.error);
      // Re-enable bet button on error
      updateBetButtonState();
    } else {
      log('<b>Bet Placed:</b> $' + usdAmount + ' in ' + currency);
      betPlaced = true;
      updateBetButtonState();
      fetchBalance(playerId);
    }
  })
  .catch(err => {
    log('<b>Bet Error:</b> ' + err.message);
    // Re-enable bet button on error
    updateBetButtonState();
  });
}

function sendCashout() {
  const playerId = document.getElementById('playerId').value.trim();
  if (!playerId) return alert('Enter playerId');
  
  if (!betPlaced) {
    log('<b>Cashout Error:</b> No active bet to cash out');
    return;
  }
  
  if (bettingPhaseActive) {
    log('<b>Cashout Error:</b> Cannot cash out during betting phase');
    return;
  }
  
  fetch(`${API_BASE_URL}/api/cashout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      log('<b>Cashout Error:</b> ' + data.error);
    } else {
      log('<b>Cashout Success:</b> Cashed out at ' + currentMultiplier.toFixed(2) + 'x');
      betPlaced = false;
      document.getElementById('cashoutBtn').disabled = true;
      updateBetButtonState();
      fetchBalance(playerId);
    }
  })
  .catch(err => log('<b>Cashout Error:</b> ' + err.message));
}

// Event listeners
document.getElementById('connectBtn').onclick = connectWS;
document.getElementById('betForm').onsubmit = placeBet;
document.getElementById('cashoutBtn').onclick = sendCashout;