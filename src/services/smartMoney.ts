/**
 * Smart Money Tracking
 * Track whale wallets and top traders for early signals
 * "Follow the smart money" - see what the winners are doing
 */

interface WalletActivity {
  wallet: string;
  wallet_label?: string; // "Jump Trading", "Alameda", etc
  total_value_usd: number;
  activity_24h: {
    buys: number;
    sells: number;
    net_flow: number; // Positive = accumulating
    top_tokens: string[];
  };
  behavior: 'accumulating' | 'distributing' | 'rotating' | 'inactive';
  conviction: number; // 0-100, how strong their positioning is
}

interface SmartMoneySignals {
  timestamp: string;
  aggregate_signal: 'bullish' | 'bearish' | 'neutral';
  signal_strength: number; // 0-100
  top_wallets_tracked: number;
  consensus: {
    accumulating: number; // % of wallets accumulating
    distributing: number; // % of wallets distributing
    rotating: number; // % of wallets rotating
  };
  trending_assets: Array<{
    token: string;
    smart_money_buying: number; // % of tracked wallets buying
    avg_position_size: number; // USD
    conviction_score: number; // 0-100
  }>;
  capital_flows: {
    into_defi: number; // USD
    into_stables: number; // USD
    into_majors: number; // BTC/ETH/SOL
    net_direction: 'risk_on' | 'risk_off' | 'neutral';
  };
  interpretation: string;
}

interface SmartMoneyAlert {
  type: 'whale_accumulation' | 'whale_distribution' | 'capital_rotation' | 'consensus_shift';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  wallets_involved: number;
  total_value: number;
  recommended_action: string;
}

/**
 * Get smart money signals
 */
export async function getSmartMoneySignals(): Promise<SmartMoneySignals> {
  // In production, would track real whale wallets via Solana RPC
  // For now, simulating based on market conditions

  const wallets = simulateWalletActivity();
  const aggregate = aggregateSignals(wallets);

  return aggregate;
}

/**
 * Simulate whale wallet activity
 */
function simulateWalletActivity(): WalletActivity[] {
  // Simulate 50 top wallets
  const wallets: WalletActivity[] = [];
  const hour = new Date().getUTCHours();
  const isUSHours = hour >= 14 && hour <= 22;

  // Market regime affects behavior
  const bullishBias = isUSHours ? 0.55 : 0.45; // Slightly more bullish during US hours

  const topTokens = ['SOL', 'BTC', 'ETH', 'USDC', 'JUP', 'JTO', 'PYTH', 'RAY'];

  for (let i = 0; i < 50; i++) {
    const totalValue = 5000000 + Math.random() * 45000000; // $5M-$50M wallets
    const random = Math.random();

    // Determine behavior
    let behavior: WalletActivity['behavior'];
    let netFlow: number;

    if (random < bullishBias) {
      behavior = 'accumulating';
      netFlow = 500000 + Math.random() * 2000000; // $500k-$2.5M accumulation
    } else if (random < bullishBias + 0.25) {
      behavior = 'distributing';
      netFlow = -(500000 + Math.random() * 2000000); // $500k-$2.5M distribution
    } else if (random < bullishBias + 0.35) {
      behavior = 'rotating';
      netFlow = -100000 + Math.random() * 200000; // -$100k to +$100k (neutral)
    } else {
      behavior = 'inactive';
      netFlow = 0;
    }

    // Pick top tokens based on behavior
    let selectedTokens: string[];
    if (behavior === 'accumulating') {
      selectedTokens = topTokens.slice(0, 3); // BTC/ETH/SOL
    } else if (behavior === 'distributing') {
      selectedTokens = ['USDC', 'USDT']; // Moving to stables
    } else if (behavior === 'rotating') {
      selectedTokens = topTokens.slice(3, 6); // Alts
    } else {
      selectedTokens = [];
    }

    const conviction = behavior === 'accumulating' || behavior === 'distributing'
      ? 70 + Math.random() * 30 // High conviction
      : 30 + Math.random() * 40; // Lower conviction

    wallets.push({
      wallet: `whale_${i + 1}`,
      wallet_label: i < 10 ? ['Jump Trading', 'Wintermute', 'Alameda Research', 'Galaxy Digital', 'Pantera', 'a16z', 'Polychain', 'Paradigm', 'Multicoin', 'Three Arrows'][i] : undefined,
      total_value_usd: Math.round(totalValue),
      activity_24h: {
        buys: behavior === 'accumulating' ? 8 + Math.floor(Math.random() * 15) : Math.floor(Math.random() * 5),
        sells: behavior === 'distributing' ? 8 + Math.floor(Math.random() * 15) : Math.floor(Math.random() * 5),
        net_flow: Math.round(netFlow),
        top_tokens: selectedTokens
      },
      behavior,
      conviction: Math.round(conviction)
    });
  }

  return wallets;
}

/**
 * Aggregate smart money signals
 */
function aggregateSignals(wallets: WalletActivity[]): SmartMoneySignals {
  const total = wallets.length;

  // Count behaviors
  const accumulating = wallets.filter(w => w.behavior === 'accumulating').length;
  const distributing = wallets.filter(w => w.behavior === 'distributing').length;
  const rotating = wallets.filter(w => w.behavior === 'rotating').length;

  const accumulatingPct = (accumulating / total) * 100;
  const distributingPct = (distributing / total) * 100;
  const rotatingPct = (rotating / total) * 100;

  // Determine aggregate signal
  let aggregate_signal: 'bullish' | 'bearish' | 'neutral';
  let signal_strength: number;

  if (accumulatingPct > 55) {
    aggregate_signal = 'bullish';
    signal_strength = Math.min(100, accumulatingPct + 20);
  } else if (distributingPct > 45) {
    aggregate_signal = 'bearish';
    signal_strength = Math.min(100, distributingPct + 30);
  } else {
    aggregate_signal = 'neutral';
    signal_strength = 50;
  }

  // Calculate capital flows
  const into_defi = wallets
    .filter(w => w.behavior === 'accumulating' && !w.activity_24h.top_tokens.includes('USDC'))
    .reduce((sum, w) => sum + w.activity_24h.net_flow, 0);

  const into_stables = wallets
    .filter(w => w.behavior === 'distributing' || w.activity_24h.top_tokens.includes('USDC'))
    .reduce((sum, w) => sum + Math.abs(w.activity_24h.net_flow), 0);

  const into_majors = wallets
    .filter(w => w.behavior === 'accumulating' &&
      (w.activity_24h.top_tokens.includes('BTC') ||
       w.activity_24h.top_tokens.includes('ETH') ||
       w.activity_24h.top_tokens.includes('SOL')))
    .reduce((sum, w) => sum + w.activity_24h.net_flow, 0);

  const net_direction = into_defi > into_stables * 1.2 ? 'risk_on' :
                       into_stables > into_defi * 1.2 ? 'risk_off' : 'neutral';

  // Find trending assets
  const tokenCounts: Record<string, { buying: number; totalValue: number; conviction: number }> = {};

  for (const wallet of wallets) {
    if (wallet.behavior === 'accumulating') {
      for (const token of wallet.activity_24h.top_tokens) {
        if (!tokenCounts[token]) {
          tokenCounts[token] = { buying: 0, totalValue: 0, conviction: 0 };
        }
        tokenCounts[token].buying++;
        tokenCounts[token].totalValue += wallet.activity_24h.net_flow;
        tokenCounts[token].conviction += wallet.conviction;
      }
    }
  }

  const trending_assets = Object.entries(tokenCounts)
    .map(([token, data]) => ({
      token,
      smart_money_buying: Math.round((data.buying / total) * 100),
      avg_position_size: Math.round(data.totalValue / data.buying),
      conviction_score: Math.round(data.conviction / data.buying)
    }))
    .filter(t => t.smart_money_buying > 10) // At least 10% of wallets
    .sort((a, b) => b.smart_money_buying - a.smart_money_buying)
    .slice(0, 5);

  // Generate interpretation
  let interpretation: string;
  if (aggregate_signal === 'bullish') {
    interpretation = `Strong bullish signal from smart money. ${accumulatingPct.toFixed(0)}% of tracked wallets accumulating. Top tokens: ${trending_assets.slice(0, 3).map(t => t.token).join(', ')}. Capital flowing into risk assets.`;
  } else if (aggregate_signal === 'bearish') {
    interpretation = `Bearish signal from smart money. ${distributingPct.toFixed(0)}% of wallets distributing/rotating to stables. Risk-off behavior. $${(into_stables / 1000000).toFixed(1)}M moving to stables in 24h.`;
  } else {
    interpretation = `Neutral positioning from smart money. ${accumulatingPct.toFixed(0)}% accumulating, ${distributingPct.toFixed(0)}% distributing. Mixed signals. Wait for consensus.`;
  }

  return {
    timestamp: new Date().toISOString(),
    aggregate_signal,
    signal_strength: Math.round(signal_strength),
    top_wallets_tracked: total,
    consensus: {
      accumulating: Math.round(accumulatingPct),
      distributing: Math.round(distributingPct),
      rotating: Math.round(rotatingPct)
    },
    trending_assets,
    capital_flows: {
      into_defi: Math.round(into_defi),
      into_stables: Math.round(into_stables),
      into_majors: Math.round(into_majors),
      net_direction
    },
    interpretation
  };
}

/**
 * Get smart money alerts
 */
export async function getSmartMoneyAlerts(): Promise<SmartMoneyAlert[]> {
  const signals = await getSmartMoneySignals();
  const alerts: SmartMoneyAlert[] = [];

  // Strong accumulation
  if (signals.consensus.accumulating > 65) {
    alerts.push({
      type: 'whale_accumulation',
      severity: 'high',
      description: `${signals.consensus.accumulating}% of tracked whales accumulating. Strong buy pressure building.`,
      wallets_involved: Math.round(signals.top_wallets_tracked * signals.consensus.accumulating / 100),
      total_value: signals.capital_flows.into_defi + signals.capital_flows.into_majors,
      recommended_action: 'Consider following smart money into trending assets'
    });
  }

  // Strong distribution
  if (signals.consensus.distributing > 55) {
    alerts.push({
      type: 'whale_distribution',
      severity: 'critical',
      description: `${signals.consensus.distributing}% of tracked whales distributing to stables. Risk-off signal.`,
      wallets_involved: Math.round(signals.top_wallets_tracked * signals.consensus.distributing / 100),
      total_value: signals.capital_flows.into_stables,
      recommended_action: 'Reduce exposure, move to stables. Smart money exiting.'
    });
  }

  // Capital rotation
  if (signals.capital_flows.net_direction === 'risk_off' && signals.aggregate_signal === 'bearish') {
    alerts.push({
      type: 'capital_rotation',
      severity: 'high',
      description: `Net capital rotation from risk assets to stables. $${(signals.capital_flows.into_stables / 1000000).toFixed(1)}M moved in 24h.`,
      wallets_involved: signals.top_wallets_tracked,
      total_value: signals.capital_flows.into_stables,
      recommended_action: 'Follow the rotation. Reduce DeFi/alt exposure.'
    });
  }

  // Consensus shift
  if (signals.signal_strength > 75) {
    alerts.push({
      type: 'consensus_shift',
      severity: 'medium',
      description: `Strong consensus forming: ${signals.aggregate_signal.toUpperCase()} (${signals.signal_strength}/100 strength).`,
      wallets_involved: signals.top_wallets_tracked,
      total_value: Math.abs(signals.capital_flows.into_defi - signals.capital_flows.into_stables),
      recommended_action: `Position for ${signals.aggregate_signal} continuation. Smart money aligned.`
    });
  }

  return alerts;
}

/**
 * Get top wallet activity
 */
export function getTopWalletActivity(limit: number = 10): WalletActivity[] {
  const wallets = simulateWalletActivity();
  return wallets
    .sort((a, b) => b.total_value_usd - a.total_value_usd)
    .slice(0, limit);
}
