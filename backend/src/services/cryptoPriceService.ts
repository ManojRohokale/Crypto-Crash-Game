import axios from 'axios';

const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';
const SUPPORTED_CURRENCIES = ['bitcoin', 'ethereum'];
const SYMBOL_TO_ID: Record<string, string> = { BTC: 'bitcoin', ETH: 'ethereum' };

let priceCache: Record<string, { price: number; timestamp: number }> = {};
const CACHE_DURATION = 10 * 1000; // 10 seconds

export async function getCryptoPrice(symbol: 'BTC' | 'ETH'): Promise<number> {
  console.log('Fetching price for symbol:', symbol); // Debug log
  const id = SYMBOL_TO_ID[symbol];
  if (!id) throw new Error(`Unsupported currency symbol: ${symbol}`);
  const now = Date.now();
  if (priceCache[symbol] && now - priceCache[symbol].timestamp < CACHE_DURATION) {
    console.log(`Using cached price for ${symbol}:`, priceCache[symbol].price);
    return priceCache[symbol].price;
  }
  const url = `${COINGECKO_API}?ids=${id}&vs_currencies=usd`;
  const response = await axios.get(url);
  if (!response.data[id] || typeof response.data[id].usd !== 'number') {
    console.error('CoinGecko response error:', response.data);
    throw new Error(`Price for ${symbol} not found in CoinGecko response`);
  }
  const price = response.data[id].usd;
  console.log(`Fetched price for ${symbol}:`, price); // Log the fetched price
  priceCache[symbol] = { price, timestamp: now };
  return price;
} 