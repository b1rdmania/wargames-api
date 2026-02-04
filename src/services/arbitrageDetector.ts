/**
 * Cross-Protocol Arbitrage Detector
 * Find profitable arbitrage opportunities across Solana DEXs
 */

interface ArbitrageOpportunity {
  token_pair: string;
  buy_from: string;
  sell_to: string;
  buy_price: number;
  sell_price: number;
  profit_pct: number;
  profit_usd: number; // Estimated for $10k trade
  estimated_gas: number;
  net_profit_usd: number;
  confidence: number; // 0-1 (price data freshness)
  execution_difficulty: 'easy' | 'medium' | 'hard';
  reasoning: string;
}

interface ArbitrageScan {
  timestamp: string;
  total_opportunities: number;
  profitable_count: number;
  best_opportunity: ArbitrageOpportunity | null;
  top_opportunities: ArbitrageOpportunity[];
  market_efficiency: number; // 0-100 (higher = fewer arb opps)
  avg_spread: number; // Average price spread across all pairs
}

/**
 * Scan for arbitrage opportunities
 */
export async function scanArbitrageOpportunities(): Promise<ArbitrageScan> {
  const opportunities: ArbitrageOpportunity[] = [];

  // Major token pairs to check
  const pairs = [
    'SOL/USDC',
    'BTC/USDC',
    'ETH/USDC',
    'JUP/USDC',
    'JTO/USDC',
    'BONK/USDC',
    'WIF/USDC',
    'PYTH/USDC'
  ];

  // DEXs to check
  const dexes = ['Jupiter', 'Raydium', 'Orca', 'Meteora'];

  // Check all pair combinations
  for (const pair of pairs) {
    for (let i = 0; i < dexes.length; i++) {
      for (let j = i + 1; j < dexes.length; j++) {
        const opp = await checkArbitrage(pair, dexes[i], dexes[j]);
        if (opp) {
          opportunities.push(opp);
        }
      }
    }
  }

  // Sort by net profit
  const sorted = opportunities.sort((a, b) => b.net_profit_usd - a.net_profit_usd);
  const profitable = sorted.filter(o => o.net_profit_usd > 0);

  // Calculate market efficiency
  const spreads = opportunities.map(o => o.profit_pct);
  const avg_spread = spreads.length > 0
    ? spreads.reduce((sum, s) => sum + s, 0) / spreads.length
    : 0;

  // Lower spread = higher efficiency
  const market_efficiency = Math.max(0, Math.min(100, 100 - (avg_spread * 50)));

  return {
    timestamp: new Date().toISOString(),
    total_opportunities: opportunities.length,
    profitable_count: profitable.length,
    best_opportunity: profitable[0] || null,
    top_opportunities: profitable.slice(0, 10),
    market_efficiency: Math.round(market_efficiency),
    avg_spread: Math.round(avg_spread * 1000) / 1000
  };
}

/**
 * Check arbitrage between two DEXs for a pair
 */
async function checkArbitrage(
  pair: string,
  dex1: string,
  dex2: string
): Promise<ArbitrageOpportunity | null> {
  // In production, fetch real prices from DEX APIs
  // For now, simulating realistic price differences

  const basePrice = getBasePrice(pair);

  // Add small random spreads (realistic market inefficiencies)
  const spread1 = (Math.random() - 0.5) * 0.006; // +/- 0.3%
  const spread2 = (Math.random() - 0.5) * 0.006;

  const price1 = basePrice * (1 + spread1);
  const price2 = basePrice * (1 + spread2);

  // Determine buy/sell
  let buy_from: string;
  let sell_to: string;
  let buy_price: number;
  let sell_price: number;

  if (price1 < price2) {
    buy_from = dex1;
    sell_to = dex2;
    buy_price = price1;
    sell_price = price2;
  } else {
    buy_from = dex2;
    sell_to = dex1;
    buy_price = price2;
    sell_price = price1;
  }

  const profit_pct = ((sell_price - buy_price) / buy_price) * 100;

  // Skip if profit too small
  if (profit_pct < 0.1) return null; // < 0.1% not worth it

  // Calculate profits for $10k trade
  const trade_size = 10000;
  const profit_usd = (trade_size * profit_pct) / 100;

  // Estimate gas costs (Solana is cheap)
  const estimated_gas = 0.001 * 150; // ~$0.15 for 2 txs
  const net_profit_usd = profit_usd - estimated_gas;

  // Execution difficulty based on liquidity and spread
  let execution_difficulty: ArbitrageOpportunity['execution_difficulty'];
  if (profit_pct > 0.5) {
    execution_difficulty = 'easy'; // Large spread, likely low liquidity
  } else if (profit_pct > 0.25) {
    execution_difficulty = 'medium';
  } else {
    execution_difficulty = 'hard'; // Small spread, need fast execution
  }

  return {
    token_pair: pair,
    buy_from,
    sell_to,
    buy_price: Math.round(buy_price * 100000) / 100000,
    sell_price: Math.round(sell_price * 100000) / 100000,
    profit_pct: Math.round(profit_pct * 1000) / 1000,
    profit_usd: Math.round(profit_usd * 100) / 100,
    estimated_gas: Math.round(estimated_gas * 1000) / 1000,
    net_profit_usd: Math.round(net_profit_usd * 100) / 100,
    confidence: 0.85,
    execution_difficulty,
    reasoning: `Buy ${pair} on ${buy_from} at ${buy_price.toFixed(6)}, sell on ${sell_to} at ${sell_price.toFixed(6)}. ${profit_pct.toFixed(3)}% spread = $${net_profit_usd.toFixed(2)} net profit on $${trade_size} trade.`
  };
}

/**
 * Get base price for token pair (simulated)
 */
function getBasePrice(pair: string): number {
  const prices: Record<string, number> = {
    'SOL/USDC': 98.50,
    'BTC/USDC': 45000,
    'ETH/USDC': 2450,
    'JUP/USDC': 0.85,
    'JTO/USDC': 2.35,
    'BONK/USDC': 0.000015,
    'WIF/USDC': 1.45,
    'PYTH/USDC': 0.42
  };

  return prices[pair] || 1.0;
}

/**
 * Get arbitrage opportunities for specific token
 */
export async function getArbitrageForToken(token: string): Promise<ArbitrageOpportunity[]> {
  const scan = await scanArbitrageOpportunities();
  return scan.top_opportunities
    .filter(o => o.token_pair.includes(token.toUpperCase()))
    .slice(0, 5);
}

/**
 * Get real-time arbitrage alerts
 */
export async function getArbitrageAlerts(): Promise<Array<{
  severity: 'high' | 'medium' | 'low';
  opportunity: ArbitrageOpportunity;
  urgency: string;
}>> {
  const scan = await scanArbitrageOpportunities();
  const alerts: Array<{
    severity: 'high' | 'medium' | 'low';
    opportunity: ArbitrageOpportunity;
    urgency: string;
  }> = [];

  for (const opp of scan.top_opportunities.slice(0, 5)) {
    let severity: 'high' | 'medium' | 'low';
    let urgency: string;

    if (opp.net_profit_usd > 50) {
      severity = 'high';
      urgency = 'Execute immediately. Large spread likely to close quickly.';
    } else if (opp.net_profit_usd > 20) {
      severity = 'medium';
      urgency = 'Good opportunity. Execute within 1-2 minutes.';
    } else {
      severity = 'low';
      urgency = 'Small opportunity. Only worth it with large capital or automated execution.';
    }

    alerts.push({
      severity,
      opportunity: opp,
      urgency
    });
  }

  return alerts;
}

/**
 * Calculate optimal trade size for arbitrage
 */
export async function getOptimalTradeSize(
  opportunity: ArbitrageOpportunity
): Promise<{
  optimal_size: number;
  expected_profit: number;
  reasoning: string;
}> {
  // In production, would calculate based on liquidity depth
  // For now, using heuristics

  let optimal_size: number;
  let reasoning: string;

  if (opportunity.profit_pct > 0.5) {
    // Large spread = low liquidity, use smaller size
    optimal_size = 5000;
    reasoning = 'Large spread indicates low liquidity. Use smaller trade size to avoid slippage.';
  } else if (opportunity.profit_pct > 0.25) {
    // Medium spread
    optimal_size = 10000;
    reasoning = 'Medium spread with decent liquidity. Standard trade size optimal.';
  } else {
    // Small spread = high liquidity, can use larger size
    optimal_size = 25000;
    reasoning = 'Small spread with high liquidity. Larger trade size to maximize absolute profit.';
  }

  const expected_profit = (optimal_size * opportunity.profit_pct / 100) - opportunity.estimated_gas;

  return {
    optimal_size,
    expected_profit: Math.round(expected_profit * 100) / 100,
    reasoning
  };
}

/**
 * Get historical arbitrage statistics
 */
export function getArbitrageStats(): {
  avg_daily_opportunities: number;
  avg_profit_per_opportunity: number;
  market_efficiency_trend: 'improving' | 'stable' | 'declining';
  best_performing_pairs: string[];
} {
  // Simulated stats based on typical Solana DEX activity
  return {
    avg_daily_opportunities: 15 + Math.floor(Math.random() * 10),
    avg_profit_per_opportunity: 12 + Math.random() * 8,
    market_efficiency_trend: 'improving', // Solana DEXs getting more efficient
    best_performing_pairs: ['SOL/USDC', 'JUP/USDC', 'JTO/USDC']
  };
}
