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
import { narratives, calculateGlobalRisk, Narrative } from './data/narratives';
import { events, getUpcomingEvents, getHighImpactEvents } from './data/events';
import {
  fetchFearGreed,
  fetchCryptoPrices,
  fetchPolymarketOdds,
  fetchEconomicIndicators,
  fetchCommodities,
  fetchWeather,
  fetchWorldState,
  calculateDynamicRisk
} from './services/dataFetchers';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Track integrations (in-memory for now)
const integrations: { agent: string; since: string; endpoint: string }[] = [];

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
    version: '1.0.0',
    description: 'Your agent sees prices. It doesnt see the world. WARGAMES gives agents macro context for better decisions.',
    quick_start: {
      step_1: 'GET /risk - Global risk score (0-100)',
      step_2: 'Integrate: if (risk.score > 70) reduceExposure()',
      step_3: 'GET /narratives - Detailed breakdown'
    },
    endpoints: {
      '/risk': 'Global macro risk score (static)',
      '/live/risk': 'Live risk score with real-time data',
      '/live/world': 'Full world state - all data in one call',
      '/live/crypto': 'Real-time crypto prices',
      '/live/sentiment': 'Fear & Greed Index',
      '/live/predictions': 'Polymarket prediction odds',
      '/live/economic': 'Economic indicators',
      '/live/commodities': 'Commodity prices',
      '/live/weather': 'Weather at trading hubs',
      '/narratives': 'Active geopolitical narratives',
      '/narratives/:id': 'Specific narrative detail',
      '/events': 'Upcoming macro events calendar',
      '/dashboard': 'Live visual dashboard',
      '/health': 'API status',
      '/integrations': 'Registered integrations',
      '/subscribe': 'Register for webhooks (POST)'
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
  res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    narratives_count: narratives.length,
    events_count: events.length,
    integrations_count: integrations.length
  });
});

/**
 * GET /risk
 * THE KEY ENDPOINT - Global risk score
 * One number. Instant value.
 */
app.get('/risk', (_req: Request, res: Response) => {
  const risk = calculateGlobalRisk();

  res.json({
    score: risk.score,
    bias: risk.bias,
    summary: risk.summary,
    interpretation: {
      '0-30': 'Risk-on environment. Consider increasing exposure.',
      '30-50': 'Neutral. Standard risk parameters.',
      '50-70': 'Elevated caution. Consider reducing leverage.',
      '70-100': 'Defensive stance. Reduce exposure, increase hedges.'
    },
    updated: new Date().toISOString(),
    next_major_event: getUpcomingEvents(7)[0] || null
  });
});

/**
 * GET /risk/history
 * Historical risk scores (simulated for now)
 */
app.get('/risk/history', (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 7;
  const history = [];

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    // Simulate some variance
    const baseScore = calculateGlobalRisk().score;
    const variance = Math.floor(Math.random() * 10) - 5;
    history.push({
      date: date.toISOString().split('T')[0],
      score: Math.max(0, Math.min(100, baseScore + variance))
    });
  }

  res.json({ history });
});

/**
 * GET /risk/defi
 * DeFi-specific risk assessment
 */
app.get('/risk/defi', (_req: Request, res: Response) => {
  const defiNarratives = narratives.filter(n =>
    n.id === 'defi-contagion' || n.id === 'regulatory-crackdown' || n.id === 'fed-pivot'
  );

  const avgScore = Math.round(
    defiNarratives.reduce((sum, n) => sum + n.current_score, 0) / defiNarratives.length
  );

  res.json({
    score: avgScore,
    bias: avgScore > 60 ? 'defensive' : avgScore > 40 ? 'cautious' : 'neutral',
    key_risks: defiNarratives.map(n => ({ id: n.id, name: n.name, score: n.current_score })),
    recommendation: avgScore > 60
      ? 'Consider reducing DeFi exposure and LP positions'
      : 'Standard DeFi risk parameters acceptable',
    updated: new Date().toISOString()
  });
});

/**
 * GET /risk/trading
 * Trading-specific risk assessment
 */
app.get('/risk/trading', (_req: Request, res: Response) => {
  const tradingNarratives = narratives.filter(n =>
    n.id === 'fed-pivot' || n.id === 'ai-bubble' || n.id === 'memecoin-mania' || n.id === 'institutional-adoption'
  );

  const avgScore = Math.round(
    tradingNarratives.reduce((sum, n) => sum + n.current_score, 0) / tradingNarratives.length
  );

  res.json({
    score: avgScore,
    bias: avgScore > 60 ? 'reduce_leverage' : avgScore > 40 ? 'standard' : 'opportunistic',
    key_factors: tradingNarratives.map(n => ({ id: n.id, name: n.name, score: n.current_score, trend: n.trend })),
    recommendation: avgScore > 60
      ? 'Reduce position sizes and leverage'
      : 'Normal trading parameters acceptable',
    updated: new Date().toISOString()
  });
});

// =============================================================================
// NARRATIVE ENDPOINTS
// =============================================================================

/**
 * GET /narratives
 * All active narratives
 */
app.get('/narratives', (_req: Request, res: Response) => {
  const summary = narratives.map(n => ({
    id: n.id,
    name: n.name,
    score: n.current_score,
    trend: n.trend,
    suggested_action: n.crypto_impact.suggested_action
  }));

  res.json({
    count: narratives.length,
    narratives: summary,
    updated: new Date().toISOString()
  });
});

/**
 * GET /narratives/:id
 * Specific narrative detail
 */
app.get('/narratives/:id', (req: Request, res: Response) => {
  const narrative = narratives.find(n => n.id === req.params.id);

  if (!narrative) {
    return res.status(404).json({
      error: 'Narrative not found',
      available: narratives.map(n => n.id)
    });
  }

  res.json(narrative);
});

// =============================================================================
// EVENT ENDPOINTS
// =============================================================================

/**
 * GET /events
 * Upcoming macro events
 */
app.get('/events', (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 14;
  const highImpactOnly = req.query.high_impact === 'true';

  const upcomingEvents = highImpactOnly ? getHighImpactEvents() : getUpcomingEvents(days);

  res.json({
    count: upcomingEvents.length,
    events: upcomingEvents,
    note: 'Plan your positions around high-impact events'
  });
});

// =============================================================================
// INTEGRATION ENDPOINTS
// =============================================================================

/**
 * GET /integrations
 * List of registered integrations (social proof)
 */
app.get('/integrations', (_req: Request, res: Response) => {
  res.json({
    count: integrations.length,
    integrations: integrations,
    message: integrations.length === 0
      ? 'Be the first to integrate! POST /subscribe to register.'
      : `${integrations.length} agents using WARGAMES macro intelligence`
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
  const existing = integrations.find(i => i.agent === agent);
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

  integrations.push(integration);

  res.json({
    message: 'Integration registered! Welcome to WARGAMES.',
    integration,
    next_steps: [
      'GET /risk - Start using macro intelligence',
      'GET /narratives - Explore active narratives',
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
    `.trim(),

    events: `
// WARGAMES Event-Aware Trading
const WARGAMES = 'https://api.wargames.sol';

async function checkUpcomingRisks(): Promise<boolean> {
  const { events } = await fetch(\`\${WARGAMES}/events?high_impact=true\`).then(r => r.json());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return events.some(e => new Date(e.date) <= tomorrow);
}

// Before opening new positions:
if (await checkUpcomingRisks()) {
  console.log('High-impact event within 24h - reducing position size');
  this.positionSizeModifier = 0.5;
}
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
 * GET /live/commodities
 * Commodity prices
 */
app.get('/live/commodities', async (_req: Request, res: Response) => {
  try {
    const commodities = await fetchCommodities();
    res.json({
      count: commodities.length,
      commodities,
      updated: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch commodities' });
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

// =============================================================================
// DASHBOARD
// =============================================================================

/**
 * GET /dashboard
 * Redirect to v2 (DOS/NORTON LAB terminal)
 */
app.get('/dashboard', (_req: Request, res: Response) => {
  res.redirect('/dashboard/v2');
});

/**
 * GET /dashboard/v1
 * Original dashboard (kept for reference)
 */
app.get('/dashboard/v1', async (_req: Request, res: Response) => {
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
      color: #00ff88;
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
      color: #00ff88;
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
      color: #00ff88;
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
      color: #00ff88;
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
      color: #00ff88;
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
      color: #00ff88;
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
      color: #00ff88;
      text-decoration: none;
      transition: color 0.2s;
    }
    .footer a:hover {
      color: #00ffaa;
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
      background: linear-gradient(135deg, #00ff88 0%, #00cc70 100%);
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
      color: #00ff88;
      border: 1px solid #00ff8850;
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
      background: #00ff8820;
      color: #00ff88;
      border-radius: 12px;
      font-size: 0.7rem;
      font-weight: bold;
      letter-spacing: 1px;
    }
  </style>
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

    <div class="card" id="narratives-card">
      <h2>Active Narratives <span class="badge">8 TRACKED</span></h2>
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

    async function fetchData() {
      const fetchStart = performance.now();

      try {
        const [risk, crypto, predictions, narratives, economic, commodities] = await Promise.all([
          fetch(API + '/live/risk').then(r => r.json()),
          fetch(API + '/live/crypto').then(r => r.json()),
          fetch(API + '/live/predictions').then(r => r.json()),
          fetch(API + '/narratives').then(r => r.json()),
          fetch(API + '/live/economic').then(r => r.json()),
          fetch(API + '/live/commodities').then(r => r.json())
        ]);

        const fetchTime = Math.round(performance.now() - fetchStart);

        // Update stats bar
        document.getElementById('stats-bar').innerHTML = \`
          <div class="stat-item"><div class="stat-value">8</div><div class="stat-label">Data Sources</div></div>
          <div class="stat-item"><div class="stat-value">\${predictions.count || 0}</div><div class="stat-label">Markets Tracked</div></div>
          <div class="stat-item"><div class="stat-value">\${fetchTime}ms</div><div class="stat-label">Response Time</div></div>
          <div class="stat-item"><div class="stat-value">$0.00</div><div class="stat-label">API Cost</div></div>
        \`;

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
        \`;

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
            <div style="text-align: center; margin-top: 15px; color: #666; font-size: 0.85rem;">
              Extreme Fear = Buying Opportunity<br>
              Extreme Greed = Correction Risk
            </div>
          \`;
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

        // Narratives
        const narrHtml = narratives.narratives?.map(n => \`
          <div class="narrative">
            <div class="narrative-header">
              <span class="narrative-name">\${n.name}</span>
              <span class="narrative-score">\${n.score}</span>
            </div>
            <div class="narrative-bar"><div class="narrative-bar-fill" style="width: \${n.score}%"></div></div>
          </div>
        \`).join('') || '';
        document.getElementById('narratives-card').innerHTML = '<h2>Active Narratives <span class="badge">8 TRACKED</span></h2>' + narrHtml;

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
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --norad-bg: #070d14;
      --norad-surface: #0e1822;
      --norad-panel: #101c28;
      --norad-grid: #234055;
      --norad-telemetry: #36d4ff;
      --norad-signal: #02ff81;
      --norad-intel: #cfbeff;
      --norad-warning: #f9c262;
      --norad-fault: #ff8f9a;
      --text-primary: #f0eef5;
      --text-muted: #6b6879;
    }

    body {
      font-family: 'JetBrains Mono', monospace;
      background: var(--norad-bg);
      color: var(--text-primary);
      min-height: 100vh;
      padding: 20px;
      overflow-x: hidden;
    }

    .terminal {
      max-width: 1600px;
      margin: 0 auto;
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

    @media (max-width: 768px) {
      .grid {
        grid-template-columns: 1fr;
      }

      .rwa-grid {
        grid-template-columns: 1fr;
      }

      .metric-value {
        font-size: 48px;
      }
    }
  </style>
</head>
<body>
  <div class="terminal">
    <div class="header">
      <div class="title">WARGAMES // NORAD INTELLIGENCE TERMINAL</div>
      <div class="subtitle">Real-Time Macro Intelligence Layer // Solana Agent Infrastructure</div>
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
        <div class="panel-header">GEOPOLITICAL NARRATIVES <span class="panel-badge">8 TRACKED</span></div>
        <div class="panel-content" id="narratives-panel"><div class="loading">LOADING TELEMETRY...</div></div>
      </div>

      <div class="panel">
        <div class="panel-header">ECONOMIC INDICATORS <span class="panel-badge">FED</span></div>
        <div class="panel-content" id="economic-panel"><div class="loading">LOADING TELEMETRY...</div></div>
      </div>

      <div class="panel">
        <div class="panel-header">RISK DRIVERS <span class="panel-badge">AUTO-DETECT</span></div>
        <div class="panel-content" id="drivers-panel"><div class="loading">LOADING TELEMETRY...</div></div>
      </div>
    </div>

    <div class="footer">
      <p>WARGAMES INTELLIGENCE TERMINAL v1.0 // ZIGGY (AGENT #311) // COLOSSEUM AGENT HACKATHON 2026</p>
      <p style="margin-top: 10px;">
        <a href="/">API DOCS</a> ·
        <a href="/live/world">GET /live/world</a> ·
        <a href="https://github.com/b1rdmania/wargames-api" target="_blank">GITHUB</a>
      </p>
      <p style="margin-top: 15px; color: var(--norad-telemetry);">"YOUR AGENT SEES PRICES. WARGAMES SEES THE WORLD."</p>
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
        const [risk, crypto, predictions, narratives, economic, commodities] = await Promise.all([
          fetch(API + '/live/risk').then(r => r.json()),
          fetch(API + '/live/crypto').then(r => r.json()),
          fetch(API + '/live/predictions').then(r => r.json()),
          fetch(API + '/narratives').then(r => r.json()),
          fetch(API + '/live/economic').then(r => r.json()),
          fetch(API + '/live/commodities').then(r => r.json())
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

        // Narratives
        const narrHtml = narratives.narratives?.map(n => \`
          <div class="narrative-row">
            <div class="narrative-header">
              <span class="narrative-name">\${n.name}</span>
              <span class="narrative-score">\${n.score}</span>
            </div>
            <div class="narrative-bar"><div class="narrative-bar-fill" style="width: \${n.score}%"></div></div>
          </div>
        \`).join('') || '';
        document.getElementById('narratives-panel').innerHTML = narrHtml;

        // Drivers
        const driversHtml = risk.drivers?.length > 0
          ? risk.drivers.map(d => \`<div class="driver-item">\${d}</div>\`).join('')
          : '<div style="text-align: center; padding: 30px; color: var(--text-muted);">NO ELEVATED RISK DRIVERS DETECTED</div>';
        document.getElementById('drivers-panel').innerHTML = driversHtml;

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

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                         WARGAMES API                          ║
║         Macro intelligence layer for Solana agents            ║
╠═══════════════════════════════════════════════════════════════╣
║  "Your agent sees prices. It doesn't see the world."          ║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                   ║
║    GET /risk          - Global macro risk score               ║
║    GET /narratives    - Active geopolitical narratives        ║
║    GET /events        - Upcoming macro events                 ║
║    POST /subscribe    - Register your integration             ║
╠═══════════════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                                  ║
║  Built by Ziggy (Agent #311) - Colosseum Hackathon 2026       ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
