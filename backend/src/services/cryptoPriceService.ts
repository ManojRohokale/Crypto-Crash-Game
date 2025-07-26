import axios from 'axios';

const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';
const SUPPORTED_CURRENCIES = ['bitcoin', 'ethereum'];
const SYMBOL_TO_ID: Record<string, string> = { BTC: 'bitcoin', ETH: 'ethereum' };

let priceCache: Record<string, { price: number; timestamp: number }> = {};
const CACHE_DURATION = 10 * 1000; // 10 seconds

// Fallback prices for testing (approximately current market prices)
const FALLBACK_PRICES: Record<string, number> = {
  BTC: 65000,
  ETH: 3000
};

export async function getCryptoPrice(symbol: 'BTC' | 'ETH'): Promise<number> {
  console.log('Fetching price for symbol:', symbol);
  
  const id = SYMBOL_TO_ID[symbol];
  if (!id) throw new Error(`Unsupported currency symbol: ${symbol}`);
  
  const now = Date.now();
  
  // Return cached price if available
  if (priceCache[symbol] && now - priceCache[symbol].timestamp < CACHE_DURATION) {
    console.log(`Using cached price for ${symbol}:`, priceCache[symbol].price);
    return priceCache[symbol].price;
  }
  
  try {
    const url = `${COINGECKO_API}?ids=${id}&vs_currencies=usd`;
    console.log('Making request to:', url);
    
    const response = await axios.get(url, {
      timeout: 5000, // 5 second timeout
      headers: {
        'User-Agent': 'crypto-crash-game/1.0'
      }
    });
    
    if (!response.data[id] || typeof response.data[id].usd !== 'number') {
      console.error('CoinGecko response error:', response.data);
      throw new Error('Invalid CoinGecko response');
    }
    
    const price = response.data[id].usd;
    console.log(`Fetched price for ${symbol}:`, price);
    
    priceCache[symbol] = { price, timestamp: now };
    return price;
    
  } catch (error) {
    console.error(`CoinGecko API error for ${symbol}:`, error);
    console.log(`Using fallback price for ${symbol}:`, FALLBACK_PRICES[symbol]);
    
    // Use fallback price if API fails
    const fallbackPrice = FALLBACK_PRICES[symbol];
    priceCache[symbol] = { price: fallbackPrice, timestamp: now };
    return fallbackPrice;
  }
}