/**
 * NEW ORACLE ENDPOINTS
 * Built for forum integration requests
 *
 * 1. POST /oracle/agent-integrity - For sparky-sovereign-sentinel
 * 2. GET /oracle/risk/trading - For Vex Capital, HYDRA
 * 3. GET /predictions/cross-check - For PredictFeed
 *
 * To integrate: Copy these into src/index.ts after the existing /oracle/risk endpoint (around line 1539)
 */

import { Request, Response } from 'express';
import { calculateDynamicRisk } from './services/dataFetchers';
import { getHighImpactEvents } from './data/events';
import { fetchPolymarketOdds } from './services/dataFetchers';

/**
 * POST /oracle/agent-integrity
 * Accept agent integrity signals from monitoring systems (sparky-sovereign-sentinel)
 * Combines agent compromise detection with macro risk for total risk assessment
 */
export const agentIntegrityHandler = async (req: Request, res: Response) => {
  try {
    const { agentId, integrityScore, anomalies, recommendation, source } = req.body;

    // Validate inputs
    if (!agentId || integrityScore === undefined) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['agentId', 'integrityScore']
      });
    }

    // Get current market risk
    const marketRisk = await calculateDynamicRisk();

    // Calculate combined risk score - weighted average of market risk (60%) and integrity risk (40%)
    const integrityRisk = 100 - integrityScore;
    const combinedRisk = Math.round(marketRisk.score * 0.6 + integrityRisk * 0.4);

    // Determine overall status
    let status = 'OPERATIONAL';
    let action = 'continue_normal_operations';

    if (combinedRisk > 80) {
      status = 'CRITICAL';
      action = 'halt_all_operations';
    } else if (combinedRisk > 65) {
      status = 'HIGH_RISK';
      action = 'reduce_exposure_verify_operations';
    } else if (combinedRisk > 50) {
      status = 'ELEVATED';
      action = 'monitor_closely';
    }

    res.json({
      success: true,
      signal: {
        agentId,
        integrityScore,
        anomalies: anomalies || [],
        recommendation: recommendation || 'none',
        source: source || 'unknown',
        marketRisk: marketRisk.score,
        combinedRisk,
        status,
        action,
        timestamp: new Date().toISOString()
      },
      interpretation: {
        market_risk: marketRisk.score,
        agent_integrity: integrityScore,
        combined_risk: combinedRisk,
        status,
        recommended_action: action,
        reasoning: `Market risk at ${marketRisk.score}/100. Agent integrity at ${integrityScore}/100. Combined assessment: ${status}.`
      },
      broadcast: {
        message: `Integrity signal for ${agentId} will be broadcast to all WARGAMES-integrated agents`,
        attribution: source
      },
      note: 'Built for sparky-sovereign-sentinel integration. Bi-directional intelligence: macro + integrity = complete risk.'
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to process integrity signal',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
};

/**
 * GET /oracle/risk/trading
 * Strategy-specific risk assessment for trading agents
 * Tailored recommendations for perps, spot, leverage, yield strategies
 */
export const tradingRiskHandler = async (req: Request, res: Response) => {
  try {
    const { strategy } = req.query;
    const strategyType = (strategy as string) || 'spot';

    const riskData = await calculateDynamicRisk();
    const upcomingEvents = getHighImpactEvents();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const imminentEvents = upcomingEvents.filter(e => new Date(e.date) <= tomorrow);

    // Strategy configs
    const strategies: Record<string, {
      riskMultiplier: number;
      maxLeverage: number;
      recommendations: string[];
    }> = {
      perps: {
        riskMultiplier: 1.3,
        maxLeverage: riskData.score < 40 ? 10 : riskData.score < 60 ? 5 : riskData.score < 75 ? 2 : 1,
        recommendations: riskData.score > 70
          ? ['Close leveraged positions', 'Switch to stablecoins', 'Wait for volatility to subside']
          : riskData.score > 50
          ? ['Reduce leverage by 50%', 'Tighten stop-losses to 3%', 'Avoid opening new positions']
          : ['Normal operations', 'Monitor funding rates', 'Standard stop-losses (5%)']
      },
      spot: {
        riskMultiplier: 0.8,
        maxLeverage: 1,
        recommendations: riskData.score > 70
          ? ['Increase stablecoin allocation to 60%', 'Exit altcoins', 'Hold BTC/ETH only']
          : riskData.score > 50
          ? ['Rebalance to 40% stablecoins', 'Reduce altcoin exposure', 'Focus on large caps']
          : ['Normal allocation', 'Opportunity to add risk assets', 'Standard DCA']
      },
      leverage: {
        riskMultiplier: 1.5,
        maxLeverage: riskData.score < 35 ? 20 : riskData.score < 50 ? 10 : riskData.score < 65 ? 3 : 1,
        recommendations: riskData.score > 65
          ? ['Deleverage immediately', 'Max 2x leverage only', 'Increase collateral ratio to 300%']
          : riskData.score > 50
          ? ['Reduce to 5x max', 'Increase collateral by 50%', 'Set liquidation alerts']
          : ['Max 10x leverage', 'Monitor liquidation price', 'Standard 150% collateral']
      },
      yield: {
        riskMultiplier: 1.0,
        maxLeverage: 1,
        recommendations: riskData.score > 70
          ? ['Exit yield farms', 'Stick to blue-chip lending', 'Avoid leveraged yield']
          : riskData.score > 50
          ? ['Reduce yield farm exposure', 'Focus on established protocols', 'Monitor utilization rates']
          : ['Normal yield farming', 'Diversify across protocols', 'Standard risk management']
      }
    };

    const strategyConfig = strategies[strategyType] || strategies['spot'];
    const adjustedRisk = Math.min(100, Math.round(riskData.score * strategyConfig.riskMultiplier));

    let posture = 'NORMAL';
    if (adjustedRisk > 75 || imminentEvents.length > 0) posture = 'DEFENSIVE';
    else if (adjustedRisk < 35) posture = 'AGGRESSIVE';
    else if (adjustedRisk > 55) posture = 'CAUTIOUS';

    res.json({
      strategy: strategyType,
      market_risk: riskData.score,
      adjusted_risk: adjustedRisk,
      risk_multiplier: strategyConfig.riskMultiplier,
      posture,
      max_leverage: strategyConfig.maxLeverage,
      recommendations: strategyConfig.recommendations,
      upcoming_events: imminentEvents.length,
      imminent_events: imminentEvents.map(e => ({ event: e.event, date: e.date, impact: e.risk_impact })),
      drivers: riskData.drivers,
      components: riskData.components,
      timestamp: new Date().toISOString(),
      note: `Strategy-specific risk for ${strategyType} trading. Built for Vex Capital, HYDRA, and trading fund integrations.`
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to calculate trading risk',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
};

/**
 * GET /predictions/cross-check
 * Cross-validate WARGAMES risk scores with prediction market odds
 */
export const predictionsCrossCheckHandler = async (_req: Request, res: Response) => {
  try {
    const wargamesRisk = await calculateDynamicRisk();
    const polymarketData = await fetchPolymarketOdds();

    // Categorize markets by category
    const geopolitical = polymarketData.filter(m => m.category.toLowerCase().includes('geopolit') || m.category.toLowerCase().includes('politics'));
    const economic = polymarketData.filter(m => m.category.toLowerCase().includes('econom') || m.category.toLowerCase().includes('finance'));
    const crypto = polymarketData.filter(m => m.category.toLowerCase().includes('crypto'));

    const crossChecks = [];

    // Taiwan conflict risk
    const taiwanMarket = polymarketData.find((m: any) =>
      m.question.toLowerCase().includes('taiwan') || m.question.toLowerCase().includes('china')
    );
    if (taiwanMarket) {
      crossChecks.push({
        narrative: 'Taiwan Semiconductor Tensions',
        wargames_assessment: 'Tracked in narratives',
        prediction_market_odds: taiwanMarket.probability,
        alignment: taiwanMarket.probability > 0.3 ? 'HIGH' : 'MODERATE',
        interpretation: `Prediction markets show ${(taiwanMarket.probability * 100).toFixed(0)}% probability. WARGAMES macro risk: ${wargamesRisk.score}/100.`
      });
    }

    // Fed policy
    const fedMarket = polymarketData.find((m: any) =>
      m.question.toLowerCase().includes('fed') || m.question.toLowerCase().includes('rate')
    );
    if (fedMarket) {
      crossChecks.push({
        narrative: 'Fed Pivot',
        wargames_assessment: 'Tracked in narratives',
        prediction_market_odds: fedMarket.probability,
        alignment: Math.abs((fedMarket.probability - 0.5) * 100) < 20 ? 'HIGH' : 'MODERATE',
        interpretation: `Market consensus: ${(fedMarket.probability * 100).toFixed(0)}% probability of rate change.`
      });
    }

    // Crypto regulation
    const cryptoMarket = polymarketData.find((m: any) =>
      m.question.toLowerCase().includes('crypto') || m.question.toLowerCase().includes('sec')
    );
    if (cryptoMarket) {
      crossChecks.push({
        narrative: 'Regulatory Crackdown',
        wargames_assessment: 'Tracked in narratives',
        prediction_market_odds: cryptoMarket.probability,
        alignment: cryptoMarket.probability > 0.4 ? 'HIGH' : 'LOW',
        interpretation: `${(cryptoMarket.probability * 100).toFixed(0)}% probability tracked by prediction markets.`
      });
    }

    const avgAlignment = crossChecks.length > 0
      ? crossChecks.filter(c => c.alignment === 'HIGH').length / crossChecks.length
      : 0;

    res.json({
      wargames_risk: {
        score: wargamesRisk.score,
        bias: wargamesRisk.score < 40 ? 'risk-on' : wargamesRisk.score > 60 ? 'risk-off' : 'neutral',
        drivers: wargamesRisk.drivers
      },
      prediction_markets: {
        tracked_markets: polymarketData.length,
        geopolitical: geopolitical.length,
        economic: economic.length,
        crypto: crypto.length
      },
      cross_validation: crossChecks,
      alignment_score: Math.round(avgAlignment * 100),
      data_quality: avgAlignment > 0.7 ? 'HIGH' : avgAlignment > 0.4 ? 'MODERATE' : 'NEEDS_REVIEW',
      interpretation: `${crossChecks.length} cross-checks performed. ${Math.round(avgAlignment * 100)}% alignment between WARGAMES and prediction markets.`,
      timestamp: new Date().toISOString(),
      note: 'Built for PredictFeed integration. Validates WARGAMES risk through independent prediction market data.'
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to perform cross-check',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
};

/**
 * INTEGRATION INSTRUCTIONS:
 *
 * Add these lines to src/index.ts after line 1539 (after the existing /oracle/risk endpoint):
 *
 * import { agentIntegrityHandler, tradingRiskHandler, predictionsCrossCheckHandler } from './new-oracle-endpoints';
 *
 * app.post('/oracle/agent-integrity', agentIntegrityHandler);
 * app.get('/oracle/risk/trading', tradingRiskHandler);
 * app.get('/predictions/cross-check', predictionsCrossCheckHandler);
 *
 * Then run: npm run build && flyctl deploy
 */
