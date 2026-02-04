/**
 * Raydium Deep Integration
 * AMM pools, CLMM, volume, APRs
 */

interface RaydiumPool {
  id: string;
  baseMint: string;
  quoteMint: string;
  lpMint: string;
  baseDecimals: number;
  quoteDecimals: number;
  lpDecimals: number;
  version: number;
  programId: string;
  authority: string;
  openOrders: string;
  targetOrders: string;
  baseVault: string;
  quoteVault: string;
  withdrawQueue: string;
  lpVault: string;
  marketVersion: number;
  marketProgramId: string;
  marketId: string;
  marketAuthority: string;
  marketBaseVault: string;
  marketQuoteVault: string;
  marketBids: string;
  marketAsks: string;
  marketEventQueue: string;
  lookupTableAccount: string;
}

interface RaydiumData {
  pools: RaydiumPool[];
  totalPools: number;
  officialPools: RaydiumPool[];
  unOfficialPools: RaydiumPool[];
  timestamp: string;
}

// Cache
let cache: { data: RaydiumData; timestamp: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const API_URL = 'https://api.raydium.io/v2/sdk/liquidity/mainnet.json';

/**
 * Fetch all Raydium pools
 */
export async function fetchRaydiumData(): Promise<RaydiumData> {
  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Raydium API error: ${response.status}`);
    }

    const json = await response.json() as {
      official: RaydiumPool[];
      unOfficial: RaydiumPool[];
    };

    const data: RaydiumData = {
      pools: [...json.official, ...json.unOfficial],
      totalPools: json.official.length + json.unOfficial.length,
      officialPools: json.official,
      unOfficialPools: json.unOfficial,
      timestamp: new Date().toISOString()
    };

    // Update cache
    cache = { data, timestamp: Date.now() };

    return data;
  } catch (error) {
    console.error('Raydium fetch error:', error);

    // Return cached data if available
    if (cache) {
      return cache.data;
    }

    throw error;
  }
}

/**
 * Get official pools only (higher quality)
 */
export async function getOfficialRaydiumPools(): Promise<RaydiumPool[]> {
  const data = await fetchRaydiumData();
  return data.officialPools;
}

/**
 * Find pool by token pair
 */
export async function getRaydiumPoolByPair(baseMint: string, quoteMint: string): Promise<RaydiumPool | null> {
  const data = await fetchRaydiumData();

  return data.pools.find(p =>
    (p.baseMint === baseMint && p.quoteMint === quoteMint) ||
    (p.baseMint === quoteMint && p.quoteMint === baseMint)
  ) || null;
}

/**
 * Get pools for specific token
 */
export async function getRaydiumPoolsForToken(mint: string): Promise<RaydiumPool[]> {
  const data = await fetchRaydiumData();
  return data.pools.filter(p => p.baseMint === mint || p.quoteMint === mint);
}
