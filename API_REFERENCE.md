# WARGAMES API Reference

**Base URL:** `https://wargames-api.fly.dev`
**Version:** 1.1.0
**Last Updated:** 2026-02-06

Complete endpoint documentation for the WARGAMES macro intelligence API.

---

## Trading Floor Feed Stack ⭐ NEW

Complete trading-floor data layer with 7 unified feed endpoints. All endpoints return consistent `FeedResponse` format with graceful degradation.

### Common Response Format

All feed endpoints return this structure:

```json
{
  "data": { /* endpoint-specific data */ },
  "metadata": {
    "provider": "FRED + Frankfurter",
    "fetchedAt": "2026-02-06T16:25:00Z",
    "ttlMs": 21600000,
    "freshness": "daily",
    "warnings": ["Copper data is monthly, not daily"]
  }
}
```

**Metadata Fields:**
- `provider` (string): Data source(s) used
- `fetchedAt` (string): ISO timestamp of fetch
- `ttlMs` (number): Cache time-to-live in milliseconds
- `freshness` (string): Data freshness level - `realtime`, `delayed`, `eod`, `daily`, `monthly`
- `warnings` (string[]): Non-fatal issues (missing data, partial results, etc.)

### GET /live/news

Breaking news with importance scoring from GDELT.

**Update Frequency:** 1 minute
**Cache TTL:** 60 seconds
**Source:** GDELT Global Event Database

**Response:**
```json
{
  "data": {
    "breaking": [
      {
        "headline": "Fed signals pause in rate cuts amid inflation concerns",
        "source": "Reuters",
        "timestamp": "2026-02-06T15:30:00Z",
        "importance": 92,
        "category": "macro",
        "url": "https://..."
      }
    ],
    "recent": [ /* last 20 articles */ ]
  },
  "metadata": {
    "provider": "GDELT",
    "fetchedAt": "2026-02-06T16:25:00Z",
    "ttlMs": 60000,
    "freshness": "realtime",
    "warnings": []
  }
}
```

**Importance Scoring:**
- Base score from recency (newer = higher)
- Keyword boosts: FOMC +30, CPI +28, sanctions +22, war +25, nuclear +30
- Category boosts: macro +15, geopolitics +12
- Source credibility weighting

**Categories:** `macro`, `geopolitics`, `markets`, `crypto`, `energy`, `other`

### GET /live/markets

FX rates (Frankfurter) + US rates (FRED).

**Update Frequency:** 6 hours
**Cache TTL:** 6 hours (21600000ms)
**Sources:** FRED (Federal Reserve Economic Data), Frankfurter (ECB)

**Response:**
```json
{
  "data": {
    "tape": [
      {
        "symbol": "EURUSD",
        "value": 1.1794,
        "change_24h": null,
        "timestamp": "2026-02-06T16:00:00Z",
        "unit": "ratio"
      },
      {
        "symbol": "DXY",
        "value": 117.90,
        "change_24h": 0.39,
        "timestamp": "2026-01-30T16:00:00Z",
        "unit": "points",
        "note": "Trade-weighted USD index (FRED: DTWEXBGS, daily close)"
      },
      {
        "symbol": "UST_10Y",
        "value": 4.29,
        "change_24h": 0.01,
        "timestamp": "2026-02-04T16:00:00Z",
        "unit": "%"
      }
    ],
    "index": {
      "EURUSD": { /* same as tape item */ },
      "DXY": { /* ... */ }
    }
  },
  "metadata": {
    "provider": "FRED + Frankfurter",
    "fetchedAt": "2026-02-06T16:25:00Z",
    "ttlMs": 21600000,
    "freshness": "daily",
    "warnings": []
  }
}
```

**Symbols:**
- **FX:** EURUSD, USDJPY, GBPUSD (ECB rates via Frankfurter)
- **Index:** DXY (USD trade-weighted index, FRED: DTWEXBGS)
- **Rates:** UST_2Y (FRED: DGS2), UST_10Y (FRED: DGS10), SOFR, EFFR

### GET /live/vol

Equity indices + VIX volatility regime.

**Update Frequency:** 6 hours
**Cache TTL:** 6 hours
**Source:** FRED

**Response:**
```json
{
  "data": {
    "indices": [
      {
        "symbol": "SPX",
        "value": 6798.4,
        "change_24h": -1.23,
        "percentile_30d": 50,
        "status": "normal",
        "timestamp": "2026-02-05T21:00:00Z",
        "note": "S&P 500 daily close (FRED: SP500)"
      }
    ],
    "volatility": [
      {
        "symbol": "VIX",
        "value": 21.77,
        "change_24h": 3.13,
        "percentile_30d": 75,
        "status": "elevated",
        "timestamp": "2026-02-05T21:00:00Z"
      }
    ],
    "summary": {
      "regime": "neutral",
      "vix_level": "elevated"
    }
  },
  "metadata": {
    "provider": "FRED",
    "fetchedAt": "2026-02-06T16:25:00Z",
    "ttlMs": 21600000,
    "freshness": "eod",
    "warnings": ["MOVE index unavailable (paid data only)"]
  }
}
```

**Regime Calculation:**
- **risk-on:** VIX < 15 AND SPX change > 0
- **risk-off:** VIX > 25 OR SPX change < -2%
- **neutral:** Everything else

**Indices:** SPX (FRED: SP500), NDX (FRED: NASDAQCOM)
**Volatility:** VIX (FRED: VIXCLS), MOVE (unavailable - paid data)

### GET /live/commodities

Energy + metals with stress indicators.

**Update Frequency:** 6 hours
**Cache TTL:** 6 hours
**Source:** FRED

**Response:**
```json
{
  "data": {
    "energy": [
      {
        "symbol": "WTI",
        "value": 61.6,
        "change_24h": -4.50,
        "change_7d": null,
        "unit": "USD/bbl",
        "timestamp": "2026-02-02T16:00:00Z",
        "frequency": "daily"
      }
    ],
    "metals": [
      {
        "symbol": "COPPER",
        "value": 11790.96,
        "change_24h": null,
        "change_7d": null,
        "unit": "USD/ton",
        "timestamp": "2025-12-01T00:00:00Z",
        "frequency": "monthly",
        "note": "Monthly data only (FRED: PCOPPUSDM)"
      }
    ],
    "summary": {
      "energy_stress": 100,
      "inflation_signal": "neutral"
    }
  },
  "metadata": {
    "provider": "FRED",
    "fetchedAt": "2026-02-06T16:25:00Z",
    "ttlMs": 21600000,
    "freshness": "daily",
    "warnings": ["Copper data is monthly, not daily"]
  }
}
```

**Energy:** WTI (FRED: DCOILWTICO), Brent (FRED: DCOILBRENTEU), Nat Gas (FRED: DHHNGSP)
**Metals:** Gold (FRED: GOLDAMGBD228NLBM), Copper (FRED: PCOPPUSDM - monthly only)

**Energy Stress Score (0-100):**
- Oil volatility (30d rolling)
- Price level deviation from mean
- Natural gas moves

**Inflation Signal:**
- `deflationary`: Oil + gold both falling
- `inflationary`: Both rising strongly
- `neutral`: Mixed or weak signals

### GET /live/geo

Geopolitical events with intensity scoring.

**Update Frequency:** 15 minutes
**Cache TTL:** 15 minutes (900000ms)
**Source:** GDELT

**Response:**
```json
{
  "data": {
    "events": [
      {
        "region": "Middle East",
        "country": "Iran",
        "intensity": 100,
        "event_type": "military",
        "headline": "Iran and US agree to hold nuclear talks Friday in Oman",
        "timestamp": "20260205T201500Z",
        "source": "GDELT",
        "url": "https://..."
      }
    ],
    "hotspots": [
      {
        "region": "Middle East",
        "event_count": 1,
        "avg_intensity": 100
      }
    ],
    "sanctions_updates": []
  },
  "metadata": {
    "provider": "GDELT",
    "fetchedAt": "2026-02-06T16:25:00Z",
    "ttlMs": 900000,
    "freshness": "realtime",
    "warnings": []
  }
}
```

**Intensity Scoring:**
- Base: 50
- Keywords: missile +25, nuclear +30, war +25, sanctions +20, strike +22

**Regions:** Middle East, East Asia, Europe, Latin America, South Asia, Africa, Global
**Event Types:** `military`, `diplomatic`, `economic`, `other`

### GET /live/credit

Credit spreads (IG/HY) + systemic stress score.

**Update Frequency:** 6 hours
**Cache TTL:** 6 hours
**Source:** FRED

**Response:**
```json
{
  "data": {
    "spreads": [
      {
        "type": "IG",
        "oas": 0.76,
        "change_24h": 0.01,
        "percentile_1y": 25,
        "status": "tight",
        "timestamp": "2026-02-05T16:00:00Z"
      },
      {
        "type": "HY",
        "oas": 2.97,
        "change_24h": 0.11,
        "percentile_1y": 25,
        "status": "tight",
        "timestamp": "2026-02-05T16:00:00Z"
      }
    ],
    "summary": {
      "systemic_stress": 23,
      "regime": "low_stress",
      "note": "Credit conditions stable"
    }
  },
  "metadata": {
    "provider": "FRED",
    "fetchedAt": "2026-02-06T16:25:00Z",
    "ttlMs": 21600000,
    "freshness": "daily",
    "warnings": ["EM spreads unavailable (paid data only)"]
  }
}
```

**Spreads:**
- **IG:** Investment Grade OAS (FRED: BAMLC0A0CM)
- **HY:** High Yield OAS (FRED: BAMLH0A0HYM2)
- **EM:** Emerging Markets (unavailable - paid data)

**Systemic Stress Formula (0-100):**
- (IG percentile × 0.4) + (HY percentile × 0.5) + velocity penalty
- **<30:** low_stress
- **30-50:** moderate
- **50-70:** elevated
- **≥70:** crisis

### GET /live/tape

Unified trading floor feed - aggregates all above.

**Update Frequency:** 1 minute
**Cache TTL:** 1 minute
**Sources:** GDELT + FRED + Frankfurter

**Response:**
```json
{
  "data": {
    "breaking_news": [ /* top 5 from /live/news */ ],
    "tape": [
      {
        "category": "fx",
        "items": [ /* FX rates */ ]
      },
      {
        "category": "rates",
        "items": [ /* UST 2Y/10Y, SOFR, EFFR */ ]
      },
      {
        "category": "indices",
        "items": [ /* SPX, NDX */ ]
      },
      {
        "category": "vol",
        "items": [ /* VIX, MOVE */ ]
      },
      {
        "category": "commodities",
        "items": [ /* WTI, Brent, Gold, Copper, Nat Gas */ ]
      },
      {
        "category": "credit",
        "items": [ /* IG, HY, EM spreads */ ]
      }
    ],
    "geo": [ /* top 5 geopolitical events */ ],
    "summary": {
      "market_regime": "neutral",
      "systemic_stress": 23,
      "top_risks": [
        "Iran and US agree to hold nuclear talks Friday in Oman as Tr... (intensity: 100)",
        "Oil volatility elevated"
      ]
    }
  },
  "metadata": {
    "provider": "GDELT + FRED + Frankfurter",
    "fetchedAt": "2026-02-06T16:25:00Z",
    "ttlMs": 60000,
    "freshness": "mixed",
    "warnings": [
      "Most data is daily close (not realtime)",
      "MOVE index unavailable",
      "EM spreads unavailable"
    ]
  }
}
```

**Use Cases:**
- **Single API call** for complete market snapshot
- **Market regime detection** (risk-on/neutral/risk-off)
- **Systemic stress monitoring** (0-100 score)
- **Top risks identification** (geo + market stress)

**SDK Usage:**
```typescript
import { WARGAMES } from '@wargames/sdk';

const wargames = new WARGAMES();
const { data } = await wargames.live.tape();

console.log(`Regime: ${data.summary.market_regime}`);
console.log(`Stress: ${data.summary.systemic_stress}/100`);
data.summary.top_risks.forEach(risk => console.log(`- ${risk}`));

if (data.summary.market_regime === 'risk-off') {
  // Reduce exposure
}
```

---

## Live Data Endpoints

Real-time data from multiple sources with automatic caching.

### GET /live/pyth ⭐ NEW

**Solana-native price oracle data from Pyth Network.**

On-chain price feeds with confidence intervals. More trusted than CEX prices.

**Update Frequency:** Real-time (on-chain)
**Cache TTL:** 30 seconds
**Source:** Pyth Network Hermes API

**Response:**
```json
{
  "endpoint": "/live/pyth",
  "network": "solana",
  "oracle": "Pyth Network",
  "count": 3,
  "prices": [
    {
      "symbol": "BTC/USD",
      "price": 76004.95,
      "confidence": 44.83,
      "publish_time": 1770165241,
      "source": "on-chain"
    },
    {
      "symbol": "ETH/USD",
      "price": 2248.41,
      "confidence": 1.56,
      "publish_time": 1770165241,
      "source": "on-chain"
    },
    {
      "symbol": "SOL/USD",
      "price": 98.4,
      "confidence": 0.07,
      "publish_time": 1770165241,
      "source": "on-chain"
    }
  ],
  "note": "On-chain price feeds from Pyth Network oracles. Confidence intervals indicate data quality.",
  "updated": "2026-02-04T00:34:02.768Z"
}
```

**Fields:**
- `symbol` (string): Asset pair (BTC/USD, ETH/USD, SOL/USD)
- `price` (number): Current on-chain price in USD
- `confidence` (number): Price confidence interval (±value in USD)
- `publish_time` (number): Unix timestamp of last oracle update
- `source` (string): "on-chain" (Solana-native verification)

**Use Cases:**
- **Trusted pricing**: On-chain verification beats CEX APIs
- **Risk assessment**: Confidence intervals show oracle data quality
- **DeFi integrations**: Solana-native, low-latency
- **Position sizing**: High confidence = safe to execute, low confidence = wait

**Example Usage:**
```typescript
const { prices } = await fetch('https://wargames-api.vercel.app/live/pyth').then(r => r.json());
const sol = prices.find(p => p.symbol === 'SOL/USD');

// Check oracle confidence before executing trade
const uncertaintyPct = (sol.confidence / sol.price) * 100;
if (uncertaintyPct > 1) {
  console.log('High price uncertainty (>1%), waiting for better oracle data');
  return;
}

// Safe to execute with high confidence
await executeTrade(sol.price);
```

---

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
