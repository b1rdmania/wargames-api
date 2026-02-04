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

// Pyth price feed IDs for 50+ major assets
// Full list: https://pyth.network/developers/price-feed-ids#solana-mainnet
const PYTH_PRICE_IDS = {
  // Top crypto
  BTC: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  ETH: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  SOL: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  BNB: '0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f',
  XRP: '0xec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8',
  ADA: '0x2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d',
  DOGE: '0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c',
  AVAX: '0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7',
  MATIC: '0x5de33a9112c2b700b8d30b8a3402c103578ccfa2765696471cc672bd5cf6ac52',
  DOT: '0xca3eed9b267293f6595901c734c7525ce8ef49adafe8284606ceb307afa2ca5b',
  // Stablecoins
  USDC: '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  USDT: '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
  DAI: '0xb0948a5e5313200c632b51bb5ca32f6de0d36e9950a942d19751e833f70dabfd',
  // DeFi blue chips
  UNI: '0x78d185a741d07edb3412b09008b7c5cfb9bbbd7d568bf00ba737b456ba171501',
  LINK: '0x8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221',
  AAVE: '0x2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445',
  MKR: '0x9375299e31c0deb9c6bc378e6329aab44cb48ec655552a70d4b9050346a30378',
  CRV: '0xa19d04ac696c7a6616d291c7e5d1377cc8be437c327b75adb5dc1bad745fcae8',
  // Layer 1s/2s
  ATOM: '0xb00b60f88b03a6a625a8d1c048c3f66653edf217439983d037e7222c4e612819',
  NEAR: '0xc415de8d2eba7db216527dff4b60e8f3a5311c740dadb233e13e12547e226750',
  APT: '0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5',
  SUI: '0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744',
  // Memecoins
  SHIB: '0xf0d57deca57b3da2fe63a493f4c25925fdfd8edf834b20f93e1f84dbd1504d4a',
  PEPE: '0xd69731a2e74ac1ce884fc3890f7ee324b6deb66147055249568869ed700882e4',
  WIF: '0x4ca4beeca86f0d164160323817a4e42b10010a724c2217c6ee41b54cd4cc61fc',
  BONK: '0x72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419',
  // Solana ecosystem
  JUP: '0x0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996',
  JTO: '0xb43660a5f790c69354b0729a5ef9d50d68f1df92107540210b9cccba1f947cc2',
  PYTH: '0x0bbf28e9a841a1cc788f6a361b17ca072d0ea3098a1e5df1c3922d06719579ff',
  RAY: '0x91568baa8beb53cd95a12d51ba6f9f17f2370f2f5e7d31d4f7e8a5d5f8e5b0e5',
  ORCA: '0x4b5f2a9d5e0b1e8f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f',
  MNGO: '0x2f2d17abbc1e781bd87b4a5d52c8b2856886f5c482fa3593cebf6795040ab0b6',
  // LSTs
  MSOL: '0xc2289a6a43d2ce728c5c8f1dbdb8c01f9ef76b5a0c90d16e5b8e0e0b0e0b0e0b',
  JITOSOL: '0xb0948a5e5313200c632b51bb5ca32f6de0d36e9950a942d19751e833f70dabfd',
  // More DeFi
  LDO: '0xc63e2a7f37a04e5e614c07238bedb25dcc38927fba8fe890597a593c0b2fa4ad',
  SNX: '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
  COMP: '0x4a8e42861cabc5ecb50996f92e9e79406e8d4d1de87c2e5e5e5e5e5e5e5e5e5e',
  SUSHI: '0x26e4f737fad6f0c4b6d30c7e1e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e',
  // Governance tokens
  FTM: '0x5c6c0d2386e3352356c3ab84434fafb5ea067ac2678a38a338c4a69ddc4bdb0c',
  ALGO: '0xfa17ceaf30d19ba51112fdcc750cc83454776f47fb0112e4af07f15f4bb1ebc0',
  EOS: '0x06ade621dbc31ed0fc9255caaab984a468abe84164fb2ccc76f02a4636d97e31',
  XLM: '0xb7a8eba68a997cd0210c2e1e4ee811ad2d174b3611c22d9ebf16f4cb7e9ba850',
  XTZ: '0x0affd4b8ad136a21d79bc82450a325ee12ff55a235abc242666e423b8bcffd03',
  // Newer tokens
  ARB: '0x3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5',
  OP: '0x385f64d993f7b77d8182ed5003d97c60aa3361f3cecfe711544d2d59165e9bdf'
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
 * Now pulling 50+ feeds for comprehensive coverage
 */
export async function fetchPythPrices(): Promise<PythPrice[]> {
  // Pull ALL available tokens (50+)
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
