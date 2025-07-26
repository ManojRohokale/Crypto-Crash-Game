// Temporary version with fixed prices - no external API calls
const FIXED_PRICES: Record<string, number> = {
  BTC: 65000,
  ETH: 3000
};

export async function getCryptoPrice(symbol: 'BTC' | 'ETH'): Promise<number> {
  console.log(`Using fixed price for ${symbol}:`, FIXED_PRICES[symbol]);
  return FIXED_PRICES[symbol];
}