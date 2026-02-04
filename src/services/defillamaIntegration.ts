/**
 * DefiLlama Integration - Solana DeFi protocol TVL data
 * API: https://defillama.com/docs/api
 */

interface DefiLlamaChain {
  gecko_id: string;
  tvl: number;
  tokenSymbol: string;
  cmcId: string;
  name: string;
  chainId: number | null;
}

interface DefiLlamaProtocol {
  id: string;
  name: string;
  address: string | null;
  symbol: string;
  url: string;
  description: string;
  chain: string;
  logo: string;
  audits: string;
  audit_note: string | null;
  gecko_id: string | null;
  cmcId: string | null;
  category: string;
  chains: string[];
  module: string;
  twitter: string | null;
  forkedFrom: string[];
  oracles: string[];
  listedAt: number;
  slug: string;
  tvl: number;
  chainTvls: Record<string, number>;
  change_1h: number | null;
  change_1d: number | null;
  change_7d: number | null;
  staking: number | null;
  fdv: number | null;
  mcap: number | null;
}

interface SolanaProtocol {
  name: string;
  slug: string;
  tvl: number;
  change_1d: number | null;
  change_7d: number | null;
  category: string;
  url: string;
}

interface SolanaDeFiData {
  chain: string;
  total_tvl: number;
  protocol_count: number;
  protocols: SolanaProtocol[];
}

/**
 * Fetch Solana DeFi ecosystem data from DefiLlama
 */
export async function fetchSolanaDeFi(): Promise<SolanaDeFiData> {
  // Fetch Solana chain TVL
  const chainsResponse = await fetch('https://api.llama.fi/v2/chains');
  if (!chainsResponse.ok) {
    throw new Error(`DefiLlama chains API error: ${chainsResponse.status}`);
  }
  const chains = await chainsResponse.json() as DefiLlamaChain[];
  const solanaChain = chains.find(c => c.name === 'Solana');

  if (!solanaChain) {
    throw new Error('Solana chain not found in DefiLlama data');
  }

  // Fetch all protocols and filter for Solana-native
  const protocolsResponse = await fetch('https://api.llama.fi/protocols');
  if (!protocolsResponse.ok) {
    throw new Error(`DefiLlama protocols API error: ${protocolsResponse.status}`);
  }
  const allProtocols = await protocolsResponse.json() as DefiLlamaProtocol[];

  // Filter for Solana-native protocols (chain === "Solana")
  const solanaProtocols = allProtocols
    .filter(p => p.chain === 'Solana' && p.tvl > 0)
    .sort((a, b) => b.tvl - a.tvl)
    .slice(0, 15) // Top 15 protocols
    .map(p => ({
      name: p.name,
      slug: p.slug,
      tvl: Math.round(p.tvl),
      change_1d: p.change_1d,
      change_7d: p.change_7d,
      category: p.category,
      url: p.url || `https://defillama.com/protocol/${p.slug}`
    }));

  return {
    chain: 'Solana',
    total_tvl: Math.round(solanaChain.tvl),
    protocol_count: solanaProtocols.length,
    protocols: solanaProtocols
  };
}

/**
 * Get a specific protocol by name
 */
export async function getSolanaProtocol(slug: string): Promise<SolanaProtocol | null> {
  const data = await fetchSolanaDeFi();
  return data.protocols.find(p => p.slug === slug) || null;
}

/**
 * Get protocols by category (Lending, Dexs, Derivatives, etc.)
 */
export async function getProtocolsByCategory(category: string): Promise<SolanaProtocol[]> {
  const data = await fetchSolanaDeFi();
  return data.protocols.filter(p =>
    p.category.toLowerCase() === category.toLowerCase()
  );
}
