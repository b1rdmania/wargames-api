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
// Full list: https://pyth.network/developers/price-feed-ids#solana-mainnet
const PYTH_PRICE_IDS = {
  BTC: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  ETH: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  SOL: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  // Stablecoins
  USDC: '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  USDT: '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
  // Major altcoins
  BNB: '0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f',
  XRP: '0xec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8',
  ADA: '0x2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d',
  DOGE: '0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c',
  AVAX: '0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7',
  // DeFi tokens
  UNI: '0x78d185a741d07edb3412b09008b7c5cfb9bbbd7d568bf00ba737b456ba171501',
  LINK: '0x8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221',
  AAVE: '0x2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445',
  // Memecoins
  SHIB: '0xf0d57deca57b3da2fe63a493f4c25925fdfd8edf834b20f93e1f84dbd1504d4a',
  PEPE: '0xd69731a2e74ac1ce884fc3890f7ee324b6deb66147055249568869ed700882e4',
  WIF: '0x4ca4beeca86f0d164160323817a4e42b10010a724c2217c6ee41b54cd4cc61fc',
  BONK: '0x72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419',
  // Solana ecosystem
  JUP: '0x0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996',
  JTO: '0xb43660a5f790c69354b0729a5ef9d50d68f1df92107540210b9cccba1f947cc2',
  PYTH: '0x0bbf28e9a841a1cc788f6a361b17ca072d0ea3098a1e5df1c3922d06719579ff',
  RAY: '0x91568baa8beb53cd95a12d51ba6f9f17f2370f2f5e7d31d4f7e8a5d5f8e5b0e5'
};

const SYMBOL_MAP: Record<string, string> = {
  [PYTH_PRICE_IDS.BTC]: 'BTC/USD',
  [PYTH_PRICE_IDS.ETH]: 'ETH/USD',
  [PYTH_PRICE_IDS.SOL]: 'SOL/USD',
  [PYTH_PRICE_IDS.USDC]: 'USDC/USD',
  [PYTH_PRICE_IDS.USDT]: 'USDT/USD',
  [PYTH_PRICE_IDS.BNB]: 'BNB/USD',
  [PYTH_PRICE_IDS.XRP]: 'XRP/USD',
  [PYTH_PRICE_IDS.ADA]: 'ADA/USD',
  [PYTH_PRICE_IDS.DOGE]: 'DOGE/USD',
  [PYTH_PRICE_IDS.AVAX]: 'AVAX/USD',
  [PYTH_PRICE_IDS.UNI]: 'UNI/USD',
  [PYTH_PRICE_IDS.LINK]: 'LINK/USD',
  [PYTH_PRICE_IDS.AAVE]: 'AAVE/USD',
  [PYTH_PRICE_IDS.SHIB]: 'SHIB/USD',
  [PYTH_PRICE_IDS.PEPE]: 'PEPE/USD',
  [PYTH_PRICE_IDS.WIF]: 'WIF/USD',
  [PYTH_PRICE_IDS.BONK]: 'BONK/USD',
  [PYTH_PRICE_IDS.JUP]: 'JUP/USD',
  [PYTH_PRICE_IDS.JTO]: 'JTO/USD',
  [PYTH_PRICE_IDS.PYTH]: 'PYTH/USD',
  [PYTH_PRICE_IDS.RAY]: 'RAY/USD'
};

/**
 * Fetch latest prices from Pyth Network
 */
export async function fetchPythPrices(): Promise<PythPrice[]> {
  // Use top 10 most important tokens to avoid API limits and invalid IDs
  const topTokens = [
    PYTH_PRICE_IDS.BTC,
    PYTH_PRICE_IDS.ETH,
    PYTH_PRICE_IDS.SOL,
    PYTH_PRICE_IDS.BONK,
    PYTH_PRICE_IDS.JUP,
    PYTH_PRICE_IDS.USDC,
    PYTH_PRICE_IDS.USDT,
    PYTH_PRICE_IDS.AVAX,
    PYTH_PRICE_IDS.LINK,
    PYTH_PRICE_IDS.UNI
  ];
  const priceIds = topTokens;

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

    // Map ID to symbol (check both with and without 0x prefix)
    const symbol = SYMBOL_MAP[feed.id] || SYMBOL_MAP[`0x${feed.id}`] || feed.id;

    return {
      symbol,
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
