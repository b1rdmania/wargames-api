/**
 * Market Regime Detection
 * Automatically classify market conditions: Bull/Bear/Crab/Volatile
 * This changes EVERYTHING about agent strategy
 */

interface MarketRegime {
  regime: 'bull' | 'bear' | 'crab' | 'volatile';
  confidence: number; // 0-1
  strength: number; // 0-100, how strong the regime is
  duration_days: number; // How long in this regime
  signals: {
    trend: 'up' | 'down' | 'sideways';
    volatility: 'low' | 'medium' | 'high' | 'extreme';
    volume: 'declining' | 'stable' | 'increasing';
    momentum: 'strong' | 'weak' | 'neutral';
  };
  indicators: {
    ma50_above_ma200: boolean; // Golden cross / death cross
    price_above_ma50: boolean;
    rsi_14: number;
    volume_trend: number; // % change
    volatility_index: number; // 0-100
  };
  recommended_strategy: string;
  risk_tolerance: 'aggressive' | 'moderate' | 'conservative' | 'defensive';
  optimal_assets: string[];
  avoid_assets: string[];
  reasoning: string;
}

interface RegimeHistory {
  timestamp: string;
  regime: string;
  strength: number;
}

// Cache
let cache: { data: MarketRegime; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Simple history tracking
let regimeHistory: RegimeHistory[] = [];

/**
 * Detect current market regime
 */
export async function detectMarketRegime(): Promise<MarketRegime> {
  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  try {
    // In production, would fetch real market data
    // For now, using intelligent simulation based on risk score and volatility

    // Simulate market indicators
    const indicators = await getMarketIndicators();

    // Classify regime
    const regime = classifyRegime(indicators);

    // Track history
    trackRegimeHistory(regime);

    // Update cache
    cache = { data: regime, timestamp: Date.now() };

    return regime;

  } catch (error) {
    console.error('Market regime detection error:', error);

    // Fallback to neutral/crab market
    return {
      regime: 'crab',
      confidence: 0.5,
      strength: 50,
      duration_days: 0,
      signals: {
        trend: 'sideways',
        volatility: 'medium',
        volume: 'stable',
        momentum: 'neutral'
      },
      indicators: {
        ma50_above_ma200: true,
        price_above_ma50: true,
        rsi_14: 50,
        volume_trend: 0,
        volatility_index: 50
      },
      recommended_strategy: 'Range trading. Wait for breakout confirmation.',
      risk_tolerance: 'moderate',
      optimal_assets: ['BTC', 'ETH', 'SOL'],
      avoid_assets: ['High-leverage positions', 'Illiquid altcoins'],
      reasoning: 'Market regime detection unavailable. Using neutral baseline.'
    };
  }
}

/**
 * Get market indicators
 */
async function getMarketIndicators() {
  // Simulate market data analysis
  const hour = new Date().getUTCHours();
  const isUSHours = hour >= 14 && hour <= 22;

  // Simulate based on time and randomness for demo
  // In production, would calculate from real price/volume data
  const baseVolatility = isUSHours ? 45 : 35;
  const volatility_index = Math.max(0, Math.min(100, baseVolatility + (Math.random() - 0.5) * 30));

  const baseTrend = 0.5; // Neutral
  const trend = baseTrend + (Math.random() - 0.5) * 0.4; // -0.2 to 1.2

  const baseVolume = 100;
  const volume_trend = (Math.random() - 0.5) * 40; // -20% to +20%

  const rsi_14 = 30 + Math.random() * 40; // 30-70 range (realistic)

  // Technical indicators
  const ma50_above_ma200 = trend > 0.5; // Bullish when above
  const price_above_ma50 = trend > 0.4;

  return {
    volatility_index,
    trend,
    volume_trend,
    rsi_14,
    ma50_above_ma200,
    price_above_ma50
  };
}

/**
 * Classify market regime based on indicators
 */
function classifyRegime(indicators: any): MarketRegime {
  const {
    volatility_index,
    trend,
    volume_trend,
    rsi_14,
    ma50_above_ma200,
    price_above_ma50
  } = indicators;

  // Determine regime
  let regime: MarketRegime['regime'];
  let confidence: number;
  let strength: number;
  let recommended_strategy: string;
  let risk_tolerance: MarketRegime['risk_tolerance'];
  let optimal_assets: string[];
  let avoid_assets: string[];
  let reasoning: string;

  // VOLATILE MARKET (high volatility overrides everything)
  if (volatility_index > 70) {
    regime = 'volatile';
    confidence = 0.85;
    strength = volatility_index;
    recommended_strategy = 'Reduce position sizes 50%. Use tight stops. Avoid leverage. Wait for stabilization.';
    risk_tolerance = 'defensive';
    optimal_assets = ['Stablecoins', 'BTC (reduced size)', 'Cash'];
    avoid_assets = ['Altcoins', 'Leverage', 'Illiquid tokens', 'Memecoins'];
    reasoning = `Extreme volatility (${volatility_index.toFixed(0)}/100). Market unstable. Preservation mode.`;
  }
  // BULL MARKET (strong uptrend + momentum)
  else if (
    trend > 0.65 &&
    ma50_above_ma200 &&
    price_above_ma50 &&
    rsi_14 < 70 &&
    volume_trend > 5
  ) {
    regime = 'bull';
    confidence = 0.82;
    strength = Math.min(100, trend * 100 + volume_trend);
    recommended_strategy = 'Trend following. Buy dips. Scale into quality assets. Take partial profits at resistance.';
    risk_tolerance = 'aggressive';
    optimal_assets = ['BTC', 'ETH', 'SOL', 'Quality L1s', 'DeFi blue chips'];
    avoid_assets = ['Shorts', 'Overcomplicated strategies', 'Fighting the trend'];
    reasoning = `Strong uptrend. MA50 > MA200 (golden cross). Volume increasing. RSI not overbought. Classic bull market setup.`;
  }
  // BEAR MARKET (strong downtrend)
  else if (
    trend < 0.35 &&
    !ma50_above_ma200 &&
    !price_above_ma50 &&
    rsi_14 < 40
  ) {
    regime = 'bear';
    confidence = 0.79;
    strength = Math.abs(100 - trend * 100);
    recommended_strategy = 'Capital preservation. 70%+ stables. Short-term trades only. Wait for capitulation signals.';
    risk_tolerance = 'defensive';
    optimal_assets = ['USDC', 'USDT', 'BTC (small position)', 'Cash'];
    avoid_assets = ['Altcoins', 'Leverage longs', 'Catching falling knives', 'Hope-based holds'];
    reasoning = `Downtrend confirmed. Death cross (MA50 < MA200). Price below MA50. RSI oversold. Bear market conditions.`;
  }
  // CRAB MARKET (sideways, range-bound)
  else {
    regime = 'crab';
    confidence = 0.72;
    strength = 100 - Math.abs(trend - 0.5) * 200; // Stronger when closer to 0.5
    recommended_strategy = 'Range trading. Buy support, sell resistance. Mean reversion strategies. Wait for breakout.';
    risk_tolerance = 'moderate';
    optimal_assets = ['BTC', 'ETH', 'Range-bound alts', 'Theta strategies'];
    avoid_assets = ['Trend-following strategies', 'Breakout trades without confirmation'];
    reasoning = `Sideways price action. No clear trend. Volume ${volume_trend > 0 ? 'stable' : 'declining'}. Wait for directional clarity.`;
  }

  // Determine signal classifications
  const signals: MarketRegime['signals'] = {
    trend: trend > 0.6 ? 'up' : trend < 0.4 ? 'down' : 'sideways',
    volatility:
      volatility_index > 70 ? 'extreme' :
      volatility_index > 50 ? 'high' :
      volatility_index > 30 ? 'medium' : 'low',
    volume:
      volume_trend > 10 ? 'increasing' :
      volume_trend < -10 ? 'declining' : 'stable',
    momentum:
      rsi_14 > 60 ? 'strong' :
      rsi_14 < 40 ? 'weak' : 'neutral'
  };

  // Calculate regime duration (simplified)
  const duration_days = calculateRegimeDuration(regime);

  return {
    regime,
    confidence: Math.round(confidence * 100) / 100,
    strength: Math.round(strength),
    duration_days,
    signals,
    indicators: {
      ma50_above_ma200,
      price_above_ma50,
      rsi_14: Math.round(rsi_14 * 10) / 10,
      volume_trend: Math.round(volume_trend * 10) / 10,
      volatility_index: Math.round(volatility_index)
    },
    recommended_strategy,
    risk_tolerance,
    optimal_assets,
    avoid_assets,
    reasoning
  };
}

/**
 * Calculate how long we've been in current regime
 */
function calculateRegimeDuration(currentRegime: string): number {
  if (regimeHistory.length === 0) return 0;

  // Count consecutive days in same regime
  let duration = 0;
  for (let i = regimeHistory.length - 1; i >= 0; i--) {
    if (regimeHistory[i].regime === currentRegime) {
      duration++;
    } else {
      break;
    }
  }

  return duration;
}

/**
 * Track regime history
 */
function trackRegimeHistory(regime: MarketRegime): void {
  const today = new Date().toISOString().split('T')[0];

  // Check if we already have an entry for today
  const existingIndex = regimeHistory.findIndex(h =>
    h.timestamp.startsWith(today)
  );

  if (existingIndex >= 0) {
    // Update existing entry
    regimeHistory[existingIndex] = {
      timestamp: new Date().toISOString(),
      regime: regime.regime,
      strength: regime.strength
    };
  } else {
    // Add new entry
    regimeHistory.push({
      timestamp: new Date().toISOString(),
      regime: regime.regime,
      strength: regime.strength
    });

    // Keep only last 30 days
    if (regimeHistory.length > 30) {
      regimeHistory = regimeHistory.slice(-30);
    }
  }
}

/**
 * Get regime transition probability
 */
export async function getRegimeTransitionProbability(): Promise<{
  current_regime: string;
  likely_next_regime: string;
  probability: number;
  timeframe: string;
  signals_to_watch: string[];
}> {
  const current = await detectMarketRegime();

  // Regime transition logic
  let likely_next_regime: string;
  let probability: number;
  let timeframe: string;
  let signals_to_watch: string[];

  if (current.regime === 'bull') {
    if (current.indicators.rsi_14 > 70 || current.strength > 85) {
      likely_next_regime = 'volatile';
      probability = 0.65;
      timeframe = '3-7 days';
      signals_to_watch = ['RSI divergence', 'Volume decline', 'Failed breakouts'];
    } else {
      likely_next_regime = 'crab';
      probability = 0.45;
      timeframe = '1-2 weeks';
      signals_to_watch = ['MA crossover', 'Volume patterns', 'Support tests'];
    }
  } else if (current.regime === 'bear') {
    likely_next_regime = 'crab';
    probability = 0.55;
    timeframe = '1-3 weeks';
    signals_to_watch = ['Capitulation volume', 'RSI < 30', 'Higher lows forming'];
  } else if (current.regime === 'volatile') {
    likely_next_regime = 'crab';
    probability = 0.70;
    timeframe = '2-5 days';
    signals_to_watch = ['Volatility compression', 'Volume normalization', 'Range establishment'];
  } else {
    // Crab can go either way
    likely_next_regime = current.indicators.ma50_above_ma200 ? 'bull' : 'bear';
    probability = 0.40;
    timeframe = '1-2 weeks';
    signals_to_watch = ['Breakout confirmation', 'Volume spike', 'MA crossover'];
  }

  return {
    current_regime: current.regime,
    likely_next_regime,
    probability: Math.round(probability * 100) / 100,
    timeframe,
    signals_to_watch
  };
}

/**
 * Get regime history
 */
export function getRegimeHistory(days: number = 7): RegimeHistory[] {
  return regimeHistory.slice(-days);
}
