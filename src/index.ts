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
 * Live HTML dashboard
 */
app.get('/dashboard', async (_req: Request, res: Response) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WARGAMES - Macro Intelligence</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
      background: #0a0a0f;
      color: #e0e0e0;
      min-height: 100vh;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 30px 0;
      border-bottom: 1px solid #333;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 2.5rem;
      color: #00ff88;
      letter-spacing: 8px;
      margin-bottom: 10px;
    }
    .header .tagline {
      color: #666;
      font-size: 0.9rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .card {
      background: #111118;
      border: 1px solid #222;
      border-radius: 8px;
      padding: 20px;
    }
    .card h2 {
      color: #00ff88;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #222;
    }
    .risk-score {
      font-size: 4rem;
      font-weight: bold;
      text-align: center;
      padding: 20px 0;
    }
    .risk-score.low { color: #00ff88; }
    .risk-score.medium { color: #ffaa00; }
    .risk-score.high { color: #ff4444; }
    .risk-label {
      text-align: center;
      font-size: 1rem;
      text-transform: uppercase;
      letter-spacing: 3px;
      margin-bottom: 20px;
    }
    .component {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #1a1a1a;
    }
    .component:last-child { border: none; }
    .component-label { color: #888; }
    .component-value { color: #fff; font-weight: bold; }
    .fear-greed {
      text-align: center;
      padding: 15px 0;
    }
    .fear-greed .value {
      font-size: 3rem;
      font-weight: bold;
    }
    .fear-greed .label {
      color: #888;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-size: 0.8rem;
      margin-top: 5px;
    }
    .price-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #1a1a1a;
    }
    .price-row:last-child { border: none; }
    .price-symbol {
      font-weight: bold;
      color: #fff;
    }
    .price-value {
      color: #888;
    }
    .price-change {
      font-size: 0.85rem;
    }
    .price-change.up { color: #00ff88; }
    .price-change.down { color: #ff4444; }
    .prediction {
      padding: 12px 0;
      border-bottom: 1px solid #1a1a1a;
    }
    .prediction:last-child { border: none; }
    .prediction-question {
      font-size: 0.85rem;
      color: #ccc;
      margin-bottom: 5px;
    }
    .prediction-odds {
      font-weight: bold;
      color: #00ff88;
    }
    .narrative {
      padding: 10px 0;
      border-bottom: 1px solid #1a1a1a;
    }
    .narrative:last-child { border: none; }
    .narrative-name {
      font-size: 0.85rem;
      margin-bottom: 5px;
    }
    .narrative-bar {
      height: 4px;
      background: #222;
      border-radius: 2px;
      overflow: hidden;
    }
    .narrative-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #00ff88, #ffaa00, #ff4444);
      transition: width 0.3s;
    }
    .driver {
      padding: 8px 12px;
      background: #1a1a1a;
      border-radius: 4px;
      margin-bottom: 8px;
      font-size: 0.85rem;
    }
    .loading {
      color: #666;
      text-align: center;
      padding: 40px;
    }
    .footer {
      text-align: center;
      padding: 40px 0;
      color: #444;
      font-size: 0.8rem;
    }
    .footer a {
      color: #00ff88;
      text-decoration: none;
    }
    .api-link {
      display: inline-block;
      margin-top: 20px;
      padding: 10px 20px;
      background: #00ff88;
      color: #000;
      text-decoration: none;
      border-radius: 4px;
      font-weight: bold;
      font-size: 0.8rem;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .live-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      background: #00ff88;
      border-radius: 50%;
      margin-right: 8px;
      animation: pulse 2s infinite;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>WARGAMES</h1>
    <p class="tagline"><span class="live-dot"></span>Macro Intelligence for Solana Agents</p>
  </div>

  <div class="grid">
    <div class="card" id="risk-card">
      <h2>Global Risk Score</h2>
      <div class="loading">Loading...</div>
    </div>

    <div class="card" id="sentiment-card">
      <h2>Fear & Greed Index</h2>
      <div class="loading">Loading...</div>
    </div>

    <div class="card" id="crypto-card">
      <h2>Crypto Prices</h2>
      <div class="loading">Loading...</div>
    </div>

    <div class="card" id="predictions-card">
      <h2>Prediction Markets</h2>
      <div class="loading">Loading...</div>
    </div>

    <div class="card" id="narratives-card">
      <h2>Active Narratives</h2>
      <div class="loading">Loading...</div>
    </div>

    <div class="card" id="drivers-card">
      <h2>Risk Drivers</h2>
      <div class="loading">Loading...</div>
    </div>
  </div>

  <div class="footer">
    <p>Built by Ziggy (Agent #311) for the Colosseum Agent Hackathon</p>
    <p style="margin-top: 10px;">"Your agent sees prices. It doesn't see the world."</p>
    <a href="/" class="api-link">API Documentation</a>
  </div>

  <script>
    const API = '';

    async function fetchData() {
      try {
        const [risk, crypto, predictions, narratives] = await Promise.all([
          fetch(API + '/live/risk').then(r => r.json()),
          fetch(API + '/live/crypto').then(r => r.json()),
          fetch(API + '/live/predictions').then(r => r.json()),
          fetch(API + '/narratives').then(r => r.json())
        ]);

        // Risk Score
        const riskClass = risk.score >= 70 ? 'high' : risk.score >= 40 ? 'medium' : 'low';
        document.getElementById('risk-card').innerHTML = \`
          <h2>Global Risk Score</h2>
          <div class="risk-score \${riskClass}">\${risk.score}</div>
          <div class="risk-label">\${risk.bias}</div>
          <div class="component"><span class="component-label">Sentiment</span><span class="component-value">\${risk.components?.sentiment || '-'}</span></div>
          <div class="component"><span class="component-label">Geopolitical</span><span class="component-value">\${risk.components?.geopolitical || '-'}</span></div>
          <div class="component"><span class="component-label">Economic</span><span class="component-value">\${risk.components?.economic || '-'}</span></div>
          <div class="component"><span class="component-label">Crypto Vol</span><span class="component-value">\${risk.components?.crypto || '-'}</span></div>
        \`;

        // Fear & Greed
        if (risk.fear_greed) {
          const fg = risk.fear_greed;
          const fgColor = fg.value <= 25 ? '#ff4444' : fg.value <= 45 ? '#ffaa00' : fg.value <= 55 ? '#888' : fg.value <= 75 ? '#88ff88' : '#00ff88';
          document.getElementById('sentiment-card').innerHTML = \`
            <h2>Fear & Greed Index</h2>
            <div class="fear-greed">
              <div class="value" style="color: \${fgColor}">\${fg.value}</div>
              <div class="label">\${fg.value_classification}</div>
            </div>
          \`;
        }

        // Crypto Prices
        const cryptoHtml = crypto.prices?.slice(0, 6).map(c => {
          const changeClass = c.price_change_percentage_24h >= 0 ? 'up' : 'down';
          const changeSign = c.price_change_percentage_24h >= 0 ? '+' : '';
          return \`
            <div class="price-row">
              <span class="price-symbol">\${c.symbol}</span>
              <span class="price-value">$\${c.current_price.toLocaleString()}</span>
              <span class="price-change \${changeClass}">\${changeSign}\${c.price_change_percentage_24h?.toFixed(1)}%</span>
            </div>
          \`;
        }).join('') || '<div class="loading">No data</div>';
        document.getElementById('crypto-card').innerHTML = '<h2>Crypto Prices</h2>' + cryptoHtml;

        // Predictions
        const predHtml = predictions.markets?.slice(0, 4).map(p => \`
          <div class="prediction">
            <div class="prediction-question">\${p.question}</div>
            <div class="prediction-odds">\${p.probability?.toFixed(0)}% odds</div>
          </div>
        \`).join('') || '<div class="loading">No markets</div>';
        document.getElementById('predictions-card').innerHTML = '<h2>Prediction Markets</h2>' + predHtml;

        // Narratives
        const narrHtml = narratives.narratives?.slice(0, 6).map(n => \`
          <div class="narrative">
            <div class="narrative-name">\${n.name} <span style="color:#666">(\${n.score})</span></div>
            <div class="narrative-bar"><div class="narrative-bar-fill" style="width: \${n.score}%"></div></div>
          </div>
        \`).join('') || '';
        document.getElementById('narratives-card').innerHTML = '<h2>Active Narratives</h2>' + narrHtml;

        // Drivers
        const driversHtml = risk.drivers?.map(d => \`<div class="driver">\${d}</div>\`).join('') || '<div class="loading">No active drivers</div>';
        document.getElementById('drivers-card').innerHTML = '<h2>Risk Drivers</h2>' + driversHtml;

      } catch (err) {
        console.error('Failed to load data:', err);
      }
    }

    // Initial load
    fetchData();
    // Refresh every 60 seconds
    setInterval(fetchData, 60000);
  </script>
</body>
</html>
  `);
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
