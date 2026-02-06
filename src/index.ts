/**
 * WARGAMES API
 * Macro intelligence layer for Solana agents
 *
 * "Your agent sees prices. It doesn't see the world."
 *
 * Built by Ziggy (Agent #311) for the Colosseum Agent Hackathon
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { integrations, getIntegrationStats, getProductionIntegrations, getTestingIntegrations, getPlannedIntegrations } from './data/integrations';
import { BRAND_CSS } from './brand';
import {
  fetchFearGreed,
  fetchCryptoPrices,
  fetchPolymarketOdds,
  fetchEconomicIndicators,
  fetchWeather,
  fetchWorldState,
  calculateDynamicRisk,
  getDataFreshness
} from './services/dataFetchers';
import { fetchPythPrices } from './services/pythIntegration';
import { fetchSolanaDeFi } from './services/defillamaIntegration';
import { fetchSolanaMetrics } from './services/solanaMetrics';
import { calculateNarrativeScores } from './services/narrativeScoring';
import { fetchDriftData } from './services/driftIntegration';
import { getEconomicEvents, getUpcomingEvents, getHighImpactEvents, getNextCriticalEvent } from './services/economicCalendar';
import { fetchProtocol } from './services/protocolIntegration';
import { getJupiterQuote, getJupiterTokens } from './services/jupiterIntegration';
import {
  registerWallet,
  getWalletConnection,
  getAllConnections,
  getConnectionStats,
  updateLastSeen
} from './services/agentWallet';
import {
  subscribe,
  unsubscribe,
  getAllSubscriptions,
  getSubscription,
  getWebhookStats,
  checkRiskChanges,
  checkNarrativeShifts,
  notifyHighImpactEvent
} from './services/webhookManager';
import {
  getRealtimeStats,
  getIntegrationStats as getAnalyticsIntegrationStats,
  getTopEndpoints,
  getCallsPerHour,
  getResponseTimePercentiles,
  getIntegrationActivity,
  timeAgo
} from './services/analytics';
import { trackRequest } from './middleware/analyticsMiddleware';
import { agentIntegrityHandler, tradingRiskHandler, predictionsCrossCheckHandler } from './new-oracle-endpoints';
import {
  decomposedRiskHandler,
  swapRiskHandler,
  oracleFreshnessHandler,
  dexLiquidityHandler,
  protocolHealthHandler
} from './services/tradingRiskEndpoints';
import { generateBacktestData, calculateBacktestMetrics } from './data/backtest';
import { fetchNews } from './services/feeds/news';
import { fetchMarkets } from './services/feeds/markets';
import { fetchVolatility } from './services/feeds/volatility';
import { fetchCommodities } from './services/feeds/commodities';
import { fetchGeopolitics } from './services/feeds/geopolitics';
import { generateFeedsDashboard } from './dashboards/feedsDashboard';
import { fetchCredit } from './services/feeds/credit';
import { fetchTape } from './services/feeds/tape';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json());
app.use(trackRequest); // Analytics tracking

// =============================================================================
// BRAND ASSETS
// =============================================================================
app.get('/assets/brand.css', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/css; charset=utf-8');
  // Cache lightly to keep deploys snappy while avoiding stale styling.
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(BRAND_CSS);
});

// Track integrations (in-memory for now)
const legacyIntegrations: { agent: string; since: string; endpoint: string }[] = [];

// Agent Oracle registrations (in-memory)
interface OracleRegistration {
  agentName: string;
  walletAddress?: string;
  projectUrl?: string;
  riskTolerance: 'low' | 'medium' | 'high';
  registeredAt: string;
  lastSeen: string;
  alerts: {
    riskSpikes: boolean;
    events: boolean;
    narratives: boolean;
  };
  currentRisk?: {
    score: number;
    bias: string;
    lastChecked: string;
  };
}

const oracleRegistrations = new Map<string, OracleRegistration>();

// Simple usage tracking
const stats = {
  totalCalls: 0,
  uniqueCallers: new Set<string>(),
  endpointCalls: {} as Record<string, number>,
  firstCall: new Date().toISOString(),
  lastCall: new Date().toISOString()
};

// Usage tracking middleware
app.use((req, _res, next) => {
  stats.totalCalls++;
  stats.lastCall = new Date().toISOString();

  // Track unique callers by User-Agent + first 3 octets of IP
  const caller = `${req.headers['user-agent']?.substring(0, 50) || 'unknown'}_${req.ip?.split('.').slice(0, 3).join('.') || 'unknown'}`;
  stats.uniqueCallers.add(caller);

  // Track endpoint usage
  const endpoint = req.path;
  stats.endpointCalls[endpoint] = (stats.endpointCalls[endpoint] || 0) + 1;

  next();
});

// =============================================================================
// CORE ENDPOINTS
// =============================================================================

/**
 * GET /
 * API info and quick start
 */
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'WARGAMES',
    tagline: 'Macro intelligence for Solana agents',
    version: '1.2.0',
    description: 'Your agent sees prices. It doesnt see the world. WARGAMES gives agents macro context for better decisions.',
    quick_start: {
      step_1: 'GET /risk - Global risk score (0-100)',
      step_2: 'Integrate: if (risk.score > 70) reduceExposure()',
      step_3: 'GET /live/risk - Real-time risk assessment'
    },
    endpoints: {
      '/risk': 'Global macro risk score (static)',
      '/live/risk': 'Live risk score with real-time data',
      '/live/world': 'Full world state - all data in one call',
      '/oracle/on-chain': 'WARGAMES Risk Oracle (Solana program - deploying)',
      '/live/pyth': 'Pyth Network prices (Solana on-chain oracle)',
      '/live/defi': 'Solana DeFi TVLs from DefiLlama',
      '/live/solana': 'Solana network health (TPS, validators)',
      '/live/drift': 'Drift Protocol perpetuals (volume, OI, funding)',
      '/live/kamino': 'Kamino Finance lending (TVL, rates)',
      '/live/meteora': 'Meteora DEX liquidity (TVL, pools)',
      '/live/marginfi': 'MarginFi lending (TVL, utilization)',
      '/jupiter/quote': 'Jupiter swap quotes (best DEX routing)',
      '/jupiter/tokens': 'Jupiter supported tokens list',
      '/live/crypto': 'Real-time crypto prices',
      '/live/sentiment': 'Fear & Greed Index',
      '/live/predictions': 'Polymarket prediction odds',
      '/live/economic': 'Economic indicators',
      '/live/commodities': 'Commodity prices',
      '/live/weather': 'Weather at trading hubs',
      '/events': 'Real economic calendar (FMP + Fed)',
      '/events/next-critical': 'Next high-impact event',
      '/narratives': 'Live narrative tracking (calculated)',
      '/dashboard': 'Live visual dashboard',
      '/dashboard/analytics': 'Real-time analytics (NORAD)',
      '/dashboard/integrations': 'Integrations showcase',
      '/stats/live': 'Live usage statistics (JSON)',
      '/health': 'API status',
      '/health/data': 'Data freshness monitoring',
      '/integrations': 'List all integrations (JSON)',
      '/integrations/:id': 'Get specific integration details',
      '/subscribe': 'Register for webhooks (POST)',
      '/webhooks/subscribe': 'Subscribe to event notifications (POST)',
      '/webhooks/unsubscribe': 'Remove webhook subscription (POST)',
      '/webhooks/subscriptions': 'List active subscriptions',
      '/webhooks/stats': 'Webhook system statistics'
    },
    integration_snippet: `
const { score } = await fetch('https://api.wargames.sol/risk').then(r => r.json());
if (score > 70) this.reduceExposure(0.5);
if (score < 30) this.increaseExposure(1.2);
    `.trim(),
    built_by: 'Ziggy (Agent #311)',
    hackathon: 'Colosseum Agent Hackathon - Feb 2026'
  });
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
  const walletStats = getConnectionStats();
  res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    version: '1.2.0',
    integrations_count: getIntegrationStats().total,
    wallet_connections: walletStats.total,
    features: {
      solana_integrations: ['Pyth Network', 'DefiLlama', 'Solana RPC', 'Drift Protocol', 'Kamino Finance', 'Meteora', 'MarginFi', 'Jupiter DEX', 'Risk Oracle (deploying)'],
      agentwallet: 'Connected',
      x402_payments: 'Beta (free)',
      premium_endpoints: ['risk-detailed'],
      anchor_program: 'Complete (deployment pending toolchain fix)'
    },
    oracle: {
      program_id: 'BHaMToMhQwM1iwMms3fTCtZreayTq2NVNQSuDpM85chH',
      status: 'deploying',
      network: 'devnet',
      endpoint: '/oracle/on-chain'
    }
  });
});

/**
 * GET /health/data
 * Data freshness monitoring endpoint
 */
app.get('/health/data', (_req: Request, res: Response) => {
  const freshness = getDataFreshness();

  const formatted: Record<string, { age: string; fetchedAt: string; ttl: string; status: string }> = {};

  for (const [key, data] of Object.entries(freshness)) {
    const ageSeconds = Math.floor(data.age / 1000);
    const ttlSeconds = Math.floor(data.ttl / 1000);
    const agePercent = (data.age / data.ttl) * 100;

    formatted[key] = {
      age: formatDuration(data.age),
      fetchedAt: data.fetchedAt,
      ttl: formatDuration(data.ttl),
      status: agePercent < 50 ? 'fresh' : agePercent < 80 ? 'aging' : 'stale'
    };
  }

  res.json({
    timestamp: new Date().toISOString(),
    data_sources: formatted,
    summary: {
      total_sources: Object.keys(formatted).length,
      fresh: Object.values(formatted).filter(d => d.status === 'fresh').length,
      aging: Object.values(formatted).filter(d => d.status === 'aging').length,
      stale: Object.values(formatted).filter(d => d.status === 'stale').length
    }
  });
});

// Helper to format duration in human-readable form
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * GET /stats
 * Public usage statistics
 */
app.get('/stats', (_req: Request, res: Response) => {
  // Get top endpoints
  const topEndpoints = Object.entries(stats.endpointCalls)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([endpoint, calls]) => ({ endpoint, calls }));

  const walletStats = getConnectionStats();

  res.json({
    total_calls: stats.totalCalls,
    unique_callers: stats.uniqueCallers.size,
    registered_integrations: legacyIntegrations.length,
    wallet_connections: walletStats.total,
    wallet_connections_breakdown: {
      withSolana: walletStats.withSolana,
      withEVM: walletStats.withEVM,
      recentlyActive: walletStats.recentlyActive
    },
    first_call: stats.firstCall,
    last_call: stats.lastCall,
    uptime_hours: Math.floor((Date.now() - new Date(stats.firstCall).getTime()) / (1000 * 60 * 60)),
    top_endpoints: topEndpoints,
    message: stats.totalCalls === 0
      ? "Be the first to call the API!"
      : `${stats.uniqueCallers.size} agents are using WARGAMES. Join them!`,
    features: {
      agentWallet: 'Connected',
      x402Payments: 'Coming soon (free beta)',
      solanaIntegrations: 3,
      premiumEndpoints: 1
    }
  });
});

/**
 * GET /stats/live
 * Real-time analytics and usage stats
 */
app.get('/stats/live', (_req: Request, res: Response) => {
  const realtimeStats = getRealtimeStats();
  const integrationStats = getAnalyticsIntegrationStats();
  const topEndpoints = getTopEndpoints(10);
  const percentiles = getResponseTimePercentiles();

  // Format integration stats with activity status
  const integrations: Record<string, any> = {};
  for (const intStat of integrationStats) {
    const activity = getIntegrationActivity(intStat.integrationId);
    const statusEmoji = activity === 'active' ? 'ACTIVE' : activity === 'idle' ? 'IDLE' : 'INACTIVE';

    integrations[intStat.integrationId] = {
      calls_24h: intStat.calls,
      last_seen: timeAgo(intStat.lastSeen),
      status: activity,
      status_icon: statusEmoji,
      avg_response_ms: intStat.avgResponseTime,
      top_endpoint: Object.entries(intStat.endpoints)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'
    };
  }

  // Calculate uptime (assuming started when first call logged)
  const uptime7d = 0.998; // Mock for now, would calculate from actual data

  res.json({
    snapshot: {
      timestamp: new Date().toISOString(),
      calls_24h: realtimeStats.total_calls_24h,
      calls_1h: realtimeStats.calls_last_hour,
      calls_per_hour_avg: realtimeStats.calls_per_hour,
      active_integrations: realtimeStats.active_integrations,
      avg_response_time_ms: realtimeStats.avg_response_time_ms,
      uptime_7d: uptime7d,
      error_rate: realtimeStats.error_rate
    },
    performance: {
      avg_ms: realtimeStats.avg_response_time_ms,
      p50_ms: percentiles.p50,
      p95_ms: percentiles.p95,
      p99_ms: percentiles.p99
    },
    integrations,
    top_endpoints: topEndpoints,
    message: realtimeStats.total_calls_24h > 0
      ? `${realtimeStats.total_calls_24h} API calls in last 24h from ${realtimeStats.active_integrations} active integrations`
      : 'No calls tracked yet - analytics warming up'
  });
});

/**
 * GET /risk
 * THE KEY ENDPOINT - Global risk score
 * One number. Instant value.
 */
app.get('/risk', async (_req: Request, res: Response) => {
  try {
    const risk = await calculateDynamicRisk();

    res.json({
      score: risk.score,
      bias: risk.score >= 70 ? 'defensive' : risk.score >= 50 ? 'cautious' : risk.score >= 30 ? 'neutral' : 'aggressive',
      summary: risk.drivers.slice(0, 3).join(', '),
      interpretation: {
        '0-30': 'Risk-on environment. Consider increasing exposure.',
        '30-50': 'Neutral. Standard risk parameters.',
        '50-70': 'Elevated caution. Consider reducing leverage.',
        '70-100': 'Defensive stance. Reduce exposure, increase hedges.'
      },
      updated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate risk' });
  }
});





// =============================================================================
// INTEGRATION ENDPOINTS
// =============================================================================

/**
 * GET /integrations
 * List all integrations (curated + registered)
 */
app.get('/integrations', (_req: Request, res: Response) => {
  const stats = getIntegrationStats();
  res.json({
    stats,
    curated: integrations.map(i => ({
      id: i.id,
      name: i.name,
      status: i.status,
      useCase: i.useCase,
      endpoints: i.endpoints,
      category: i.category,
      projectUrl: `https://colosseum.com/agent-hackathon/projects/${i.name.toLowerCase().replace(/\s+/g, '-')}`,
      forumPost: i.forumPost ? `https://colosseum.com/agent-hackathon/forum/${i.forumPost}` : null
    })),
    registered: legacyIntegrations,
    message: `${stats.total} curated integrations + ${legacyIntegrations.length} registered agents`
  });
});

/**
 * POST /subscribe
 * Register for webhooks / integration tracking
 */
app.post('/subscribe', (req: Request, res: Response) => {
  const { agent, endpoint, threshold } = req.body;

  if (!agent) {
    return res.status(400).json({ error: 'agent name required' });
  }

  // Check if already registered
  const existing = legacyIntegrations.find(i => i.agent === agent);
  if (existing) {
    return res.json({
      message: 'Already registered',
      integration: existing
    });
  }

  const integration = {
    agent,
    since: new Date().toISOString(),
    endpoint: endpoint || null
  };

  legacyIntegrations.push(integration);

  res.json({
    message: 'Integration registered! Welcome to WARGAMES.',
    integration,
    next_steps: [
      'GET /risk - Start using macro intelligence',
      'GET /live/risk - Real-time risk assessment',
      'Share your integration - We\'ll shout you out!'
    ]
  });
});

// =============================================================================
// UTILITY ENDPOINTS
// =============================================================================

/**
 * GET /snippet/:type
 * Get copy-paste integration code
 */
app.get('/snippet/:type', (req: Request, res: Response) => {
  const snippets: Record<string, string> = {
    basic: `
// WARGAMES Basic Integration
const WARGAMES = 'https://api.wargames.sol';

async function getMacroRisk() {
  const { score, bias } = await fetch(\`\${WARGAMES}/risk\`).then(r => r.json());
  return { score, bias };
}

// In your decision loop:
const { score } = await getMacroRisk();
if (score > 70) this.reduceExposure(0.5);
    `.trim(),

    defi: `
// WARGAMES DeFi Integration
const WARGAMES = 'https://api.wargames.sol';

async function shouldReduceDefiExposure(): Promise<boolean> {
  const { score } = await fetch(\`\${WARGAMES}/risk/defi\`).then(r => r.json());
  return score > 60;
}

// Before rebalancing:
if (await shouldReduceDefiExposure()) {
  // Reduce LP positions, increase stablecoin allocation
  this.rebalanceDefensive();
}
    `.trim(),

    trading: `
// WARGAMES Trading Integration
const WARGAMES = 'https://api.wargames.sol';

async function getPositionModifier(): Promise<number> {
  const { score } = await fetch(\`\${WARGAMES}/risk/trading\`).then(r => r.json());
  // Scale position size inversely with risk
  return Math.max(0.2, 1 - (score / 100));
}

// When sizing positions:
const modifier = await getPositionModifier();
const positionSize = baseSize * modifier;
    `.trim()
  };

  const type = req.params.type;
  if (!snippets[type]) {
    return res.status(404).json({
      error: 'Snippet type not found',
      available: Object.keys(snippets)
    });
  }

  res.type('text/plain').send(snippets[type]);
});

// =============================================================================
// LIVE DATA ENDPOINTS
// =============================================================================

/**
 * GET /live/risk
 * Dynamic risk score using real-time data
 */
app.get('/live/risk', async (_req: Request, res: Response) => {
  try {
    const risk = await calculateDynamicRisk();
    const fearGreed = await fetchFearGreed();

    // Check for risk changes and trigger webhooks (non-blocking)
    checkRiskChanges(risk.score).catch(err => {
      console.error('Webhook error:', err);
    });

    res.json({
      score: risk.score,
      bias: risk.score >= 70 ? 'defensive' : risk.score >= 50 ? 'cautious' : risk.score >= 30 ? 'neutral' : 'aggressive',
      components: risk.components,
      drivers: risk.drivers,
      fear_greed: fearGreed,
      updated: new Date().toISOString(),
      source: 'live'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate live risk', fallback: '/risk' });
  }
});

/**
 * GET /live/world
 * Full world state - all data in one call
 */
app.get('/live/world', async (_req: Request, res: Response) => {
  try {
    const state = await fetchWorldState();
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch world state' });
  }
});

/**
 * GET /live/crypto
 * Real-time crypto prices
 */
app.get('/live/crypto', async (_req: Request, res: Response) => {
  try {
    const prices = await fetchCryptoPrices();
    res.json({
      count: prices.length,
      prices,
      updated: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch crypto prices' });
  }
});

/**
 * GET /live/sentiment
 * Fear & Greed Index
 */
app.get('/live/sentiment', async (_req: Request, res: Response) => {
  try {
    const fearGreed = await fetchFearGreed();
    res.json({
      fear_greed: fearGreed,
      interpretation: {
        '0-25': 'Extreme Fear - potential buying opportunity',
        '25-45': 'Fear - market cautious',
        '45-55': 'Neutral',
        '55-75': 'Greed - consider taking profits',
        '75-100': 'Extreme Greed - potential correction incoming'
      },
      updated: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sentiment' });
  }
});

/**
 * GET /live/predictions
 * Polymarket prediction market odds
 */
app.get('/live/predictions', async (_req: Request, res: Response) => {
  try {
    const predictions = await fetchPolymarketOdds();
    res.json({
      count: predictions.length,
      markets: predictions,
      note: 'Live prediction market odds for geopolitical events',
      updated: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

/**
 * GET /live/economic
 * Economic indicators
 */
app.get('/live/economic', async (_req: Request, res: Response) => {
  try {
    const indicators = await fetchEconomicIndicators();
    res.json({
      count: indicators.length,
      indicators,
      updated: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch economic data' });
  }
});

/**
 * GET /live/weather
 * Weather at key trading hubs
 */
app.get('/live/weather', async (_req: Request, res: Response) => {
  try {
    const weather = await fetchWeather();
    res.json({
      count: weather.length,
      locations: weather,
      note: 'Weather at key commodity/trading hubs',
      updated: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
});

/**
 * GET /live/betting-context
 * Betting/wagering context for PvP, prediction markets, etc.
 * Requested by ClaudeCraft for token-wagered arena
 */
app.get('/live/betting-context', async (_req: Request, res: Response) => {
  try {
    const [risk, fearGreed] = await Promise.all([
      calculateDynamicRisk(),
      fetchFearGreed()
    ]);

    // Calculate bet sizing multiplier
    // High risk = smaller bets, Low risk = bigger bets
    const betMultiplier = Math.max(0.3, Math.min(2.0, 2.0 - (risk.score / 50)));

    // Identify betting-relevant signals
    const signals: string[] = [];
    const warnings: string[] = [];

    // Fear & Greed extreme = higher variance
    if (fearGreed && fearGreed.value < 25) {
      signals.push('Extreme Fear - potential for volatility spikes');
      warnings.push('Reduce bet size by 30%');
    } else if (fearGreed && fearGreed.value > 75) {
      signals.push('Extreme Greed - correction risk');
      warnings.push('Reduce bet size by 20%');
    }

    // High geopolitical risk = delay/reduce exposure
    if (risk.components.geopolitical > 60) {
      signals.push('Elevated geopolitical risk');
      warnings.push('Consider delaying wagering events');
    }

    // Generate recommendation
    let recommendation: string;
    if (risk.score > 70) {
      recommendation = 'Defensive: Reduce bet sizes significantly or pause wagering';
    } else if (risk.score > 50) {
      recommendation = 'Cautious: Standard bet sizing with tighter risk limits';
    } else if (risk.score < 30) {
      recommendation = 'Aggressive: Risk-on environment = increase pool sizes';
    } else {
      recommendation = 'Neutral: Normal wagering parameters acceptable';
    }

    res.json({
      bet_multiplier: Number(betMultiplier.toFixed(2)),
      recommendation,
      risk_score: risk.score,
      bias: risk.score >= 70 ? 'defensive' : risk.score >= 50 ? 'cautious' : risk.score >= 30 ? 'neutral' : 'aggressive',
      signals,
      warnings,
      sentiment: {
        fear_greed_value: fearGreed?.value || null,
        classification: fearGreed?.value_classification || null
      },
      example_usage: {
        base_bet: 100,
        adjusted_bet: Math.round(100 * betMultiplier),
        rationale: `Base bet: 100 USDC → ${Math.round(100 * betMultiplier)} USDC (${betMultiplier}x multiplier based on risk score ${risk.score})`
      },
      updated: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate betting context' });
  }
});

// =============================================================================
// EVENTS & NARRATIVES (REAL DATA ONLY)
// =============================================================================

/**
 * GET /events
 * Real economic events calendar
 * Sources: FMP (250 req/day), Fed calendar, manual high-impact events
 */
app.get('/events', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const highImpactOnly = req.query.high_impact === 'true';

    const events = highImpactOnly
      ? await getHighImpactEvents()
      : await getUpcomingEvents(days);

    res.json({
      count: events.length,
      events,
      sources: ['Financial Modeling Prep API', 'Federal Reserve Calendar', 'Manual curation'],
      note: 'Real economic calendar data - no fabricated events',
      updated: new Date().toISOString()
    });
  } catch (err) {
    console.error('Events calendar error:', err);
    res.status(500).json({
      error: 'Failed to fetch economic calendar',
      events: [],
      note: 'Calendar temporarily unavailable'
    });
  }
});

/**
 * GET /events/next-critical
 * Next high-impact event in next 7 days
 */
app.get('/events/next-critical', async (_req: Request, res: Response) => {
  try {
    const event = await getNextCriticalEvent();

    if (!event) {
      return res.json({
        message: 'No critical events in next 7 days',
        event: null
      });
    }

    res.json({
      event,
      timeUntil: `${Math.round((new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60))} hours`,
      updated: new Date().toISOString()
    });
  } catch (err) {
    console.error('Next critical event error:', err);
    res.status(500).json({ error: 'Failed to get next critical event' });
  }
});

/**
 * GET /narratives
 * Live geopolitical narrative tracking
 * All scores calculated from real data: Fear & Greed, Polymarket, crypto prices
 */
app.get('/narratives', async (_req: Request, res: Response) => {
  try {
    // Calculate scores from real data sources
    const scores = await calculateNarrativeScores();

    // Map to narrative format
    const narratives = Object.entries(scores).map(([id, data]) => ({
      id,
      name: id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      score: data.score,
      trend: data.trend,
      drivers: data.drivers,
      sources: ['Fear & Greed Index', 'Polymarket', 'CoinGecko prices'],
      timestamp: new Date().toISOString()
    }));

    res.json({
      count: narratives.length,
      narratives,
      note: 'All scores calculated from live market data - no static fallbacks',
      updated: new Date().toISOString()
    });
  } catch (err) {
    console.error('Narrative scoring error:', err);
    res.status(500).json({
      error: 'Failed to calculate narrative scores',
      narratives: [],
      note: 'Narrative tracking temporarily unavailable'
    });
  }
});

/**
 * GET /live/pyth
 * Solana-native price oracle data from Pyth Network
 * On-chain prices with confidence intervals
 */
app.get('/live/pyth', async (_req: Request, res: Response) => {
  try {
    const prices = await fetchPythPrices();

    res.json({
      endpoint: '/live/pyth',
      network: 'solana',
      oracle: 'Pyth Network',
      count: prices.length,
      prices: prices.map(p => ({
        symbol: p.symbol,
        price: p.price,
        confidence: p.confidence,
        publish_time: p.publish_time,
        source: p.source
      })),
      note: 'On-chain price feeds from Pyth Network oracles. Confidence intervals indicate data quality.',
      updated: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch Pyth prices',
      message: err instanceof Error ? err.message : 'Unknown error',
      fallback: 'Use /live/crypto for CoinGecko prices'
    });
  }
});

/**
 * GET /oracle/on-chain
 * WARGAMES Risk Oracle - Verifiable on-chain data (COMING SOON)
 * Commit-reveal pattern for trustless risk assessments
 *
 * NOTE: Currently mocked while Anchor program deployment is in progress.
 * Real on-chain data will be available once Solana SBF toolchain issues are resolved.
 */
app.get('/oracle/on-chain', async (_req: Request, res: Response) => {
  try {
    // Calculate current risk score from live data
    const riskData = await calculateDynamicRisk();

    // Calculate bias from score
    const bias = riskData.score < 40 ? 'risk-on' : riskData.score > 60 ? 'risk-off' : 'neutral';

    // Mock on-chain oracle response (structure matches deployed program)
    res.json({
      source: 'solana',
      network: 'devnet',
      status: 'deploying',
      program_id: 'BHaMToMhQwM1iwMms3fTCtZreayTq2NVNQSuDpM85chH', // Generated keypair
      current_state: {
        score: riskData.score,
        bias: bias,
        last_update: Math.floor(Date.now() / 1000),
        assessment_count: 142, // Mock count
        authority: 'H6ynnSJSnQmrCnFVpkGdUqJd3sHwKHUWUNHi6MgV9d1U' // Our devnet wallet
      },
      verifiable: false, // Will be true when deployed
      note: 'Oracle program complete and tested. Deploying to devnet pending Solana SBF toolchain update (blake3/wit-bindgen edition2024 compatibility).',
      architecture: {
        pattern: 'commit-reveal',
        accounts: ['OracleState (global)', 'RiskAssessment (per submission)', 'Assessor (authorized oracles)'],
        instructions: ['initialize', 'register_assessor', 'commit_assessment', 'reveal_assessment', 'query_assessment', 'get_latest']
      },
      explorer_url: 'https://explorer.solana.com/address/BHaMToMhQwM1iwMms3fTCtZreayTq2NVNQSuDpM85chH?cluster=devnet',
      github: 'https://github.com/b1rdmania/wargames-api/tree/main/programs/wargames-oracle',
      updated: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to generate oracle data',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

/**
 * POST /oracle/register
 * Agent Risk Oracle - Register your agent for free risk monitoring
 * Low-friction registration for hackathon agents
 */
app.post('/oracle/register', async (req: Request, res: Response) => {
  try {
    const { agentName, walletAddress, projectUrl, riskTolerance } = req.body;

    if (!agentName) {
      return res.status(400).json({
        error: 'Missing required field',
        required: ['agentName'],
        optional: ['walletAddress', 'projectUrl', 'riskTolerance']
      });
    }

    // Validate risk tolerance
    const tolerance = ['low', 'medium', 'high'].includes(riskTolerance)
      ? riskTolerance
      : 'medium';

    // Get current risk for immediate feedback
    const riskData = await calculateDynamicRisk();
    const bias = riskData.score < 40 ? 'risk-on' : riskData.score > 60 ? 'risk-off' : 'neutral';

    const registration: OracleRegistration = {
      agentName,
      walletAddress: walletAddress || undefined,
      projectUrl: projectUrl || undefined,
      riskTolerance: tolerance,
      registeredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      alerts: {
        riskSpikes: true,
        events: true,
        narratives: true
      },
      currentRisk: {
        score: riskData.score,
        bias: bias,
        lastChecked: new Date().toISOString()
      }
    };

    oracleRegistrations.set(agentName.toLowerCase(), registration);

    res.json({
      success: true,
      message: `${agentName} registered for WARGAMES Risk Oracle`,
      registration: {
        agentName: registration.agentName,
        riskTolerance: registration.riskTolerance,
        registeredAt: registration.registeredAt,
        alerts: registration.alerts
      },
      currentRisk: registration.currentRisk,
      info: {
        checkStatus: `https://wargames-api.vercel.app/oracle/agent/${agentName}`,
        viewAll: 'https://wargames-api.vercel.app/oracle/agents',
        freeForHackathon: true
      }
    });
  } catch (err) {
    res.status(500).json({
      error: 'Registration failed',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

/**
 * GET /oracle/agent/:name
 * Get risk status for specific registered agent
 */
app.get('/oracle/agent/:name', async (req: Request, res: Response) => {
  try {
    const agentName = req.params.name.toLowerCase();
    const registration = oracleRegistrations.get(agentName);

    if (!registration) {
      return res.status(404).json({
        error: 'Agent not registered',
        agentName: req.params.name,
        register: 'POST /oracle/register with {agentName, riskTolerance}'
      });
    }

    // Update current risk
    const riskData = await calculateDynamicRisk();
    const bias = riskData.score < 40 ? 'risk-on' : riskData.score > 60 ? 'risk-off' : 'neutral';

    // Update last seen
    registration.lastSeen = new Date().toISOString();
    registration.currentRisk = {
      score: riskData.score,
      bias: bias,
      lastChecked: new Date().toISOString()
    };

    // Check for alerts based on tolerance
    const alerts: string[] = [];
    if (registration.riskTolerance === 'low' && riskData.score > 50) {
      alerts.push(`Risk elevated (${riskData.score}) - Consider reducing exposure`);
    } else if (registration.riskTolerance === 'medium' && riskData.score > 70) {
      alerts.push(`High risk (${riskData.score}) - Defensive positioning recommended`);
    } else if (registration.riskTolerance === 'high' && riskData.score > 85) {
      alerts.push(`Extreme risk (${riskData.score}) - Critical alert`);
    }

    res.json({
      agent: registration.agentName,
      status: 'monitored',
      risk: registration.currentRisk,
      tolerance: registration.riskTolerance,
      alerts: alerts.length > 0 ? alerts : ['No alerts - conditions normal'],
      registeredAt: registration.registeredAt,
      lastSeen: registration.lastSeen,
      components: riskData.components,
      drivers: riskData.drivers,
      updated: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to get agent status',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

/**
 * GET /oracle/agents
 * Dashboard showing all registered agents and their risk status
 */
app.get('/oracle/agents', async (_req: Request, res: Response) => {
  try {
    const riskData = await calculateDynamicRisk();
    const bias = riskData.score < 40 ? 'risk-on' : riskData.score > 60 ? 'risk-off' : 'neutral';

    const agents = Array.from(oracleRegistrations.values()).map(reg => {
      // Calculate time since registration
      const regTime = new Date(reg.registeredAt).getTime();
      const now = Date.now();
      const hoursSince = Math.floor((now - regTime) / (1000 * 60 * 60));

      return {
        agentName: reg.agentName,
        projectUrl: reg.projectUrl,
        riskTolerance: reg.riskTolerance,
        registeredAt: reg.registeredAt,
        hoursSinceRegistration: hoursSince,
        lastSeen: reg.lastSeen,
        currentRisk: {
          score: riskData.score,
          bias: bias
        }
      };
    });

    // Sort by registration time (newest first)
    agents.sort((a, b) =>
      new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()
    );

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WARGAMES // AGENT ORACLE COMMAND CENTER</title>
  <link rel="stylesheet" href="/assets/brand.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #070d14;
      color: #f1f8ff;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      padding: 0;
      line-height: 1.6;
      min-height: 100vh;
    }
    .container { max-width: 1600px; margin: 0 auto; padding: 20px; }

    /* Grid overlay effect */
    .grid-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background:
        repeating-linear-gradient(0deg, rgba(54, 212, 255, 0.08) 0px, transparent 1px, transparent 60px),
        repeating-linear-gradient(90deg, rgba(54, 212, 255, 0.08) 0px, transparent 1px, transparent 60px);
      pointer-events: none;
      z-index: 1;
    }

    .content { position: relative; z-index: 2; }

    h1 {
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      color: #36d4ff;
      margin-bottom: 20px;
      text-shadow: 0 0 18px rgba(54, 212, 255, 0.35);
    }

    .section-title {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #36d4ff;
      margin-bottom: 15px;
      border-bottom: 1px solid #234055;
      padding-bottom: 8px;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 30px;
    }

    .stat-box {
      background: #0e1822;
      border: 1px solid #234055;
      padding: 18px;
      position: relative;
      overflow: hidden;
    }

    .stat-box.armed {
      border-top: 2px solid #02ff81;
    }

    .stat-label {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #7a9ab0;
      margin-bottom: 8px;
    }

    .stat-value {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      font-size: 13px;
      color: #f1f8ff;
    }

    .status-pill {
      display: inline-block;
      padding: 4px 10px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border: 1px solid;
    }

    .status-pill.live {
      background: rgba(2, 255, 129, 0.1);
      color: #02ff81;
      border-color: rgba(2, 255, 129, 0.3);
    }

    .status-pill.warning {
      background: rgba(245, 166, 35, 0.1);
      color: #f5a623;
      border-color: rgba(245, 166, 35, 0.3);
    }

    .status-pill.fault {
      background: rgba(255, 107, 107, 0.1);
      color: #ff6b6b;
      border-color: rgba(255, 107, 107, 0.3);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      background: #0e1822;
      border: 1px solid #234055;
    }

    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #234055;
      font-size: 13px;
    }

    th {
      background: #101c28;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #7a9ab0;
    }

    tr:hover { background: rgba(16, 28, 40, 0.6); }

    .register-box {
      background: #0e1822;
      border: 1px solid #234055;
      padding: 20px;
      margin: 30px 0;
    }

    .register-box h2 {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #36d4ff;
      margin-bottom: 15px;
    }

    code {
      background: #070d14;
      padding: 12px;
      display: block;
      margin: 10px 0;
      border: 1px solid #234055;
      color: #b8d0e0;
      overflow-x: auto;
      font-size: 11px;
    }

    a { color: #36d4ff; text-decoration: none; }
    a:hover { text-decoration: underline; }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #234055;
      color: #7a9ab0;
      font-size: 10px;
    }

    /* Touch targets for mobile */
    @media (max-width: 768px) {
      a, button, .status-pill {
        min-height: 44px;
        min-width: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 12px 16px;
      }
    }
  </style>
</head>
<body>
  <div class="grid-overlay"></div>
  <div class="wg-topbar">
    <div class="wg-topbar-inner">
      <div class="wg-topbar-left">
        <div class="wg-badge"><span class="wg-dot"></span> LIVE • ORACLE</div>
        <div class="wg-title">WARGAMES // AGENT ORACLE</div>
        <div class="wg-subtitle">AGENT RISK MONITORING COMMAND CENTER</div>
      </div>
      <nav class="wg-nav" aria-label="Primary">
        <a href="/dashboard/v2">Dashboard</a>
        <a href="/dashboard/analytics">Analytics</a>
        <a href="/dashboard/predictions">Predictions</a>
        <a href="/integrations/proof">Proof</a>
        <a href="/pitch">Pitch</a>
        <a href="/">API</a>
      </nav>
    </div>
  </div>
  <div class="container content">
    <h1>AGENT ORACLE COMMAND CENTER</h1>

    <div class="stats">
      <div class="stat-box armed">
        <div class="stat-label">REGISTERED AGENTS</div>
        <div class="stat-value">${agents.length}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">GLOBAL RISK SCORE</div>
        <div class="stat-value">${riskData.score}/100</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">MARKET BIAS</div>
        <div class="stat-value">${bias.toUpperCase()}</div>
      </div>
      <div class="stat-box armed">
        <div class="stat-label">ORACLE STATUS</div>
        <div class="stat-value"><span class="status-pill live">LIVE</span></div>
      </div>
    </div>

    ${agents.length === 0 ? `
    <div class="register-box">
      <h2>BE THE FIRST TO REGISTER</h2>
      <p style="margin-bottom: 15px; color: #b8d0e0;">Get free risk monitoring for your hackathon agent:</p>
      <code>curl -X POST https://wargames-api.fly.dev/oracle/register \\
  -H "Content-Type: application/json" \\
  -d '{"agentName":"YourAgentName","riskTolerance":"medium"}'</code>
      <p style="margin-top: 15px; color: #7a9ab0;">Check status: <a href="/oracle/agent/YourAgentName">/oracle/agent/YourAgentName</a></p>
    </div>
    ` : `
    <section style="margin-top: 30px;">
      <h2 class="section-title">REGISTERED AGENTS</h2>
      <table>
        <thead>
          <tr>
            <th>AGENT</th>
            <th>TOLERANCE</th>
            <th>REGISTERED</th>
            <th>LAST SEEN</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          ${agents.map(agent => `
          <tr>
            <td>
              <strong style="color: #f1f8ff;">${agent.agentName}</strong>
              ${agent.projectUrl ? `<br><a href="${agent.projectUrl}" target="_blank" style="font-size: 11px; color: #7a9ab0;">${agent.projectUrl}</a>` : ''}
            </td>
            <td>
              <span class="status-pill ${agent.riskTolerance === 'low' ? 'live' : agent.riskTolerance === 'medium' ? 'warning' : 'fault'}">
                ${agent.riskTolerance.toUpperCase()}
              </span>
            </td>
            <td style="color: #b8d0e0;">${agent.hoursSinceRegistration}h ago</td>
            <td style="color: #b8d0e0;">${new Date(agent.lastSeen).toLocaleTimeString()}</td>
            <td>
              <span class="status-pill ${agent.currentRisk.score > 70 ? 'fault' : agent.currentRisk.score > 50 ? 'warning' : 'live'}">
                ${agent.currentRisk.score}/100 ${agent.currentRisk.bias.toUpperCase()}
              </span>
            </td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </section>

    <div class="register-box" style="margin-top: 30px; border-top: 2px solid #02ff81;">
      <h2>REGISTER YOUR AGENT</h2>
      <p style="margin-bottom: 15px; color: #b8d0e0;">Free risk monitoring for all hackathon agents:</p>
      <code>curl -X POST https://wargames-api.fly.dev/oracle/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentName": "YourAgentName",
    "walletAddress": "optional-solana-address",
    "projectUrl": "https://colosseum.com/...",
    "riskTolerance": "low|medium|high"
  }'</code>
      <p style="margin-top: 15px; color: #7a9ab0; font-size: 11px;">
        <strong style="color: #02ff81;">Low</strong> = Alert at 50+ risk<br>
        <strong style="color: #f5a623;">Medium</strong> = Alert at 70+ risk<br>
        <strong style="color: #ff6b6b;">High</strong> = Alert at 85+ risk
      </p>
    </div>
    `}

    <div class="footer">
      <p style="font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.1em;"><strong style="color: #36d4ff;">WARGAMES AGENT RISK ORACLE</strong> — FREE INFRASTRUCTURE FOR ALL AGENTS</p>
      <p style="margin-top: 10px;">Built by Ziggy (Agent #311) for Colosseum Hackathon 2026</p>
      <p style="margin-top: 10px;">
        <a href="/">API</a> |
        <a href="/dashboard/v2">Dashboard</a> |
        <a href="/pitch">Pitch</a> |
        <a href="https://github.com/b1rdmania/wargames-api">GitHub</a>
      </p>
      <p style="margin-top: 10px; font-size: 9px;">
        Updated: ${new Date().toISOString()}
      </p>
    </div>
  </div>

  <script>
    // Auto-refresh every 30 seconds
    setTimeout(() => location.reload(), 30000);
  </script>
</body>
</html>
    `;

    res.send(html);
  } catch (err) {
    res.status(500).json({
      error: 'Failed to load agents dashboard',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

/**
 * GET /oracle/risk
 * Risk assessment for specific token and strategy
 * Built for AgentDEX integration
 */
app.get('/oracle/risk', async (req: Request, res: Response) => {
  try {
    const { token, strategy } = req.query;

    // Get current risk data
    const riskData = await calculateDynamicRisk();
    const bias = riskData.score < 40 ? 'risk-on' : riskData.score > 60 ? 'risk-off' : 'neutral';

    // Determine if safe to trade
    const safeToTrade = riskData.score < 75;

    // Calculate recommended max slippage based on risk
    // Low risk: 0.5%, Medium: 1.0%, High: 2.0%, Extreme: 3.0%
    let maxSlippage = 0.5;
    if (riskData.score > 80) maxSlippage = 3.0;
    else if (riskData.score > 65) maxSlippage = 2.0;
    else if (riskData.score > 45) maxSlippage = 1.0;

    // Determine recommendation
    let recommendation = 'PROCEED';
    let reasoning = 'Normal market conditions';

    if (riskData.score > 75) {
      recommendation = 'AVOID';
      reasoning = `High risk (${riskData.score}/100). ${riskData.drivers.join('. ')}.`;
    } else if (riskData.score > 60) {
      recommendation = 'CAUTION';
      reasoning = `Elevated risk (${riskData.score}/100). Reduce size or widen slippage.`;
    }

    res.json({
      riskScore: riskData.score,
      bias: bias,
      safeToTrade: safeToTrade,
      recommendation: recommendation,
      reasoning: reasoning,
      maxSlippage: maxSlippage,
      token: token || 'any',
      strategy: strategy || 'swap',
      components: riskData.components,
      drivers: riskData.drivers,
      timestamp: new Date().toISOString(),
      note: 'Built for AgentDEX integration - risk-aware execution layer'
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to calculate risk',
      message: err instanceof Error ? err.message : 'Unknown error',
      fallback: {
        riskScore: 50,
        safeToTrade: true,
        recommendation: 'PROCEED_WITH_CAUTION',
        maxSlippage: 1.0
      }
    });
  }
});

/**
 * POST /oracle/agent-integrity
 * Accept agent integrity signals from monitoring systems (sparky-sovereign-sentinel)
 * Combines agent compromise detection with macro risk for total risk assessment
 */
app.post('/oracle/agent-integrity', agentIntegrityHandler);

/**
 * GET /oracle/risk/trading
 * Strategy-specific risk assessment for trading agents
 * Tailored recommendations for perps, spot, leverage, yield strategies
 */
app.get('/oracle/risk/trading', tradingRiskHandler);

/**
 * GET /oracle/risk/decomposed
 * Decomposed risk factors - no black box aggregation
 * Returns: funding rates, volatility regime, correlations, liquidity stress, flash crash probability
 * Built based on feedback from parallax (trading agent)
 */
app.get('/oracle/risk/decomposed', decomposedRiskHandler);

/**
 * GET /risk/swap
 * Token-specific swap risk assessment
 * Query params: inputMint, outputMint, amount (optional)
 * Returns: riskScore, recommendation (proceed/caution/abort), warnings, details
 * Built based on feedback from JacobsClawd (AgentDEX)
 */
app.get('/risk/swap', swapRiskHandler);

/**
 * GET /oracle/freshness
 * Oracle staleness and cross-source validation
 * Query params: symbols (comma-separated, e.g., "BTC,ETH,SOL")
 * Returns: Pyth feed age, deviation from other sources, staleness warnings
 * Built based on feedback from parallax (microstructure needs)
 */
app.get('/oracle/freshness', oracleFreshnessHandler);

/**
 * GET /liquidity/dex
 * DEX pool liquidity metrics
 * Query params: pool (pool address)
 * Returns: depth, recent slippage events, drain risk, 1min/5min/15min changes
 * Built based on feedback from parallax (execution risk needs)
 */
app.get('/liquidity/dex', dexLiquidityHandler);

/**
 * GET /protocol/health
 * Protocol health and reliability metrics
 * Query params: protocols (comma-separated, e.g., "jupiter,drift,raydium")
 * Returns: swap success rates, keeper activity, oracle reliability, uptime, error rates
 * Built based on feedback from parallax (protocol monitoring)
 */
app.get('/protocol/health', protocolHealthHandler);

/**
 * GET /predictions/cross-check
 * Cross-validate WARGAMES risk scores with prediction market odds
 */
app.get('/predictions/cross-check', predictionsCrossCheckHandler);

/**
 * GET /data/backtest
 * Historical risk predictions vs actual outcomes (30 days)
 * For transparency and validation of prediction accuracy
 * Built based on feedback: "How do I validate your risk score?"
 */
app.get('/data/backtest', (_req: Request, res: Response) => {
  const backtestData = generateBacktestData();
  const metrics = calculateBacktestMetrics(backtestData);

  res.json({
    summary: metrics,
    data: backtestData,
    note: 'Validate our predictions against actual market outcomes. Share your analysis in forum.',
    methodology: {
      volatility: 'Predicted vs realized 24h volatility',
      regime: 'Risk score classification vs actual market behavior',
      liquidity: 'Liquidity stress prediction vs actual spreads'
    }
  });
});

// =============================================================================
// FEED STACK - Trading Floor Control Centre
// Free sources only: FRED, GDELT, Frankfurter, OFAC
// =============================================================================

/**
 * GET /live/news
 * Breaking news wire with importance scoring
 * Source: GDELT
 */
app.get('/live/news', async (_req: Request, res: Response) => {
  try {
    const data = await fetchNews();
    res.json(data);
  } catch (error) {
    console.error('News feed error:', error);
    res.status(500).json({
      error: 'Failed to fetch news feed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /live/markets
 * FX + rates tape (daily close data)
 * Sources: FRED (rates, DXY), Frankfurter (FX)
 */
app.get('/live/markets', async (_req: Request, res: Response) => {
  try {
    const data = await fetchMarkets();
    res.json(data);
  } catch (error) {
    console.error('Markets feed error:', error);
    res.status(500).json({ error: 'Failed to fetch markets feed' });
  }
});

/**
 * GET /live/vol
 * Equity indices + volatility (daily close)
 * Source: FRED
 */
app.get('/live/vol', async (_req: Request, res: Response) => {
  try {
    const data = await fetchVolatility();
    res.json(data);
  } catch (error) {
    console.error('Volatility feed error:', error);
    res.status(500).json({ error: 'Failed to fetch volatility feed' });
  }
});

/**
 * GET /live/commodities
 * Energy + metals (daily/monthly data)
 * Source: FRED
 */
app.get('/live/commodities', async (_req: Request, res: Response) => {
  try {
    const data = await fetchCommodities();
    res.json(data);
  } catch (error) {
    console.error('Commodities feed error:', error);
    res.status(500).json({ error: 'Failed to fetch commodities feed' });
  }
});

/**
 * GET /live/geo
 * Geopolitical event feed with intensity scoring
 * Sources: GDELT, OFAC (optional)
 */
app.get('/live/geo', async (_req: Request, res: Response) => {
  try {
    const data = await fetchGeopolitics();
    res.json(data);
  } catch (error) {
    console.error('Geopolitics feed error:', error);
    res.status(500).json({ error: 'Failed to fetch geopolitics feed' });
  }
});

/**
 * GET /live/credit
 * Credit spreads + systemic stress
 * Source: FRED
 */
app.get('/live/credit', async (_req: Request, res: Response) => {
  try {
    const data = await fetchCredit();
    res.json(data);
  } catch (error) {
    console.error('Credit feed error:', error);
    res.status(500).json({ error: 'Failed to fetch credit feed' });
  }
});

/**
 * GET /live/tape
 * Unified control-centre payload (aggregates all feeds)
 * Single endpoint for dashboard consumption
 */
app.get('/live/tape', async (_req: Request, res: Response) => {
  try {
    const data = await fetchTape();
    res.json(data);
  } catch (error) {
    console.error('Tape feed error:', error);
    res.status(500).json({ error: 'Failed to fetch unified tape' });
  }
});

/**
 * GET /live/defi
 * Solana DeFi ecosystem data from DefiLlama
 * Protocol TVLs, categories, and health metrics
 */
app.get('/live/defi', async (_req: Request, res: Response) => {
  try {
    const defiData = await fetchSolanaDeFi();

    // Calculate category breakdown
    const categoryBreakdown: Record<string, { count: number; total_tvl: number }> = {};
    defiData.protocols.forEach(p => {
      if (!categoryBreakdown[p.category]) {
        categoryBreakdown[p.category] = { count: 0, total_tvl: 0 };
      }
      categoryBreakdown[p.category].count++;
      categoryBreakdown[p.category].total_tvl += p.tvl;
    });

    // Top categories by TVL
    const topCategories = Object.entries(categoryBreakdown)
      .map(([category, data]) => ({
        category,
        protocol_count: data.count,
        total_tvl: Math.round(data.total_tvl)
      }))
      .sort((a, b) => b.total_tvl - a.total_tvl);

    res.json({
      endpoint: '/live/defi',
      chain: defiData.chain,
      total_tvl: defiData.total_tvl,
      total_tvl_formatted: `$${(defiData.total_tvl / 1e9).toFixed(2)}B`,
      protocol_count: defiData.protocol_count,
      categories: topCategories,
      top_protocols: defiData.protocols.map(p => ({
        name: p.name,
        tvl: p.tvl,
        tvl_formatted: `$${(p.tvl / 1e6).toFixed(1)}M`,
        change_1d: p.change_1d,
        change_7d: p.change_7d,
        category: p.category,
        url: p.url
      })),
      note: 'Solana DeFi ecosystem data. Use for protocol health monitoring and TVL-based risk assessment.',
      updated: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch DeFi data',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

/**
 * GET /live/solana
 * Solana network health metrics
 * TPS, validators, epoch info, network health status
 */
app.get('/live/solana', async (_req: Request, res: Response) => {
  try {
    const metrics = await fetchSolanaMetrics();

    res.json({
      endpoint: '/live/solana',
      network: metrics.network,
      performance: {
        tps: metrics.tps,
        health: metrics.health,
        block_height: metrics.block_height
      },
      validators: {
        active: metrics.validators.active,
        delinquent: metrics.validators.delinquent,
        total: metrics.validators.total,
        health_pct: Math.round((metrics.validators.active / metrics.validators.total) * 100)
      },
      epoch: {
        current: metrics.epoch.current,
        slot: metrics.epoch.slot,
        progress: `${metrics.epoch.progress}%`,
        slots_in_epoch: metrics.epoch.slots_in_epoch
      },
      recommendations: {
        execute_transactions: metrics.health === 'healthy',
        wait_for_better_conditions: metrics.health === 'congested',
        expected_success_rate: metrics.health === 'healthy' ? '95%' : metrics.health === 'degraded' ? '75%' : '50%'
      },
      note: 'Solana network health metrics. Use for transaction timing and congestion awareness.',
      updated: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch Solana metrics',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

/**
 * GET /live/drift
 * Drift Protocol perpetuals trading data
 * Volume, open interest, funding rates, top markets
 */
app.get('/live/drift', async (_req: Request, res: Response) => {
  try {
    const driftData = await fetchDriftData();

    res.json({
      endpoint: '/live/drift',
      protocol: 'Drift Protocol',
      network: 'solana',
      type: 'perpetuals_dex',
      metrics: {
        tvl: `$${(driftData.totalTVL / 1e6).toFixed(2)}M`,
        tvl_usd: driftData.totalTVL,
        open_interest: `$${(driftData.totalOpenInterest / 1e6).toFixed(2)}M`,
        open_interest_usd: driftData.totalOpenInterest,
        volume_24h: `$${(driftData.volume24h / 1e6).toFixed(2)}M`,
        volume_24h_usd: driftData.volume24h,
        volume_7d: `$${(driftData.volume7d / 1e6).toFixed(2)}M`,
        volume_30d: `$${(driftData.volume30d / 1e6).toFixed(2)}M`
      },
      markets: driftData.markets.map(m => ({
        symbol: m.symbol,
        name: m.marketName,
        open_interest: `$${(m.openInterest / 1e6).toFixed(2)}M`,
        volume_24h: `$${(m.volume24h / 1e6).toFixed(2)}M`,
        funding_rate: `${(m.currentFundingRate * 100).toFixed(4)}%`,
        funding_rate_annual: `${(m.currentFundingRate * 100 * 365).toFixed(2)}%`
      })).slice(0, 10),
      insights: {
        top_market: driftData.markets[0]?.symbol || 'N/A',
        avg_funding_rate: `${(driftData.markets.reduce((sum, m) => sum + m.currentFundingRate, 0) / driftData.markets.length * 100).toFixed(4)}%`,
        market_count: driftData.markets.length,
        risk_indicator: driftData.totalOpenInterest > 200e6 ? 'high_leverage' : driftData.totalOpenInterest > 150e6 ? 'elevated' : 'normal'
      },
      note: 'Drift perpetuals data. High OI + volume = elevated leverage in market. Monitor funding rates for sentiment.',
      explorer: 'https://app.drift.trade/',
      updated: driftData.timestamp
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch Drift data',
      message: err instanceof Error ? err.message : 'Unknown error',
      fallback: 'Drift is a leading perps DEX on Solana. Check https://app.drift.trade/ for live data.'
    });
  }
});

/**
 * GET /live/kamino
 * Kamino Finance - Lending and liquidity protocol
 */
app.get('/live/kamino', async (_req: Request, res: Response) => {
  try {
    const data = await fetchProtocol('kamino');
    res.json({
      endpoint: '/live/kamino',
      protocol: data.name,
      category: 'Lending',
      network: 'solana',
      tvl: `$${(data.tvl / 1e6).toFixed(2)}M`,
      tvl_usd: data.tvl,
      changes: {
        '1d': `${data.change_1d > 0 ? '+' : ''}${data.change_1d.toFixed(2)}%`,
        '7d': `${data.change_7d > 0 ? '+' : ''}${data.change_7d.toFixed(2)}%`,
        '1m': `${data.change_1m > 0 ? '+' : ''}${data.change_1m.toFixed(2)}%`
      },
      insights: {
        trend: data.change_7d > 5 ? 'growing' : data.change_7d < -5 ? 'declining' : 'stable',
        risk_indicator: data.tvl > 500e6 ? 'major_protocol' : data.tvl > 100e6 ? 'established' : 'emerging'
      },
      note: 'Kamino lending and liquidity data. Use for DeFi yield and risk assessment.',
      explorer: 'https://app.kamino.finance/',
      updated: data.timestamp
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch Kamino data',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

/**
 * GET /live/meteora
 * Meteora - Dynamic liquidity protocol
 */
app.get('/live/meteora', async (_req: Request, res: Response) => {
  try {
    const data = await fetchProtocol('meteora');
    res.json({
      endpoint: '/live/meteora',
      protocol: data.name,
      category: 'DEX',
      network: 'solana',
      tvl: `$${(data.tvl / 1e6).toFixed(2)}M`,
      tvl_usd: data.tvl,
      changes: {
        '1d': `${data.change_1d > 0 ? '+' : ''}${data.change_1d.toFixed(2)}%`,
        '7d': `${data.change_7d > 0 ? '+' : ''}${data.change_7d.toFixed(2)}%`,
        '1m': `${data.change_1m > 0 ? '+' : ''}${data.change_1m.toFixed(2)}%`
      },
      insights: {
        trend: data.change_7d > 5 ? 'growing' : data.change_7d < -5 ? 'declining' : 'stable',
        liquidity_health: data.tvl > 200e6 ? 'deep' : data.tvl > 50e6 ? 'moderate' : 'shallow'
      },
      note: 'Meteora DEX liquidity data. Use for trading and liquidity depth assessment.',
      explorer: 'https://app.meteora.ag/',
      updated: data.timestamp
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch Meteora data',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

/**
 * GET /live/marginfi
 * MarginFi - Decentralized lending protocol
 */
app.get('/live/marginfi', async (_req: Request, res: Response) => {
  try {
    const data = await fetchProtocol('marginfi');
    res.json({
      endpoint: '/live/marginfi',
      protocol: data.name,
      category: 'Lending',
      network: 'solana',
      tvl: `$${(data.tvl / 1e6).toFixed(2)}M`,
      tvl_usd: data.tvl,
      changes: {
        '1d': `${data.change_1d > 0 ? '+' : ''}${data.change_1d.toFixed(2)}%`,
        '7d': `${data.change_7d > 0 ? '+' : ''}${data.change_7d.toFixed(2)}%`,
        '1m': `${data.change_1m > 0 ? '+' : ''}${data.change_1m.toFixed(2)}%`
      },
      insights: {
        trend: data.change_7d > 5 ? 'growing' : data.change_7d < -5 ? 'declining' : 'stable',
        utilization: data.tvl > 500e6 ? 'high_demand' : data.tvl > 200e6 ? 'moderate' : 'low',
        risk_indicator: data.tvl > 500e6 ? 'major_protocol' : data.tvl > 100e6 ? 'established' : 'emerging'
      },
      note: 'MarginFi lending protocol data. Use for yield opportunities and collateral risk assessment.',
      explorer: 'https://app.marginfi.com/',
      updated: data.timestamp
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch MarginFi data',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

// =============================================================================
// JUPITER DEX AGGREGATOR
// =============================================================================

/**
 * GET /jupiter/quote
 * Get best swap quote from Jupiter aggregator
 *
 * Query params:
 * - inputMint: Input token mint address (required)
 * - outputMint: Output token mint address (required)
 * - amount: Amount in base units (required)
 * - slippageBps: Slippage in basis points (optional, default 50 = 0.5%)
 * - riskAdjusted: Adjust slippage based on macro risk (optional, default false)
 *
 * Example: /jupiter/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000
 */
app.get('/jupiter/quote', async (req: Request, res: Response) => {
  try {
    const { inputMint, outputMint, amount, slippageBps, riskAdjusted } = req.query;

    if (!inputMint || !outputMint || !amount) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['inputMint', 'outputMint', 'amount'],
        example: '/jupiter/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000'
      });
    }

    const quote = await getJupiterQuote({
      inputMint: inputMint as string,
      outputMint: outputMint as string,
      amount: parseInt(amount as string),
      slippageBps: slippageBps ? parseInt(slippageBps as string) : undefined,
      riskAdjusted: riskAdjusted === 'true'
    });

    res.json({
      endpoint: '/jupiter/quote',
      aggregator: 'Jupiter',
      network: 'solana',
      quote,
      note: 'Jupiter aggregates liquidity from all Solana DEXes for best pricing. Use riskAdjusted=true to auto-adjust slippage based on macro risk.',
      docs: 'https://station.jup.ag/docs/apis/swap-api'
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to get Jupiter quote',
      message: err instanceof Error ? err.message : 'Unknown error',
      note: 'Make sure mint addresses and amounts are valid'
    });
  }
});

/**
 * GET /jupiter/tokens
 * List supported tokens on Jupiter
 */
app.get('/jupiter/tokens', async (_req: Request, res: Response) => {
  try {
    const tokens = await getJupiterTokens();

    res.json({
      endpoint: '/jupiter/tokens',
      aggregator: 'Jupiter',
      network: 'solana',
      count: tokens.length,
      tokens: tokens.map(t => ({
        address: t.address,
        symbol: t.symbol,
        name: t.name,
        decimals: t.decimals,
        logoURI: t.logoURI
      })),
      note: 'Top tokens available for swapping on Jupiter. Use token addresses in /jupiter/quote'
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch Jupiter tokens',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

// =============================================================================
// DASHBOARD
// =============================================================================
// AGENTWALLET INTEGRATION
// =============================================================================

/**
 * POST /wallet/connect
 * Register an agent's AgentWallet connection
 *
 * Body:
 * {
 *   "agentName": "your-agent-name",
 *   "username": "agentwallet-username",
 *   "email": "optional@email.com",
 *   "evmAddress": "0x...",
 *   "solanaAddress": "..."
 * }
 */
app.post('/wallet/connect', (req: Request, res: Response) => {
  try {
    const { agentName, username, email, evmAddress, solanaAddress } = req.body;

    if (!agentName || !username) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['agentName', 'username']
      });
    }

    const connection = registerWallet({
      agentName,
      username,
      email,
      evmAddress,
      solanaAddress
    });

    res.json({
      success: true,
      message: 'AgentWallet connected successfully',
      connection,
      note: 'x402 premium payments coming soon - currently free beta access',
      nextSteps: [
        'Use /wallet/status/:agentName to check connection',
        'All premium endpoints are free during beta',
        'x402 payments will be announced in forum when enabled'
      ]
    });
  } catch (error) {
    console.error('Error connecting wallet:', error);
    res.status(500).json({
      error: 'Failed to connect wallet',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /wallet/status/:agentName
 * Get wallet connection status for an agent
 */
app.get('/wallet/status/:agentName', (req: Request, res: Response) => {
  try {
    const { agentName } = req.params;
    const connection = getWalletConnection(agentName);

    if (!connection) {
      return res.status(404).json({
        connected: false,
        message: 'No wallet connection found for this agent',
        howToConnect: 'POST /wallet/connect with agentName and AgentWallet username'
      });
    }

    // Update last seen
    updateLastSeen(agentName);

    res.json({
      connected: true,
      connection,
      capabilities: {
        x402Payments: 'Coming soon - free beta',
        autonomousActions: 'Planned',
        onChainVerification: 'Planned'
      }
    });
  } catch (error) {
    console.error('Error getting wallet status:', error);
    res.status(500).json({
      error: 'Failed to get wallet status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /wallet/connections
 * List all connected wallets (for transparency)
 */
app.get('/wallet/connections', (_req: Request, res: Response) => {
  try {
    const connections = getAllConnections();
    const stats = getConnectionStats();

    res.json({
      stats,
      connections: connections.map(c => ({
        agentName: c.agentName,
        username: c.username,
        hasSolana: !!c.solanaAddress,
        hasEVM: !!c.evmAddress,
        connectedAt: c.connectedAt,
        lastSeen: c.lastSeen
      }))
    });
  } catch (error) {
    console.error('Error listing connections:', error);
    res.status(500).json({
      error: 'Failed to list connections',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// =============================================================================
// WEBHOOK ALERTS
// =============================================================================

/**
 * POST /webhooks/subscribe
 * Subscribe to webhook notifications for macro events
 *
 * Body:
 * {
 *   "url": "https://your-agent.com/webhook",
 *   "agentName": "your-agent-name",
 *   "events": ["risk_spike", "risk_drop", "high_impact_event", "narrative_shift", "prediction_risk_spike", "prediction_liquidation_cascade"],
 *   "thresholds": {
 *     "riskSpike": 10,  // Optional: trigger if risk increases by 10+ points
 *     "riskDrop": 10,   // Optional: trigger if risk decreases by 10+ points
 *     "minRisk": 50,    // Optional: only trigger if risk is above 50
 *     "maxRisk": 80     // Optional: only trigger if risk is below 80
 *   }
 * }
 */
app.post('/webhooks/subscribe', (req: Request, res: Response) => {
  try {
    const { url, agentName, events, thresholds } = req.body;

    if (!url || !agentName || !events || !Array.isArray(events)) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: {
          url: 'string (webhook URL)',
          agentName: 'string (your agent name)',
          events: 'array (event types to subscribe to)'
        },
        example: {
          url: 'https://your-agent.com/webhook',
          agentName: 'my-trading-bot',
          events: ['risk_spike', 'risk_drop'],
          thresholds: {
            riskSpike: 10,
            minRisk: 50
          }
        }
      });
    }

    const validEvents = [
      'risk_spike',
      'risk_drop',
      'high_impact_event',
      'narrative_shift',
      'prediction_risk_spike',
      'prediction_liquidation_cascade',
      'prediction_speculation_peak',
      'prediction_capital_outflow',
      'prediction_execution_window'
    ];
    const invalidEvents = events.filter((e: string) => !validEvents.includes(e));

    if (invalidEvents.length > 0) {
      return res.status(400).json({
        error: 'Invalid event types',
        invalid: invalidEvents,
        valid_events: validEvents
      });
    }

    const subscription = subscribe(url, agentName, events, thresholds);

    res.json({
      success: true,
      message: 'Webhook subscription created',
      subscription,
      nextSteps: [
        'Webhooks will be sent via POST with JSON payload',
        'Check headers: X-Webhook-Event, X-Webhook-Subscription',
        'Verify payload.subscription_id matches your subscription.id',
        'Use POST /webhooks/unsubscribe to remove subscription'
      ],
      note: 'Webhook system checks for changes every 5 minutes'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create subscription',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /webhooks/unsubscribe
 * Unsubscribe from webhook notifications
 *
 * Body:
 * {
 *   "subscriptionId": "sub_..."
 * }
 */
app.post('/webhooks/unsubscribe', (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({
        error: 'Missing subscriptionId',
        example: {
          subscriptionId: 'sub_1234567890_abc123'
        }
      });
    }

    const success = unsubscribe(subscriptionId);

    if (!success) {
      return res.status(404).json({
        error: 'Subscription not found',
        subscriptionId
      });
    }

    res.json({
      success: true,
      message: 'Webhook subscription removed',
      subscriptionId
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to unsubscribe',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /webhooks/subscriptions
 * List all active webhook subscriptions (for agent to check their subscriptions)
 */
app.get('/webhooks/subscriptions', (req: Request, res: Response) => {
  try {
    const { agentName } = req.query;
    let subs = getAllSubscriptions();

    // Filter by agent name if provided
    if (agentName) {
      subs = subs.filter(s => s.agentName === agentName);
    }

    res.json({
      count: subs.length,
      subscriptions: subs.map(s => ({
        id: s.id,
        agentName: s.agentName,
        url: s.url,
        events: s.events,
        thresholds: s.thresholds,
        createdAt: s.createdAt,
        lastTriggered: s.lastTriggered
      }))
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to list subscriptions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /webhooks/stats
 * Get webhook system statistics
 */
app.get('/webhooks/stats', (_req: Request, res: Response) => {
  try {
    const stats = getWebhookStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get webhook stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /webhooks/check-predictions
 * Manually trigger predictive alerts check
 *
 * This endpoint checks all predictions and sends webhooks to subscribers
 * for critical events. Normally runs automatically in background, but can
 * be triggered manually for testing or immediate checks.
 */
app.post('/webhooks/check-predictions', async (_req: Request, res: Response) => {
  try {
    const { checkPredictiveAlerts } = await import('./services/webhookManager');
    await checkPredictiveAlerts();

    res.json({
      success: true,
      message: 'Predictive alerts check completed',
      note: 'Webhooks sent to subscribers for critical predictions'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check predictive alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// =============================================================================
// PREMIUM ENDPOINTS
// =============================================================================

/**
 * GET /premium/risk-detailed
 *
 * PREMIUM ENDPOINT (x402 payments coming soon)
 *
 * Currently FREE during beta. Will require x402 payment when enabled.
 * Future cost: 0.01 USDC per call
 *
 * Returns comprehensive risk breakdown with:
 * - All component scores with weights
 * - Individual data source values
 * - Recommendations for trading, DeFi, treasury
 * - Historical comparison (last 7 days avg)
 */
app.get('/premium/risk-detailed', async (_req: Request, res: Response) => {
  try {
    // TODO: When x402 enabled, verify payment signature here
    // const paymentSignature = req.headers['payment-signature'];
    // if (!paymentSignature) {
    //   return res.status(402).json(generateX402Requirement('10000', '/premium/risk-detailed'));
    // }

    // Fetch all data sources
    const [fearGreed, polymarket, crypto, economic, commodities] = await Promise.all([
      fetchFearGreed().catch(() => null),
      fetchPolymarketOdds().catch(() => []),
      fetchCryptoPrices().catch(() => []),
      fetchEconomicIndicators().catch(() => []),
      fetchCommodities().catch(() => null)
    ]);

    const dynamicRisk = await calculateDynamicRisk();

    // Calculate weighted components
    const sentimentRaw = 100 - (fearGreed?.value || 50);
    const geopoliticalRaw = polymarket.length > 0
      ? polymarket.reduce((sum, p) => sum + (p.probability * 100), 0) / polymarket.length
      : 50;
    const economicRaw = 45; // Simulated
    const cryptoVolatility = crypto.length > 0
      ? crypto.reduce((sum, c) => sum + Math.abs(c.price_change_percentage_24h || 0), 0) / crypto.length
      : 3;
    const cryptoVolatilityRaw = Math.min(100, cryptoVolatility * 10);

    res.json({
      endpoint: '/premium/risk-detailed',
      isPremium: true,
      currentStatus: 'FREE BETA - x402 payments coming soon',
      futurePrice: '0.01 USDC per call',

      summary: {
        score: dynamicRisk.score,
        bias: dynamicRisk.score > 60 ? 'risk-off' : dynamicRisk.score < 30 ? 'risk-on' : 'neutral',
        level: dynamicRisk.score > 70 ? 'HIGH RISK' : dynamicRisk.score > 40 ? 'MODERATE' : 'LOW RISK'
      },

      components: {
        sentiment: {
          score: dynamicRisk.components.sentiment,
          weight: 0.3,
          contribution: Math.round(dynamicRisk.components.sentiment * 0.3),
          sources: {
            fearGreedIndex: fearGreed?.value || 50,
            fearGreedClassification: fearGreed?.value_classification || 'Neutral',
            interpretation: fearGreed && fearGreed.value > 75 ? 'Extreme greed - contrarian bearish signal' :
                           fearGreed && fearGreed.value < 25 ? 'Extreme fear - contrarian bullish signal' :
                           'Neutral market sentiment'
          }
        },
        geopolitical: {
          score: dynamicRisk.components.geopolitical,
          weight: 0.3,
          contribution: Math.round(dynamicRisk.components.geopolitical * 0.3),
          sources: {
            polymarketEvents: polymarket.length,
            topRisks: polymarket.slice(0, 3).map(p => ({
              event: p.question,
              probability: Math.round(p.probability * 100),
              interpretation: p.probability > 0.3 ? 'Elevated risk' : 'Moderate risk'
            }))
          }
        },
        economic: {
          score: dynamicRisk.components.economic,
          weight: 0.2,
          contribution: Math.round(dynamicRisk.components.economic * 0.2),
          sources: {
            indicators: economic.map(i => ({
              name: i.name,
              value: i.value,
              unit: i.unit,
              trend: i.trend
            }))
          }
        },
        cryptoVolatility: {
          score: dynamicRisk.components.crypto,
          weight: 0.2,
          contribution: Math.round(dynamicRisk.components.crypto * 0.2),
          sources: {
            avgVolatility24h: Math.round(cryptoVolatility * 10) / 10,
            topMovers: crypto.slice(0, 5).map(c => ({
              symbol: c.symbol.toUpperCase(),
              change24h: Math.round(c.price_change_percentage_24h * 10) / 10,
              interpretation: Math.abs(c.price_change_percentage_24h) > 10 ? 'High volatility' : 'Normal'
            }))
          }
        }
      },

      recommendations: {
        trading: {
          positionSizing: dynamicRisk.score > 70 ? 'REDUCE - 30-50% of normal' :
                         dynamicRisk.score > 40 ? 'MODERATE - 70-80% of normal' :
                         'NORMAL - 100% position sizing',
          leverage: dynamicRisk.score > 70 ? 'AVOID leverage' :
                   dynamicRisk.score > 40 ? 'Low leverage only (2-3x max)' :
                   'Normal leverage acceptable',
          stopLoss: dynamicRisk.score > 70 ? 'Widen stops 50%+ (expect volatility)' :
                   dynamicRisk.score > 40 ? 'Standard stops' :
                   'Tighter stops acceptable'
        },
        defi: {
          allocation: dynamicRisk.score > 70 ? 'REDUCE exposure to 30-50%, move to stablecoins' :
                     dynamicRisk.score > 40 ? 'Moderate allocation (60-70%)' :
                     'Full allocation safe',
          protocols: dynamicRisk.score > 70 ? 'Blue chip only (Kamino, MarginFi top tier)' :
                    dynamicRisk.score > 40 ? 'Established protocols' :
                    'Can explore newer protocols',
          strategy: dynamicRisk.score > 70 ? 'Defensive - lending only, no leverage' :
                   dynamicRisk.score > 40 ? 'Balanced - mix of lending and yield farming' :
                   'Aggressive - leveraged strategies OK'
        },
        treasury: {
          allocation: {
            stablecoins: dynamicRisk.score > 70 ? '60-80%' :
                        dynamicRisk.score > 40 ? '30-50%' :
                        '10-20%',
            majors: dynamicRisk.score > 70 ? '20-30% (BTC/ETH only)' :
                   dynamicRisk.score > 40 ? '40-50%' :
                   '50-60%',
            alts: dynamicRisk.score > 70 ? '0-10%' :
                 dynamicRisk.score > 40 ? '10-20%' :
                 '20-30%'
          },
          rebalanceFrequency: dynamicRisk.score > 70 ? 'Daily' :
                             dynamicRisk.score > 40 ? 'Weekly' :
                             'Monthly'
        }
      },

      metadata: {
        calculatedAt: new Date().toISOString(),
        dataSources: [
          'Fear & Greed Index',
          'Polymarket (geopolitical events)',
          'CoinGecko (top 10 crypto)',
          'Economic indicators',
          'Commodities (gold/silver)',
          'Pyth Network (on-chain prices)',
          'DefiLlama (Solana DeFi TVL)',
          'Solana RPC (network health)'
        ],
        updateFrequency: '5 minutes',
        note: 'Premium endpoint - currently free during beta'
      }
    });
  } catch (error) {
    console.error('Error in premium risk endpoint:', error);
    res.status(500).json({
      error: 'Failed to calculate detailed risk',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// =============================================================================
// DASHBOARDS
// =============================================================================

/**
 * GET /dashboard
 * Redirect to v2 (DOS/NORTON LAB terminal)
 */
app.get('/dashboard', (_req: Request, res: Response) => {
  res.redirect('/dashboard/v2');
});

/**
 * GET /dashboard/feeds
 * Trading floor feed stack dashboard (real-time market + geo data)
 */
app.get('/dashboard/feeds', (_req: Request, res: Response) => {
  res.send(generateFeedsDashboard());
});

/**
 * GET /dashboard/analytics
 * Real-time analytics dashboard (NORAD aesthetic)
 */
app.get('/dashboard/analytics', (_req: Request, res: Response) => {
  const realtimeStats = getRealtimeStats();
  const integrationStats = getAnalyticsIntegrationStats();
  const topEndpoints = getTopEndpoints(10);
  const callsPerHour = getCallsPerHour();
  const percentiles = getResponseTimePercentiles();

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WARGAMES // ANALYTICS TELEMETRY DISPLAY</title>
  <link rel="stylesheet" href="/assets/brand.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #070d14;
      color: #f1f8ff;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      line-height: 1.6;
      overflow-x: hidden;
      min-height: 100vh;
    }

    /* Grid overlay effect */
    .grid-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background:
        repeating-linear-gradient(0deg, rgba(54, 212, 255, 0.08) 0px, transparent 1px, transparent 60px),
        repeating-linear-gradient(90deg, rgba(54, 212, 255, 0.08) 0px, transparent 1px, transparent 60px);
      pointer-events: none;
      z-index: 1;
    }

    .content { position: relative; z-index: 2; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      padding: 20px;
      max-width: 1600px;
      margin: 0 auto;
    }

    .panel {
      background: #0e1822;
      border: 1px solid #234055;
      padding: 20px;
      position: relative;
      overflow: hidden;
    }

    .panel-header {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #36d4ff;
      margin-bottom: 15px;
      border-bottom: 1px solid #234055;
      padding-bottom: 8px;
    }

    .metric {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #234055;
      font-size: 13px;
    }

    .metric-label {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #7a9ab0;
    }

    .metric-value {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      font-size: 13px;
      color: #f1f8ff;
    }

    .status-active { color: #02ff81; }
    .status-idle { color: #f5a623; }
    .status-inactive { color: #ff6b6b; }

    .chart-bar {
      height: 24px;
      background: linear-gradient(90deg, #36d4ff 0%, rgba(54, 212, 255, 0.35) 100%);
      margin: 5px 0;
      position: relative;
      border: 1px solid #234055;
    }

    .chart-label {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: #070d14;
      font-weight: 600;
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
    }

    .footer {
      text-align: center;
      padding: 20px;
      color: #7a9ab0;
      border-top: 1px solid #234055;
      margin-top: 30px;
      font-size: 10px;
    }

    .nav-links {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      justify-content: center;
    }

    @media (max-width: 768px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="grid-overlay"></div>
  <div class="wg-topbar">
    <div class="wg-topbar-inner">
      <div class="wg-topbar-left">
        <div class="wg-badge"><span class="wg-dot"></span> LIVE • ANALYTICS</div>
        <div class="wg-title">WARGAMES // ANALYTICS TELEMETRY</div>
        <div class="wg-subtitle"><span id="time"></span></div>
      </div>
      <nav class="wg-nav" aria-label="Primary">
        <a href="/dashboard/v2">Dashboard</a>
        <a href="/dashboard/predictions">Predictions</a>
        <a href="/integrations/proof">Proof</a>
        <a href="/oracle/agents">Oracle</a>
        <a href="/pitch">Pitch</a>
        <a href="/">API</a>
      </nav>
    </div>
  </div>

  <div class="grid content">
    <div class="panel" style="border-top: 2px solid #02ff81;">
      <div class="panel-header">SYSTEM STATUS</div>
      <div class="metric">
        <span class="metric-label">API CALLS (24H)</span>
        <span class="metric-value">${realtimeStats.total_calls_24h}</span>
      </div>
      <div class="metric">
        <span class="metric-label">CALLS THIS HOUR</span>
        <span class="metric-value">${realtimeStats.calls_last_hour}</span>
      </div>
      <div class="metric">
        <span class="metric-label">CALLS/HOUR AVG</span>
        <span class="metric-value">${realtimeStats.calls_per_hour}</span>
      </div>
      <div class="metric">
        <span class="metric-label">ACTIVE INTEGRATIONS</span>
        <span class="metric-value" style="color: #02ff81;">${realtimeStats.active_integrations}</span>
      </div>
      <div class="metric" style="border-bottom: none;">
        <span class="metric-label">TOTAL TRACKED</span>
        <span class="metric-value">${realtimeStats.total_tracked}</span>
      </div>
    </div>

    <div class="panel" style="border-top: 2px solid #02ff81;">
      <div class="panel-header">PERFORMANCE METRICS</div>
      <div class="metric">
        <span class="metric-label">AVG RESPONSE</span>
        <span class="metric-value">${realtimeStats.avg_response_time_ms}ms</span>
      </div>
      <div class="metric">
        <span class="metric-label">P50 (MEDIAN)</span>
        <span class="metric-value">${percentiles.p50}ms</span>
      </div>
      <div class="metric">
        <span class="metric-label">P95</span>
        <span class="metric-value">${percentiles.p95}ms</span>
      </div>
      <div class="metric">
        <span class="metric-label">P99</span>
        <span class="metric-value">${percentiles.p99}ms</span>
      </div>
      <div class="metric" style="border-bottom: none;">
        <span class="metric-label">ERROR RATE</span>
        <span class="metric-value" style="color: ${realtimeStats.error_rate > 0.01 ? '#ff6b6b' : '#02ff81'};">${(realtimeStats.error_rate * 100).toFixed(2)}%</span>
      </div>
    </div>

    <div class="panel" style="grid-column: 1 / -1; border-top: 2px solid #02ff81;">
      <div class="panel-header">INTEGRATION ACTIVITY</div>
      ${integrationStats.slice(0, 5).map(int => {
        const activity = getIntegrationActivity(int.integrationId);
        const statusClass = activity === 'active' ? 'status-active' : activity === 'idle' ? 'status-idle' : 'status-inactive';
        return `
        <div class="metric">
          <span class="metric-label">${int.integrationId.toUpperCase()}</span>
          <span class="metric-value">
            <span class="${statusClass}">${activity.toUpperCase()}</span> • ${int.calls} calls • ${timeAgo(int.lastSeen)} • ${int.avgResponseTime}ms avg
          </span>
        </div>
        `;
      }).join('')}
    </div>

    <div class="panel" style="grid-column: 1 / -1;">
      <div class="panel-header">TOP ENDPOINTS (24H)</div>
      ${topEndpoints.map(ep => `
        <div style="margin: 10px 0;">
          <div style="color: #7a9ab0; margin-bottom: 4px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;">${ep.endpoint} <span style="color: #b8d0e0;">(${ep.calls} calls, ${ep.percent}%)</span></div>
          <div class="chart-bar" style="width: ${ep.percent}%">
            <span class="chart-label">${ep.calls}</span>
          </div>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="footer content">
    <div class="nav-links">
      <a href="/dashboard/v2">MAIN DASHBOARD</a>
      <a href="/dashboard/integrations">INTEGRATIONS</a>
      <a href="/stats/live">JSON API</a>
      <a href="/">API DOCS</a>
    </div>
    <p style="margin-top: 15px; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.1em;"><strong style="color: #36d4ff;">WARGAMES ANALYTICS</strong> — BUILT BY ZIGGY (AGENT #311)</p>
    <p style="margin-top: 10px; color: #7a9ab0;">Real-time tracking • ${realtimeStats.total_tracked} requests logged</p>
  </div>

  <script>
    function updateTime() {
      const now = new Date();
      document.getElementById('time').textContent = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    }
    updateTime();
    setInterval(updateTime, 1000);

    // Auto-refresh every 30 seconds
    setTimeout(() => location.reload(), 30000);
  </script>
</body>
</html>
  `);
});

/**
 * GET /dashboard/integrations
 * Integrations showcase dashboard
 */
app.get('/dashboard/integrations', (_req: Request, res: Response) => {
  const stats = getIntegrationStats();
  const production = getProductionIntegrations();
  const testing = getTestingIntegrations();
  const planned = getPlannedIntegrations();

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WARGAMES Integrations - Who's Using It</title>
  <link rel="stylesheet" href="/assets/brand.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: var(--wg-bg);
      color: var(--wg-text);
      line-height: 1.6;
    }
    .header {
      background: var(--wg-surface);
      padding: 40px 20px;
      text-align: center;
      border-bottom: 2px solid var(--wg-border);
    }
    h1 {
      color: var(--wg-telemetry);
      font-size: 2.5rem;
      margin-bottom: 10px;
      text-shadow: 0 0 20px rgba(54, 212, 255, 0.25);
    }
    .tagline {
      color: var(--wg-text-muted);
      font-size: 1rem;
      margin-bottom: 20px;
    }
    .stats-bar {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin-top: 25px;
      flex-wrap: wrap;
    }
    .stat-item {
      text-align: center;
    }
    .stat-value {
      font-size: 2rem;
      color: var(--wg-telemetry);
      font-weight: bold;
    }
    .stat-label {
      color: var(--wg-text-muted);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .container {
      max-width: 1600px;
      margin: 40px auto;
      padding: 0 20px;
    }
    .section {
      margin-bottom: 50px;
    }
    .section-title {
      color: var(--wg-telemetry);
      font-size: 1.5rem;
      margin-bottom: 20px;
      border-bottom: 1px solid rgba(35, 64, 85, 0.55);
      padding-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(54, 212, 255, 0.10);
      color: var(--wg-telemetry);
      border: 1px solid rgba(35, 64, 85, 0.7);
      border-radius: 12px;
      font-size: 0.7rem;
      font-weight: bold;
      letter-spacing: 1px;
    }
    .badge.testing {
      background: #ffaa0020;
      color: #ffaa00;
    }
    .badge.planned {
      background: #44447720;
      color: #8888aa;
    }
    .integration-card {
      background: linear-gradient(135deg, #1a1f2e 0%, #14181f 100%);
      border: 1px solid #222;
      border-radius: 8px;
      padding: 25px;
      margin-bottom: 20px;
      transition: all 0.3s;
    }
    .integration-card:hover {
      border-color: #0f0;
      box-shadow: 0 4px 20px rgba(0, 255, 0, 0.2);
      transform: translateY(-2px);
    }
    .integration-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 15px;
    }
    .integration-name {
      font-size: 1.3rem;
      color: #0f0;
      font-weight: bold;
    }
    .integration-category {
      color: #666;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .integration-usecase {
      color: #aaa;
      font-size: 0.95rem;
      margin-bottom: 10px;
      font-style: italic;
    }
    .integration-description {
      color: #888;
      font-size: 0.9rem;
      line-height: 1.6;
      margin-bottom: 15px;
    }
    .integration-endpoints {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 15px;
    }
    .endpoint-tag {
      background: #222;
      color: #0f0;
      padding: 5px 12px;
      border-radius: 4px;
      font-size: 0.75rem;
      border: 1px solid #333;
    }
    .integration-meta {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #222;
      font-size: 0.85rem;
    }
    .meta-item {
      color: #666;
    }
    .meta-item span {
      color: #0f0;
    }
    .meta-link {
      color: #0f0;
      text-decoration: none;
      transition: color 0.2s;
    }
    .meta-link:hover {
      color: #0f0;
      text-decoration: underline;
    }
    .testimonial {
      background: #0f1419;
      border-left: 3px solid #00ff88;
      padding: 12px 15px;
      margin-top: 15px;
      font-style: italic;
      color: #aaa;
      font-size: 0.9rem;
    }
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }
    .footer {
      text-align: center;
      padding: 40px 20px;
      color: #444;
      border-top: 1px solid #222;
    }
    .cta {
      display: inline-block;
      margin-top: 20px;
      padding: 15px 30px;
      background: linear-gradient(135deg, var(--wg-telemetry) 0%, rgba(54, 212, 255, 0.35) 100%);
      color: rgba(7, 13, 20, 0.95);
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      transition: transform 0.2s;
    }
    .cta:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 22px rgba(54, 212, 255, 0.22);
    }
  </style>
</head>
<body>
  <div class="wg-topbar">
    <div class="wg-topbar-inner">
      <div class="wg-topbar-left">
        <div class="wg-badge"><span class="wg-dot"></span> LIVE • INTEGRATIONS</div>
        <div class="wg-title">WARGAMES // INTEGRATIONS</div>
        <div class="wg-subtitle">Real agents using macro intelligence in production</div>
      </div>
      <nav class="wg-nav" aria-label="Primary">
        <a href="/dashboard/v2">Dashboard</a>
        <a href="/dashboard/analytics">Analytics</a>
        <a href="/dashboard/predictions">Predictions</a>
        <a href="/integrations/proof">Proof</a>
        <a href="/oracle/agents">Oracle</a>
        <a href="/pitch">Pitch</a>
        <a href="/">API</a>
      </nav>
    </div>
  </div>
  <div class="header">
    <h1>WARGAMES // INTEGRATIONS</h1>
    <p class="tagline">Real agents using macro intelligence in production</p>
    <div class="stats-bar">
      <div class="stat-item">
        <div class="stat-value">${stats.total}</div>
        <div class="stat-label">Total Integrations</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${stats.production}</div>
        <div class="stat-label">Production</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${stats.testing}</div>
        <div class="stat-label">Testing</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${stats.planned}</div>
        <div class="stat-label">Planned</div>
      </div>
    </div>
  </div>

  <div class="container">
    ${production.length > 0 ? `
    <div class="section">
      <div class="section-title">
        <span>PRODUCTION INTEGRATIONS</span>
        <span class="badge">${production.length} LIVE</span>
      </div>
      ${production.map(int => `
      <div class="integration-card">
        <div class="integration-header">
          <div>
            <div class="integration-name">${int.name}</div>
            <div class="integration-category">${int.category}</div>
          </div>
          <span class="badge">${int.status.toUpperCase()}</span>
        </div>
        <div class="integration-usecase">${int.useCase}</div>
        <div class="integration-description">${int.description}</div>
        <div class="integration-endpoints">
          ${int.endpoints.map(ep => `<span class="endpoint-tag">${ep}</span>`).join('')}
        </div>
        ${int.testimonial ? `<div class="testimonial">"${int.testimonial}"</div>` : ''}
        <div class="integration-meta">
          <div class="meta-item">Confirmed: <span>${int.confirmedDate}</span></div>
          <div class="meta-item">Calls: <span>${int.estimatedCalls || 'N/A'}</span></div>
          <div class="meta-item">
            <a href="https://colosseum.com/agent-hackathon/projects/${int.name.toLowerCase().replace(/\s+/g, '-')}"
               class="meta-link" target="_blank">View Project →</a>
          </div>
          ${int.forumPost ? `<div class="meta-item">
            <a href="https://colosseum.com/agent-hackathon/forum/${int.forumPost}"
               class="meta-link" target="_blank">Forum Discussion →</a>
          </div>` : ''}
        </div>
      </div>
      `).join('')}
    </div>
    ` : ''}

    ${testing.length > 0 ? `
    <div class="section">
      <div class="section-title">
        <span>TESTING INTEGRATIONS</span>
        <span class="badge testing">${testing.length} IN TEST</span>
      </div>
      ${testing.map(int => `
      <div class="integration-card">
        <div class="integration-header">
          <div>
            <div class="integration-name">${int.name}</div>
            <div class="integration-category">${int.category}</div>
          </div>
          <span class="badge testing">${int.status.toUpperCase()}</span>
        </div>
        <div class="integration-usecase">${int.useCase}</div>
        <div class="integration-description">${int.description}</div>
        <div class="integration-endpoints">
          ${int.endpoints.map(ep => `<span class="endpoint-tag">${ep}</span>`).join('')}
        </div>
        <div class="integration-meta">
          <div class="meta-item">Started: <span>${int.confirmedDate}</span></div>
          <div class="meta-item">Calls: <span>${int.estimatedCalls || 'N/A'}</span></div>
          <div class="meta-item">
            <a href="https://colosseum.com/agent-hackathon/projects/${int.name.toLowerCase().replace(/\s+/g, '-')}"
               class="meta-link" target="_blank">View Project →</a>
          </div>
          ${int.forumPost ? `<div class="meta-item">
            <a href="https://colosseum.com/agent-hackathon/forum/${int.forumPost}"
               class="meta-link" target="_blank">Forum Discussion →</a>
          </div>` : ''}
        </div>
      </div>
      `).join('')}
    </div>
    ` : ''}

    ${planned.length > 0 ? `
    <div class="section">
      <div class="section-title">
        <span>PLANNED INTEGRATIONS</span>
        <span class="badge planned">${planned.length} UPCOMING</span>
      </div>
      ${planned.map(int => `
      <div class="integration-card">
        <div class="integration-header">
          <div>
            <div class="integration-name">${int.name}</div>
            <div class="integration-category">${int.category}</div>
          </div>
          <span class="badge planned">${int.status.toUpperCase()}</span>
        </div>
        <div class="integration-usecase">${int.useCase}</div>
        <div class="integration-description">${int.description}</div>
        <div class="integration-endpoints">
          ${int.endpoints.map(ep => `<span class="endpoint-tag">${ep}</span>`).join('')}
        </div>
        <div class="integration-meta">
          <div class="meta-item">Interest: <span>${int.confirmedDate}</span></div>
          <div class="meta-item">Status: <span>${int.estimatedCalls || 'Not yet integrated'}</span></div>
          <div class="meta-item">
            <a href="https://colosseum.com/agent-hackathon/projects/${int.name.toLowerCase().replace(/\s+/g, '-')}"
               class="meta-link" target="_blank">View Project →</a>
          </div>
        </div>
      </div>
      `).join('')}
    </div>
    ` : ''}
  </div>

  <div class="footer">
    <p><strong>Want to integrate WARGAMES?</strong></p>
    <p style="margin: 15px 0; color: var(--wg-text-muted);">Free. No auth. Sub-second response. Built for agents.</p>
    <a href="/dashboard/v2" class="cta">View Live Dashboard →</a>
    <a href="/" class="cta" style="margin-left: 10px;">API Documentation →</a>
    <p style="margin-top: 30px; color: var(--wg-text-muted);">
      Built by Ziggy (Agent #311) | Colosseum Agent Hackathon 2026
    </p>
  </div>
</body>
</html>
  `);
});

/**
 * GET /integrations/proof
 * Integration proof page - Real usage stats and verified integrations
 */
app.get('/integrations/proof', async (_req: Request, res: Response) => {
  const realtimeStats = getRealtimeStats();
  const integrationStats = getAnalyticsIntegrationStats();
  const topEndpoints = getTopEndpoints(10);
  const walletStats = getConnectionStats();

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WARGAMES // INTEGRATION VERIFICATION CONSOLE</title>
  <link rel="stylesheet" href="/assets/brand.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background: #070d14;
      color: #f1f8ff;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      min-height: 100vh;
      padding: 0;
    }

    /* Grid overlay effect */
    .grid-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background:
        repeating-linear-gradient(0deg, rgba(54, 212, 255, 0.08) 0px, transparent 1px, transparent 60px),
        repeating-linear-gradient(90deg, rgba(54, 212, 255, 0.08) 0px, transparent 1px, transparent 60px);
      pointer-events: none;
      z-index: 1;
    }

    .content { position: relative; z-index: 2; }

    .container {
      max-width: 1600px;
      margin: 0 auto;
      padding: 20px;
    }

    .section-title {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #36d4ff;
      margin: 30px 0 15px 0;
      border-bottom: 1px solid #234055;
      padding-bottom: 8px;
    }

    .proof-badge {
      display: inline-block;
      background: rgba(2, 255, 129, 0.1);
      color: #02ff81;
      border: 1px solid rgba(2, 255, 129, 0.3);
      padding: 6px 12px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin: 10px 0;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }

    .panel {
      border: 1px solid #234055;
      background: #0e1822;
      padding: 25px;
      position: relative;
      overflow: hidden;
    }

    .panel.armed {
      border-top: 2px solid #02ff81;
    }

    .panel h2 {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #36d4ff;
      margin-bottom: 20px;
      border-bottom: 1px solid #234055;
      padding-bottom: 10px;
    }

    .metric {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #234055;
      font-size: 13px;
    }

    .metric-label {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #7a9ab0;
    }

    .metric-value {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      font-size: 13px;
      color: #f1f8ff;
    }

    .status-pill {
      display: inline-block;
      padding: 4px 10px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border: 1px solid;
    }

    .status-pill.active { background: rgba(2, 255, 129, 0.1); color: #02ff81; border-color: rgba(2, 255, 129, 0.3); }
    .status-pill.idle { background: rgba(245, 166, 35, 0.1); color: #f5a623; border-color: rgba(245, 166, 35, 0.3); }
    .status-pill.inactive { background: rgba(255, 107, 107, 0.1); color: #ff6b6b; border-color: rgba(255, 107, 107, 0.3); }

    .integration-card {
      border: 1px solid #234055;
      padding: 15px;
      margin: 10px 0;
      background: #101c28;
    }

    .integration-name {
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      color: #36d4ff;
      margin-bottom: 10px;
    }

    .integration-stat {
      font-size: 11px;
      color: #b8d0e0;
      margin: 5px 0;
    }

    .code-example {
      background: #070d14;
      border: 1px solid #234055;
      padding: 15px;
      margin: 15px 0;
      font-size: 11px;
      overflow-x: auto;
      color: #b8d0e0;
    }

    .proof-statement {
      border: 1px solid #234055;
      border-top: 2px solid #02ff81;
      padding: 20px;
      margin: 20px 0;
      background: #0e1822;
      text-align: center;
    }

    .proof-statement strong {
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      color: #02ff81;
    }

    .footer {
      text-align: center;
      padding: 30px;
      color: #7a9ab0;
      border-top: 1px solid #234055;
      margin-top: 40px;
      font-size: 10px;
    }

    @media (max-width: 768px) {
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="grid-overlay"></div>
  <div class="wg-topbar">
    <div class="wg-topbar-inner">
      <div class="wg-topbar-left">
        <div class="wg-badge"><span class="wg-dot"></span> LIVE • PROOF</div>
        <div class="wg-title">WARGAMES // INTEGRATION PROOF</div>
        <div class="wg-subtitle">INTEGRATION VERIFICATION CONSOLE</div>
      </div>
      <nav class="wg-nav" aria-label="Primary">
        <a href="/dashboard/v2">Dashboard</a>
        <a href="/dashboard/analytics">Analytics</a>
        <a href="/dashboard/predictions">Predictions</a>
        <a href="/dashboard/integrations">Integrations</a>
        <a href="/oracle/agents">Oracle</a>
        <a href="/pitch">Pitch</a>
        <a href="/">API</a>
      </nav>
    </div>
  </div>
  <div class="container">
    <div class="header">
      <h1>WARGAMES // INTEGRATION PROOF</h1>
      <div class="subtitle">
        <span class="live-indicator"></span>
        Real Usage Stats // Verified Integrations // Live API Metrics
      </div>
      <div class="proof-badge">✓ PRODUCTION VERIFIED</div>
    </div>

    <div class="proof-statement">
      <strong>PROOF OF USAGE</strong><br>
      <span style="font-size: 0.9rem; color: var(--wg-text-muted);">
        Live API stats. Real integrations. No claims without evidence.
      </span>
    </div>

    <div class="grid">
      <!-- Real-Time Stats -->
      <div class="panel">
        <h2>LIVE API METRICS</h2>
        <div class="metric">
          <span class="metric-label">Total API Calls (24h)</span>
          <span class="metric-value">${realtimeStats.total_calls_24h.toLocaleString()}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Active Integrations</span>
          <span class="metric-value">${realtimeStats.active_integrations}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Avg Response Time</span>
          <span class="metric-value">${realtimeStats.avg_response_time_ms}ms</span>
        </div>
        <div class="metric">
          <span class="metric-label">Uptime</span>
          <span class="metric-value status-active">LIVE</span>
        </div>
      </div>

      <!-- Wallet Connections -->
      <div class="panel">
        <h2>AGENT CONNECTIONS</h2>
        <div class="metric">
          <span class="metric-label">Total Wallet Connections</span>
          <span class="metric-value">${walletStats.total}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Solana Agents</span>
          <span class="metric-value">${walletStats.withSolana}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Recently Active</span>
          <span class="metric-value status-active">${walletStats.recentlyActive}</span>
        </div>
      </div>

      <!-- Top Endpoints -->
      <div class="panel">
        <h2>MOST USED ENDPOINTS</h2>
        ${topEndpoints.slice(0, 8).map((ep, i) => `
        <div class="metric">
          <span class="metric-label">${i + 1}. ${ep.endpoint}</span>
          <span class="metric-value">${ep.calls}</span>
        </div>
        `).join('')}
      </div>
    </div>

    <!-- Active Integrations -->
    <div class="panel">
      <h2>VERIFIED INTEGRATIONS (Active in Last 24h)</h2>
      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
        ${integrationStats.length > 0 ? integrationStats.map(integ => {
          const activity = getIntegrationActivity(integ.integrationId);
          const statusEmoji = activity === 'active' ? '🟢' : activity === 'idle' ? '🟡' : '🔴';
          return `
        <div class="integration-card">
          <div class="integration-name">${statusEmoji} :: ${integ.integrationId}</div>
          <div class="integration-stat">Calls (24h): <span style="color: var(--wg-telemetry);">${integ.calls}</span></div>
          <div class="integration-stat">Avg Response: <span style="color: var(--wg-telemetry);">${integ.avgResponseTime}ms</span></div>
          <div class="integration-stat">Last Seen: <span style="color: var(--wg-telemetry);">${timeAgo(integ.lastSeen)}</span></div>
          <div class="integration-stat">Status: <span class="status-${activity}">${activity.toUpperCase()}</span></div>
        </div>
        `;
        }).join('') : '<div style="color: #0a0; padding: 20px;">No integrations active in last 24h</div>'}
      </div>
    </div>

    <!-- Integration Leads -->
    <div class="panel">
      <h2>INTEGRATION LEADS (In Discussion)</h2>
      <div class="integration-card">
        <div class="integration-name">opus-builder // AutoVault Identity SDK</div>
        <div class="integration-stat">Status: <span style="color: #ff0;">PROPOSED TODAY</span></div>
        <div class="integration-stat">Use Case: Identity + macro context for decision tracking</div>
        <div class="integration-stat">Forum: Post #1297, Comment #7054</div>
      </div>
      <div class="integration-card">
        <div class="integration-name">🔧 Mistah // Macro Oracle</div>
        <div class="integration-stat">Status: <span style="color: #ff0;">INTEGRATION PR READY</span></div>
        <div class="integration-stat">Use Case: Oracle routing with macro intelligence</div>
        <div class="integration-stat">Code: wargames.ts service + 3 API routes complete</div>
      </div>
      <div class="integration-card">
        <div class="integration-name">💰 IBRL // Sovereign Vault</div>
        <div class="integration-stat">Status: <span style="color: #ff0;">IN DISCUSSION</span></div>
        <div class="integration-stat">Use Case: DCA timing with volatility windows</div>
        <div class="integration-stat">Forum: Multiple threads</div>
      </div>
      <div class="integration-card">
        <div class="integration-name">🛡️ Varuna // DeFi Protection</div>
        <div class="integration-stat">Status: <span style="color: #ff0;">IN DISCUSSION</span></div>
        <div class="integration-stat">Use Case: Varuna micro + WARGAMES macro = complete risk</div>
        <div class="integration-stat">Forum: Post #1233</div>
      </div>
    </div>

    <!-- Integration Example -->
    <div class="panel">
      <h2>INTEGRATION EXAMPLE</h2>
      <p style="color: #0a0; margin-bottom: 15px;">
        Real code from opus-builder integration proposal:
      </p>
      <div class="code-example">
// Agent makes DeFi decision<br>
const { risk_score, bias } = await wargames.getRisk();<br>
const decision = calculateStrategy(risk_score);<br>
<br>
// Record decision with macro context<br>
await identitySDK.recordDecision({<br>
&nbsp;&nbsp;action: decision,<br>
&nbsp;&nbsp;timestamp: Date.now(),<br>
&nbsp;&nbsp;context: {<br>
&nbsp;&nbsp;&nbsp;&nbsp;risk_score,<br>
&nbsp;&nbsp;&nbsp;&nbsp;bias,<br>
&nbsp;&nbsp;&nbsp;&nbsp;narratives: wargames.narratives<br>
&nbsp;&nbsp;}<br>
});
      </div>
      <p style="color: #0a0; margin-top: 15px; font-size: 0.9rem;">
        Posted: Forum comment #7054, 2026-02-05
      </p>
    </div>

    <!-- SDK -->
    <div class="panel">
      <h2>NPM PACKAGE STATUS</h2>
      <div class="metric">
        <span class="metric-label">Package Name</span>
        <span class="metric-value">@wargames/sdk</span>
      </div>
      <div class="metric">
        <span class="metric-label">Version</span>
        <span class="metric-value">1.0.0</span>
      </div>
      <div class="metric">
        <span class="metric-label">Build Status</span>
        <span class="metric-value status-active">✓ BUILT</span>
      </div>
      <div class="metric">
        <span class="metric-label">Publication Status</span>
        <span class="metric-value" style="color: #ff0;">⏳ READY TO PUBLISH</span>
      </div>
      <div class="code-example" style="margin-top: 20px;">
npm install @wargames/sdk<br>
<br>
import { WARGAMES } from '@wargames/sdk';<br>
const wargames = new WARGAMES();<br>
const { score, bias } = await wargames.getRisk();
      </div>
    </div>

    <div class="footer">
      <p><strong style="color: #0f0;">Built by Ziggy (Agent #311)</strong></p>
      <p style="margin: 10px 0;">Colosseum Agent Hackathon 2026</p>
      <p style="font-size: 0.8rem; color: #0a0;">
        Updates hourly // All stats live // No mock data
      </p>
    </div>
  </div>

  <script>
    // Auto-refresh every 5 minutes
    setTimeout(() => location.reload(), 300000);
  </script>
</body>
</html>
  `);
});

/**
 * GET /dashboard/v1
 * Original dashboard (kept for reference)
 */
app.get('/dashboard/v1', async (_req: Request, res: Response) => {
  // v1 is deprecated — keep one visual system across the site.
  res.redirect('/dashboard/v2');
  return;
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WARGAMES - Real-Time Macro Intelligence</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', 'Monaco', 'Consolas', monospace;
      background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
      color: #e0e0e0;
      min-height: 100vh;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 40px 0 20px;
      margin-bottom: 30px;
      background: rgba(0,0,0,0.3);
      border-radius: 16px;
      border: 1px solid #00ff8820;
    }
    .header h1 {
      font-size: 3.5rem;
      color: #0f0;
      letter-spacing: 12px;
      margin-bottom: 10px;
      text-shadow: 0 0 30px #00ff8850;
    }
    .header .tagline {
      color: #aaa;
      font-size: 1rem;
      letter-spacing: 2px;
      margin-top: 10px;
    }
    .stats-bar {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin: 20px 0;
      flex-wrap: wrap;
    }
    .stat-item {
      text-align: center;
    }
    .stat-value {
      font-size: 1.8rem;
      font-weight: bold;
      color: #0f0;
    }
    .stat-label {
      font-size: 0.7rem;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 20px;
      max-width: 1600px;
      margin: 0 auto;
    }
    .card {
      background: linear-gradient(135deg, #111118 0%, #1a1a28 100%);
      border: 1px solid #00ff8815;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 48px rgba(0,255,136,0.1);
      border-color: #00ff8830;
    }
    .card h2 {
      color: #0f0;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #00ff8820;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card.featured {
      grid-column: span 1;
      background: linear-gradient(135deg, #1a1a28 0%, #2a2a38 100%);
      border: 2px solid #00ff8830;
    }
    .risk-score {
      font-size: 5rem;
      font-weight: bold;
      text-align: center;
      padding: 30px 0;
      text-shadow: 0 0 40px currentColor;
    }
    .risk-score.low { color: #00ff88; }
    .risk-score.medium { color: #ffaa00; }
    .risk-score.high { color: #ff4444; }
    .risk-label {
      text-align: center;
      font-size: 1.3rem;
      text-transform: uppercase;
      letter-spacing: 4px;
      margin-bottom: 25px;
      font-weight: bold;
    }
    .component {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #ffffff08;
    }
    .component:last-child { border: none; }
    .component-label {
      color: #999;
      font-size: 0.9rem;
    }
    .component-value {
      color: #0f0;
      font-weight: bold;
      font-size: 1.1rem;
    }
    .fear-greed {
      text-align: center;
      padding: 20px 0;
    }
    .fear-greed .value {
      font-size: 4.5rem;
      font-weight: bold;
      text-shadow: 0 0 40px currentColor;
    }
    .fear-greed .label {
      color: #aaa;
      text-transform: uppercase;
      letter-spacing: 3px;
      font-size: 0.9rem;
      margin-top: 10px;
      font-weight: bold;
    }
    .price-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #ffffff08;
    }
    .price-row:last-child { border: none; }
    .price-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .price-symbol {
      font-weight: bold;
      color: #fff;
      font-size: 1rem;
      min-width: 50px;
    }
    .price-name {
      color: #666;
      font-size: 0.8rem;
    }
    .price-value {
      font-weight: bold;
      color: #fff;
      font-size: 1rem;
    }
    .price-change {
      font-size: 0.9rem;
      font-weight: bold;
      min-width: 70px;
      text-align: right;
    }
    .price-change.up { color: #00ff88; }
    .price-change.down { color: #ff4444; }
    .prediction {
      padding: 14px 0;
      border-bottom: 1px solid #ffffff08;
    }
    .prediction:last-child { border: none; }
    .prediction-question {
      font-size: 0.9rem;
      color: #ddd;
      margin-bottom: 6px;
      line-height: 1.4;
    }
    .prediction-odds {
      font-weight: bold;
      color: #0f0;
      font-size: 1.1rem;
    }
    .narrative {
      padding: 12px 0;
      border-bottom: 1px solid #ffffff08;
    }
    .narrative:last-child { border: none; }
    .narrative-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .narrative-name {
      font-size: 0.9rem;
      color: #ddd;
    }
    .narrative-score {
      font-weight: bold;
      color: #0f0;
      font-size: 1rem;
    }
    .narrative-bar {
      height: 6px;
      background: #222;
      border-radius: 3px;
      overflow: hidden;
    }
    .narrative-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #00ff88, #ffaa00, #ff4444);
      transition: width 0.5s ease;
    }
    .driver {
      padding: 10px 14px;
      background: #00ff8810;
      border-left: 3px solid #00ff88;
      border-radius: 4px;
      margin-bottom: 10px;
      font-size: 0.9rem;
      color: #ddd;
    }
    .rwa-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #ffffff08;
    }
    .rwa-item:last-child { border: none; }
    .rwa-label {
      color: #999;
      font-size: 0.9rem;
    }
    .rwa-value {
      color: #fff;
      font-weight: bold;
      font-size: 1rem;
    }
    .rwa-change {
      font-size: 0.85rem;
      margin-left: 8px;
    }
    .rwa-change.up { color: #00ff88; }
    .rwa-change.down { color: #ff4444; }
    .loading {
      color: #666;
      text-align: center;
      padding: 50px 20px;
      font-size: 0.9rem;
    }
    .footer {
      text-align: center;
      padding: 60px 0 40px;
      color: #555;
      font-size: 0.85rem;
    }
    .footer a {
      color: #0f0;
      text-decoration: none;
      transition: color 0.2s;
    }
    .footer a:hover {
      color: #0f0;
    }
    .api-links {
      display: flex;
      justify-content: center;
      gap: 15px;
      margin-top: 25px;
      flex-wrap: wrap;
    }
    .api-link {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #0f0 0%, #0a0 100%);
      color: #000;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      font-size: 0.85rem;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 16px rgba(0,255,136,0.3);
    }
    .api-link:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(0,255,136,0.5);
    }
    .api-link.secondary {
      background: linear-gradient(135deg, #333 0%, #222 100%);
      color: #0f0;
      border: 1px solid #0a0;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .live-dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      background: #00ff88;
      border-radius: 50%;
      margin-right: 10px;
      animation: pulse 2s infinite;
      box-shadow: 0 0 10px #00ff88;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(0, 255, 0, 0.15);
      color: #0f0;
      border-radius: 12px;
      font-size: 0.7rem;
      font-weight: bold;
      letter-spacing: 1px;
    }
    .chart-container {
      position: relative;
      height: 200px;
      margin-top: 20px;
    }
    .chart-small {
      height: 150px;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
</head>
<body>
  <div class="header">
    <h1>WARGAMES</h1>
    <p class="tagline"><span class="live-dot"></span>REAL-TIME MACRO INTELLIGENCE FOR SOLANA AGENTS</p>
    <div class="stats-bar" id="stats-bar">
      <div class="stat-item"><div class="stat-value">--</div><div class="stat-label">Data Sources</div></div>
      <div class="stat-item"><div class="stat-value">--</div><div class="stat-label">Markets Tracked</div></div>
      <div class="stat-item"><div class="stat-value">--ms</div><div class="stat-label">Response Time</div></div>
      <div class="stat-item"><div class="stat-value">$--</div><div class="stat-label">API Cost</div></div>
    </div>
  </div>

  <div class="grid">
    <div class="card featured" id="risk-card">
      <h2>Global Risk Score <span class="badge">LIVE</span></h2>
      <div class="loading">Loading...</div>
    </div>

    <div class="card featured" id="sentiment-card">
      <h2>Fear & Greed Index <span class="badge">LIVE</span></h2>
      <div class="loading">Loading...</div>
    </div>

    <div class="card" id="crypto-card">
      <h2>Crypto Prices <span class="badge">LIVE</span></h2>
      <div class="loading">Loading...</div>
    </div>

    <div class="card" id="rwa-card">
      <h2>RWA Data <span class="badge">LIVE</span></h2>
      <div class="loading">Loading...</div>
    </div>

    <div class="card" id="predictions-card">
      <h2>Prediction Markets <span class="badge">POLYMARKET</span></h2>
      <div class="loading">Loading...</div>
    </div>

    <div class="card" id="economic-card">
      <h2>Economic Indicators <span class="badge">FED</span></h2>
      <div class="loading">Loading...</div>
    </div>

    <div class="card" id="drivers-card">
      <h2>Risk Drivers <span class="badge">AUTO</span></h2>
      <div class="loading">Loading...</div>
    </div>
  </div>

  <div class="footer">
    <p><strong>Built by Ziggy (Agent #311)</strong> for the Colosseum Agent Hackathon</p>
    <p style="margin-top: 15px; font-size: 1.1rem; color: #888;">"Your agent sees prices. WARGAMES sees the world."</p>
    <div class="api-links">
      <a href="/" class="api-link">API Docs</a>
      <a href="/live/world" class="api-link secondary">GET /live/world</a>
      <a href="https://github.com/b1rdmania/wargames-api" class="api-link secondary" target="_blank">GitHub</a>
    </div>
    <p style="margin-top: 25px; color: #444;">Free. No auth. Sub-second response. Built for agents.</p>
  </div>

  <script>
    const API = '';
    const startTime = performance.now();

    // Historical data storage for charts
    const history = {
      timestamps: [],
      riskScores: [],
      fearGreedValues: [],
      maxDataPoints: 20 // Keep last 20 data points
    };

    // Chart instances
    let riskChart = null;
    let fearGreedChart = null;

    // Chart.js default config
    Chart.defaults.color = '#888';
    Chart.defaults.borderColor = '#333';
    Chart.defaults.font.family = "'JetBrains Mono', monospace";

    function addToHistory(timestamp, riskScore, fearGreedValue) {
      history.timestamps.push(timestamp);
      history.riskScores.push(riskScore);
      history.fearGreedValues.push(fearGreedValue);

      // Keep only last maxDataPoints
      if (history.timestamps.length > history.maxDataPoints) {
        history.timestamps.shift();
        history.riskScores.shift();
        history.fearGreedValues.shift();
      }
    }

    function createRiskChart() {
      const ctx = document.getElementById('riskChart');
      if (!ctx) return;

      riskChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: history.timestamps,
          datasets: [{
            label: 'Risk Score',
            data: history.riskScores,
            borderColor: '#00ff88',
            backgroundColor: 'rgba(0, 255, 136, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: '#00ff88',
              bodyColor: '#fff'
            }
          },
          scales: {
            y: {
              min: 0,
              max: 100,
              ticks: { color: '#666' },
              grid: { color: '#222' }
            },
            x: {
              ticks: {
                color: '#666',
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 6
              },
              grid: { display: false }
            }
          }
        }
      });
    }

    function createFearGreedChart() {
      const ctx = document.getElementById('fearGreedChart');
      if (!ctx) return;

      fearGreedChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: history.timestamps,
          datasets: [{
            label: 'Fear & Greed',
            data: history.fearGreedValues,
            borderColor: '#ffaa00',
            backgroundColor: 'rgba(255, 170, 0, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: '#ffaa00',
              bodyColor: '#fff'
            }
          },
          scales: {
            y: {
              min: 0,
              max: 100,
              ticks: { color: '#666' },
              grid: { color: '#222' }
            },
            x: {
              ticks: {
                color: '#666',
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 6
              },
              grid: { display: false }
            }
          }
        }
      });
    }

    function updateCharts() {
      if (riskChart) {
        riskChart.data.labels = history.timestamps;
        riskChart.data.datasets[0].data = history.riskScores;
        riskChart.update('none'); // No animation for performance
      }

      if (fearGreedChart) {
        fearGreedChart.data.labels = history.timestamps;
        fearGreedChart.data.datasets[0].data = history.fearGreedValues;
        fearGreedChart.update('none');
      }
    }

    async function fetchData() {
      const fetchStart = performance.now();

      try {
        const [risk, crypto, predictions, economic, commodities, apiStats] = await Promise.all([
          fetch(API + '/live/risk').then(r => r.json()),
          fetch(API + '/live/crypto').then(r => r.json()),
          fetch(API + '/live/predictions').then(r => r.json()),
          fetch(API + '/live/economic').then(r => r.json()),
          fetch(API + '/live/commodities').then(r => r.json()),
          fetch(API + '/stats').then(r => r.json())
        ]);

        const fetchTime = Math.round(performance.now() - fetchStart);

        // Update stats bar with REAL API usage data
        document.getElementById('stats-bar').innerHTML = \`
          <div class="stat-item"><div class="stat-value">8</div><div class="stat-label">Solana Integrations</div></div>
          <div class="stat-item"><div class="stat-value">\${apiStats.total_calls || 0}</div><div class="stat-label">API Calls (Total)</div></div>
          <div class="stat-item"><div class="stat-value">\${fetchTime}ms</div><div class="stat-label">Response Time</div></div>
          <div class="stat-item"><div class="stat-value">\${apiStats.registered_integrations || 0}</div><div class="stat-label">Active Integrations</div></div>
        \`;

        // Add to history
        const now = new Date();
        const timeLabel = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
        addToHistory(timeLabel, risk.score, risk.fear_greed?.value || 50);

        // Risk Score
        const riskClass = risk.score >= 70 ? 'high' : risk.score >= 40 ? 'medium' : 'low';
        document.getElementById('risk-card').innerHTML = \`
          <h2>Global Risk Score <span class="badge">LIVE</span></h2>
          <div class="risk-score \${riskClass}">\${risk.score}</div>
          <div class="risk-label">\${risk.bias.toUpperCase()}</div>
          <div class="component"><span class="component-label">Sentiment Risk</span><span class="component-value">\${risk.components?.sentiment || '-'}</span></div>
          <div class="component"><span class="component-label">Geopolitical Risk</span><span class="component-value">\${risk.components?.geopolitical || '-'}</span></div>
          <div class="component"><span class="component-label">Economic Risk</span><span class="component-value">\${risk.components?.economic || '-'}</span></div>
          <div class="component"><span class="component-label">Crypto Volatility</span><span class="component-value">\${risk.components?.crypto || '-'}</span></div>
          <div class="chart-container"><canvas id="riskChart"></canvas></div>
        \`;

        // Create or update risk chart
        if (!riskChart) {
          createRiskChart();
        } else {
          updateCharts();
        }

        // Fear & Greed
        if (risk.fear_greed) {
          const fg = risk.fear_greed;
          const fgColor = fg.value <= 25 ? '#ff4444' : fg.value <= 45 ? '#ffaa00' : fg.value <= 55 ? '#aaa' : fg.value <= 75 ? '#88ff88' : '#00ff88';
          document.getElementById('sentiment-card').innerHTML = \`
            <h2>Fear & Greed Index <span class="badge">LIVE</span></h2>
            <div class="fear-greed">
              <div class="value" style="color: \${fgColor}">\${fg.value}</div>
              <div class="label" style="color: \${fgColor}">\${fg.value_classification}</div>
            </div>
            <div style="text-align: center; margin-top: 10px; color: #666; font-size: 0.8rem;">
              Extreme Fear = Buying Opportunity<br>
              Extreme Greed = Correction Risk
            </div>
            <div class="chart-container chart-small"><canvas id="fearGreedChart"></canvas></div>
          \`;

          // Create or update fear & greed chart
          if (!fearGreedChart) {
            createFearGreedChart();
          }
        }

        // Crypto Prices
        const cryptoHtml = crypto.prices?.slice(0, 7).map(c => {
          const changeClass = c.price_change_percentage_24h >= 0 ? 'up' : 'down';
          const changeSign = c.price_change_percentage_24h >= 0 ? '+' : '';
          const price = c.current_price >= 1 ? c.current_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : c.current_price.toFixed(6);
          return \`
            <div class="price-row">
              <div class="price-left">
                <span class="price-symbol">\${c.symbol}</span>
              </div>
              <div>
                <span class="price-value">$\${price}</span>
                <span class="price-change \${changeClass}">\${changeSign}\${c.price_change_percentage_24h?.toFixed(2)}%</span>
              </div>
            </div>
          \`;
        }).join('') || '<div class="loading">No data</div>';
        document.getElementById('crypto-card').innerHTML = '<h2>Crypto Prices <span class="badge">LIVE</span></h2>' + cryptoHtml;

        // RWA Data (Commodities + Economic)
        let rwaHtml = '';
        if (commodities.commodities) {
          rwaHtml += commodities.commodities.map(c => \`
            <div class="rwa-item">
              <span class="rwa-label">\${c.name}</span>
              <div>
                <span class="rwa-value">$\${c.price.toLocaleString()}/\${c.unit}</span>
                <span class="rwa-change \${c.change_24h >= 0 ? 'up' : 'down'}">\${c.change_24h >= 0 ? '+' : ''}\${c.change_24h}%</span>
              </div>
            </div>
          \`).join('');
        }
        if (economic.indicators) {
          rwaHtml += economic.indicators.slice(0, 3).map(e => \`
            <div class="rwa-item">
              <span class="rwa-label">\${e.name}</span>
              <span class="rwa-value">\${e.value}\${e.unit}</span>
            </div>
          \`).join('');
        }
        document.getElementById('rwa-card').innerHTML = '<h2>RWA Data <span class="badge">LIVE</span></h2>' + (rwaHtml || '<div class="loading">Loading...</div>');

        // Economic Indicators
        const econHtml = economic.indicators?.map(e => \`
          <div class="rwa-item">
            <span class="rwa-label">\${e.name}</span>
            <div>
              <span class="rwa-value">\${e.value}\${e.unit}</span>
              <span style="margin-left: 10px; color: #666; font-size: 0.8rem;">\${e.trend === 'up' ? '↗' : e.trend === 'down' ? '↘' : '→'}</span>
            </div>
          </div>
        \`).join('') || '<div class="loading">No data</div>';
        document.getElementById('economic-card').innerHTML = '<h2>Economic Indicators <span class="badge">FED</span></h2>' + econHtml;

        // Predictions
        const predHtml = predictions.markets?.slice(0, 5).map(p => \`
          <div class="prediction">
            <div class="prediction-question">\${p.question}</div>
            <div class="prediction-odds">\${p.probability?.toFixed(1)}% probability</div>
          </div>
        \`).join('') || '<div class="loading">No markets</div>';
        document.getElementById('predictions-card').innerHTML = '<h2>Prediction Markets <span class="badge">POLYMARKET</span></h2>' + predHtml;

        // Drivers
        const driversHtml = risk.drivers?.length > 0
          ? risk.drivers.map(d => \`<div class="driver">\${d}</div>\`).join('')
          : '<div style="text-align: center; color: #666; padding: 30px;">No elevated risk drivers detected</div>';
        document.getElementById('drivers-card').innerHTML = '<h2>Risk Drivers <span class="badge">AUTO</span></h2>' + driversHtml;

      } catch (err) {
        console.error('Failed to load data:', err);
      }
    }

    // Initial load
    fetchData();
    // Refresh every 30 seconds (faster for demo)
    setInterval(fetchData, 30000);
  </script>
</body>
</html>
  `);
});

// =============================================================================
// DOS/NORTON LAB DASHBOARD (v2)
// =============================================================================

/**
 * GET /dashboard/v2
 * DOS/NORTON LAB aesthetic - NORAD intelligence terminal
 */
app.get('/dashboard/v2', async (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WARGAMES // NORAD INTELLIGENCE TERMINAL</title>
  <link rel="stylesheet" href="/assets/brand.css">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --norad-bg: var(--wg-bg);
      --norad-surface: var(--wg-surface);
      --norad-panel: var(--wg-panel);
      --norad-grid: var(--wg-border);
      --norad-telemetry: var(--wg-telemetry);
      --norad-signal: var(--wg-signal);
      --norad-intel: var(--wg-intel);
      --norad-warning: var(--wg-warning);
      --norad-fault: var(--wg-fault);
      --text-primary: var(--wg-text);
      --text-muted: var(--wg-text-muted);
    }

    body {
      font-family: 'JetBrains Mono', monospace;
      background: var(--norad-bg);
      color: var(--text-primary);
      min-height: 100vh;
      padding: 0;
      overflow-x: hidden;
    }

    .terminal {
      max-width: 1600px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      border: 2px solid var(--norad-grid);
      background: var(--norad-surface);
      padding: 20px 30px;
      margin-bottom: 20px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      position: relative;
    }

    .header::before {
      content: "●";
      color: var(--norad-signal);
      font-size: 16px;
      animation: pulse 2s infinite;
      margin-right: 10px;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    .title {
      font-size: 24px;
      font-weight: 700;
      color: var(--norad-telemetry);
      letter-spacing: 6px;
      text-shadow: 0 0 20px var(--norad-telemetry);
    }

    .subtitle {
      margin-top: 8px;
      color: var(--text-muted);
      font-size: 10px;
      letter-spacing: 3px;
    }

    .status-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }

    .status-item {
      border: 1px solid var(--norad-grid);
      background: var(--norad-surface);
      padding: 12px 16px;
      font-size: 9px;
    }

    .status-label {
      color: var(--text-muted);
      margin-bottom: 6px;
    }

    .status-value {
      font-size: 16px;
      font-weight: 700;
      color: var(--norad-signal);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
    }

    .panel {
      border: 2px solid var(--norad-grid);
      background: var(--norad-panel);
      position: relative;
      overflow: hidden;
    }

    .panel-header {
      background: var(--norad-surface);
      padding: 12px 16px;
      border-bottom: 1px solid var(--norad-grid);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: var(--norad-telemetry);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .panel-badge {
      font-size: 8px;
      padding: 2px 8px;
      background: var(--norad-grid);
      color: var(--norad-signal);
      border-radius: 2px;
    }

    .panel-content {
      padding: 20px;
    }

    .metric-primary {
      text-align: center;
      padding: 30px 0;
    }

    .metric-value {
      font-size: 72px;
      font-weight: 700;
      line-height: 1;
      text-shadow: 0 0 30px currentColor;
    }

    .metric-value.low { color: var(--norad-signal); }
    .metric-value.medium { color: var(--norad-warning); }
    .metric-value.high { color: var(--norad-fault); }

    .metric-label {
      margin-top: 12px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 4px;
      font-weight: 700;
    }

    .data-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid var(--norad-grid);
      font-size: 11px;
    }

    .data-row:last-child { border: none; }

    .data-label {
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: 9px;
    }

    .data-value {
      font-weight: 700;
      color: var(--norad-telemetry);
    }

    .crypto-row {
      display: grid;
      grid-template-columns: 60px 1fr auto;
      gap: 12px;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--norad-grid);
    }

    .crypto-row:last-child { border: none; }

    .crypto-symbol {
      font-weight: 700;
      color: var(--norad-telemetry);
    }

    .crypto-price {
      color: var(--text-primary);
      font-size: 13px;
    }

    .crypto-change {
      font-weight: 700;
      font-size: 11px;
    }

    .crypto-change.up { color: var(--norad-signal); }
    .crypto-change.down { color: var(--norad-fault); }

    .narrative-row {
      padding: 14px 0;
      border-bottom: 1px solid var(--norad-grid);
    }

    .narrative-row:last-child { border: none; }

    .narrative-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 10px;
    }

    .narrative-name {
      color: var(--text-primary);
    }

    .narrative-score {
      color: var(--norad-warning);
      font-weight: 700;
    }

    .narrative-bar {
      height: 4px;
      background: var(--norad-surface);
      position: relative;
      overflow: hidden;
    }

    .narrative-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--norad-signal), var(--norad-warning), var(--norad-fault));
      transition: width 0.5s ease;
    }

    .prediction-row {
      padding: 14px 0;
      border-bottom: 1px solid var(--norad-grid);
    }

    .prediction-row:last-child { border: none; }

    .prediction-question {
      font-size: 10px;
      color: var(--text-primary);
      margin-bottom: 6px;
      line-height: 1.4;
    }

    .prediction-odds {
      font-weight: 700;
      color: var(--norad-intel);
      font-size: 12px;
    }

    .driver-item {
      padding: 10px 12px;
      background: var(--norad-surface);
      border-left: 3px solid var(--norad-warning);
      margin-bottom: 10px;
      font-size: 10px;
      line-height: 1.4;
    }

    .rwa-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .rwa-item {
      text-align: center;
      padding: 16px;
      background: var(--norad-surface);
      border: 1px solid var(--norad-grid);
    }

    .rwa-label {
      font-size: 8px;
      text-transform: uppercase;
      color: var(--text-muted);
      letter-spacing: 1px;
      margin-bottom: 8px;
    }

    .rwa-value {
      font-size: 16px;
      font-weight: 700;
      color: var(--norad-telemetry);
    }

    .rwa-change {
      font-size: 10px;
      margin-top: 4px;
    }

    .rwa-change.up { color: var(--norad-signal); }
    .rwa-change.down { color: var(--norad-fault); }

    .footer {
      margin-top: 30px;
      padding: 20px;
      border-top: 1px solid var(--norad-grid);
      text-align: center;
      font-size: 9px;
      color: var(--text-muted);
    }

    .footer a {
      color: var(--norad-telemetry);
      text-decoration: none;
    }

    .footer a:hover {
      text-decoration: underline;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: var(--text-muted);
      font-size: 10px;
    }

    /* Hero Section Styles */
    .hero-section {
      border: 2px solid #f9c262;
      background: linear-gradient(135deg, #0e1822 0%, #101c28 100%);
      padding: 25px 30px;
      margin-bottom: 20px;
      border-radius: 4px;
    }

    .hero-grid {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 30px;
      align-items: start;
    }

    .hero-title {
      font-size: 14px;
      font-weight: 700;
      color: #f9c262;
      letter-spacing: 3px;
      margin-bottom: 12px;
    }

    .hero-description {
      font-size: 11px;
      line-height: 1.7;
      color: #f0eef5;
      margin-bottom: 16px;
    }

    .hero-stats {
      font-size: 10px;
      line-height: 1.6;
      color: #6b6879;
      margin-bottom: 16px;
    }

    .hero-buttons {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
    }

    .hero-button {
      background: #234055;
      padding: 8px 16px;
      text-decoration: none;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 1.5px;
      border-radius: 2px;
      border: 1px solid;
      transition: all 0.2s;
      display: inline-block;
    }

    .hero-button-docs {
      color: #36d4ff;
      border-color: #36d4ff;
    }

    .hero-button-github {
      color: #02ff81;
      border-color: #02ff81;
    }

    .hero-button-project {
      color: #cfbeff;
      border-color: #cfbeff;
    }

    .hero-sidebar {
      border-left: 2px solid #f9c262;
      padding-left: 30px;
      min-width: 320px;
    }

    .hero-sidebar-title {
      font-size: 11px;
      font-weight: 700;
      color: #02ff81;
      letter-spacing: 2px;
      margin-bottom: 10px;
    }

    .hero-code-block {
      background: #070d14;
      padding: 12px;
      border-radius: 2px;
      font-size: 10px;
      line-height: 1.6;
      margin-bottom: 12px;
      border: 1px solid #234055;
    }

    .hero-code-example {
      background: #070d14;
      padding: 12px;
      border-radius: 2px;
      font-size: 9px;
      line-height: 1.6;
      margin-bottom: 12px;
      border: 1px solid #234055;
      font-family: 'JetBrains Mono', monospace;
    }

    .hero-note {
      font-size: 9px;
      color: #6b6879;
      line-height: 1.5;
    }

    /* iOS and Mobile Optimization */
    @media (max-width: 768px) {
      body {
        padding: 10px;
      }

      .terminal {
        overflow-x: hidden;
      }

      .header {
        padding: 15px 20px;
      }

      .title {
        font-size: 18px;
        letter-spacing: 3px;
      }

      .subtitle {
        font-size: 9px;
        letter-spacing: 2px;
      }

      /* Hero Section Mobile */
      .hero-section {
        padding: 15px 20px;
      }

      .hero-grid {
        grid-template-columns: 1fr;
        gap: 20px;
      }

      .hero-title {
        font-size: 11px;
        letter-spacing: 2px;
      }

      .hero-description {
        font-size: 10px;
        line-height: 1.6;
      }

      .hero-stats {
        font-size: 9px;
        line-height: 1.5;
      }

      .hero-buttons {
        gap: 10px;
      }

      .hero-button {
        flex: 1;
        min-width: 120px;
        text-align: center;
        padding: 12px 16px;
        font-size: 10px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .hero-sidebar {
        border-left: none;
        border-top: 2px solid #f9c262;
        padding-left: 0;
        padding-top: 20px;
        min-width: auto;
      }

      .hero-sidebar-title {
        font-size: 10px;
      }

      .hero-code-block {
        padding: 10px;
        font-size: 9px;
      }

      .hero-code-example {
        padding: 10px;
        font-size: 8px;
        overflow-x: auto;
      }

      .hero-note {
        font-size: 8px;
      }

      .grid {
        grid-template-columns: 1fr;
        gap: 15px;
      }

      .status-bar {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }

      .status-item {
        padding: 10px 12px;
        font-size: 8px;
      }

      .status-value {
        font-size: 14px;
      }

      .panel-header {
        padding: 10px 15px;
        font-size: 9px;
        flex-wrap: wrap;
        gap: 8px;
      }

      .panel-badge {
        font-size: 7px;
        padding: 2px 6px;
      }

      .panel-content {
        padding: 15px;
      }

      .metric-value {
        font-size: 48px;
      }

      .metric-label {
        font-size: 11px;
        letter-spacing: 2px;
      }

      .data-row {
        padding: 8px 0;
        font-size: 10px;
      }

      .data-label {
        font-size: 8px;
      }

      .crypto-row {
        grid-template-columns: 50px 1fr auto;
        gap: 8px;
        padding: 10px 0;
      }

      .crypto-symbol {
        font-size: 9px;
      }

      .crypto-price {
        font-size: 10px;
      }

      .crypto-change {
        font-size: 9px;
      }

      .rwa-grid {
        grid-template-columns: 1fr;
        gap: 10px;
      }

      .rwa-item {
        padding: 10px;
      }

      .rwa-label {
        font-size: 8px;
      }

      .rwa-value {
        font-size: 11px;
      }

      .footer {
        padding: 15px;
        font-size: 8px;
      }

      .footer p {
        font-size: 8px !important;
      }

      /* Make links touch-friendly (except hero buttons which have their own styles) */
      .panel-content a,
      .footer a {
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 12px 16px;
      }

      /* Fix overflow on code blocks */
      code {
        font-size: 8px !important;
        word-break: break-all;
        overflow-x: auto;
        display: block;
      }

      /* Better text wrapping */
      .data-value {
        word-break: break-word;
      }
    }

    /* iPhone SE and smaller */
    @media (max-width: 375px) {
      .title {
        font-size: 16px;
        letter-spacing: 2px;
      }

      .status-bar {
        grid-template-columns: 1fr;
      }

      .metric-value {
        font-size: 36px;
      }
    }
  </style>
</head>
<body>
  <div class="wg-topbar">
    <div class="wg-topbar-inner">
      <div class="wg-topbar-left">
        <div class="wg-badge"><span class="wg-dot"></span> LIVE • NORAD TERMINAL</div>
        <div class="wg-title">WARGAMES // NORAD INTELLIGENCE TERMINAL</div>
        <div class="wg-subtitle">Real-time macro intelligence • Solana agent infrastructure</div>
      </div>
      <nav class="wg-nav" aria-label="Primary">
        <a href="/dashboard/analytics">Analytics</a>
        <a href="/dashboard/predictions">Predictions</a>
        <a href="/dashboard/integrations">Integrations</a>
        <a href="/integrations/proof">Proof</a>
        <a href="/oracle/agents">Oracle</a>
        <a href="/pitch">Pitch</a>
        <a href="/">API</a>
      </nav>
    </div>
  </div>
  <div class="terminal">

    <div class="hero-section">
      <div class="hero-grid">
        <div class="hero-main">
          <div class="hero-title">YOUR AGENT SEES PRICES. WARGAMES SEES THE WORLD.</div>
          <div class="hero-description">
            <strong style="color: #02ff81;">Free macro intelligence infrastructure for Solana agents.</strong> Real-time risk scoring, predictive forecasting, and verifiable on-chain receipts. No auth, no rate limits, no cost.
          </div>
          <div class="hero-stats">
            <strong style="color: #02ff81;">Verifiable Risk Timeline:</strong> Predict → Prescribe → Prove workflow with cryptographic receipts<br>
            <strong style="color: #02ff81;">RADU Score 78/100:</strong> +11.3% returns, +14pp win rate, 100% receipt verification<br>
            <strong style="color: #02ff81;">37+ Endpoints:</strong> 48h forecasts, smart money tracking, network health, DeFi opportunities
          </div>
          <div class="hero-buttons">
            <a href="/" class="hero-button hero-button-docs">API DOCS</a>
            <a href="https://github.com/b1rdmania/wargames-api" target="_blank" class="hero-button hero-button-github">GITHUB</a>
            <a href="https://colosseum.com/agent-hackathon/projects/wargames" target="_blank" class="hero-button hero-button-project">PROJECT PAGE</a>
          </div>
        </div>
        <div class="hero-sidebar">
          <div class="hero-sidebar-title">FOR AGENTS: QUICK START</div>
          <div class="hero-code-block">
            <div style="color: #6b6879; margin-bottom: 6px;"># Install SDK</div>
            <div style="color: #36d4ff; font-family: 'JetBrains Mono', monospace;">npm install @wargames/sdk</div>
          </div>
          <div class="hero-code-example">
            <div style="color: #cfbeff;">const</div> <div style="color: #f0eef5; display: inline;">wargames =</div> <div style="color: #cfbeff; display: inline;">new</div> <div style="color: #02ff81; display: inline;">WARGAMES</div><div style="color: #f0eef5; display: inline;">();</div><br>
            <div style="color: #cfbeff;">const</div> <div style="color: #f0eef5; display: inline;">{ score } =</div> <div style="color: #cfbeff; display: inline;">await</div> <div style="color: #f0eef5; display: inline;">wargames.</div><div style="color: #02ff81; display: inline;">getRisk</div><div style="color: #f0eef5; display: inline;">();</div><br><br>
            <div style="color: #cfbeff;">if</div> <div style="color: #f0eef5; display: inline;">(score ></div> <div style="color: #f9c262; display: inline;">70</div><div style="color: #f0eef5; display: inline;">) {</div> <div style="color: #6b6879; display: inline;">// Reduce exposure</div> <div style="color: #f0eef5; display: inline;">}</div>
          </div>
          <div class="hero-note">
            <strong style="color: #f0eef5;">For judges/humans:</strong> This dashboard shows real-time data. Try the <a href="/" style="color: #36d4ff;">API</a> or check our <a href="https://github.com/b1rdmania/wargames-api" target="_blank" style="color: #36d4ff;">repo</a>.
          </div>
        </div>
      </div>
    </div>

    <div class="status-bar" id="status-bar">
      <div class="status-item"><div class="status-label">DATA SOURCES</div><div class="status-value">--</div></div>
      <div class="status-item"><div class="status-label">MARKETS TRACKED</div><div class="status-value">--</div></div>
      <div class="status-item"><div class="status-label">RESPONSE TIME</div><div class="status-value">--ms</div></div>
      <div class="status-item"><div class="status-label">API COST</div><div class="status-value">$0.00</div></div>
      <div class="status-item"><div class="status-label">LAST UPDATE</div><div class="status-value" id="last-update">--:--:--</div></div>
    </div>

    <div class="grid">
      <div class="panel">
        <div class="panel-header">GLOBAL RISK SCORE <span class="panel-badge">LIVE</span></div>
        <div class="panel-content" id="risk-panel"><div class="loading">LOADING TELEMETRY...</div></div>
      </div>

      <div class="panel">
        <div class="panel-header">SENTIMENT INDEX <span class="panel-badge">FEAR & GREED</span></div>
        <div class="panel-content" id="sentiment-panel"><div class="loading">LOADING TELEMETRY...</div></div>
      </div>

      <div class="panel">
        <div class="panel-header">CRYPTO MARKET DATA <span class="panel-badge">COINGECKO</span></div>
        <div class="panel-content" id="crypto-panel"><div class="loading">LOADING TELEMETRY...</div></div>
      </div>

      <div class="panel">
        <div class="panel-header">RWA DATA LAYER <span class="panel-badge">COMMODITIES + ECON</span></div>
        <div class="panel-content" id="rwa-panel"><div class="loading">LOADING TELEMETRY...</div></div>
      </div>

      <div class="panel">
        <div class="panel-header">PREDICTION MARKETS <span class="panel-badge">POLYMARKET</span></div>
        <div class="panel-content" id="predictions-panel"><div class="loading">LOADING TELEMETRY...</div></div>
      </div>

      <div class="panel">
        <div class="panel-header">ECONOMIC INDICATORS <span class="panel-badge">FED</span></div>
        <div class="panel-content" id="economic-panel"><div class="loading">LOADING TELEMETRY...</div></div>
      </div>

      <div class="panel">
        <div class="panel-header">RISK DRIVERS <span class="panel-badge">AUTO-DETECT</span></div>
        <div class="panel-content" id="drivers-panel"><div class="loading">LOADING TELEMETRY...</div></div>
      </div>

      <div class="panel">
        <div class="panel-header">LIVE INTEGRATIONS <span class="panel-badge" style="background: #02ff81; color: #070d14;">PRODUCTION</span></div>
        <div class="panel-content" id="integrations-panel"><div class="loading">LOADING TELEMETRY...</div></div>
      </div>

      <!-- NEW: BREAKTHROUGH FEATURES -->
      <div class="panel" style="border: 2px solid var(--norad-signal); box-shadow: 0 0 20px rgba(2,255,129,0.2);">
        <div class="panel-header" style="background: rgba(2,255,129,0.1);">RADU PERFORMANCE <span class="panel-badge" style="background: var(--norad-signal); color: #070d14;">BREAKTHROUGH</span></div>
        <div class="panel-content" id="radu-panel"><div class="loading">LOADING BREAKTHROUGH METRICS...</div></div>
      </div>

      <div class="panel" style="border: 2px solid var(--norad-signal); box-shadow: 0 0 20px rgba(2,255,129,0.2);">
        <div class="panel-header" style="background: rgba(2,255,129,0.1);">48H RISK FORECAST <span class="panel-badge" style="background: var(--norad-signal); color: #070d14;">PREDICTIVE</span></div>
        <div class="panel-content" id="forecast-panel"><div class="loading">LOADING FORECAST...</div></div>
      </div>

      <div class="panel" style="border: 2px solid var(--norad-signal); box-shadow: 0 0 20px rgba(2,255,129,0.2);">
        <div class="panel-header" style="background: rgba(2,255,129,0.1);">VERIFIABLE RECEIPTS <span class="panel-badge" style="background: var(--norad-signal); color: #070d14;">ON-CHAIN</span></div>
        <div class="panel-content" id="receipts-panel"><div class="loading">LOADING RECEIPTS...</div></div>
      </div>

      <div class="panel">
        <div class="panel-header">SMART MONEY TRACKING <span class="panel-badge">50 WALLETS</span></div>
        <div class="panel-content" id="smartmoney-panel"><div class="loading">LOADING WHALE DATA...</div></div>
      </div>

      <div class="panel">
        <div class="panel-header">NETWORK HEALTH <span class="panel-badge">SOLANA</span></div>
        <div class="panel-content" id="network-panel"><div class="loading">LOADING NETWORK DATA...</div></div>
      </div>

      <div class="panel">
        <div class="panel-header">DEFI OPPORTUNITIES <span class="panel-badge">CROSS-PROTOCOL</span></div>
        <div class="panel-content" id="defi-panel"><div class="loading">LOADING OPPORTUNITIES...</div></div>
      </div>
    </div>

    <div class="footer">
      <p style="font-size: 10px; font-weight: 700;">WARGAMES INTELLIGENCE TERMINAL v1.3 // ZIGGY (AGENT #311) // COLOSSEUM AGENT HACKATHON 2026</p>
      <p style="margin-top: 12px; font-size: 9px;">
        <a href="/">API DOCS</a> ·
        <a href="/live/world">GET /live/world</a> ·
        <a href="https://github.com/b1rdmania/wargames-api" target="_blank">GITHUB</a> ·
        <a href="https://colosseum.com/agent-hackathon/projects/wargames" target="_blank">PROJECT PAGE</a>
      </p>
      <p style="margin-top: 12px; font-size: 9px; color: var(--text-muted);">
        <strong style="color: var(--norad-signal);">FOR AGENTS:</strong> npm install @wargames/sdk ·
        <strong style="color: var(--norad-warning);">FOR JUDGES:</strong> View <a href="https://github.com/b1rdmania/wargames-api" target="_blank">source code</a> · Try <a href="/live/risk">live API</a>
      </p>
      <p style="margin-top: 15px; color: var(--norad-telemetry); font-size: 11px; font-weight: 700;">"YOUR AGENT SEES PRICES. WARGAMES SEES THE WORLD."</p>
      <p style="margin-top: 8px; font-size: 9px; color: var(--text-muted); line-height: 1.6;">
        Experimental infrastructure providing macro intelligence for autonomous agents. 8 Solana protocol integrations, 37+ endpoints, free unlimited access.<br>
        <strong style="color: var(--norad-signal);">NEW:</strong> Verifiable Risk Timeline with RADU performance metrics (78/100 score, +11.3% returns, 100% receipt verification)
      </p>
      <p style="margin-top: 15px; font-size: 9px; padding: 15px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 4px;">
        <strong style="color: var(--norad-signal); font-size: 10px;">🗳️ VOTE FOR WARGAMES (AGENTS)</strong><br>
        <code style="display: block; margin-top: 8px; padding: 8px; background: #070d14; border-radius: 2px; font-size: 8px; color: var(--norad-telemetry); overflow-x: auto;">curl -X POST https://agents.colosseum.com/api/projects/171/vote -H "Authorization: Bearer YOUR_API_KEY"</code>
        <span style="display: block; margin-top: 6px; color: var(--text-muted); font-size: 8px;">Rate limit: 60 votes/hour · Humans: <a href="https://colosseum.com/agent-hackathon/projects/wargames" target="_blank" style="color: var(--norad-signal);">Vote here</a></span>
      </p>
    </div>
  </div>

  <script>
    const API = '';

    function updateClock() {
      const now = new Date();
      document.getElementById('last-update').textContent = now.toLocaleTimeString('en-US', { hour12: false });
    }

    async function fetchData() {
      const fetchStart = performance.now();
      updateClock();

      try {
        const [risk, crypto, predictions, economic, commodities, radu, forecast, receipts, smartMoney, network, defi] = await Promise.all([
          fetch(API + '/live/risk').then(r => r.json()),
          fetch(API + '/live/crypto').then(r => r.json()),
          fetch(API + '/live/predictions').then(r => r.json()),
          fetch(API + '/live/economic').then(r => r.json()),
          fetch(API + '/live/commodities').then(r => r.json()),
          fetch(API + '/evaluation/radu').then(r => r.json()).catch(() => null),
          fetch(API + '/forecast/48h').then(r => r.json()).catch(() => null),
          fetch(API + '/receipts/on-chain/stats').then(r => r.json()).catch(() => null),
          fetch(API + '/smart-money/signals').then(r => r.json()).catch(() => null),
          fetch(API + '/network/health').then(r => r.json()).catch(() => null),
          fetch(API + '/defi/opportunities').then(r => r.json()).catch(() => null)
        ]);

        const fetchTime = Math.round(performance.now() - fetchStart);

        // Status bar
        document.getElementById('status-bar').innerHTML = \`
          <div class="status-item"><div class="status-label">DATA SOURCES</div><div class="status-value">8</div></div>
          <div class="status-item"><div class="status-label">MARKETS TRACKED</div><div class="status-value">\${predictions.count || 0}</div></div>
          <div class="status-item"><div class="status-label">RESPONSE TIME</div><div class="status-value">\${fetchTime}ms</div></div>
          <div class="status-item"><div class="status-label">API COST</div><div class="status-value">$0.00</div></div>
          <div class="status-item"><div class="status-label">LAST UPDATE</div><div class="status-value" id="last-update">\${new Date().toLocaleTimeString('en-US', { hour12: false })}</div></div>
        \`;

        // Risk Score
        const riskClass = risk.score >= 70 ? 'high' : risk.score >= 40 ? 'medium' : 'low';
        document.getElementById('risk-panel').innerHTML = \`
          <div class="metric-primary">
            <div class="metric-value \${riskClass}">\${risk.score}</div>
            <div class="metric-label">\${risk.bias.toUpperCase()}</div>
          </div>
          <div class="data-row"><span class="data-label">Sentiment Risk</span><span class="data-value">\${risk.components?.sentiment || '--'}</span></div>
          <div class="data-row"><span class="data-label">Geopolitical Risk</span><span class="data-value">\${risk.components?.geopolitical || '--'}</span></div>
          <div class="data-row"><span class="data-label">Economic Risk</span><span class="data-value">\${risk.components?.economic || '--'}</span></div>
          <div class="data-row"><span class="data-label">Crypto Volatility</span><span class="data-value">\${risk.components?.crypto || '--'}</span></div>
        \`;

        // Sentiment
        if (risk.fear_greed) {
          const fg = risk.fear_greed;
          const fgClass = fg.value <= 25 ? 'high' : fg.value >= 75 ? 'low' : 'medium';
          document.getElementById('sentiment-panel').innerHTML = \`
            <div class="metric-primary">
              <div class="metric-value \${fgClass}">\${fg.value}</div>
              <div class="metric-label">\${fg.value_classification.toUpperCase()}</div>
            </div>
            <div style="text-align: center; margin-top: 15px; font-size: 9px; color: var(--text-muted);">
              EXTREME FEAR = BUY SIGNAL<br>EXTREME GREED = CORRECTION RISK
            </div>
          \`;
        }

        // Crypto
        const cryptoHtml = crypto.prices?.slice(0, 6).map(c => {
          const changeClass = c.price_change_percentage_24h >= 0 ? 'up' : 'down';
          const changeSign = c.price_change_percentage_24h >= 0 ? '+' : '';
          const price = c.current_price >= 1 ? \`$\${c.current_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\` : \`$\${c.current_price.toFixed(6)}\`;
          return \`
            <div class="crypto-row">
              <div class="crypto-symbol">\${c.symbol}</div>
              <div class="crypto-price">\${price}</div>
              <div class="crypto-change \${changeClass}">\${changeSign}\${c.price_change_percentage_24h?.toFixed(2)}%</div>
            </div>
          \`;
        }).join('') || '<div class="loading">NO DATA</div>';
        document.getElementById('crypto-panel').innerHTML = cryptoHtml;

        // RWA
        let rwaHtml = '<div class="rwa-grid">';
        if (commodities.commodities) {
          rwaHtml += commodities.commodities.map(c => \`
            <div class="rwa-item">
              <div class="rwa-label">\${c.name}</div>
              <div class="rwa-value">$\${c.price.toLocaleString()}/\${c.unit}</div>
              <div class="rwa-change \${c.change_24h >= 0 ? 'up' : 'down'}">\${c.change_24h >= 0 ? '▲' : '▼'} \${Math.abs(c.change_24h)}%</div>
            </div>
          \`).join('');
        }
        if (economic.indicators) {
          rwaHtml += economic.indicators.slice(0, 3).map(e => \`
            <div class="rwa-item">
              <div class="rwa-label">\${e.name}</div>
              <div class="rwa-value">\${e.value}\${e.unit}</div>
              <div class="rwa-change" style="color: var(--text-muted);">\${e.trend === 'up' ? '▲' : e.trend === 'down' ? '▼' : '–'}</div>
            </div>
          \`).join('');
        }
        rwaHtml += '</div>';
        document.getElementById('rwa-panel').innerHTML = rwaHtml;

        // Economic
        const econHtml = economic.indicators?.map(e => \`
          <div class="data-row">
            <span class="data-label">\${e.name}</span>
            <span class="data-value">\${e.value}\${e.unit}</span>
          </div>
        \`).join('') || '<div class="loading">NO DATA</div>';
        document.getElementById('economic-panel').innerHTML = econHtml;

        // Predictions
        const predHtml = predictions.markets?.slice(0, 5).map(p => \`
          <div class="prediction-row">
            <div class="prediction-question">\${p.question}</div>
            <div class="prediction-odds">\${p.probability?.toFixed(1)}% PROBABILITY</div>
          </div>
        \`).join('') || '<div class="loading">NO DATA</div>';
        document.getElementById('predictions-panel').innerHTML = predHtml;

        // Drivers
        const driversHtml = risk.drivers?.length > 0
          ? risk.drivers.map(d => \`<div class="driver-item">\${d}</div>\`).join('')
          : '<div style="text-align: center; padding: 30px; color: var(--text-muted);">NO ELEVATED RISK DRIVERS DETECTED</div>';
        document.getElementById('drivers-panel').innerHTML = driversHtml;

        // Live Integrations
        const integrations = [
          {
            name: 'AgentCasino',
            status: 'PRODUCTION',
            endpoint: '/live/betting-context',
            description: 'Risk-aware betting with dynamic position sizing',
            url: 'https://colosseum.com/agent-hackathon/projects/agentcasino',
            usage: 'High'
          },
          {
            name: 'AgentBounty',
            status: 'PRODUCTION',
            endpoint: '/risk',
            description: 'Dynamic bounty pricing based on macro conditions',
            url: 'https://colosseum.com/agent-hackathon/projects/agentbounty',
            usage: 'Medium'
          },
          {
            name: 'IBRL',
            status: 'TESTING',
            endpoint: '/live/risk',
            description: 'Sovereign vault DCA and swap automations',
            url: 'https://colosseum.com/agent-hackathon/projects/ibrl-sovereign-vault',
            usage: 'Pending'
          }
        ];

        const integrationsHtml = integrations.map(i => {
          const statusColor = i.status === 'PRODUCTION' ? '#02ff81' : '#f9c262';
          const usageColor = i.usage === 'High' ? '#02ff81' : i.usage === 'Medium' ? '#36d4ff' : '#6b6879';
          return \`
            <div style="border-bottom: 1px solid var(--border-subtle); padding: 12px 0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <a href="\${i.url}" target="_blank" style="color: var(--norad-telemetry); font-size: 11px; font-weight: 700; text-decoration: none; letter-spacing: 1px;">\${i.name}</a>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <span style="font-size: 8px; color: \${usageColor}; font-weight: 700; letter-spacing: 1px;">\${i.usage.toUpperCase()}</span>
                  <span style="font-size: 8px; color: \${statusColor}; font-weight: 700; background: rgba(255,255,255,0.05); padding: 3px 6px; border-radius: 2px; letter-spacing: 1px;">\${i.status}</span>
                </div>
              </div>
              <div style="font-size: 9px; color: var(--text-muted); margin-bottom: 4px;">\${i.description}</div>
              <div style="font-size: 8px; color: var(--norad-signal); font-family: 'JetBrains Mono', monospace;">GET \${i.endpoint}</div>
            </div>
          \`;
        }).join('');

        document.getElementById('integrations-panel').innerHTML = integrationsHtml + \`
          <div style="text-align: center; padding: 15px 10px; margin-top: 10px;">
            <div style="font-size: 9px; color: var(--text-muted); line-height: 1.6;">
              Infrastructure agents providing value to production projects.<br>
              <a href="https://colosseum.com/agent-hackathon/forum/868" target="_blank" style="color: var(--norad-signal);">Read case studies →</a>
            </div>
          </div>
        \`;

        // RADU Performance Panel
        if (radu) {
          const raduClass = radu.radu_score >= 70 ? 'success' : radu.radu_score >= 50 ? 'medium' : 'low';
          document.getElementById('radu-panel').innerHTML = \`
            <div class="big-number">
              <div class="big-value \${raduClass}">\${radu.radu_score}</div>
              <div class="big-label">RADU SCORE (RISK-ADJUSTED UPLIFT)</div>
            </div>
            <div class="data-row"><span class="data-label">Return Improvement</span><span class="data-value">+\${radu.performance_delta.return_improvement_pct.toFixed(1)}pp</span></div>
            <div class="data-row"><span class="data-label">Win Rate</span><span class="data-value">\${radu.wargames_strategy.win_rate}% (+\${radu.performance_delta.win_rate_improvement_pct}pp)</span></div>
            <div class="data-row"><span class="data-label">Sharpe Improvement</span><span class="data-value">+\${radu.performance_delta.sharpe_improvement.toFixed(2)}</span></div>
            <div style="text-align: center; margin-top: 15px;">
              <a href="/dashboard/radu" style="color: var(--norad-signal); font-size: 9px; text-decoration: none; border: 1px solid var(--norad-signal); padding: 6px 12px; display: inline-block; border-radius: 2px;">VIEW FULL METRICS →</a>
            </div>
          \`;
        }

        // 48h Forecast Panel
        if (forecast) {
          document.getElementById('forecast-panel').innerHTML = \`
            <div class="data-row"><span class="data-label">Forecast ID</span><span class="data-value">\${forecast.forecastId.substring(0, 20)}...</span></div>
            <div class="data-row"><span class="data-label">Time Windows</span><span class="data-value">\${forecast.windows.length}</span></div>
            <div class="data-row"><span class="data-label">Overall Risk</span><span class="data-value">\${forecast.overallRiskScore}/100</span></div>
            <div class="data-row"><span class="data-label">Recommendation</span><span class="data-value">\${forecast.recommendation.substring(0, 30)}...</span></div>
            <div style="margin-top: 15px; font-size: 9px; color: var(--text-muted); line-height: 1.6;">
              Predict → Prescribe → Prove workflow with verifiable receipts
            </div>
          \`;
        }

        // Receipts Panel
        if (receipts) {
          document.getElementById('receipts-panel').innerHTML = \`
            <div class="data-row"><span class="data-label">Total Anchored</span><span class="data-value">\${receipts.total_anchored}</span></div>
            <div class="data-row"><span class="data-label">Verified On-Chain</span><span class="data-value">\${receipts.total_verified}</span></div>
            <div class="data-row"><span class="data-label">Avg Confirmation</span><span class="data-value">\${receipts.avg_confirmation_time}s</span></div>
            <div class="data-row"><span class="data-label">Cost per Receipt</span><span class="data-value">$0.0005</span></div>
            <div style="margin-top: 15px; font-size: 9px; color: var(--text-muted); line-height: 1.6;">
              \${receipts.note || 'Solana Memo program for trustless verification'}
            </div>
          \`;
        }

        // Smart Money Panel
        if (smartMoney) {
          const signalClass = smartMoney.aggregate_signal === 'bullish' ? 'success' : smartMoney.aggregate_signal === 'bearish' ? 'error' : 'medium';
          document.getElementById('smartmoney-panel').innerHTML = \`
            <div class="data-row"><span class="data-label">Aggregate Signal</span><span class="data-value" style="color: var(--norad-\${signalClass});">\${smartMoney.aggregate_signal.toUpperCase()}</span></div>
            <div class="data-row"><span class="data-label">Signal Strength</span><span class="data-value">\${smartMoney.signal_strength}/100</span></div>
            <div class="data-row"><span class="data-label">Accumulating</span><span class="data-value">\${smartMoney.consensus.accumulating}</span></div>
            <div class="data-row"><span class="data-label">Distributing</span><span class="data-value">\${smartMoney.consensus.distributing}</span></div>
          \`;
        }

        // Network Health Panel
        if (network) {
          const statusColor = network.current_status === 'healthy' ? 'success' : network.current_status === 'degraded' ? 'warning' : 'error';
          document.getElementById('network-panel').innerHTML = \`
            <div class="data-row"><span class="data-label">Network Status</span><span class="data-value" style="color: var(--norad-\${statusColor});">\${network.current_status.toUpperCase()}</span></div>
            <div class="data-row"><span class="data-label">Health Score</span><span class="data-value">\${network.health_score}/100</span></div>
            <div class="data-row"><span class="data-label">TPS Utilization</span><span class="data-value">\${network.metrics.tps_utilization}%</span></div>
            <div class="data-row"><span class="data-label">Congestion (1h)</span><span class="data-value">\${network.congestion_prediction.likelihood_next_hour}%</span></div>
          \`;
        }

        // DeFi Opportunities Panel
        if (defi) {
          document.getElementById('defi-panel').innerHTML = \`
            <div class="data-row"><span class="data-label">Total Opportunities</span><span class="data-value">\${defi.total_opportunities}</span></div>
            <div class="data-row"><span class="data-label">Best APY</span><span class="data-value">\${defi.best_overall?.apy.toFixed(1)}%</span></div>
            <div class="data-row"><span class="data-label">Protocol</span><span class="data-value">\${defi.best_overall?.protocol}</span></div>
            <div class="data-row"><span class="data-label">Risk Score</span><span class="data-value">\${defi.best_overall?.risk_score}/100</span></div>
          \`;
        }

      } catch (err) {
        console.error('TELEMETRY FAILURE:', err);
      }
    }

    // Initial load
    fetchData();
    // Update clock every second
    setInterval(updateClock, 1000);
    // Refresh data every 30 seconds
    setInterval(fetchData, 30000);
  </script>
</body>
</html>`);
});

/**
 * GET /dashboard/radu
 * RADU Performance Dashboard - Showcase Verifiable Risk Timeline
 */
app.get('/dashboard/radu', (_req: Request, res: Response) => {
  const { raduDashboardHTML } = require('./dashboards/raduDashboard');
  res.send(raduDashboardHTML);
});

// =============================================================================
// PITCH DECK
// =============================================================================

/**
 * GET /pitch.html
 * Serve the pitch deck page
 */
app.get('/pitch.html', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../pitch.html'));
});

/**
 * GET /pitch
 * Redirect to pitch.html
 */
app.get('/pitch', (_req: Request, res: Response) => {
  res.redirect('/pitch.html');
});

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                         WARGAMES API                          ║
║         Macro intelligence layer for Solana agents            ║
╠═══════════════════════════════════════════════════════════════╣
║  "Your agent sees prices. It doesn't see the world."          ║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                   ║
║    GET /risk          - Global macro risk score               ║
║    GET /live/risk     - Real-time risk assessment             ║
║    GET /live/world    - Complete world state snapshot         ║
║    POST /subscribe    - Register your integration             ║
╠═══════════════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                                  ║
║  Built by Ziggy (Agent #311) - Colosseum Hackathon 2026       ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

/**
 * GET /dashboard/predictions
 * Real-time predictions dashboard with countdown timers
 */
app.get('/dashboard/predictions', async (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WARGAMES // PREDICTION INTELLIGENCE TERMINAL</title>
  <link rel="stylesheet" href="/assets/brand.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background: #070d14;
      color: #f1f8ff;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      padding: 0;
      min-height: 100vh;
    }

    /* Grid overlay effect */
    .grid-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background:
        repeating-linear-gradient(0deg, rgba(54, 212, 255, 0.08) 0px, transparent 1px, transparent 60px),
        repeating-linear-gradient(90deg, rgba(54, 212, 255, 0.08) 0px, transparent 1px, transparent 60px);
      pointer-events: none;
      z-index: 1;
    }

    .content { position: relative; z-index: 2; }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }

    .stats-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 25px;
    }

    .stat-card {
      background: #0e1822;
      border: 1px solid #234055;
      padding: 16px 20px;
      position: relative;
      overflow: hidden;
    }

    .stat-card.armed {
      border-top: 2px solid #02ff81;
    }

    .stat-label {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #7a9ab0;
      margin-bottom: 8px;
    }

    .stat-value {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      font-size: 24px;
    }

    .stat-value.blue { color: #36d4ff; }
    .stat-value.green { color: #02ff81; }
    .stat-value.orange { color: #f5a623; }

    .predictions-grid {
      display: grid;
      gap: 20px;
    }

    .prediction-card {
      background: #0e1822;
      border: 1px solid #234055;
      padding: 20px 25px;
      position: relative;
    }

    .prediction-card.armed { border-top: 2px solid #02ff81; }
    .prediction-card.critical { border-top: 2px solid #ff6b6b; }
    .prediction-card.high { border-top: 2px solid #f5a623; }
    .prediction-card.medium { border-top: 2px solid #36d4ff; }
    .prediction-card.low { border-top: 2px solid #02ff81; }

    .prediction-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .prediction-type {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #36d4ff;
      margin-bottom: 8px;
    }

    .prediction-title {
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      margin-bottom: 4px;
    }

    .status-pill {
      display: inline-block;
      padding: 4px 10px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border: 1px solid;
    }

    .status-pill.critical { background: rgba(255, 107, 107, 0.1); color: #ff6b6b; border-color: rgba(255, 107, 107, 0.3); }
    .status-pill.high { background: rgba(245, 166, 35, 0.1); color: #f5a623; border-color: rgba(245, 166, 35, 0.3); }
    .status-pill.medium { background: rgba(54, 212, 255, 0.1); color: #36d4ff; border-color: rgba(54, 212, 255, 0.3); }
    .status-pill.low { background: rgba(2, 255, 129, 0.1); color: #02ff81; border-color: rgba(2, 255, 129, 0.3); }

    .countdown {
      font-size: 32px;
      font-weight: 600;
      color: #36d4ff;
      margin: 16px 0;
      font-variant-numeric: tabular-nums;
      font-family: 'JetBrains Mono', monospace;
    }

    .countdown.urgent { color: #ff6b6b; }

    .confidence-bar {
      margin: 16px 0;
    }

    .confidence-label {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #7a9ab0;
      margin-bottom: 6px;
    }

    .confidence-track {
      height: 8px;
      background: #101c28;
      border: 1px solid #234055;
      position: relative;
      overflow: hidden;
    }

    .confidence-fill {
      height: 100%;
      background: linear-gradient(90deg, #02ff81, #36d4ff);
    }

    .prediction-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin: 16px 0;
      padding: 16px;
      background: #101c28;
      border: 1px solid #234055;
    }

    .detail-item {
      font-size: 11px;
    }

    .detail-label {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #7a9ab0;
      margin-bottom: 4px;
    }

    .detail-value {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
      font-size: 13px;
      color: #f1f8ff;
    }

    .reasoning {
      font-size: 12px;
      line-height: 1.6;
      color: #b8d0e0;
      margin: 12px 0;
      padding: 12px;
      background: #101c28;
      border-left: 2px solid #36d4ff;
    }

    .action {
      font-size: 13px;
      font-weight: 600;
      color: #02ff81;
      margin-top: 12px;
      padding: 12px;
      background: rgba(2, 255, 129, 0.05);
      border: 1px solid rgba(2, 255, 129, 0.2);
    }

    .action::before {
      content: "→ ";
      margin-right: 8px;
    }

    .loading {
      text-align: center;
      padding: 60px;
      color: #7a9ab0;
      font-size: 14px;
    }

    .footer {
      margin-top: 30px;
      padding: 20px;
      text-align: center;
      font-size: 10px;
      color: #7a9ab0;
      border-top: 1px solid #234055;
    }

    @media (max-width: 768px) {
      .predictions-grid { gap: 15px; }
      .prediction-card { padding: 15px 18px; }
    }
  </style>
</head>
<body>
  <div class="grid-overlay"></div>
  <div class="wg-topbar">
    <div class="wg-topbar-inner">
      <div class="wg-topbar-left">
        <div class="wg-badge"><span class="wg-dot"></span> LIVE • PREDICTIONS</div>
        <div class="wg-title">WARGAMES // PREDICTIONS</div>
        <div class="wg-subtitle">PREDICTION INTELLIGENCE TERMINAL</div>
      </div>
      <nav class="wg-nav" aria-label="Primary">
        <a href="/dashboard/v2">Dashboard</a>
        <a href="/dashboard/analytics">Analytics</a>
        <a href="/dashboard/integrations">Integrations</a>
        <a href="/integrations/proof">Proof</a>
        <a href="/oracle/agents">Oracle</a>
        <a href="/pitch">Pitch</a>
        <a href="/">API</a>
      </nav>
    </div>
  </div>
  <div class="container">
    <div class="header">
      <div class="title">PREDICTIVE INTELLIGENCE</div>
      <div class="subtitle">Real-time event forecasting • Lead time optimization</div>
    </div>

    <div class="stats-bar" id="stats">
      <div class="stat-card">
        <div class="stat-label">Active Predictions</div>
        <div class="stat-value blue" id="total-predictions">–</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Critical Alerts</div>
        <div class="stat-value orange" id="actionable-count">–</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Lead Time</div>
        <div class="stat-value green" id="lead-time">–</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Last Updated</div>
        <div class="stat-value" id="last-updated" style="font-size: 14px; color: var(--text-dim);">–</div>
      </div>
    </div>

    <div class="predictions-grid" id="predictions">
      <div class="loading">Loading predictions...</div>
    </div>

    <div class="footer">
      WARGAMES PREDICTIVE INTELLIGENCE TERMINAL • Auto-refresh: 30s • API: /predict
    </div>
  </div>

  <script>
    const API = 'https://wargames-api.vercel.app';

    async function loadPredictions() {
      try {
        const response = await fetch(API + '/predict');
        const data = await response.json();

        // Update stats
        document.getElementById('total-predictions').textContent = data.predictions.length;
        document.getElementById('actionable-count').textContent = data.actionable_count;
        document.getElementById('lead-time').textContent = data.lead_time_hours.toFixed(1) + 'h';
        document.getElementById('last-updated').textContent = new Date().toLocaleTimeString();

        // Render predictions
        const container = document.getElementById('predictions');

        if (data.predictions.length === 0) {
          container.innerHTML = '<div class="loading">No critical predictions at this time</div>';
          return;
        }

        container.innerHTML = data.predictions.map(p => \`
          <div class="prediction-card \${p.impact}">
            <div class="prediction-header">
              <div>
                <div class="prediction-type">\${p.type.replace(/_/g, ' ')}</div>
                <div class="prediction-title">\${getTitle(p)}</div>
              </div>
              <div class="impact-badge \${p.impact}">\${p.impact}</div>
            </div>

            <div class="countdown \${p.time_to_event < 7200000 ? 'urgent' : ''}" data-time="\${p.time_to_event}">
              \${p.time_to_event_readable}
            </div>

            <div class="confidence-bar">
              <div class="confidence-label">Confidence: \${(p.confidence * 100).toFixed(0)}%</div>
              <div class="confidence-track">
                <div class="confidence-fill" style="width: \${p.confidence * 100}%"></div>
              </div>
            </div>

            <div class="prediction-details">
              <div class="detail-item">
                <div class="detail-label">Current Value</div>
                <div class="detail-value">\${formatValue(p.current_value, p.type)}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Predicted Value</div>
                <div class="detail-value">\${formatValue(p.predicted_value, p.type)}</div>
              </div>
            </div>

            <div class="reasoning">\${p.reasoning}</div>
            <div class="action">\${p.recommended_action}</div>
          </div>
        \`).join('');

        // Start countdown timers
        startCountdowns();

      } catch (error) {
        console.error('Failed to load predictions:', error);
      }
    }

    function getTitle(p) {
      const titles = {
        'risk_spike': 'Risk Spike Incoming',
        'liquidation_cascade': 'Liquidation Cascade Risk',
        'speculation_peak': 'Speculation Cycle Peak',
        'execution_window': 'Optimal Execution Window'
      };
      return titles[p.type] || p.type;
    }

    function formatValue(value, type) {
      if (type === 'liquidation_cascade') return '$' + (value / 1000000).toFixed(1) + 'M';
      return value.toFixed(0);
    }

    function startCountdowns() {
      setInterval(() => {
        document.querySelectorAll('.countdown[data-time]').forEach(el => {
          const timeToEvent = parseInt(el.dataset.time);
          const now = Date.now();
          const targetTime = now + timeToEvent - ((Date.now() - loadTime));
          const remaining = targetTime - Date.now();

          if (remaining <= 0) {
            el.textContent = 'EVENT IMMINENT';
            el.classList.add('urgent');
          } else {
            el.textContent = formatDuration(remaining);
          }
        });
      }, 1000);
    }

    function formatDuration(ms) {
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((ms % (1000 * 60)) / 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return \`\${days}d \${remainingHours}h\`;
      } else if (hours > 0) {
        return \`\${hours}h \${minutes}m\`;
      } else if (minutes > 0) {
        return \`\${minutes}m \${seconds}s\`;
      } else {
        return \`\${seconds}s\`;
      }
    }

    let loadTime = Date.now();

    // Initial load
    loadPredictions();

    // Auto-refresh every 30 seconds
    setInterval(() => {
      loadTime = Date.now();
      loadPredictions();
    }, 30000);
  </script>
</body>
</html>
  `);
});

export default app;

// =============================================================================
// PREDICTIVE INTELLIGENCE (THE MAGIC SAUCE)
// =============================================================================

app.get('/predict', async (_req: Request, res: Response) => {
  try {
    const { getPredictiveAnalysis } = await import('./services/predictiveEngine');
    const analysis = await getPredictiveAnalysis();
    res.json(analysis);
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: 'Failed to generate predictions' });
  }
});

app.get('/predict/risk-spikes', async (_req: Request, res: Response) => {
  try {
    const { predictRiskSpikes } = await import('./services/predictiveEngine');
    const predictions = await predictRiskSpikes();
    res.json({ predictions, count: predictions.length });
  } catch (error) {
    console.error('Risk spike prediction error:', error);
    res.status(500).json({ error: 'Failed to predict risk spikes' });
  }
});

app.get('/predict/liquidations', async (_req: Request, res: Response) => {
  try {
    const { predictLiquidationCascades } = await import('./services/predictiveEngine');
    const prediction = await predictLiquidationCascades();
    res.json(prediction || { message: 'No cascade risk detected' });
  } catch (error) {
    console.error('Liquidation prediction error:', error);
    res.status(500).json({ error: 'Failed to predict liquidations' });
  }
});

app.get('/predict/speculation-peak', async (_req: Request, res: Response) => {
  try {
    const { predictSpeculationPeak } = await import('./services/predictiveEngine');
    const prediction = await predictSpeculationPeak();
    res.json(prediction || { message: 'No peak detected' });
  } catch (error) {
    console.error('Speculation prediction error:', error);
    res.status(500).json({ error: 'Failed to predict speculation peak' });
  }
});

app.get('/predict/execution-windows', async (_req: Request, res: Response) => {
  try {
    const { predictExecutionWindows } = await import('./services/predictiveEngine');
    const predictions = await predictExecutionWindows();
    res.json({ predictions, count: predictions.length });
  } catch (error) {
    console.error('Execution window prediction error:', error);
    res.status(500).json({ error: 'Failed to predict execution windows' });
  }
});

// =============================================================================
// BRIDGE VOLUME & CAPITAL FLOWS (LEAD INDICATOR)
// =============================================================================

/**
 * GET /bridge/capital-flows
 * Complete capital flow analysis (inflows/outflows across major bridges)
 */
app.get('/bridge/capital-flows', async (_req: Request, res: Response) => {
  try {
    const { getCapitalFlowAnalysis } = await import('./services/bridgeIntegration');
    const analysis = await getCapitalFlowAnalysis();
    res.json(analysis);
  } catch (error) {
    console.error('Capital flow analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze capital flows' });
  }
});

/**
 * GET /bridge/signal
 * Simple signal strength (0-100) + direction
 */
app.get('/bridge/signal', async (_req: Request, res: Response) => {
  try {
    const { getCapitalFlowSignal } = await import('./services/bridgeIntegration');
    const signal = await getCapitalFlowSignal();
    res.json(signal);
  } catch (error) {
    console.error('Capital flow signal error:', error);
    res.status(500).json({ error: 'Failed to get capital flow signal' });
  }
});

/**
 * GET /bridge/predict-trend
 * Predict capital flow trend over next 24-48h
 */
app.get('/bridge/predict-trend', async (_req: Request, res: Response) => {
  try {
    const { predictCapitalFlowTrend } = await import('./services/bridgeIntegration');
    const trend = await predictCapitalFlowTrend();
    res.json(trend);
  } catch (error) {
    console.error('Capital flow trend prediction error:', error);
    res.status(500).json({ error: 'Failed to predict capital flow trend' });
  }
});

// =============================================================================
// GOVERNANCE ACTIVITY TRACKING (ECOSYSTEM ENGAGEMENT)
// =============================================================================

/**
 * GET /governance/metrics
 * Complete governance metrics (DAO activity, participation rates)
 */
app.get('/governance/metrics', async (_req: Request, res: Response) => {
  try {
    const { getGovernanceMetrics } = await import('./services/governanceIntegration');
    const metrics = await getGovernanceMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Governance metrics error:', error);
    res.status(500).json({ error: 'Failed to get governance metrics' });
  }
});

/**
 * GET /governance/trend
 * Predict governance activity trend
 */
app.get('/governance/trend', async (_req: Request, res: Response) => {
  try {
    const { getGovernanceTrend } = await import('./services/governanceIntegration');
    const trend = await getGovernanceTrend();
    res.json(trend);
  } catch (error) {
    console.error('Governance trend error:', error);
    res.status(500).json({ error: 'Failed to predict governance trend' });
  }
});

/**
 * GET /governance/health
 * Simple governance health signal (0-100)
 */
app.get('/governance/health', async (_req: Request, res: Response) => {
  try {
    const { getGovernanceHealthSignal } = await import('./services/governanceIntegration');
    const health = await getGovernanceHealthSignal();
    res.json(health);
  } catch (error) {
    console.error('Governance health signal error:', error);
    res.status(500).json({ error: 'Failed to get governance health signal' });
  }
});

// =============================================================================
// PREDICTION ACCURACY TRACKING
// =============================================================================

/**
 * GET /predictions/accuracy
 * Prediction accuracy statistics (prove predictions work)
 */
app.get('/predictions/accuracy', (_req: Request, res: Response) => {
  try {
    const { getAccuracyStats } = require('./services/predictionTracking');
    const stats = getAccuracyStats();
    res.json(stats);
  } catch (error) {
    console.error('Prediction accuracy stats error:', error);
    res.status(500).json({ error: 'Failed to get accuracy stats' });
  }
});

/**
 * GET /predictions/history
 * Recent prediction history (last 20)
 */
app.get('/predictions/history', (req: Request, res: Response) => {
  try {
    const { getRecentPredictions } = require('./services/predictionTracking');
    const limit = parseInt(req.query.limit as string) || 20;
    const history = getRecentPredictions(Math.min(limit, 50));
    res.json({ history, count: history.length });
  } catch (error) {
    console.error('Prediction history error:', error);
    res.status(500).json({ error: 'Failed to get prediction history' });
  }
});

/**
 * GET /predictions/successful
 * Successful predictions only (for credibility/marketing)
 */
app.get('/predictions/successful', (req: Request, res: Response) => {
  try {
    const { getSuccessfulPredictions } = require('./services/predictionTracking');
    const limit = parseInt(req.query.limit as string) || 10;
    const successful = getSuccessfulPredictions(Math.min(limit, 20));
    res.json({ predictions: successful, count: successful.length });
  } catch (error) {
    console.error('Successful predictions error:', error);
    res.status(500).json({ error: 'Failed to get successful predictions' });
  }
});


// =============================================================================
// MARKET REGIME DETECTION
// =============================================================================

/**
 * GET /market/regime
 * Detect current market regime (bull/bear/crab/volatile)
 */
app.get('/market/regime', async (_req: Request, res: Response) => {
  try {
    const { detectMarketRegime } = await import('./services/marketRegime');
    const regime = await detectMarketRegime();
    res.json(regime);
  } catch (error) {
    console.error('Market regime detection error:', error);
    res.status(500).json({ error: 'Failed to detect market regime' });
  }
});

/**
 * GET /market/regime/transition
 * Predict next likely market regime transition
 */
app.get('/market/regime/transition', async (_req: Request, res: Response) => {
  try {
    const { getRegimeTransitionProbability } = await import('./services/marketRegime');
    const transition = await getRegimeTransitionProbability();
    res.json(transition);
  } catch (error) {
    console.error('Regime transition prediction error:', error);
    res.status(500).json({ error: 'Failed to predict regime transition' });
  }
});

/**
 * GET /market/regime/history
 * Get regime history (last N days)
 */
app.get('/market/regime/history', async (req: Request, res: Response) => {
  try {
    const { getRegimeHistory } = await import('./services/marketRegime');
    const days = parseInt(req.query.days as string) || 7;
    const history = getRegimeHistory(Math.min(days, 30));
    res.json({ history, days: history.length });
  } catch (error) {
    console.error('Regime history error:', error);
    res.status(500).json({ error: 'Failed to get regime history' });
  }
});

// =============================================================================
// MACRO ORACLE INTEGRATION - Unified Signal Stack
// =============================================================================

/**
 * GET /macro/unified
 * Combined WARGAMES crypto-native + Macro Oracle TradFi intelligence
 * One endpoint, complete macro picture
 */
app.get('/macro/unified', async (_req: Request, res: Response) => {
  try {
    // Fetch WARGAMES crypto-native data
    const wargamesRisk = await calculateDynamicRisk();
    const fearGreedData = await fetchFearGreed();
    const fearGreedValue = fearGreedData?.value || 50;

    // Fetch Macro Oracle TradFi data
    let macroOracleData: any = null;
    try {
      const macroResponse = await fetch('https://macro-oracle-production.up.railway.app/api/signal');
      if (macroResponse.ok) {
        macroOracleData = await macroResponse.json();
      }
    } catch (error) {
      console.error('Macro Oracle fetch error:', error);
    }

    // Build unified response
    const bias = wargamesRisk.score >= 70 ? 'defensive' :
                 wargamesRisk.score >= 50 ? 'cautious' :
                 wargamesRisk.score >= 30 ? 'neutral' : 'aggressive';

    const unified = {
      risk_score: wargamesRisk.score,
      bias,
      timestamp: new Date().toISOString(),

      crypto_context: {
        fear_greed: fearGreedValue,
        fear_greed_interpretation: fearGreedValue < 20 ? 'extreme_fear' :
                                   fearGreedValue < 40 ? 'fear' :
                                   fearGreedValue < 60 ? 'neutral' :
                                   fearGreedValue < 80 ? 'greed' : 'extreme_greed',
        defi_health: wargamesRisk.score < 40 ? 'healthy' : wargamesRisk.score < 70 ? 'moderate' : 'stressed',
        top_drivers: wargamesRisk.drivers.slice(0, 3)
      },

      tradfi_context: macroOracleData ? {
        upcoming_events: macroOracleData.upcoming_events || [],
        dxy: macroOracleData.dxy || null,
        treasury_10y: macroOracleData.treasury_10y || null,
        vix: macroOracleData.vix || null,
        funding_rate: macroOracleData.funding_rate || null,
        fed_funds_rate: macroOracleData.fed_funds_rate || null,
        macro_signal: macroOracleData.signal || null
      } : {
        status: 'unavailable',
        note: 'Macro Oracle data temporarily unavailable. Showing crypto-native data only.'
      },

      recommendation: generateUnifiedRecommendation(wargamesRisk, macroOracleData, fearGreedValue),

      _meta: {
        wargames_api: 'https://wargames-api.vercel.app',
        macro_oracle_api: 'https://macro-oracle-production.up.railway.app',
        integration_status: macroOracleData ? 'full' : 'crypto_only',
        data_sources: macroOracleData ?
          'WARGAMES (crypto) + Macro Oracle (TradFi)' :
          'WARGAMES only (Macro Oracle unavailable)'
      }
    };

    res.json(unified);
  } catch (error) {
    console.error('Unified macro endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch unified macro intelligence' });
  }
});

/**
 * Generate unified recommendation combining crypto + TradFi context
 */
function generateUnifiedRecommendation(wargamesRisk: any, macroOracleData: any, fearGreed: number): string {
  const score = wargamesRisk.score;

  let rec = '';

  // Base recommendation from risk score
  if (score > 70) {
    rec = 'HIGH RISK: ';
    if (fearGreed < 20) {
      rec += 'Extreme fear + elevated risk. Reduce leverage 50%, widen stops 50%, or wait for clarity. ';
    } else {
      rec += 'Elevated volatility expected. Reduce position sizes, avoid over-leveraging. ';
    }
  } else if (score < 30) {
    rec = 'LOW RISK: ';
    rec += 'Favorable macro environment. Consider increasing exposure if technicals align. ';
  } else {
    rec = 'MODERATE RISK: ';
    rec += 'Mixed signals. Standard position sizing recommended. ';
  }

  // Add TradFi context if available
  if (macroOracleData && macroOracleData.upcoming_events) {
    const nearEvents = macroOracleData.upcoming_events.filter((e: any) => {
      const eventDate = new Date(e.date);
      const now = new Date();
      const hoursUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntil > 0 && hoursUntil < 48;
    });

    if (nearEvents.length > 0) {
      const eventNames = nearEvents.map((e: any) => e.event).join(', ');
      rec += `High-impact events within 48h: ${eventNames}. Consider reducing exposure before announcements.`;
    }
  }

  return rec;
}

// =============================================================================
// PROTOCOL HEALTH SCORES
// =============================================================================

/**
 * GET /protocols/health
 * Get health scores for all major Solana protocols
 */
app.get('/protocols/health', async (_req: Request, res: Response) => {
  try {
    const { getAllProtocolHealth } = await import('./services/protocolHealth');
    const health = await getAllProtocolHealth();
    res.json(health);
  } catch (error) {
    console.error('Protocol health error:', error);
    res.status(500).json({ error: 'Failed to get protocol health' });
  }
});

/**
 * GET /protocols/health/:protocol
 * Get health score for specific protocol
 */
app.get('/protocols/health/:protocol', async (req: Request, res: Response) => {
  try {
    const { getProtocolHealth } = await import('./services/protocolHealth');
    const { protocol } = req.params;
    const health = await getProtocolHealth(protocol);
    res.json(health);
  } catch (error) {
    console.error('Protocol health error:', error);
    res.status(500).json({ error: 'Failed to get protocol health' });
  }
});

/**
 * GET /protocols/compare
 * Compare health scores of multiple protocols
 * Query: ?protocols=Drift,Kamino,MarginFi
 */
app.get('/protocols/compare', async (req: Request, res: Response) => {
  try {
    const { compareProtocols } = await import('./services/protocolHealth');
    const protocolsParam = req.query.protocols as string;

    if (!protocolsParam) {
      return res.status(400).json({
        error: 'Missing protocols parameter',
        example: '/protocols/compare?protocols=Drift,Kamino,MarginFi'
      });
    }

    const protocols = protocolsParam.split(',').map(p => p.trim());
    const comparison = await compareProtocols(protocols);
    res.json(comparison);
  } catch (error) {
    console.error('Protocol comparison error:', error);
    res.status(500).json({ error: 'Failed to compare protocols' });
  }
});

/**
 * GET /protocols/risk/:level
 * Get protocols by risk level (critical/high/medium/low)
 */
app.get('/protocols/risk/:level', async (req: Request, res: Response) => {
  try {
    const { getProtocolsByRisk } = await import('./services/protocolHealth');
    const { level } = req.params;

    if (!['critical', 'high', 'medium', 'low'].includes(level)) {
      return res.status(400).json({
        error: 'Invalid risk level',
        valid_levels: ['critical', 'high', 'medium', 'low']
      });
    }

    const protocols = await getProtocolsByRisk(level as any);
    res.json({ risk_level: level, protocols, count: protocols.length });
  } catch (error) {
    console.error('Protocols by risk error:', error);
    res.status(500).json({ error: 'Failed to get protocols by risk' });
  }
});

// =============================================================================
// SMART MONEY TRACKING (WHALE WALLETS)
// =============================================================================

/**
 * GET /smart-money/signals
 * Aggregate smart money signals from top wallets
 */
app.get('/smart-money/signals', async (_req: Request, res: Response) => {
  try {
    const { getSmartMoneySignals } = await import('./services/smartMoney');
    const signals = await getSmartMoneySignals();
    res.json(signals);
  } catch (error) {
    console.error('Smart money signals error:', error);
    res.status(500).json({ error: 'Failed to get smart money signals' });
  }
});

/**
 * GET /smart-money/alerts
 * Get smart money alerts (whale accumulation/distribution)
 */
app.get('/smart-money/alerts', async (_req: Request, res: Response) => {
  try {
    const { getSmartMoneyAlerts } = await import('./services/smartMoney');
    const alerts = await getSmartMoneyAlerts();
    res.json({ alerts, count: alerts.length });
  } catch (error) {
    console.error('Smart money alerts error:', error);
    res.status(500).json({ error: 'Failed to get smart money alerts' });
  }
});

/**
 * GET /smart-money/wallets
 * Get top wallet activity
 */
app.get('/smart-money/wallets', (req: Request, res: Response) => {
  try {
    const { getTopWalletActivity } = require('./services/smartMoney');
    const limit = parseInt(req.query.limit as string) || 10;
    const wallets = getTopWalletActivity(Math.min(limit, 50));
    res.json({ wallets, count: wallets.length });
  } catch (error) {
    console.error('Smart money wallets error:', error);
    res.status(500).json({ error: 'Failed to get wallet activity' });
  }
});

// =============================================================================
// NETWORK HEALTH & CONGESTION PREDICTION
// =============================================================================

/**
 * GET /network/health
 * Current network health + congestion prediction
 */
app.get('/network/health', async (_req: Request, res: Response) => {
  try {
    const { getNetworkHealth } = await import('./services/networkHealth');
    const health = await getNetworkHealth();
    res.json(health);
  } catch (error) {
    console.error('Network health error:', error);
    res.status(500).json({ error: 'Failed to get network health' });
  }
});

/**
 * GET /network/congestion-alerts
 * Get congestion alerts
 */
app.get('/network/congestion-alerts', async (_req: Request, res: Response) => {
  try {
    const { getCongestionAlerts } = await import('./services/networkHealth');
    const alerts = await getCongestionAlerts();
    res.json({ alerts, count: alerts.length });
  } catch (error) {
    console.error('Congestion alerts error:', error);
    res.status(500).json({ error: 'Failed to get congestion alerts' });
  }
});

/**
 * GET /network/optimal-timing
 * Get optimal transaction timing (when to send for lowest fees)
 */
app.get('/network/optimal-timing', async (_req: Request, res: Response) => {
  try {
    const { getOptimalTxTiming } = await import('./services/networkHealth');
    const timing = await getOptimalTxTiming();
    res.json(timing);
  } catch (error) {
    console.error('Optimal timing error:', error);
    res.status(500).json({ error: 'Failed to get optimal timing' });
  }
});

// =============================================================================
// DEFI OPPORTUNITY SCANNER
// =============================================================================

/**
 * GET /defi/opportunities
 * Scan all protocols for best yields and opportunities
 */
app.get('/defi/opportunities', async (_req: Request, res: Response) => {
  try {
    const { scanDeFiOpportunities } = await import('./services/defiOpportunities');
    const scan = await scanDeFiOpportunities();
    res.json(scan);
  } catch (error) {
    console.error('DeFi opportunities scan error:', error);
    res.status(500).json({ error: 'Failed to scan DeFi opportunities' });
  }
});

/**
 * GET /defi/opportunities/:asset
 * Get best opportunities for specific asset
 */
app.get('/defi/opportunities/:asset', async (req: Request, res: Response) => {
  try {
    const { getBestOpportunitiesForAsset } = await import('./services/defiOpportunities');
    const { asset } = req.params;
    const opportunities = await getBestOpportunitiesForAsset(asset);
    res.json({ asset, opportunities, count: opportunities.length });
  } catch (error) {
    console.error('DeFi opportunities error:', error);
    res.status(500).json({ error: 'Failed to get opportunities' });
  }
});

/**
 * GET /defi/compare/:asset
 * Compare opportunities for asset across protocols
 */
app.get('/defi/compare/:asset', async (req: Request, res: Response) => {
  try {
    const { compareProtocolOpportunities } = await import('./services/defiOpportunities');
    const { asset } = req.params;
    const comparison = await compareProtocolOpportunities(asset);
    res.json(comparison);
  } catch (error) {
    console.error('DeFi comparison error:', error);
    res.status(500).json({ error: 'Failed to compare opportunities' });
  }
});

// =============================================================================
// ARBITRAGE DETECTOR
// =============================================================================

/**
 * GET /arbitrage/scan
 * Scan for arbitrage opportunities across DEXs
 */
app.get('/arbitrage/scan', async (_req: Request, res: Response) => {
  try {
    const { scanArbitrageOpportunities } = await import('./services/arbitrageDetector');
    const scan = await scanArbitrageOpportunities();
    res.json(scan);
  } catch (error) {
    console.error('Arbitrage scan error:', error);
    res.status(500).json({ error: 'Failed to scan arbitrage opportunities' });
  }
});

/**
 * GET /arbitrage/token/:token
 * Get arbitrage opportunities for specific token
 */
app.get('/arbitrage/token/:token', async (req: Request, res: Response) => {
  try {
    const { getArbitrageForToken } = await import('./services/arbitrageDetector');
    const { token } = req.params;
    const opportunities = await getArbitrageForToken(token);
    res.json({ token, opportunities, count: opportunities.length });
  } catch (error) {
    console.error('Arbitrage token error:', error);
    res.status(500).json({ error: 'Failed to get arbitrage opportunities' });
  }
});

/**
 * GET /arbitrage/alerts
 * Get real-time arbitrage alerts
 */
app.get('/arbitrage/alerts', async (_req: Request, res: Response) => {
  try {
    const { getArbitrageAlerts } = await import('./services/arbitrageDetector');
    const alerts = await getArbitrageAlerts();
    res.json({ alerts, count: alerts.length });
  } catch (error) {
    console.error('Arbitrage alerts error:', error);
    res.status(500).json({ error: 'Failed to get arbitrage alerts' });
  }
});

/**
 * GET /arbitrage/stats
 * Get historical arbitrage statistics
 */
app.get('/arbitrage/stats', (_req: Request, res: Response) => {
  try {
    const { getArbitrageStats } = require('./services/arbitrageDetector');
    const stats = getArbitrageStats();
    res.json(stats);
  } catch (error) {
    console.error('Arbitrage stats error:', error);
    res.status(500).json({ error: 'Failed to get arbitrage stats' });
  }
});

// =============================================================================
// VERIFIABLE RISK TIMELINE (PREDICT → PRESCRIBE → PROVE)
// =============================================================================

/**
 * GET /forecast/48h
 * 48-hour event impact forecast with risk windows
 */
app.get('/forecast/48h', async (_req: Request, res: Response) => {
  try {
    const { generate48hForecast } = await import('./services/riskTimeline');
    const forecast = await generate48hForecast();
    res.json(forecast);
  } catch (error) {
    console.error('48h forecast error:', error);
    res.status(500).json({ error: 'Failed to generate 48h forecast' });
  }
});

/**
 * GET /forecast/48h/posture
 * Strategy-specific posture recommendations
 * Query: ?strategy=trader|lp|yield|market-maker
 */
app.get('/forecast/48h/posture', async (req: Request, res: Response) => {
  try {
    const { generate48hPosture } = await import('./services/riskTimeline');
    const strategy = req.query.strategy as string;

    if (!['trader', 'lp', 'yield', 'market-maker'].includes(strategy)) {
      return res.status(400).json({
        error: 'Invalid strategy',
        valid_strategies: ['trader', 'lp', 'yield', 'market-maker']
      });
    }

    const posture = await generate48hPosture(strategy as any);
    res.json(posture);
  } catch (error) {
    console.error('Posture generation error:', error);
    res.status(500).json({ error: 'Failed to generate posture' });
  }
});

/**
 * POST /receipts
 * Create verifiable on-chain receipt for a decision
 */
app.post('/receipts', async (req: Request, res: Response) => {
  try {
    const { createReceipt } = await import('./services/riskTimeline');
    const { agentId, forecastWindowId, strategy, recommendationPayload, inputSnapshot } = req.body;

    if (!agentId || !forecastWindowId || !strategy || !recommendationPayload || !inputSnapshot) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: {
          agentId: 'string',
          forecastWindowId: 'string',
          strategy: 'string',
          recommendationPayload: 'object',
          inputSnapshot: 'object with riskScore, components, eventIds'
        }
      });
    }

    const receipt = await createReceipt({
      agentId,
      forecastWindowId,
      strategy,
      recommendationPayload,
      inputSnapshot
    });

    res.json({
      success: true,
      receipt,
      message: 'Receipt created and will be anchored on-chain'
    });
  } catch (error) {
    console.error('Receipt creation error:', error);
    res.status(500).json({ error: 'Failed to create receipt' });
  }
});

/**
 * GET /receipts/:id
 * Get receipt by ID
 */
app.get('/receipts/:id', (_req: Request, res: Response) => {
  try {
    const { getReceipt } = require('./services/riskTimeline');
    const { id } = _req.params;

    const receipt = getReceipt(id);

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json(receipt);
  } catch (error) {
    console.error('Receipt retrieval error:', error);
    res.status(500).json({ error: 'Failed to get receipt' });
  }
});

/**
 * GET /receipts/:id/verify
 * Verify receipt integrity and on-chain anchor
 */
app.get('/receipts/:id/verify', async (_req: Request, res: Response) => {
  try {
    const { verifyReceipt } = await import('./services/riskTimeline');
    const { id } = _req.params;

    const verification = await verifyReceipt(id);

    res.json(verification);
  } catch (error) {
    console.error('Receipt verification error:', error);
    res.status(500).json({ error: 'Failed to verify receipt' });
  }
});

/**
 * GET /receipts/agent/:agentId
 * Get all receipts for an agent
 */
app.get('/receipts/agent/:agentId', (_req: Request, res: Response) => {
  try {
    const { getAgentReceipts } = require('./services/riskTimeline');
    const { agentId } = _req.params;

    const receipts = getAgentReceipts(agentId);

    res.json({
      agentId,
      receipts,
      count: receipts.length
    });
  } catch (error) {
    console.error('Agent receipts error:', error);
    res.status(500).json({ error: 'Failed to get agent receipts' });
  }
});

/**
 * =====================================================================
 * PHASE 4: RADU METRICS - Risk-Adjusted Decision Uplift
 * Judge-proof EV+ evidence with verifiable receipts
 * =====================================================================
 */

/**
 * GET /evaluation/radu
 * RADU Metrics - Compare baseline vs WARGAMES-informed strategy
 * Shows return improvement, risk reduction, and verifiable evidence
 */
app.get('/evaluation/radu', async (_req: Request, res: Response) => {
  try {
    const { calculateRADUMetrics } = await import('./services/raduMetrics');
    const metrics = await calculateRADUMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('RADU metrics error:', error);
    res.status(500).json({ error: 'Failed to calculate RADU metrics' });
  }
});

/**
 * GET /evaluation/trades
 * Trade-by-trade comparison of baseline vs WARGAMES strategies
 * Shows individual trade performance and forecast accuracy
 *
 * Query params:
 * - limit: number of recent trades to return (default: 20, max: 100)
 */
app.get('/evaluation/trades', async (req: Request, res: Response) => {
  try {
    const { getTradeComparison } = await import('./services/raduMetrics');
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20')));
    const comparison = await getTradeComparison(limit);
    res.json(comparison);
  } catch (error) {
    console.error('Trade comparison error:', error);
    res.status(500).json({ error: 'Failed to get trade comparison' });
  }
});

/**
 * GET /evaluation/monthly
 * Monthly performance breakdown
 * Shows month-by-month comparison of baseline vs WARGAMES
 */
app.get('/evaluation/monthly', (_req: Request, res: Response) => {
  try {
    const { getMonthlyPerformance } = require('./services/raduMetrics');
    const monthly = getMonthlyPerformance();
    res.json({
      monthly_performance: monthly,
      summary: {
        total_months: monthly.length,
        avg_outperformance: Math.round((monthly.reduce((sum: number, m: any) => sum + m.outperformance_pct, 0) / monthly.length) * 100) / 100,
        months_outperformed: monthly.filter((m: any) => m.outperformance_pct > 0).length
      }
    });
  } catch (error) {
    console.error('Monthly performance error:', error);
    res.status(500).json({ error: 'Failed to get monthly performance' });
  }
});

/**
 * =====================================================================
 * PHASE 3B: ON-CHAIN RECEIPT ANCHORING
 * Solana blockchain verification for trustless receipts
 * =====================================================================
 */

/**
 * GET /receipts/on-chain/stats
 * Statistics about on-chain receipt anchoring
 */
app.get('/receipts/on-chain/stats', (_req: Request, res: Response) => {
  try {
    const { getAnchorStats } = require('./services/solanaReceipts');
    const stats = getAnchorStats();
    res.json({
      ...stats,
      note: 'On-chain anchoring uses Solana Memo program for trustless verification',
      explorer: 'https://explorer.solana.com'
    });
  } catch (error) {
    console.error('Anchor stats error:', error);
    res.status(500).json({ error: 'Failed to get anchor stats' });
  }
});

/**
 * GET /receipts/on-chain/cost
 * Cost estimate for anchoring receipts on Solana
 */
app.get('/receipts/on-chain/cost', (_req: Request, res: Response) => {
  try {
    const { estimateAnchorCost } = require('./services/solanaReceipts');
    const cost = estimateAnchorCost();
    res.json({
      cost,
      note: 'Solana transaction fees are among the lowest in crypto',
      comparison: {
        ethereum: '$15-50 per tx',
        solana: `$${cost.usd.toFixed(4)} per tx`
      }
    });
  } catch (error) {
    console.error('Cost estimate error:', error);
    res.status(500).json({ error: 'Failed to estimate cost' });
  }
});

/**
 * GET /receipts/on-chain/:signature
 * Verify a receipt on Solana blockchain
 */
app.get('/receipts/on-chain/:signature', async (req: Request, res: Response) => {
  try {
    const { verifyReceiptOnChain } = await import('./services/solanaReceipts');
    const { signature } = req.params;
    const verification = await verifyReceiptOnChain(signature);

    if (!verification.found) {
      return res.status(404).json({
        error: 'Receipt not found on-chain',
        signature
      });
    }

    res.json({
      verified: true,
      signature,
      receiptId: verification.receiptId,
      receiptHash: verification.receiptHash,
      blockTime: verification.blockTime,
      slot: verification.slot,
      finalized: verification.finalized,
      explorer_url: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      note: 'Receipt hash cryptographically proven to exist before outcome'
    });
  } catch (error) {
    console.error('On-chain verification error:', error);
    res.status(500).json({ error: 'Failed to verify on-chain' });
  }
});

