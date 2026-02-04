/**
 * Pyth Network Integration - Solana-native price oracles
 * API: https://hermes.pyth.network/docs/
 */

interface PythPriceFeed {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
  ema_price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
}

interface PythPrice {
  symbol: string;
  id: string;
  price: number;
  confidence: number;
  publish_time: number;
  source: string;
}

// Pyth price feed IDs for major assets
const PYTH_PRICE_IDS = {
  BTC: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  ETH: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  SOL: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d'
};

const SYMBOL_MAP: Record<string, string> = {
  [PYTH_PRICE_IDS.BTC]: 'BTC/USD',
  [PYTH_PRICE_IDS.ETH]: 'ETH/USD',
  [PYTH_PRICE_IDS.SOL]: 'SOL/USD'
};

/**
 * Fetch latest prices from Pyth Network
 */
export async function fetchPythPrices(): Promise<PythPrice[]> {
  const priceIds = Object.values(PYTH_PRICE_IDS);

  const url = `https://hermes.pyth.network/api/latest_price_feeds?ids[]=${priceIds.join('&ids[]=')}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Pyth API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as PythPriceFeed[];

  return data.map(feed => {
    const price = parseFloat(feed.price.price) * Math.pow(10, feed.price.expo);
    const confidence = parseFloat(feed.price.conf) * Math.pow(10, feed.price.expo);

    return {
      symbol: SYMBOL_MAP[feed.id] || feed.id,
      id: feed.id,
      price: Math.round(price * 100) / 100, // Round to 2 decimals
      confidence: Math.round(confidence * 100) / 100,
      publish_time: feed.price.publish_time,
      source: 'on-chain'
    };
  });
}

/**
 * Get a single price by symbol
 */
export async function getPythPrice(symbol: 'BTC' | 'ETH' | 'SOL'): Promise<PythPrice | null> {
  const prices = await fetchPythPrices();
  return prices.find(p => p.symbol === `${symbol}/USD`) || null;
}
