/**
 * Generic Protocol Integration
 * Fetches data for any Solana protocol from DefiLlama
 */

interface ProtocolData {
  name: string;
  slug: string;
  tvl: number;
  category: string;
  chains: string[];
  change_1d: number;
  change_7d: number;
  change_1m: number;
  mcap?: number;
  timestamp: string;
}

const cache: Map<string, { data: ProtocolData; timestamp: number }> = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function fetchProtocol(slug: string): Promise<ProtocolData> {
  // Check cache
  const cached = cache.get(slug);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await fetch(`https://api.llama.fi/protocol/${slug}`);

    if (!response.ok) {
      throw new Error(`DefiLlama API error for ${slug}: ${response.status}`);
    }

    const raw = await response.json() as any;

    // Get current TVL
    let currentTVL = 0;
    if (raw.currentChainTvls?.Solana) {
      currentTVL = raw.currentChainTvls.Solana;
    } else if (raw.tvl && Array.isArray(raw.tvl)) {
      const latest = raw.tvl[raw.tvl.length - 1];
      currentTVL = latest?.totalLiquidityUSD || 0;
    } else if (typeof raw.tvl === 'number') {
      currentTVL = raw.tvl;
    }

    // Calculate changes
    const change_1d = raw.change_1d || 0;
    const change_7d = raw.change_7d || 0;
    const change_1m = raw.change_1m || 0;

    const data: ProtocolData = {
      name: raw.name || slug,
      slug,
      tvl: currentTVL,
      category: raw.category || 'DeFi',
      chains: raw.chains || ['Solana'],
      change_1d,
      change_7d,
      change_1m,
      mcap: raw.mcap,
      timestamp: new Date().toISOString()
    };

    // Update cache
    cache.set(slug, { data, timestamp: Date.now() });

    return data;
  } catch (error) {
    console.error(`Error fetching ${slug}:`, error);

    // Return cached data if available, even if stale
    const stale = cache.get(slug);
    if (stale) {
      return stale.data;
    }

    throw error;
  }
}
