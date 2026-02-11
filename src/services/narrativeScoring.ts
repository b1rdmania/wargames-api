/**
 * Dynamic Narrative Scoring
 * Calculate narrative heat scores from real market data instead of static values
 */

import { fetchFearGreed, fetchPolymarketOdds, fetchCryptoPrices } from './dataFetchers';

interface NarrativeScore {
  score: number;
  trend: 'rising' | 'falling' | 'stable';
  drivers: string[];
}

interface NarrativeScores {
  [narrativeId: string]: NarrativeScore;
}

// Store historical scores for trend detection (in-memory for now)
const scoreHistory: Record<string, number[]> = {};

/**
 * Calculate dynamic narrative scores from real market data
 */
export async function calculateNarrativeScores(): Promise<NarrativeScores> {
  const [fearGreedResult, polymarket, crypto] = await Promise.all([
    fetchFearGreed().catch(() => null),
    fetchPolymarketOdds().catch(() => []),
    fetchCryptoPrices().catch(() => [])
  ]);

  // Use default if fearGreed fetch failed
  const fearGreed = fearGreedResult || { value: 50, value_classification: 'Neutral' };

  const scores: NarrativeScores = {};

  // 1. MEMECOIN MANIA
  // Formula: f(Fear & Greed, SOL volatility, memecoin performance)
  const solData = crypto.find(c => c.id === 'solana');
  const solVolatility = solData ? Math.abs(solData.price_change_percentage_24h || 0) : 5;

  // Find memecoin tokens in crypto data
  const memecoins = crypto.filter(c =>
    ['dogecoin', 'shiba-inu', 'pepe', 'bonk', 'dogwifhat'].includes(c.id)
  );
  const memecoinAvgChange = memecoins.length > 0
    ? memecoins.reduce((sum, c) => sum + (c.price_change_percentage_24h || 0), 0) / memecoins.length
    : 0;

  const memecoinMania = Math.min(100, Math.max(0, Math.round(
    (fearGreed.value * 0.4) +              // Greed drives mania
    (solVolatility * 4 * 0.3) +            // High SOL vol = activity
    (Math.max(0, memecoinAvgChange) * 3 * 0.3) // Memecoin pumps
  )));

  scores['memecoin-mania'] = {
    score: memecoinMania,
    trend: detectTrend('memecoin-mania', memecoinMania),
    drivers: [
      `Fear & Greed: ${fearGreed.value}`,
      `SOL volatility: ${solVolatility.toFixed(1)}%`,
      memecoins.length > 0 ? `Memecoin avg: ${memecoinAvgChange > 0 ? '+' : ''}${memecoinAvgChange.toFixed(1)}%` : 'No memecoin data'
    ]
  };

  // 2. TAIWAN SEMICONDUCTOR
  // Formula: Polymarket Taiwan odds + geopolitical tensions
  const taiwanEvents = polymarket.filter(e =>
    e.question.toLowerCase().includes('taiwan') ||
    e.question.toLowerCase().includes('china')
  );
  // Probabilities are already 0-100 from the data fetcher
  const taiwanAvgPct = taiwanEvents.length > 0
    ? taiwanEvents.reduce((sum, e) => sum + e.probability, 0) / taiwanEvents.length
    : 15; // Default 15% baseline risk

  const taiwanScore = Math.round(Math.min(100, taiwanAvgPct * 4)); // Amplify: 25% odds → 100 score

  scores['taiwan-semiconductor'] = {
    score: taiwanScore,
    trend: detectTrend('taiwan-semiconductor', taiwanScore),
    drivers: [
      `Polymarket odds: ${taiwanAvgPct.toFixed(1)}%`,
      `Events tracked: ${taiwanEvents.length}`
    ]
  };

  // 3. FED PIVOT
  // Formula: Polymarket Fed odds + economic indicators
  const fedEvents = polymarket.filter(e =>
    e.question.toLowerCase().includes('fed') ||
    e.question.toLowerCase().includes('rate cut') ||
    e.question.toLowerCase().includes('federal reserve')
  );
  const fedAvgPct = fedEvents.length > 0
    ? fedEvents.reduce((sum, e) => sum + e.probability, 0) / fedEvents.length
    : 30; // Default 30% baseline

  const fedScore = Math.round(Math.min(100, fedAvgPct * 1.5)); // 67% odds → 100 score

  scores['fed-pivot'] = {
    score: fedScore,
    trend: detectTrend('fed-pivot', fedScore),
    drivers: [
      `Rate cut odds: ${fedAvgPct.toFixed(1)}%`,
      `Fed events: ${fedEvents.length}`
    ]
  };

  // 4. AI BUBBLE
  // Formula: AI token performance + tech sentiment
  const aiTokens = crypto.filter(c =>
    ['render-token', 'fetch-ai', 'singularitynet', 'worldcoin'].includes(c.id)
  );
  const aiAvgChange = aiTokens.length > 0
    ? aiTokens.reduce((sum, c) => sum + (c.price_change_percentage_24h || 0), 0) / aiTokens.length
    : 0;

  // Base score on Fear & Greed (extreme greed = bubble) + AI token performance
  const aiScore = Math.min(100, Math.max(0, Math.round(
    (fearGreed.value * 0.5) +              // Greed = bubble risk
    (Math.max(0, aiAvgChange) * 5 * 0.5)   // AI tokens pumping
  )));

  scores['ai-bubble'] = {
    score: aiScore,
    trend: detectTrend('ai-bubble', aiScore),
    drivers: [
      `AI token avg: ${aiAvgChange > 0 ? '+' : ''}${aiAvgChange.toFixed(1)}%`,
      `Sentiment: ${fearGreed.value_classification}`
    ]
  };

  // 5. MIDDLE EAST OIL
  // Formula: Polymarket conflict odds
  const middleEastEvents = polymarket.filter(e =>
    e.question.toLowerCase().includes('iran') ||
    e.question.toLowerCase().includes('israel') ||
    e.question.toLowerCase().includes('middle east') ||
    e.question.toLowerCase().includes('oil')
  );
  if (middleEastEvents.length > 0) {
    const middleEastPct = middleEastEvents.reduce((sum, e) => sum + e.probability, 0) / middleEastEvents.length;
    const middleEastScore = Math.round(Math.min(100, middleEastPct * 3));
    scores['middle-east-oil'] = {
      score: middleEastScore,
      trend: detectTrend('middle-east-oil', middleEastScore),
      drivers: [
        `Conflict odds: ${middleEastPct.toFixed(1)}%`,
        `Events tracked: ${middleEastEvents.length}`
      ]
    };
  } else {
    scores['middle-east-oil'] = {
      score: 0,
      trend: 'stable',
      drivers: ['No active Polymarket events found']
    };
  }

  // 6. DEFI CONTAGION
  // Formula: DeFi protocol health (would use DefiLlama, for now use crypto volatility)
  const defiTokens = crypto.filter(c =>
    ['uniswap', 'aave', 'maker', 'lido-dao', 'curve-dao-token'].includes(c.id)
  );
  const defiAvgChange = defiTokens.length > 0
    ? defiTokens.reduce((sum, c) => sum + (c.price_change_percentage_24h || 0), 0) / defiTokens.length
    : 0;

  // Negative DeFi performance = contagion risk
  const defiScore = Math.min(100, Math.max(0, Math.round(
    50 + (Math.min(0, defiAvgChange) * -5) // Losses increase score
  )));

  scores['defi-contagion'] = {
    score: defiScore,
    trend: detectTrend('defi-contagion', defiScore),
    drivers: [
      `DeFi token avg: ${defiAvgChange > 0 ? '+' : ''}${defiAvgChange.toFixed(1)}%`,
      `Tokens tracked: ${defiTokens.length}`
    ]
  };

  // 7. REGULATORY CRACKDOWN
  // Formula: Baseline + recent enforcement (would need news API, use Polymarket)
  const regulatoryEvents = polymarket.filter(e =>
    e.question.toLowerCase().includes('sec') ||
    e.question.toLowerCase().includes('regulation') ||
    e.question.toLowerCase().includes('lawsuit')
  );
  if (regulatoryEvents.length > 0) {
    const regulatoryPct = regulatoryEvents.reduce((sum, e) => sum + e.probability, 0) / regulatoryEvents.length;
    const regulatoryScore = Math.round(Math.min(100, regulatoryPct * 2.5));
    scores['regulatory-crackdown'] = {
      score: regulatoryScore,
      trend: detectTrend('regulatory-crackdown', regulatoryScore),
      drivers: [
        `Enforcement odds: ${regulatoryPct.toFixed(1)}%`,
        `Events tracked: ${regulatoryEvents.length}`
      ]
    };
  } else {
    scores['regulatory-crackdown'] = {
      score: 0,
      trend: 'stable',
      drivers: ['No active Polymarket events found']
    };
  }

  // 8. INSTITUTIONAL ADOPTION
  // Formula: BTC market cap dominance + ETH stability + moderate sentiment (not extreme either way)
  // Institutions prefer stability - extreme fear OR extreme greed both reduce institutional confidence
  const btcData = crypto.find(c => c.id === 'bitcoin');
  const ethData = crypto.find(c => c.id === 'ethereum');
  const btcStability = btcData ? Math.max(0, 100 - Math.abs(btcData.price_change_percentage_24h || 0) * 10) : 50;
  const ethStability = ethData ? Math.max(0, 100 - Math.abs(ethData.price_change_percentage_24h || 0) * 10) : 50;
  // Sentiment sweet spot: institutions prefer 40-60 range, penalize extremes
  const sentimentDistance = Math.abs(fearGreed.value - 50);
  const sentimentStability = Math.max(0, 100 - sentimentDistance * 2);

  const institutionalScore = Math.round(Math.min(100, Math.max(0,
    (btcStability * 0.35) + (ethStability * 0.25) + (sentimentStability * 0.4)
  )));

  scores['institutional-adoption'] = {
    score: institutionalScore,
    trend: detectTrend('institutional-adoption', institutionalScore),
    drivers: [
      `BTC 24h: ${btcData ? (btcData.price_change_percentage_24h > 0 ? '+' : '') + btcData.price_change_percentage_24h.toFixed(1) + '%' : 'N/A'}`,
      `ETH 24h: ${ethData ? (ethData.price_change_percentage_24h > 0 ? '+' : '') + ethData.price_change_percentage_24h.toFixed(1) + '%' : 'N/A'}`,
      `Sentiment: ${fearGreed.value_classification} (${fearGreed.value})`
    ]
  };

  return scores;
}

/**
 * Detect trend by comparing to historical scores
 */
function detectTrend(narrativeId: string, currentScore: number): 'rising' | 'falling' | 'stable' {
  // Initialize history if needed
  if (!scoreHistory[narrativeId]) {
    scoreHistory[narrativeId] = [];
  }

  // Add current score to history
  scoreHistory[narrativeId].push(currentScore);

  // Keep last 10 scores
  if (scoreHistory[narrativeId].length > 10) {
    scoreHistory[narrativeId].shift();
  }

  // Need at least 3 scores to detect trend
  if (scoreHistory[narrativeId].length < 3) {
    return 'stable';
  }

  // Calculate average of last 3 vs previous 3
  const history = scoreHistory[narrativeId];
  const recentAvg = (history[history.length - 1] + history[history.length - 2] + history[history.length - 3]) / 3;

  if (history.length >= 6) {
    const previousAvg = (history[history.length - 4] + history[history.length - 5] + history[history.length - 6]) / 3;
    const change = recentAvg - previousAvg;

    if (change > 5) return 'rising';
    if (change < -5) return 'falling';
  }

  // Not enough history yet - default to stable (don't confuse level with trend)
  return 'stable';
}

/**
 * Get score for a specific narrative
 */
export async function getNarrativeScore(narrativeId: string): Promise<NarrativeScore | null> {
  const scores = await calculateNarrativeScores();
  return scores[narrativeId] || null;
}
