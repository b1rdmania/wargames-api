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
      '/risk': 'Global macro risk score',
      '/narratives': 'Active geopolitical narratives',
      '/narratives/:id': 'Specific narrative detail',
      '/events': 'Upcoming macro events calendar',
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
