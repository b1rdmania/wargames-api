/**
 * Jupiter DEX Aggregator Integration
 * Best swap routing across Solana DEXes
 *
 * API: https://api.jup.ag (v1)
 * Docs: https://dev.jup.ag/api-reference
 *
 * NOTE: Jupiter deprecated free v6 API (quote-api.jup.ag) in early 2026.
 * New API requires x-api-key from https://portal.jup.ag
 * This integration uses MOCK DATA until API key is configured.
 * Set JUPITER_API_KEY environment variable for real quotes.
 */

interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: null | any;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  contextSlot: number;
  timeTaken: number;
}

interface QuoteRequest {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
  riskAdjusted?: boolean;
}

const BASE_URL = 'https://api.jup.ag';
const CACHE_TTL = 30 * 1000; // 30 seconds (Jupiter prices change fast)

let cache: Map<string, { data: any; timestamp: number }> = new Map();

// Check if Jupiter API key is available
const JUPITER_API_KEY = process.env.JUPITER_API_KEY;
const USE_MOCK = !JUPITER_API_KEY; // Use mock data if no API key

// Mock quote generator for demo purposes
function getMockQuote(req: QuoteRequest, slippageBps: number): any {
  const tokenPairs: Record<string, {symbol: string, rate: number}> = {
    'So11111111111111111111111111111111111111112': { symbol: 'SOL', rate: 185.00 },
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', rate: 1.00 },
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', rate: 1.00 },
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { symbol: 'mSOL', rate: 195.00 },
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK', rate: 0.000025 },
    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': { symbol: 'JUP', rate: 1.20 }
  };

  const inputToken = tokenPairs[req.inputMint] || { symbol: 'UNKNOWN', rate: 1 };
  const outputToken = tokenPairs[req.outputMint] || { symbol: 'UNKNOWN', rate: 1 };

  // Calculate output amount based on mock rates
  const inputValue = (req.amount / 1e6) * inputToken.rate; // Assume 6 decimals
  const outputAmount = Math.floor((inputValue / outputToken.rate) * 1e6);

  // Simulate price impact based on trade size
  const priceImpact = Math.min((req.amount / 1e9) * 0.001, 0.05); // Max 5%

  return {
    input: {
      mint: req.inputMint,
      amount: req.amount.toString(),
      symbol: inputToken.symbol
    },
    output: {
      mint: req.outputMint,
      amount: outputAmount.toString(),
      estimated_amount: outputAmount / 1e6,
      symbol: outputToken.symbol
    },
    price_impact: `${(priceImpact * 100).toFixed(4)}%`,
    price_impact_bps: Math.round(priceImpact * 10000),
    slippage: `${slippageBps / 100}%`,
    slippage_bps: slippageBps,
    routes: 2,
    dexes: ['Orca', 'Raydium'],
    swap_mode: 'ExactIn',
    time_taken_ms: 245,
    warnings: priceImpact > 0.01 ? ['High price impact (>1%). Consider splitting trade.'] : [],
    mode: 'MOCK_DATA',
    note: 'This is simulated data. Set JUPITER_API_KEY environment variable for real quotes from https://portal.jup.ag'
  };
}

export async function getJupiterQuote(req: QuoteRequest): Promise<any> {
  const cacheKey = `${req.inputMint}-${req.outputMint}-${req.amount}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    // Default slippage: 50 bps (0.5%)
    let slippageBps = req.slippageBps || 50;

    // Risk-adjusted slippage (if requested)
    if (req.riskAdjusted) {
      // TODO: Fetch current risk score and adjust
      // Higher risk = higher slippage tolerance
      // slippageBps = baseSlippage * (1 + riskScore/100)
      slippageBps = Math.min(slippageBps * 1.5, 500); // Max 5%
    }

    // If no API key, return mock data
    if (USE_MOCK) {
      const result = getMockQuote(req, slippageBps);
      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }

    // Real API call with authentication
    const params = new URLSearchParams({
      inputMint: req.inputMint,
      outputMint: req.outputMint,
      amount: req.amount.toString(),
      slippageBps: slippageBps.toString()
    });

    const response = await fetch(`${BASE_URL}/swap/v1/quote?${params}`, {
      headers: {
        'x-api-key': JUPITER_API_KEY || '',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Jupiter API error: ${response.status}`);
    }

    const quote = await response.json() as JupiterQuote;

    // Parse and format the response
    const result = {
      input: {
        mint: quote.inputMint,
        amount: quote.inAmount,
        symbol: getMintSymbol(quote.inputMint)
      },
      output: {
        mint: quote.outputMint,
        amount: quote.outAmount,
        estimated_amount: Number(quote.outAmount) / 1e6, // Assuming 6 decimals
        symbol: getMintSymbol(quote.outputMint)
      },
      price_impact: `${(parseFloat(quote.priceImpactPct) * 100).toFixed(4)}%`,
      price_impact_bps: Math.round(parseFloat(quote.priceImpactPct) * 10000),
      slippage: `${slippageBps / 100}%`,
      slippage_bps: slippageBps,
      routes: quote.routePlan.length,
      dexes: quote.routePlan.map(r => r.swapInfo.label),
      swap_mode: quote.swapMode,
      time_taken_ms: quote.timeTaken,
      warnings: [] as string[],
      mode: 'LIVE_DATA'
    };

    // Add warnings for high price impact
    if (parseFloat(quote.priceImpactPct) > 0.01) { // > 1%
      result.warnings.push('High price impact (>1%). Consider splitting trade.');
    }

    if (parseFloat(quote.priceImpactPct) > 0.05) { // > 5%
      result.warnings.push('CRITICAL: Very high price impact (>5%). Trade at your own risk.');
    }

    // Update cache
    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;
  } catch (error) {
    console.error('Error fetching Jupiter quote:', error);

    // Fallback to mock data on error
    if (!USE_MOCK) {
      console.warn('Jupiter API failed, falling back to mock data');
      const result = getMockQuote(req, req.slippageBps || 50);
      result.mode = 'FALLBACK_MOCK';
      return result;
    }

    throw error;
  }
}

// Helper to get token symbol from mint address
function getMintSymbol(mint: string): string {
  const knownMints: Record<string, string> = {
    'So11111111111111111111111111111111111111112': 'SOL',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'mSOL',
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'JUP'
  };

  return knownMints[mint] || mint.substring(0, 4) + '...' + mint.substring(mint.length - 4);
}

// Get list of supported tokens (top tokens only)
export async function getJupiterTokens(): Promise<any[]> {
  // If no API key, return mock tokens
  if (USE_MOCK) {
    return [
      {
        address: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
      },
      {
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
      },
      {
        address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png'
      },
      {
        address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
        symbol: 'mSOL',
        name: 'Marinade staked SOL',
        decimals: 9,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png'
      },
      {
        address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        symbol: 'BONK',
        name: 'Bonk',
        decimals: 5,
        logoURI: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACXaQT35uC9HE17SA'
      },
      {
        address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
        symbol: 'JUP',
        name: 'Jupiter',
        decimals: 6,
        logoURI: 'https://static.jup.ag/jup/icon.png'
      }
    ];
  }

  try {
    const response = await fetch('https://token.jup.ag/strict', {
      headers: {
        'x-api-key': JUPITER_API_KEY || ''
      }
    });

    if (!response.ok) {
      throw new Error(`Jupiter tokens API error: ${response.status}`);
    }

    const tokens = await response.json() as any[];
    return tokens.slice(0, 50); // Top 50 tokens
  } catch (error) {
    console.error('Error fetching Jupiter tokens:', error);
    // Return mock tokens on error
    return getJupiterTokens(); // Recursive call will hit USE_MOCK path
  }
}
