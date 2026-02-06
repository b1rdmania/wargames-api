/**
 * Verifiable Risk Timeline
 * Predict → Prescribe → Prove
 *
 * The breakthrough: Every decision gets an on-chain receipt BEFORE the outcome.
 * Agents can prove their decisions were made with WARGAMES intelligence.
 */

import crypto from 'crypto';

// ============================================================================
// PHASE 1: 48H EVENT IMPACT FORECAST
// ============================================================================

interface ForecastWindow {
  windowId: string;
  windowStart: string;
  windowEnd: string;
  eventType: 'FOMC' | 'CPI' | 'jobs' | 'earnings' | 'network' | 'protocol' | 'market_hours';
  eventName: string;
  expectedVolatility: number; // 0-100
  confidence: number; // 0-1
  riskDirection: 'risk_on' | 'risk_off' | 'mixed';
  drivers: string[];
  historicalImpact?: {
    avgPriceMove: number; // %
    avgVolumeSpike: number; // %
    occurrences: number;
  };
}

interface Forecast48h {
  generatedAt: string;
  forecastId: string;
  validUntil: string;
  windows: ForecastWindow[];
  overallRiskScore: number; // 0-100 for next 48h
  recommendation: string;
}

/**
 * Generate 48-hour risk forecast
 */
export async function generate48hForecast(): Promise<Forecast48h> {
  const now = new Date();
  const forecastId = generateForecastId();
  const validUntil = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

  // No upcoming events - this feature has been deprecated
  const upcomingEvents: any[] = [];
  const windows: ForecastWindow[] = [];

  // Add event-driven windows
  for (const event of upcomingEvents) {
    const eventTime = new Date(event.date);
    const preEventWindow = new Date(eventTime.getTime() - 2 * 60 * 60 * 1000); // 2h before
    const postEventWindow = new Date(eventTime.getTime() + 2 * 60 * 60 * 1000); // 2h after

    windows.push({
      windowId: `event_${event.id}`,
      windowStart: preEventWindow.toISOString(),
      windowEnd: postEventWindow.toISOString(),
      eventType: event.category === 'monetary_policy' ? 'FOMC' :
                 event.category === 'economic_data' ? 'CPI' :
                 event.category === 'earnings' ? 'earnings' : 'market_hours',
      eventName: event.title,
      expectedVolatility: event.predicted_impact,
      confidence: event.confidence,
      riskDirection: event.impact_direction === 'bullish' ? 'risk_on' :
                     event.impact_direction === 'bearish' ? 'risk_off' : 'mixed',
      drivers: [
        `${event.title}`,
        `Historical impact: ${event.historical_volatility.avg_price_change_24h.toFixed(1)}% avg move`,
        event.recommended_positioning
      ],
      historicalImpact: {
        avgPriceMove: event.historical_volatility.avg_price_change_24h,
        avgVolumeSpike: event.historical_volatility.avg_volume_spike,
        occurrences: event.historical_volatility.past_occurrences
      }
    });
  }

  // Add network congestion windows
  const { getNetworkHealth } = await import('./networkHealth');
  const networkHealth = await getNetworkHealth();

  if (networkHealth.congestion_prediction.likelihood_next_hour > 60) {
    const congestionStart = new Date(now.getTime() + 30 * 60 * 1000); // 30min from now
    const congestionEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3h from now

    windows.push({
      windowId: `network_congestion_${Date.now()}`,
      windowStart: congestionStart.toISOString(),
      windowEnd: congestionEnd.toISOString(),
      eventType: 'network',
      eventName: 'Solana Network Congestion',
      expectedVolatility: 45,
      confidence: networkHealth.congestion_prediction.confidence,
      riskDirection: 'risk_off',
      drivers: [
        `${networkHealth.congestion_prediction.likelihood_next_hour}% congestion probability`,
        `Current TPS: ${networkHealth.metrics.tps_current}`,
        'Recommended: Use high priority fees or delay transactions'
      ]
    });
  }

  // Add market hours windows (predictable patterns)
  const marketHoursWindows = generateMarketHoursWindows(now, 48);
  windows.push(...marketHoursWindows);

  // Sort by window start time
  windows.sort((a, b) =>
    new Date(a.windowStart).getTime() - new Date(b.windowStart).getTime()
  );

  // Calculate overall 48h risk score
  const avgVolatility = windows.reduce((sum, w) => sum + w.expectedVolatility, 0) / windows.length;
  const maxVolatility = Math.max(...windows.map(w => w.expectedVolatility));
  const overallRiskScore = Math.round((avgVolatility * 0.6 + maxVolatility * 0.4));

  // Generate recommendation
  let recommendation: string;
  if (overallRiskScore > 75) {
    recommendation = 'HIGH RISK 48h period. Reduce leverage 50%+. Multiple high-impact events. Consider defensive positioning.';
  } else if (overallRiskScore > 60) {
    recommendation = 'Elevated risk next 48h. Use caution. Reduce position sizes 20-30%. Monitor key event windows closely.';
  } else if (overallRiskScore > 40) {
    recommendation = 'Moderate risk environment. Normal positioning acceptable. Watch for event-driven volatility spikes.';
  } else {
    recommendation = 'Low risk 48h period. Favorable conditions for trading. Few major catalysts. Normal position sizing appropriate.';
  }

  return {
    generatedAt: now.toISOString(),
    forecastId,
    validUntil,
    windows,
    overallRiskScore,
    recommendation
  };
}

/**
 * Generate market hours windows (predictable intraday patterns)
 */
function generateMarketHoursWindows(startTime: Date, hoursAhead: number): ForecastWindow[] {
  const windows: ForecastWindow[] = [];
  const endTime = new Date(startTime.getTime() + hoursAhead * 60 * 60 * 1000);

  // Key market hours patterns
  const patterns = [
    { hour: 14, name: 'US Market Open', volatility: 65, direction: 'mixed' as const },
    { hour: 18, name: 'US Midday', volatility: 45, direction: 'risk_on' as const },
    { hour: 21, name: 'US Market Close', volatility: 55, direction: 'mixed' as const },
    { hour: 2, name: 'Asian Hours', volatility: 35, direction: 'risk_off' as const }
  ];

  let currentTime = new Date(startTime);
  while (currentTime < endTime) {
    const hour = currentTime.getUTCHours();

    for (const pattern of patterns) {
      if (hour === pattern.hour) {
        const windowStart = new Date(currentTime);
        const windowEnd = new Date(currentTime.getTime() + 2 * 60 * 60 * 1000);

        if (windowEnd <= endTime) {
          windows.push({
            windowId: `market_hours_${currentTime.toISOString()}`,
            windowStart: windowStart.toISOString(),
            windowEnd: windowEnd.toISOString(),
            eventType: 'market_hours',
            eventName: pattern.name,
            expectedVolatility: pattern.volatility,
            confidence: 0.75,
            riskDirection: pattern.direction,
            drivers: [
              `Historical ${pattern.name} volatility pattern`,
              'Predictable intraday liquidity shift'
            ]
          });
        }
      }
    }

    currentTime = new Date(currentTime.getTime() + 60 * 60 * 1000); // Advance 1 hour
  }

  return windows;
}

/**
 * Generate unique forecast ID
 */
function generateForecastId(): string {
  return `forecast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// PHASE 2: STRATEGY POSTURE ENGINE
// ============================================================================

interface StrategyPosture {
  strategy: 'trader' | 'lp' | 'yield' | 'market-maker';
  windowId: string;
  windowStart: string;
  windowEnd: string;
  positionMultiplier: number; // 0-2 (0.5 = reduce 50%, 1 = normal, 1.5 = increase 50%)
  maxLeverage: number; // Max leverage multiplier
  stablecoinAllocationTarget: number; // % of portfolio
  hedgeRecommended: boolean;
  doNotTradeWindow: boolean;
  specificActions: string[];
  reasoning: string;
}

interface ForecastPosture {
  forecastId: string;
  strategy: string;
  generatedAt: string;
  windowPostures: StrategyPosture[];
  overallRecommendation: string;
}

/**
 * Generate strategy-specific posture for 48h forecast
 */
export async function generate48hPosture(
  strategy: 'trader' | 'lp' | 'yield' | 'market-maker'
): Promise<ForecastPosture> {
  const forecast = await generate48hForecast();
  const windowPostures: StrategyPosture[] = [];

  for (const window of forecast.windows) {
    const posture = calculatePostureForWindow(window, strategy);
    windowPostures.push(posture);
  }

  // Generate overall recommendation
  const avgMultiplier = windowPostures.reduce((sum, p) => sum + p.positionMultiplier, 0) / windowPostures.length;
  const doNotTradeCount = windowPostures.filter(p => p.doNotTradeWindow).length;

  let overallRecommendation: string;
  if (doNotTradeCount > windowPostures.length / 3) {
    overallRecommendation = `DEFENSIVE MODE: ${doNotTradeCount}/${windowPostures.length} windows flagged as do-not-trade. Prioritize capital preservation.`;
  } else if (avgMultiplier < 0.7) {
    overallRecommendation = `REDUCED EXPOSURE: Average position multiplier ${avgMultiplier.toFixed(2)}x. Scale down across all windows.`;
  } else if (avgMultiplier > 1.2) {
    overallRecommendation = `AGGRESSIVE MODE: Favorable conditions. Average multiplier ${avgMultiplier.toFixed(2)}x. Capitalize on opportunities.`;
  } else {
    overallRecommendation = `NORMAL POSITIONING: Standard risk/reward profile. Position sizing ${avgMultiplier.toFixed(2)}x baseline.`;
  }

  return {
    forecastId: forecast.forecastId,
    strategy,
    generatedAt: new Date().toISOString(),
    windowPostures,
    overallRecommendation
  };
}

/**
 * Calculate posture for specific window and strategy
 */
function calculatePostureForWindow(
  window: ForecastWindow,
  strategy: 'trader' | 'lp' | 'yield' | 'market-maker'
): StrategyPosture {
  const volatility = window.expectedVolatility;
  const confidence = window.confidence;

  // Base rules (can be overridden by strategy)
  let positionMultiplier = 1.0;
  let maxLeverage = 2.0;
  let stablecoinTarget = 20;
  let hedgeRecommended = false;
  let doNotTrade = false;
  let actions: string[] = [];

  // Low confidence = reduce across all strategies
  if (confidence < 0.6) {
    positionMultiplier *= 0.7;
    actions.push('Low confidence forecast - reduce size');
  }

  // High volatility adjustments by strategy
  if (volatility > 80) {
    // Critical volatility
    switch (strategy) {
      case 'trader':
        positionMultiplier = 0.3;
        maxLeverage = 1.0;
        stablecoinTarget = 60;
        hedgeRecommended = true;
        doNotTrade = window.riskDirection === 'mixed';
        actions.push('Critical volatility: Reduce to 30% normal size');
        actions.push('Use tight stops');
        actions.push('Consider hedging with stables or inverse positions');
        break;
      case 'lp':
        positionMultiplier = 0.5;
        stablecoinTarget = 40;
        actions.push('High IL risk: Consider single-sided or stable pairs only');
        actions.push('Withdraw from volatile pairs before window');
        break;
      case 'yield':
        positionMultiplier = 0.8;
        stablecoinTarget = 30;
        actions.push('Maintain positions but avoid new entries');
        actions.push('Favor stable/low-volatility yields');
        break;
      case 'market-maker':
        positionMultiplier = 0.4;
        hedgeRecommended = true;
        doNotTrade = true;
        actions.push('HALT: Extreme volatility = unpredictable spreads');
        actions.push('Widen spreads 3x or pause until window passes');
        break;
    }
  } else if (volatility > 60) {
    // High volatility
    switch (strategy) {
      case 'trader':
        positionMultiplier = 0.6;
        maxLeverage = 1.5;
        stablecoinTarget = 40;
        actions.push('Elevated volatility: Reduce to 60% size');
        actions.push('Trail stops aggressively');
        break;
      case 'lp':
        positionMultiplier = 0.7;
        stablecoinTarget = 30;
        actions.push('Moderate IL risk: Monitor pool balances closely');
        break;
      case 'yield':
        positionMultiplier = 0.9;
        actions.push('Hold existing positions');
        break;
      case 'market-maker':
        positionMultiplier = 0.7;
        actions.push('Widen spreads 50%');
        actions.push('Reduce inventory');
        break;
    }
  } else if (volatility > 40) {
    // Moderate volatility
    positionMultiplier = 0.85;
    actions.push('Normal volatility with slight caution');
  } else {
    // Low volatility - opportunity
    switch (strategy) {
      case 'trader':
        positionMultiplier = 1.2;
        maxLeverage = 3.0;
        stablecoinTarget = 10;
        actions.push('Low volatility: Favorable for position sizing');
        actions.push('Can use moderate leverage');
        break;
      case 'lp':
        positionMultiplier = 1.1;
        actions.push('Good conditions for liquidity provision');
        actions.push('Low IL risk');
        break;
      case 'yield':
        positionMultiplier = 1.0;
        actions.push('Optimal conditions for yield farming');
        break;
      case 'market-maker':
        positionMultiplier = 1.3;
        actions.push('Tighten spreads for volume');
        actions.push('Increase inventory');
        break;
    }
  }

  // Event-specific adjustments
  if (window.eventType === 'FOMC' || window.eventType === 'CPI') {
    doNotTrade = true;
    actions.push('MAJOR CATALYST: Do not trade 1h before/after event');
  }

  if (window.eventType === 'network' && strategy === 'trader') {
    actions.push('Network congestion: Increase priority fees or delay non-urgent txs');
  }

  // Generate reasoning
  let reasoning = `${window.eventName}: ${volatility} expected volatility, ${(confidence * 100).toFixed(0)}% confidence. `;
  reasoning += `Strategy: ${strategy}. `;
  reasoning += `Position multiplier: ${positionMultiplier.toFixed(2)}x. `;
  reasoning += `Risk direction: ${window.riskDirection}.`;

  return {
    strategy,
    windowId: window.windowId,
    windowStart: window.windowStart,
    windowEnd: window.windowEnd,
    positionMultiplier: Math.round(positionMultiplier * 100) / 100,
    maxLeverage: Math.round(maxLeverage * 10) / 10,
    stablecoinAllocationTarget: Math.round(stablecoinTarget),
    hedgeRecommended,
    doNotTradeWindow: doNotTrade,
    specificActions: actions,
    reasoning
  };
}

// Store for receipts (in production, use database)
const receipts: Map<string, any> = new Map();

// ============================================================================
// PHASE 3: RISK ORACLE RECEIPTS (ON-CHAIN PROOF)
// ============================================================================

interface ReceiptInput {
  agentId: string;
  forecastWindowId: string;
  strategy: string;
  recommendationPayload: any;
  inputSnapshot: {
    riskScore: number;
    components: any;
    eventIds: string[];
  };
}

interface Receipt {
  receiptId: string;
  receiptHash: string;
  agentId: string;
  forecastWindowId: string;
  strategy: string;
  payload: any;
  inputSnapshot: any;
  timestamp: string;
  signature?: string; // Solana tx signature
  slot?: number; // Solana slot number
}

/**
 * Create verifiable receipt for a decision
 */
export async function createReceipt(input: ReceiptInput): Promise<Receipt> {
  const receiptId = `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const timestamp = new Date().toISOString();

  // Canonicalize JSON for consistent hashing
  const canonicalPayload = JSON.stringify({
    agentId: input.agentId,
    forecastWindowId: input.forecastWindowId,
    strategy: input.strategy,
    recommendationPayload: input.recommendationPayload,
    inputSnapshot: input.inputSnapshot,
    timestamp
  }, null, 0); // No whitespace

  // Generate receipt hash
  const receiptHash = crypto
    .createHash('sha256')
    .update(canonicalPayload)
    .digest('hex');

  const receipt: Receipt = {
    receiptId,
    receiptHash,
    agentId: input.agentId,
    forecastWindowId: input.forecastWindowId,
    strategy: input.strategy,
    payload: input.recommendationPayload,
    inputSnapshot: input.inputSnapshot,
    timestamp
  };

  // Anchor on Solana (Phase 3b)
  try {
    const { anchorReceiptOnChain } = await import('./solanaReceipts');
    const anchor = await anchorReceiptOnChain(receiptId, receiptHash);
    receipt.signature = anchor.signature;
    receipt.slot = anchor.slot;
  } catch (error) {
    console.error('Failed to anchor receipt on-chain:', error);
    // Continue without on-chain anchoring (graceful degradation)
  }

  receipts.set(receiptId, receipt);

  return receipt;
}

/**
 * Get receipt by ID
 */
export function getReceipt(receiptId: string): Receipt | null {
  return receipts.get(receiptId) || null;
}

/**
 * Verify receipt integrity
 */
export async function verifyReceipt(receiptId: string): Promise<{
  valid: boolean;
  receipt: Receipt | null;
  recomputedHash: string;
  matches: boolean;
  onChainVerified?: boolean;
}> {
  const receipt = receipts.get(receiptId);

  if (!receipt) {
    return {
      valid: false,
      receipt: null,
      recomputedHash: '',
      matches: false
    };
  }

  // Recompute hash
  const canonicalPayload = JSON.stringify({
    agentId: receipt.agentId,
    forecastWindowId: receipt.forecastWindowId,
    strategy: receipt.strategy,
    recommendationPayload: receipt.payload,
    inputSnapshot: receipt.inputSnapshot,
    timestamp: receipt.timestamp
  }, null, 0);

  const recomputedHash = crypto
    .createHash('sha256')
    .update(canonicalPayload)
    .digest('hex');

  const matches = recomputedHash === receipt.receiptHash;

  // Check on-chain verification if signature exists
  let onChainVerified = false;
  if (receipt.signature) {
    try {
      const { verifyReceiptOnChain } = require('./solanaReceipts');
      const onChainResult = await verifyReceiptOnChain(receipt.signature);
      onChainVerified = onChainResult.found && onChainResult.receiptHash === receipt.receiptHash;
    } catch (error) {
      console.error('Failed to verify on-chain:', error);
    }
  }

  return {
    valid: matches,
    receipt,
    recomputedHash,
    matches,
    onChainVerified
  };
}

/**
 * Get all receipts for an agent
 */
export function getAgentReceipts(agentId: string): Receipt[] {
  return Array.from(receipts.values())
    .filter(r => r.agentId === agentId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
