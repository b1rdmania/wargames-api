/**
 * WARGAMES Narrative Definitions
 * Geopolitical and macro narratives adapted for Solana/crypto context
 *
 * Each narrative has:
 * - thesis: The core argument
 * - indicators: What we monitor to score this narrative
 * - crypto_impact: How this affects crypto markets
 * - current_score: 0-100 risk/heat level
 */

export interface Narrative {
  id: string;
  name: string;
  thesis: string;
  indicators: string[];
  crypto_impact: {
    risk_on: string[];   // Assets that benefit from this narrative playing out
    risk_off: string[];  // Assets that suffer
    suggested_action: 'increase_risk' | 'reduce_risk' | 'hedge' | 'neutral';
  };
  current_score: number;
  trend: 'rising' | 'falling' | 'stable';
  last_updated: string;
}

export const narratives: Narrative[] = [
  {
    id: 'taiwan-semiconductor',
    name: 'Taiwan Strait Crisis',
    thesis: 'US-China tensions over Taiwan threaten global semiconductor supply chains. Escalation = risk-off across tech and crypto.',
    indicators: [
      'US-China diplomatic statements',
      'Taiwan Strait military activity',
      'TSMC supply chain news',
      'US chip export controls',
      'Tech sector earnings guidance'
    ],
    crypto_impact: {
      risk_on: ['USDC', 'USDT', 'gold-backed tokens'],
      risk_off: ['SOL', 'ETH', 'AI tokens', 'memecoins'],
      suggested_action: 'reduce_risk'
    },
    current_score: 62,
    trend: 'stable',
    last_updated: new Date().toISOString()
  },
  {
    id: 'ai-bubble',
    name: 'AI Bubble Correction',
    thesis: 'AI hype has driven valuations to unsustainable levels. Correction in AI equities spills into AI crypto tokens.',
    indicators: [
      'NVDA price action and P/E',
      'AI startup funding rounds',
      'Big tech capex guidance',
      'AI token sentiment',
      'Retail AI trading volume'
    ],
    crypto_impact: {
      risk_on: ['BTC', 'stablecoins', 'DeFi blue chips'],
      risk_off: ['RNDR', 'FET', 'AI memecoins', 'compute tokens'],
      suggested_action: 'hedge'
    },
    current_score: 55,
    trend: 'rising',
    last_updated: new Date().toISOString()
  },
  {
    id: 'middle-east-oil',
    name: 'Middle East Oil Shock',
    thesis: 'Regional conflict disrupts oil supply, driving inflation fears and risk-off sentiment globally.',
    indicators: [
      'Crude oil price',
      'Shipping lane disruptions',
      'Middle East diplomatic news',
      'US strategic reserve actions',
      'Inflation expectations'
    ],
    crypto_impact: {
      risk_on: ['BTC', 'gold-backed tokens', 'inflation hedges'],
      risk_off: ['altcoins', 'DeFi', 'leveraged positions'],
      suggested_action: 'reduce_risk'
    },
    current_score: 48,
    trend: 'falling',
    last_updated: new Date().toISOString()
  },
  {
    id: 'fed-pivot',
    name: 'Fed Policy Pivot',
    thesis: 'Federal Reserve shifts between hawkish and dovish stance. Dovish = risk-on rally, Hawkish = risk-off.',
    indicators: [
      'Fed funds rate expectations',
      'FOMC meeting minutes',
      'Fed speaker commentary',
      'Treasury yields',
      'Dollar index (DXY)'
    ],
    crypto_impact: {
      risk_on: ['SOL', 'ETH', 'altcoins', 'memecoins'],
      risk_off: ['stablecoins', 'shorts'],
      suggested_action: 'neutral'
    },
    current_score: 45,
    trend: 'stable',
    last_updated: new Date().toISOString()
  },
  {
    id: 'defi-contagion',
    name: 'DeFi Contagion Risk',
    thesis: 'Major DeFi protocol failure or exploit cascades through interconnected protocols. Smart contract risk materializes.',
    indicators: [
      'Large protocol TVL changes',
      'Unusual withdrawal patterns',
      'Oracle manipulation attempts',
      'Bridge exploits',
      'Stablecoin depegs'
    ],
    crypto_impact: {
      risk_on: ['BTC', 'cold storage', 'CEX stables'],
      risk_off: ['DeFi tokens', 'LP positions', 'bridged assets'],
      suggested_action: 'reduce_risk'
    },
    current_score: 35,
    trend: 'stable',
    last_updated: new Date().toISOString()
  },
  {
    id: 'memecoin-mania',
    name: 'Memecoin Sentiment Cycle',
    thesis: 'Memecoin speculation follows boom/bust cycles. Peak euphoria = incoming correction, max fear = reversal opportunity.',
    indicators: [
      'Memecoin trading volume',
      'New token launches per day',
      'Social sentiment metrics',
      'Retail onboarding data',
      'Exchange memecoin listings'
    ],
    crypto_impact: {
      risk_on: ['memecoins', 'SOL (as base layer)', 'DEX tokens'],
      risk_off: ['stablecoins', 'BTC'],
      suggested_action: 'neutral'
    },
    current_score: 68,
    trend: 'rising',
    last_updated: new Date().toISOString()
  },
  {
    id: 'regulatory-crackdown',
    name: 'Regulatory Crackdown',
    thesis: 'US or global regulatory action against crypto. SEC enforcement, exchange restrictions, or stablecoin rules.',
    indicators: [
      'SEC enforcement actions',
      'Congressional hearings',
      'Exchange delistings',
      'Stablecoin legislation',
      'International regulatory coordination'
    ],
    crypto_impact: {
      risk_on: ['BTC', 'decentralized protocols', 'privacy coins'],
      risk_off: ['exchange tokens', 'US-based projects', 'securities-adjacent tokens'],
      suggested_action: 'hedge'
    },
    current_score: 42,
    trend: 'stable',
    last_updated: new Date().toISOString()
  },
  {
    id: 'institutional-adoption',
    name: 'Institutional Wave',
    thesis: 'Major institutional adoption (ETFs, corporate treasury, sovereign funds) drives sustained buying pressure.',
    indicators: [
      'ETF flows',
      'Corporate treasury announcements',
      'Custody solution news',
      'Prime brokerage expansion',
      'Pension fund allocations'
    ],
    crypto_impact: {
      risk_on: ['BTC', 'ETH', 'SOL', 'institutional-grade tokens'],
      risk_off: ['stablecoins (opportunity cost)'],
      suggested_action: 'increase_risk'
    },
    current_score: 58,
    trend: 'rising',
    last_updated: new Date().toISOString()
  }
];

/**
 * Calculate global risk score from all narratives
 * Weighted by each narrative's score and impact
 */
export function calculateGlobalRisk(): { score: number; bias: string; summary: string } {
  // Weight negative narratives more heavily for risk score
  const negativeNarratives = narratives.filter(n =>
    n.crypto_impact.suggested_action === 'reduce_risk' ||
    n.crypto_impact.suggested_action === 'hedge'
  );

  const positiveNarratives = narratives.filter(n =>
    n.crypto_impact.suggested_action === 'increase_risk'
  );

  const avgNegative = negativeNarratives.length > 0
    ? negativeNarratives.reduce((sum, n) => sum + n.current_score, 0) / negativeNarratives.length
    : 0;

  const avgPositive = positiveNarratives.length > 0
    ? positiveNarratives.reduce((sum, n) => sum + n.current_score, 0) / positiveNarratives.length
    : 0;

  // Global risk is weighted toward negative narratives
  const score = Math.round((avgNegative * 0.7) + ((100 - avgPositive) * 0.3));

  let bias: string;
  if (score >= 70) bias = 'defensive';
  else if (score >= 50) bias = 'cautious';
  else if (score >= 30) bias = 'neutral';
  else bias = 'aggressive';

  // Generate summary from top narratives
  const topRisks = [...narratives]
    .filter(n => n.crypto_impact.suggested_action === 'reduce_risk' || n.crypto_impact.suggested_action === 'hedge')
    .sort((a, b) => b.current_score - a.current_score)
    .slice(0, 2);

  const summary = topRisks.length > 0
    ? `Key risks: ${topRisks.map(n => n.name).join(', ')}`
    : 'No elevated risks detected';

  return { score, bias, summary };
}
