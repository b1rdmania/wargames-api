/**
 * Meteora DLMM Deep Integration
 * Pool yields, volume, fees, liquidity depth
 */

interface MeteoraPool {
  address: string;
  name: string;
  mint_x: string;
  mint_y: string;
  reserve_x: string;
  reserve_y: string;
  reserve_x_amount: number;
  reserve_y_amount: number;
  bin_step: number;
  base_fee_percentage: string;
  max_fee_percentage: string;
  protocol_fee_percentage: string;
  liquidity: string;
  reward_mint_x: string;
  reward_mint_y: string;
  fees_24h: number;
  today_fees: number;
  trade_volume_24h: number;
  cumulative_trade_volume: string;
  cumulative_fee_volume: string;
  current_price: number;
  apr: number;
  apy: number;
  farm_apr: number;
  farm_apy: number;
  hide: boolean;
}

interface MeteoraData {
  pools: MeteoraPool[];
  totalLiquidity: number;
  totalVolume24h: number;
  totalFees24h: number;
  avgAPY: number;
  timestamp: string;
}

// Cache
let cache: { data: MeteoraData; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const API_URL = 'https://dlmm-api.meteora.ag/pair/all';

/**
 * Fetch all Meteora DLMM pools
 */
export async function fetchMeteoraData(): Promise<MeteoraData> {
  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Meteora API error: ${response.status}`);
    }

    const pools = await response.json() as MeteoraPool[];

    // Filter out hidden pools
    const activePools = pools.filter(p => !p.hide);

    // Calculate aggregates
    let totalLiquidity = 0;
    let totalVolume24h = 0;
    let totalFees24h = 0;
    let totalAPY = 0;

    for (const pool of activePools) {
      totalLiquidity += parseFloat(pool.liquidity) || 0;
      totalVolume24h += pool.trade_volume_24h || 0;
      totalFees24h += pool.fees_24h || 0;
      totalAPY += pool.apy || 0;
    }

    const avgAPY = activePools.length > 0 ? totalAPY / activePools.length : 0;

    const data: MeteoraData = {
      pools: activePools.sort((a, b) => parseFloat(b.liquidity) - parseFloat(a.liquidity)),
      totalLiquidity,
      totalVolume24h,
      totalFees24h,
      avgAPY: Math.round(avgAPY * 100) / 100,
      timestamp: new Date().toISOString()
    };

    // Update cache
    cache = { data, timestamp: Date.now() };

    return data;
  } catch (error) {
    console.error('Meteora fetch error:', error);

    // Return cached data if available
    if (cache) {
      return cache.data;
    }

    throw error;
  }
}

/**
 * Get top pools by liquidity
 */
export async function getTopMeteorapools(limit: number = 10): Promise<MeteoraPool[]> {
  const data = await fetchMeteoraData();
  return data.pools.slice(0, limit);
}

/**
 * Get pools by token pair
 */
export async function getMeteoraPoolByPair(tokenA: string, tokenB: string): Promise<MeteoraPool[]> {
  const data = await fetchMeteoraData();
  return data.pools.filter(p =>
    (p.mint_x === tokenA && p.mint_y === tokenB) ||
    (p.mint_x === tokenB && p.mint_y === tokenA)
  );
}

/**
 * Get high APY pools (yield opportunities)
 */
export async function getHighYieldMeteorapools(minAPY: number = 20): Promise<MeteoraPool[]> {
  const data = await fetchMeteoraData();
  return data.pools
    .filter(p => p.apy >= minAPY)
    .sort((a, b) => b.apy - a.apy)
    .slice(0, 20);
}
