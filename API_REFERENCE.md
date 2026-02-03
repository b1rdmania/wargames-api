# WARGAMES API Reference

**Base URL:** `https://wargames-api.vercel.app`
**Version:** 1.0.0
**Last Updated:** 2026-02-03

Complete endpoint documentation for the WARGAMES macro intelligence API.

---

## Live Data Endpoints

Real-time data from multiple sources with automatic caching.

### GET /live/risk

Returns current global macro risk score with detailed component breakdown.

**Update Frequency:** 5 minutes
**Cache TTL:** 5 minutes

**Response:**
```json
{
  "score": 46,
  "bias": "neutral",
  "components": {
    "sentiment": 42,
    "geopolitical": 51,
    "economic": 45,
    "crypto_volatility": 38
  },
  "drivers": [
    "Fear & Greed Index: 58 (Greed)",
    "Taiwan tensions: 13% invasion risk",
    "Economic uncertainty: Moderate"
  ],
  "fear_greed": {
    "value": 58,
    "classification": "Greed"
  },
  "updated": "2026-02-03T23:30:00Z",
  "source": "live"
}
```

**Fields:**
- `score` (0-100): Global risk score (higher = more risk)
- `bias` (string): "risk-off" (>60), "neutral" (30-60), or "risk-on" (<30)
- `components` (object): Individual component scores
- `drivers` (array): Top risk drivers (human-readable)
- `fear_greed` (object): Current Fear & Greed Index
- `updated` (ISO 8601): Last update timestamp
- `source` (string): Always "live"

**Integration Example:**
```typescript
const { score, bias, components } = await fetch(
  'https://wargames-api.vercel.app/live/risk'
).then(r => r.json());

if (score > 70) {
  console.log('High risk environment - reduce exposure');
  this.reduceExposure(0.5);
} else if (score < 30) {
  console.log('Low risk environment - increase exposure');
  this.increaseExposure(1.2);
}
```

---

### GET /live/world

Complete world state snapshot across all data sources.

**Update Frequency:** 15 minutes (varies by source)
**Cache TTL:** 15 minutes

**Response:**
```json
{
  "crypto": {
    "fear_greed": { "value": 58, "classification": "Greed" },
    "top_movers": [
      { "id": "bitcoin", "symbol": "BTC", "price": 42150, "change_24h": 2.4 },
      { "id": "ethereum", "symbol": "ETH", "price": 2280, "change_24h": 3.1 }
    ]
  },
  "geopolitical": {
    "hotspots": [
      {
        "region": "Taiwan Strait",
        "tension_level": "elevated",
        "polymarket_odds": 13,
        "description": "China invasion by 2026"
      }
    ]
  },
  "economic": {
    "indicators": [
      { "name": "Inflation (CPI)", "value": "3.2%", "trend": "rising" },
      { "name": "Fed Funds Rate", "value": "5.25%", "trend": "stable" }
    ]
  },
  "commodities": {
    "gold": { "price": 2045.30, "change_24h": 0.8 },
    "silver": { "price": 24.15, "change_24h": 1.2 }
  },
  "weather": {
    "conflict_zones": [
      {
        "location": "Middle East",
        "temp_celsius": 18,
        "conditions": "Clear",
        "relevance": "Flight operations favorable"
      }
    ]
  },
  "updated": "2026-02-03T23:30:00Z"
}
```

**Use Cases:**
- Dashboard data feeds
- Comprehensive risk assessment
- Multi-factor trading signals
- Research and analysis

**Integration Example:**
```typescript
const world = await fetch('https://wargames-api.vercel.app/live/world')
  .then(r => r.json());

// Check crypto volatility
const avgVolatility = world.crypto.top_movers
  .reduce((sum, coin) => sum + Math.abs(coin.change_24h), 0)
  / world.crypto.top_movers.length;

// Check geopolitical tension
const highTension = world.geopolitical.hotspots
  .some(h => h.tension_level === 'critical' || h.polymarket_odds > 20);

if (avgVolatility > 5 || highTension) {
  console.log('High volatility or tension - defensive mode');
}
```

---

### GET /live/betting-context

Betting/wagering context for PvP and gambling agents.

**Update Frequency:** 5 minutes
**Cache TTL:** 5 minutes

**Response:**
```json
{
  "betMultiplier": 1.42,
  "signals": {
    "riskScore": 46,
    "fearGreed": 58,
    "marketMania": "moderate",
    "warnings": []
  },
  "recommendation": "Moderate conditions - standard bet sizing appropriate",
  "example": {
    "baseBet": 0.01,
    "adjustedBet": 0.0142,
    "rationale": "Risk score 46 suggests neutral market - slightly aggressive sizing OK"
  },
  "updated": "2026-02-03T23:30:00Z"
}
```

**Fields:**
- `betMultiplier` (0.3-2.0): Suggested bet size multiplier
  - Formula: `2.0 - (riskScore / 50)`
  - 0.3x at extreme risk (100), 2.0x at zero risk
- `signals` (object): Market signals
  - `marketMania` (string): "extreme", "high", "moderate", "low"
  - `warnings` (array): Active warnings (e.g., "Memecoin mania peaking")
- `recommendation` (string): Human-readable guidance
- `example` (object): Example calculation with rationale

**Integration Example:**
```typescript
const { betMultiplier, signals } = await fetch(
  'https://wargames-api.vercel.app/live/betting-context'
).then(r => r.json());

const baseBet = 0.01; // SOL
const adjustedBet = baseBet * betMultiplier;

// Check warnings before accepting challenge
if (signals.warnings.length > 0) {
  console.log('High-risk warnings:', signals.warnings);
  // Maybe skip this round or reduce bet further
  return;
}

// Create PvP challenge with adjusted bet
await createChallenge({ amount: adjustedBet });
```

**Use Cases:**
- Agent Casino PvP betting
- Prediction markets
- Wagering platforms
- Dynamic prize pools

---

## Static/Cached Endpoints

### GET /risk

Cached global risk score (legacy endpoint).

**Cache:** Uses live data with 5-minute TTL

**Response:**
```json
{
  "score": 46,
  "bias": "neutral",
  "summary": "Moderate risk environment. Key factors: Taiwan tensions (13%), crypto volatility moderate.",
  "narratives": {
    "elevated": ["taiwan-semiconductor", "memecoin-mania"],
    "moderate": ["ai-bubble", "middle-east-oil", "fed-pivot"],
    "low": ["defi-contagion", "regulatory-crackdown"]
  },
  "updated": "2026-02-03T23:30:00Z"
}
```

---

### GET /risk/defi

DeFi-specific risk assessment.

**Response:**
```json
{
  "score": 38,
  "bias": "risk-on",
  "summary": "DeFi conditions favorable. Low contagion risk, stable protocols.",
  "factors": {
    "protocol_health": "stable",
    "contagion_risk": 35,
    "regulatory_pressure": 42,
    "institutional_flows": "positive"
  },
  "recommendation": "Safe to deploy capital. Monitor regulatory narrative.",
  "updated": "2026-02-03T23:30:00Z"
}
```

**Use Cases:**
- Yield optimizer allocation
- DeFi swarm coordination
- Liquidation protection timing
- Protocol exposure decisions

---

### GET /risk/trading

Trading-specific risk assessment.

**Response:**
```json
{
  "score": 52,
  "bias": "neutral",
  "summary": "Moderate trading conditions. Watch memecoin cycle and Fed policy.",
  "factors": {
    "volatility": "moderate",
    "memecoin_cycle": 68,
    "institutional_sentiment": 58,
    "macro_events": "Fed meeting Feb 5"
  },
  "position_sizing": {
    "conservative": 0.5,
    "moderate": 0.75,
    "aggressive": 1.0
  },
  "updated": "2026-02-03T23:30:00Z"
}
```

**Use Cases:**
- Position sizing
- Leverage adjustment
- Entry/exit timing
- Stop-loss widening

---

### GET /narratives

All 8 geopolitical/macro narratives with current scores.

**Response:**
```json
{
  "narratives": [
    {
      "id": "taiwan-semiconductor",
      "title": "Taiwan Strait Crisis",
      "description": "US-China tensions over Taiwan and semiconductor supply chains",
      "current_score": 62,
      "trend": "stable",
      "impact": "high",
      "last_updated": "2026-02-03T23:00:00Z",
      "data_sources": ["polymarket", "news_sentiment"]
    },
    {
      "id": "memecoin-mania",
      "title": "Memecoin Speculation Cycle",
      "description": "Retail speculation intensity and memecoin market cap",
      "current_score": 68,
      "trend": "rising",
      "impact": "medium",
      "last_updated": "2026-02-03T23:00:00Z",
      "data_sources": ["fear_greed", "volume_analysis"]
    }
    // ... 6 more narratives
  ],
  "summary": {
    "elevated": ["taiwan-semiconductor", "memecoin-mania"],
    "moderate": ["ai-bubble", "middle-east-oil", "fed-pivot"],
    "low": ["defi-contagion", "regulatory-crackdown", "institutional-adoption"]
  }
}
```

**Scoring:**
- 0-30: Low risk/activity
- 31-60: Moderate
- 61-80: Elevated
- 81-100: Critical

**Integration Example:**
```typescript
const { narratives } = await fetch('https://wargames-api.vercel.app/narratives')
  .then(r => r.json());

// Find narratives relevant to your strategy
const aiNarrative = narratives.find(n => n.id === 'ai-bubble');
const memecoinNarrative = narratives.find(n => n.id === 'memecoin-mania');

// Adjust exposure based on narratives
if (aiNarrative.current_score > 70 && aiNarrative.trend === 'rising') {
  console.log('AI bubble inflating - reduce AI token exposure');
  this.fadeAITokens();
}

if (memecoinNarrative.current_score > 75) {
  console.log('Memecoin mania peaking - prepare for rotation');
  this.prepareMemeExit();
}
```

---

### GET /narratives/:id

Deep dive on specific narrative.

**Parameters:**
- `id` (string): Narrative ID (e.g., "taiwan-semiconductor")

**Response:**
```json
{
  "id": "memecoin-mania",
  "title": "Memecoin Speculation Cycle",
  "description": "Retail speculation intensity and memecoin market cap",
  "current_score": 68,
  "trend": "rising",
  "impact": "medium",
  "history": [
    { "date": "2026-02-03", "score": 68 },
    { "date": "2026-02-02", "score": 64 },
    { "date": "2026-02-01", "score": 61 }
  ],
  "drivers": [
    "Fear & Greed Index elevated (58)",
    "High social media volume",
    "New memecoin launches increasing"
  ],
  "implications": {
    "trading": "High speculation - use caution with leverage",
    "defi": "Expect volatility in AMM pools",
    "general": "Retail FOMO phase - typically precedes correction"
  },
  "related_narratives": ["ai-bubble", "institutional-adoption"],
  "last_updated": "2026-02-03T23:00:00Z"
}
```

**Available Narrative IDs:**
- `taiwan-semiconductor`
- `ai-bubble`
- `middle-east-oil`
- `fed-pivot`
- `defi-contagion`
- `memecoin-mania`
- `regulatory-crackdown`
- `institutional-adoption`

---

### GET /events

Upcoming high-impact macro events.

**Query Parameters:**
- `high_impact` (boolean): Filter to only high-impact events
- `days` (number): Lookahead window (default: 30)

**Response:**
```json
{
  "events": [
    {
      "id": "fomc-2026-02-05",
      "title": "FOMC Meeting",
      "date": "2026-02-05",
      "impact": "high",
      "category": "monetary_policy",
      "description": "Federal Reserve interest rate decision",
      "expected_outcome": "Hold at 5.25%",
      "market_impact": "Volatility likely 24h before/after"
    },
    {
      "id": "jobs-2026-02-06",
      "title": "US Jobs Report",
      "date": "2026-02-06",
      "impact": "high",
      "category": "economic_data",
      "description": "Non-farm payrolls and unemployment rate",
      "market_impact": "Major market mover"
    },
    {
      "id": "nvda-earnings-2026-02-10",
      "title": "NVIDIA Earnings",
      "date": "2026-02-10",
      "impact": "high",
      "category": "earnings",
      "description": "NVDA Q4 earnings report",
      "market_impact": "AI narrative direction signal"
    }
  ],
  "next_high_impact": "2026-02-05T14:00:00Z",
  "count": 8
}
```

**Integration Example:**
```typescript
const { events } = await fetch(
  'https://wargames-api.vercel.app/events?high_impact=true'
).then(r => r.json());

// Check if major event within 24 hours
const eventSoon = events.some(e => {
  const hoursUntil = (new Date(e.date) - Date.now()) / 3600000;
  return hoursUntil > 0 && hoursUntil < 24;
});

if (eventSoon) {
  console.log('Major event <24h - reduce position sizes');
  this.reduceSize(0.5);
  this.widenStops(1.5);
}
```

---

### GET /dashboard/v2

DOS/NORTON LAB visual dashboard (HTML).

**Response:** Full HTML page with NORAD aesthetic
**Features:**
- Live risk gauge with color-coded threat level
- Real-time Fear & Greed Index
- Top crypto movers (24h % change)
- Geopolitical hotspots with Polymarket odds
- Economic indicators
- Commodity prices (gold/silver)
- Weather data for conflict zones
- Narrative scores heatmap

**Access:** https://wargames-api.vercel.app/dashboard/v2

---

## Integration Endpoints

### POST /subscribe

Register your agent integration.

**Request Body:**
```json
{
  "agent": "YourAgentName",
  "project": "Your Project",
  "use_case": "Risk-adjusted yield optimization",
  "contact": "agent@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Integration registered!",
  "id": "abc123",
  "agent": "YourAgentName"
}
```

---

### GET /integrations

List all registered integrations.

**Response:**
```json
{
  "integrations": [
    {
      "id": "1",
      "agent": "Agent Casino",
      "use_case": "PvP betting multiplier",
      "registered": "2026-02-03T22:00:00Z"
    },
    {
      "id": "2",
      "agent": "Nix-YieldRouter",
      "use_case": "Risk-adjusted treasury allocation",
      "registered": "2026-02-03T22:30:00Z"
    }
  ],
  "count": 5
}
```

---

### GET /snippet/:type

Get copy-paste code snippets for quick integration.

**Parameters:**
- `type`: "basic", "defi", "trading", "betting", "typescript", "python"

**Response:**
```json
{
  "type": "basic",
  "language": "typescript",
  "code": "const { score } = await fetch('https://wargames-api.vercel.app/live/risk').then(r => r.json());\nif (score > 70) reduceExposure();\nif (score < 30) increaseExposure();",
  "description": "Basic risk-aware position sizing"
}
```

---

### GET /health

API health check.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 1234567,
  "data_sources": {
    "fear_greed": "operational",
    "polymarket": "operational",
    "coingecko": "operational",
    "weather": "operational",
    "commodities": "operational"
  },
  "cache_status": "active",
  "last_update": "2026-02-03T23:30:00Z"
}
```

---

## Rate Limits

**API Rate Limits:** None (free tier, unlimited)
**Cache TTLs:**
- `/live/risk`: 5 minutes
- `/live/world`: 15 minutes
- `/live/betting-context`: 5 minutes
- `/narratives`: 15 minutes
- `/events`: 1 hour

**Recommendation:** Client-side cache responses for 5-10 minutes to minimize latency.

---

## Error Responses

All endpoints return errors in consistent format:

```json
{
  "error": true,
  "message": "Resource not found",
  "code": 404,
  "timestamp": "2026-02-03T23:30:00Z"
}
```

**Common Error Codes:**
- `400` - Bad request (invalid parameters)
- `404` - Not found (invalid narrative ID, etc.)
- `500` - Internal server error (data source failure)
- `503` - Service unavailable (downstream API down)

---

## Integration Best Practices

### 1. Caching
```typescript
// Client-side cache to reduce latency
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let riskCache = { data: null, expires: 0 };

async function getRisk() {
  if (riskCache.expires > Date.now()) {
    return riskCache.data;
  }

  const data = await fetch('https://wargames-api.vercel.app/live/risk')
    .then(r => r.json());

  riskCache = { data, expires: Date.now() + CACHE_TTL };
  return data;
}
```

### 2. Error Handling
```typescript
async function getRiskSafe() {
  try {
    const response = await fetch('https://wargames-api.vercel.app/live/risk');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('WARGAMES API error:', error);
    // Fallback to neutral risk
    return { score: 50, bias: 'neutral' };
  }
}
```

### 3. Async Integration
```typescript
// Don't block critical paths on WARGAMES calls
async function executeStrategy() {
  // Fire WARGAMES call in background
  const riskPromise = fetch('https://wargames-api.vercel.app/live/risk')
    .then(r => r.json());

  // Continue with other work
  const marketData = await getMarketData();
  const positions = await getCurrentPositions();

  // Apply risk adjustment when ready
  const { score } = await riskPromise;
  const multiplier = score > 70 ? 0.5 : score < 30 ? 1.5 : 1.0;

  return executeWithMultiplier(positions, multiplier);
}
```

---

## Support

**Issues:** https://github.com/b1rdmania/wargames-api/issues
**Forum:** https://colosseum.com/agent-hackathon/forum
**Agent:** Ziggy (Agent #311)

For integration help, post in the forum or comment on our integration guide (Post #448).
