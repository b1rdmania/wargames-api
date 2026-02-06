# WARGAMES Trading-Floor Feed Stack — Full Implementation Specification

**Version:** 1.0
**Status:** Production-Ready
**Constraint:** Free feeds only

## Executive Summary

WARGAMES is adding a free, judge-proof control-centre feed stack that provides macro context (news, FX/rates, vol, commodities, geopolitics, credit spreads) via stable `/live/*` endpoints backed by cached free sources (FRED, GDELT, Frankfurter, OFAC; optional ACLED/EIA).

**Key constraint:** All data sources must be free (public or free-with-free-key). Where datapoints aren't available for free (e.g. real-time futures, MOVE), endpoints return `null` with clear `freshness` labels and notes.

---

## Table of Contents

1. [Endpoint Specifications](#1-endpoint-specifications)
2. [Provider Mapping & Fallback Logic](#2-provider-mapping--fallback-logic)
3. [Implementation Approach](#3-implementation-approach)
4. [Rollout Plan](#4-rollout-plan)
5. [UI Consumption Notes](#5-ui-consumption-notes)
6. [Error Handling & Observability](#6-error-handling--observability)

---

## 1. Endpoint Specifications

### Common Response Structure

All `/live/*` endpoints share a common metadata structure:

```typescript
interface FeedMetadata {
  provider: string;              // "FRED", "GDELT", "Frankfurter", etc.
  fetchedAt: string;             // ISO timestamp
  ttlMs: number;                 // Cache TTL in milliseconds
  freshness: 'realtime' | 'delayed' | 'eod' | 'daily' | 'monthly';
  warnings: string[];            // Soft failures, missing data
}

interface FeedResponse<T> {
  data: T;
  metadata: FeedMetadata;
}
```

---

### 1.1 GET /live/news

**Purpose:** Breaking news wire with importance scoring

**Schema:**
```typescript
interface NewsItem {
  headline: string;
  source: string;
  timestamp: string;              // ISO timestamp
  importance: number;             // 0-100
  category: 'macro' | 'geopolitics' | 'markets' | 'crypto' | 'energy' | 'other';
  url?: string;
}

interface NewsResponse {
  data: {
    breaking: NewsItem[];         // Top 10 by importance
    recent: NewsItem[];           // Last 50, time-ordered
  };
  metadata: FeedMetadata;
}
```

**Example Response:**
```json
{
  "data": {
    "breaking": [
      {
        "headline": "Fed Chair Powell: Rate cuts possible if inflation moderates",
        "source": "Reuters",
        "timestamp": "2026-02-06T12:45:00Z",
        "importance": 95,
        "category": "macro",
        "url": "https://..."
      },
      {
        "headline": "Iran military exercises near Strait of Hormuz escalate tensions",
        "source": "Associated Press",
        "timestamp": "2026-02-06T12:30:00Z",
        "importance": 88,
        "category": "geopolitics",
        "url": "https://..."
      }
    ],
    "recent": [
      // ... 50 items, time-ordered
    ]
  },
  "metadata": {
    "provider": "GDELT",
    "fetchedAt": "2026-02-06T12:50:15.234Z",
    "ttlMs": 60000,
    "freshness": "realtime",
    "warnings": []
  }
}
```

**Importance Scoring Algorithm:**
```typescript
// Base score from recency
const baseScore = Math.max(0, 100 - (ageMinutes * 2));

// Keyword boosts
const keywordBoosts = {
  'FOMC': 30, 'CPI': 28, 'jobs report': 28, 'Fed': 25,
  'sanctions': 22, 'missile': 20, 'default': 25,
  'SEC': 18, 'rate cut': 22, 'recession': 20,
  'war': 25, 'China': 18, 'Taiwan': 22,
  'nuclear': 28, 'oil': 15, 'OPEC': 18
};

// Category boosts
const categoryBoosts = {
  'macro': 15,
  'geopolitics': 12,
  'energy': 10,
  'markets': 8,
  'crypto': 5
};

// Source credibility
const sourceWeights = {
  'Reuters': 1.2, 'Bloomberg': 1.2, 'Associated Press': 1.15,
  'Financial Times': 1.15, 'Wall Street Journal': 1.15,
  'other': 1.0
};

const finalScore = Math.min(100,
  (baseScore + keywordBoost + categoryBoost) * sourceWeight
);
```

---

### 1.2 GET /live/markets

**Purpose:** FX + rates tape (daily close data)

**Schema:**
```typescript
interface MarketTicker {
  symbol: string;
  value: number | null;
  change_24h: number | null;      // Percentage
  timestamp: string;
  unit: string;                   // "%", "points", "ratio"
  note?: string;                  // Explanation if null
}

interface MarketsResponse {
  data: {
    tape: MarketTicker[];         // Ordered display list
    index: Record<string, MarketTicker>; // Keyed access
  };
  metadata: FeedMetadata;
}
```

**Example Response:**
```json
{
  "data": {
    "tape": [
      {
        "symbol": "DXY",
        "value": 103.45,
        "change_24h": 0.32,
        "timestamp": "2026-02-05T16:00:00Z",
        "unit": "points",
        "note": "Trade-weighted USD index (FRED: DTWEXBGS, daily close)"
      },
      {
        "symbol": "EURUSD",
        "value": 1.0842,
        "change_24h": -0.15,
        "timestamp": "2026-02-05T16:00:00Z",
        "unit": "ratio"
      },
      {
        "symbol": "USDJPY",
        "value": 149.23,
        "change_24h": 0.45,
        "timestamp": "2026-02-05T16:00:00Z",
        "unit": "ratio"
      },
      {
        "symbol": "UST_2Y",
        "value": 4.23,
        "change_24h": 0.08,
        "timestamp": "2026-02-05T16:00:00Z",
        "unit": "%"
      },
      {
        "symbol": "UST_10Y",
        "value": 4.45,
        "change_24h": 0.05,
        "timestamp": "2026-02-05T16:00:00Z",
        "unit": "%"
      },
      {
        "symbol": "SOFR",
        "value": 4.56,
        "change_24h": 0.01,
        "timestamp": "2026-02-05T16:00:00Z",
        "unit": "%"
      },
      {
        "symbol": "EFFR",
        "value": 4.58,
        "change_24h": 0.00,
        "timestamp": "2026-02-05T16:00:00Z",
        "unit": "%",
        "note": "Effective Fed Funds Rate"
      }
    ],
    "index": {
      "DXY": { /* ... */ },
      "EURUSD": { /* ... */ }
      // ... keyed by symbol
    }
  },
  "metadata": {
    "provider": "FRED + Frankfurter",
    "fetchedAt": "2026-02-06T09:15:00Z",
    "ttlMs": 21600000,
    "freshness": "daily",
    "warnings": []
  }
}
```

---

### 1.3 GET /live/vol

**Purpose:** Equity indices + volatility (daily close)

**Schema:**
```typescript
interface VolTicker {
  symbol: string;
  value: number | null;
  change_24h: number | null;
  percentile_30d?: number;        // 0-100
  status: 'low' | 'normal' | 'elevated' | 'extreme';
  timestamp: string;
  note?: string;
}

interface VolResponse {
  data: {
    indices: VolTicker[];
    volatility: VolTicker[];
    summary: {
      regime: 'risk-on' | 'neutral' | 'risk-off';
      vix_level: 'low' | 'normal' | 'elevated' | 'extreme';
    };
  };
  metadata: FeedMetadata;
}
```

**Example Response:**
```json
{
  "data": {
    "indices": [
      {
        "symbol": "SPX",
        "value": 5234.18,
        "change_24h": -0.82,
        "percentile_30d": 42,
        "status": "normal",
        "timestamp": "2026-02-05T21:00:00Z",
        "note": "S&P 500 daily close (FRED: SP500)"
      },
      {
        "symbol": "NDX",
        "value": 18456.32,
        "change_24h": -1.15,
        "percentile_30d": 38,
        "status": "normal",
        "timestamp": "2026-02-05T21:00:00Z",
        "note": "Nasdaq Composite close (FRED: NASDAQCOM)"
      }
    ],
    "volatility": [
      {
        "symbol": "VIX",
        "value": 18.45,
        "change_24h": 2.34,
        "percentile_30d": 65,
        "status": "normal",
        "timestamp": "2026-02-05T21:00:00Z"
      },
      {
        "symbol": "MOVE",
        "value": null,
        "change_24h": null,
        "status": "normal",
        "timestamp": null,
        "note": "MOVE index not available via free sources"
      }
    ],
    "summary": {
      "regime": "neutral",
      "vix_level": "normal"
    }
  },
  "metadata": {
    "provider": "FRED",
    "fetchedAt": "2026-02-06T09:15:00Z",
    "ttlMs": 21600000,
    "freshness": "eod",
    "warnings": ["MOVE index unavailable (paid data only)"]
  }
}
```

**Regime Classification:**
```typescript
// VIX levels
const vixLevels = {
  low: vix < 15,
  normal: vix >= 15 && vix < 20,
  elevated: vix >= 20 && vix < 30,
  extreme: vix >= 30
};

// Risk regime (combine VIX + equity momentum)
const regime =
  (vix < 15 && spx_change > 0) ? 'risk-on' :
  (vix > 25 || spx_change < -2) ? 'risk-off' :
  'neutral';
```

---

### 1.4 GET /live/commodities

**Purpose:** Energy + metals (daily/monthly data)

**Schema:**
```typescript
interface CommodityTicker {
  symbol: string;
  value: number | null;
  change_24h: number | null;
  change_7d: number | null;
  unit: string;                   // "USD/bbl", "USD/oz", "USD/mmBtu"
  timestamp: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  note?: string;
}

interface CommoditiesResponse {
  data: {
    energy: CommodityTicker[];
    metals: CommodityTicker[];
    summary: {
      energy_stress: number;      // 0-100
      inflation_signal: 'deflationary' | 'neutral' | 'inflationary';
    };
  };
  metadata: FeedMetadata;
}
```

**Example Response:**
```json
{
  "data": {
    "energy": [
      {
        "symbol": "WTI",
        "value": 78.45,
        "change_24h": 1.23,
        "change_7d": 3.45,
        "unit": "USD/bbl",
        "timestamp": "2026-02-05T16:00:00Z",
        "frequency": "daily"
      },
      {
        "symbol": "BRENT",
        "value": 82.12,
        "change_24h": 0.98,
        "change_7d": 2.87,
        "unit": "USD/bbl",
        "timestamp": "2026-02-05T16:00:00Z",
        "frequency": "daily"
      },
      {
        "symbol": "NATGAS",
        "value": 3.42,
        "change_24h": -2.15,
        "change_7d": -5.23,
        "unit": "USD/mmBtu",
        "timestamp": "2026-02-05T16:00:00Z",
        "frequency": "daily",
        "note": "Henry Hub spot price"
      }
    ],
    "metals": [
      {
        "symbol": "GOLD",
        "value": 2045.50,
        "change_24h": 0.65,
        "change_7d": 1.82,
        "unit": "USD/oz",
        "timestamp": "2026-02-05T16:00:00Z",
        "frequency": "daily",
        "note": "LBMA AM fix"
      },
      {
        "symbol": "COPPER",
        "value": 8523.45,
        "change_24h": null,
        "change_7d": null,
        "unit": "USD/ton",
        "timestamp": "2026-01-31T00:00:00Z",
        "frequency": "monthly",
        "note": "Monthly data only (FRED: PCOPPUSDM)"
      }
    ],
    "summary": {
      "energy_stress": 42,
      "inflation_signal": "neutral"
    }
  },
  "metadata": {
    "provider": "FRED",
    "fetchedAt": "2026-02-06T09:15:00Z",
    "ttlMs": 21600000,
    "freshness": "daily",
    "warnings": ["Copper data is monthly, not daily"]
  }
}
```

**Energy Stress Score:**
```typescript
// Combine oil volatility + price level + nat gas moves
const oilPercentile = calculatePercentile(wti_current, wti_1y_history);
const natgasMove = Math.abs(natgas_change_7d);

const energyStress = Math.min(100,
  (oilPercentile * 0.5) +
  (natgasMove > 10 ? 30 : natgasMove > 5 ? 15 : 0) +
  (wti_current > 90 ? 20 : 0)
);

// Inflation signal
const inflationSignal =
  (wti_change_7d > 5 && gold_change_7d > 2) ? 'inflationary' :
  (wti_change_7d < -5 && copper_change_1m < -5) ? 'deflationary' :
  'neutral';
```

---

### 1.5 GET /live/geo

**Purpose:** Geopolitical event feed with intensity scoring

**Schema:**
```typescript
interface GeoEvent {
  region: string;                 // "Middle East", "East Asia", "Europe", etc.
  country?: string;
  intensity: number;              // 0-100
  event_type: 'conflict' | 'sanctions' | 'diplomatic' | 'protest' | 'military' | 'other';
  headline: string;
  timestamp: string;
  source: string;
  url?: string;
}

interface GeoResponse {
  data: {
    events: GeoEvent[];           // Ordered by intensity
    hotspots: Array<{
      region: string;
      event_count: number;
      avg_intensity: number;
    }>;
    sanctions_updates: Array<{
      entity: string;
      action: string;
      timestamp: string;
    }>;
  };
  metadata: FeedMetadata;
}
```

**Example Response:**
```json
{
  "data": {
    "events": [
      {
        "region": "Middle East",
        "country": "Iran",
        "intensity": 85,
        "event_type": "military",
        "headline": "Iranian naval exercises in Strait of Hormuz",
        "timestamp": "2026-02-06T08:30:00Z",
        "source": "GDELT",
        "url": "https://..."
      },
      {
        "region": "East Asia",
        "country": "China",
        "intensity": 72,
        "event_type": "diplomatic",
        "headline": "China announces military drills near Taiwan",
        "timestamp": "2026-02-06T07:15:00Z",
        "source": "GDELT"
      }
    ],
    "hotspots": [
      {
        "region": "Middle East",
        "event_count": 12,
        "avg_intensity": 68
      },
      {
        "region": "East Asia",
        "event_count": 8,
        "avg_intensity": 54
      }
    ],
    "sanctions_updates": [
      {
        "entity": "Example Corp",
        "action": "Added to SDN list",
        "timestamp": "2026-02-05T14:00:00Z"
      }
    ]
  },
  "metadata": {
    "provider": "GDELT + OFAC",
    "fetchedAt": "2026-02-06T09:00:00Z",
    "ttlMs": 900000,
    "freshness": "realtime",
    "warnings": []
  }
}
```

**Intensity Scoring:**
```typescript
// GDELT provides tone/relevance scores - map to 0-100
const gdeltTone = event.avgTone || 0;  // GDELT's sentiment (-100 to +100)
const baseIntensity = Math.abs(gdeltTone);

// Keyword boost
const keywordBoosts = {
  'missile': 25, 'nuclear': 30, 'war': 25,
  'invasion': 28, 'sanctions': 20, 'strike': 22,
  'attack': 25, 'drone': 18, 'naval': 15
};

// Region boost (conflict zones)
const regionBoosts = {
  'Middle East': 15,
  'East Asia': 12,
  'Ukraine': 18,
  'Red Sea': 20
};

const intensity = Math.min(100,
  baseIntensity + keywordBoost + regionBoost
);
```

---

### 1.6 GET /live/credit

**Purpose:** Credit spreads + systemic stress

**Schema:**
```typescript
interface CreditSpread {
  type: 'IG' | 'HY' | 'EM';
  oas: number | null;             // Option-adjusted spread (bps)
  change_24h: number | null;
  percentile_1y: number;          // 0-100
  status: 'tight' | 'normal' | 'widening' | 'stressed';
  timestamp: string;
}

interface CreditResponse {
  data: {
    spreads: CreditSpread[];
    summary: {
      systemic_stress: number;    // 0-100
      regime: 'low_stress' | 'moderate' | 'elevated' | 'crisis';
      note: string;
    };
  };
  metadata: FeedMetadata;
}
```

**Example Response:**
```json
{
  "data": {
    "spreads": [
      {
        "type": "IG",
        "oas": 112,
        "change_24h": 2,
        "percentile_1y": 45,
        "status": "normal",
        "timestamp": "2026-02-05T16:00:00Z"
      },
      {
        "type": "HY",
        "oas": 342,
        "change_24h": 8,
        "percentile_1y": 58,
        "status": "widening",
        "timestamp": "2026-02-05T16:00:00Z"
      },
      {
        "type": "EM",
        "oas": null,
        "change_24h": null,
        "percentile_1y": null,
        "status": "normal",
        "timestamp": null,
        "note": "EM spreads not available via free sources"
      }
    ],
    "summary": {
      "systemic_stress": 38,
      "regime": "moderate",
      "note": "Credit conditions normal; HY spreads widening modestly"
    }
  },
  "metadata": {
    "provider": "FRED",
    "fetchedAt": "2026-02-06T09:15:00Z",
    "ttlMs": 21600000,
    "freshness": "daily",
    "warnings": ["EM spreads unavailable (paid data only)"]
  }
}
```

**Systemic Stress Calculation:**
```typescript
// Combine IG + HY percentiles with velocity
const igStress = ig_percentile_1y;
const hyStress = hy_percentile_1y;
const velocityPenalty = (ig_change_24h > 5 || hy_change_24h > 15) ? 20 : 0;

const systemicStress = Math.min(100,
  (igStress * 0.4) + (hyStress * 0.5) + velocityPenalty
);

// Regime thresholds
const regime =
  systemicStress < 30 ? 'low_stress' :
  systemicStress < 50 ? 'moderate' :
  systemicStress < 70 ? 'elevated' :
  'crisis';
```

---

### 1.7 GET /live/tape (Unified Feed)

**Purpose:** Aggregated control-centre payload for dashboard consumption

**Schema:**
```typescript
interface TapeResponse {
  data: {
    breaking_news: NewsItem[];
    tape: Array<{
      category: 'fx' | 'rates' | 'indices' | 'vol' | 'commodities' | 'credit';
      items: Array<MarketTicker | VolTicker | CommodityTicker | CreditSpread>;
    }>;
    geo: GeoEvent[];
    summary: {
      market_regime: 'risk-on' | 'neutral' | 'risk-off';
      systemic_stress: number;
      top_risks: string[];
    };
  };
  metadata: {
    sources: string[];
    fetchedAt: string;
    freshness: 'mixed';
    warnings: string[];
  };
}
```

**Example Response:**
```json
{
  "data": {
    "breaking_news": [
      // Top 5 from /live/news
    ],
    "tape": [
      {
        "category": "fx",
        "items": [
          { "symbol": "DXY", "value": 103.45, "change_24h": 0.32 },
          { "symbol": "EURUSD", "value": 1.0842, "change_24h": -0.15 }
        ]
      },
      {
        "category": "rates",
        "items": [
          { "symbol": "UST_2Y", "value": 4.23, "change_24h": 0.08 },
          { "symbol": "UST_10Y", "value": 4.45, "change_24h": 0.05 }
        ]
      },
      {
        "category": "indices",
        "items": [
          { "symbol": "SPX", "value": 5234.18, "change_24h": -0.82 }
        ]
      },
      {
        "category": "vol",
        "items": [
          { "symbol": "VIX", "value": 18.45, "change_24h": 2.34 }
        ]
      },
      {
        "category": "commodities",
        "items": [
          { "symbol": "WTI", "value": 78.45, "change_24h": 1.23 },
          { "symbol": "GOLD", "value": 2045.50, "change_24h": 0.65 }
        ]
      },
      {
        "category": "credit",
        "items": [
          { "type": "IG", "oas": 112, "change_24h": 2 },
          { "type": "HY", "oas": 342, "change_24h": 8 }
        ]
      }
    ],
    "geo": [
      // Top 5 from /live/geo by intensity
    ],
    "summary": {
      "market_regime": "neutral",
      "systemic_stress": 42,
      "top_risks": [
        "Iran military exercises (intensity: 85)",
        "Credit spreads widening (HY +8bps)",
        "Oil volatility elevated"
      ]
    }
  },
  "metadata": {
    "sources": ["FRED", "GDELT", "Frankfurter", "OFAC"],
    "fetchedAt": "2026-02-06T09:15:00Z",
    "freshness": "mixed",
    "warnings": [
      "Most data is daily close (not realtime)",
      "MOVE index unavailable",
      "EM spreads unavailable"
    ]
  }
}
```

---

## 2. Provider Mapping & Fallback Logic

### 2.1 Provider Matrix

| Endpoint | Primary Provider | Fallback | Cache TTL | Freshness |
|----------|------------------|----------|-----------|-----------|
| `/live/news` | GDELT | NewsAPI (optional) | 60s | realtime |
| `/live/markets` (rates) | FRED | None | 6h | daily |
| `/live/markets` (FX) | Frankfurter | None | 6h | daily |
| `/live/vol` | FRED | None | 6h | eod |
| `/live/commodities` | FRED | EIA (optional) | 6h | daily/monthly |
| `/live/geo` | GDELT | ACLED (optional) | 15min | realtime |
| `/live/geo` (sanctions) | OFAC | None | 24h | daily |
| `/live/credit` | FRED | None | 6h | daily |

### 2.2 FRED Series IDs Reference

```typescript
const FRED_SERIES = {
  // Rates
  UST_2Y: 'DGS2',
  UST_10Y: 'DGS10',
  SOFR: 'SOFR',
  EFFR: 'EFFR',
  DXY: 'DTWEXBGS',

  // Indices
  SPX: 'SP500',
  NDX: 'NASDAQCOM',
  VIX: 'VIXCLS',

  // Commodities
  WTI: 'DCOILWTICO',
  BRENT: 'DCOILBRENTEU',
  NATGAS: 'DHHNGSP',
  GOLD: 'GOLDAMGBD228NLBM',
  COPPER: 'PCOPPUSDM',

  // Credit
  IG_OAS: 'BAMLC0A0CM',
  HY_OAS: 'BAMLH0A0HYM2'
};
```

### 2.3 API Rate Limits & Quotas

| Provider | Free Tier Limits | Recommendation |
|----------|------------------|----------------|
| **FRED** | 120 calls/minute (no key), higher with key | Get free API key, cache 6h+ |
| **GDELT** | No published limits, but throttle recommended | Cache 1-5min, batch queries |
| **Frankfurter** | No published limits (ECB mirror) | Cache 6h+ (daily data) |
| **NewsAPI** | 100 calls/day (free tier) | Cache 5min, use sparingly |
| **OFAC** | No published limits (bulk download available) | Cache 24h, download daily |
| **ACLED** | Account-based, varies | Cache 6h+, optional provider |
| **EIA** | 5000 calls/month (free tier) | Cache 6h+, use for energy only |

### 2.4 Fallback Strategy

```typescript
async function fetchWithFallback<T>(
  primary: () => Promise<T>,
  fallback?: () => Promise<T>,
  defaultValue?: T
): Promise<T> {
  try {
    return await primary();
  } catch (primaryError) {
    console.error('Primary provider failed:', primaryError);

    if (fallback) {
      try {
        return await fallback();
      } catch (fallbackError) {
        console.error('Fallback provider failed:', fallbackError);
      }
    }

    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new Error('All providers failed');
  }
}
```

### 2.5 Partial Data Handling

**Rule:** Never fail the entire endpoint if one data source fails. Return partial data + warnings.

```typescript
// Example: /live/markets returns FX + rates
// If FRED fails but Frankfurter succeeds, return FX data only
const marketsResponse = {
  data: {
    tape: [
      // ... FX data from Frankfurter
    ],
    index: { /* ... */ }
  },
  metadata: {
    provider: 'Frankfurter',
    fetchedAt: new Date().toISOString(),
    ttlMs: 21600000,
    freshness: 'daily',
    warnings: ['FRED API unavailable - rates data missing']
  }
};
```

---

## 3. Implementation Approach

### 3.1 Code Organization

**Option A: Extend existing `dataFetchers.ts`**
- ✅ Reuses existing cache infrastructure
- ✅ Consistent pattern
- ⚠️ File becomes large (1000+ lines)

**Option B: New `src/services/feeds/` directory (RECOMMENDED)**
- ✅ Better organization
- ✅ Easier to maintain
- ✅ Clear separation of concerns

```
src/services/feeds/
├── index.ts           # Exports all feed fetchers
├── news.ts            # GDELT + NewsAPI
├── markets.ts         # FRED rates + Frankfurter FX
├── volatility.ts      # FRED indices + VIX
├── commodities.ts     # FRED commodities
├── geopolitics.ts     # GDELT + OFAC + ACLED
├── credit.ts          # FRED credit spreads
└── tape.ts            # Unified aggregator
```

### 3.2 Shared Utilities (feeds/index.ts)

```typescript
import { getCached, setCache } from '../dataFetchers';

// Re-export cache utilities for feeds
export { getCached, setCache };

// Common types
export interface FeedMetadata {
  provider: string;
  fetchedAt: string;
  ttlMs: number;
  freshness: 'realtime' | 'delayed' | 'eod' | 'daily' | 'monthly';
  warnings: string[];
}

export interface FeedResponse<T> {
  data: T;
  metadata: FeedMetadata;
}

// FRED helper
export async function fetchFRED(seriesId: string): Promise<any> {
  const apiKey = process.env.FRED_API_KEY || '';
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=2`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`FRED API error: ${response.status}`);
  }

  return response.json();
}

// GDELT helper
export async function fetchGDELT(query: string, maxRecords = 100): Promise<any> {
  // GDELT 2.0 Doc API
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=${maxRecords}&format=json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GDELT API error: ${response.status}`);
  }

  return response.json();
}

// Frankfurter helper
export async function fetchFrankfurter(base = 'USD', symbols: string[] = ['EUR', 'JPY', 'GBP']): Promise<any> {
  const url = `https://api.frankfurter.app/latest?from=${base}&to=${symbols.join(',')}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Frankfurter API error: ${response.status}`);
  }

  return response.json();
}
```

### 3.3 Example Implementation: feeds/news.ts

```typescript
import { getCached, setCache, FeedResponse, fetchGDELT } from './index';

export interface NewsItem {
  headline: string;
  source: string;
  timestamp: string;
  importance: number;
  category: 'macro' | 'geopolitics' | 'markets' | 'crypto' | 'energy' | 'other';
  url?: string;
}

export interface NewsData {
  breaking: NewsItem[];
  recent: NewsItem[];
}

export async function fetchNews(): Promise<FeedResponse<NewsData>> {
  const cacheKey = 'feed-news';
  const cached = getCached<FeedResponse<NewsData>>(cacheKey);
  if (cached) return cached;

  const warnings: string[] = [];
  const items: NewsItem[] = [];

  try {
    // Fetch from GDELT
    const gdeltQuery = 'FOMC OR "Federal Reserve" OR "rate cut" OR sanctions OR Iran OR Taiwan OR recession OR Bitcoin';
    const gdeltData = await fetchGDELT(gdeltQuery, 50);

    if (gdeltData.articles) {
      for (const article of gdeltData.articles) {
        const item: NewsItem = {
          headline: article.title || '',
          source: article.domain || 'Unknown',
          timestamp: article.seendate || new Date().toISOString(),
          importance: calculateImportance(article),
          category: categorizeNews(article.title || ''),
          url: article.url
        };
        items.push(item);
      }
    }
  } catch (error) {
    console.error('GDELT fetch failed:', error);
    warnings.push('GDELT API unavailable');
  }

  // Sort by importance
  items.sort((a, b) => b.importance - a.importance);

  const response: FeedResponse<NewsData> = {
    data: {
      breaking: items.slice(0, 10),
      recent: items
    },
    metadata: {
      provider: 'GDELT',
      fetchedAt: new Date().toISOString(),
      ttlMs: 60000, // 1 minute
      freshness: 'realtime',
      warnings
    }
  };

  setCache(cacheKey, response, 60000);
  return response;
}

function calculateImportance(article: any): number {
  const headline = (article.title || '').toLowerCase();
  const ageMinutes = Date.now() / 60000 - (article.seendate ? new Date(article.seendate).getTime() / 60000 : 0);

  let score = Math.max(0, 100 - (ageMinutes * 2));

  // Keyword boosts
  const keywords = {
    'fomc': 30, 'cpi': 28, 'jobs report': 28, 'fed': 25,
    'sanctions': 22, 'missile': 20, 'default': 25,
    'recession': 20, 'war': 25, 'nuclear': 28
  };

  for (const [keyword, boost] of Object.entries(keywords)) {
    if (headline.includes(keyword)) {
      score += boost;
    }
  }

  return Math.min(100, score);
}

function categorizeNews(headline: string): NewsItem['category'] {
  const lower = headline.toLowerCase();

  if (lower.match(/fomc|fed|cpi|inflation|rate|jobs/)) return 'macro';
  if (lower.match(/iran|china|taiwan|russia|war|sanctions/)) return 'geopolitics';
  if (lower.match(/bitcoin|crypto|ethereum|solana/)) return 'crypto';
  if (lower.match(/oil|energy|gas|opec/)) return 'energy';
  if (lower.match(/stocks|market|dow|nasdaq/)) return 'markets';

  return 'other';
}
```

### 3.4 Route Integration (index.ts)

```typescript
// Add to src/index.ts imports
import { fetchNews } from './services/feeds/news';
import { fetchMarkets } from './services/feeds/markets';
import { fetchVolatility } from './services/feeds/volatility';
import { fetchCommodities } from './services/feeds/commodities';
import { fetchGeopolitics } from './services/feeds/geopolitics';
import { fetchCredit } from './services/feeds/credit';
import { fetchTape } from './services/feeds/tape';

// Add routes
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

app.get('/live/markets', async (_req: Request, res: Response) => {
  try {
    const data = await fetchMarkets();
    res.json(data);
  } catch (error) {
    console.error('Markets feed error:', error);
    res.status(500).json({ error: 'Failed to fetch markets feed' });
  }
});

// ... repeat for other endpoints

app.get('/live/tape', async (_req: Request, res: Response) => {
  try {
    const data = await fetchTape();
    res.json(data);
  } catch (error) {
    console.error('Tape feed error:', error);
    res.status(500).json({ error: 'Failed to fetch unified tape' });
  }
});
```

### 3.5 Environment Variables

Add to `.env` and Fly.io secrets:

```bash
# Required
FRED_API_KEY=your_fred_key_here

# Optional (for extended functionality)
NEWSAPI_KEY=your_newsapi_key_here
EIA_API_KEY=your_eia_key_here
ACLED_CLIENT_ID=your_acled_id_here
ACLED_CLIENT_SECRET=your_acled_secret_here
```

Set in Fly.io:
```bash
flyctl secrets set FRED_API_KEY=your_key_here
```

---

## 4. Rollout Plan

### Phase 0: Core Endpoints (1-2 hours)
**Goal:** Ship minimal viable feed stack

**Deliverables:**
- ✅ `/live/news` - GDELT headlines
- ✅ `/live/markets` - FRED rates + Frankfurter FX
- ✅ `/live/commodities` - FRED commodities
- ✅ `/live/credit` - FRED IG/HY OAS

**Implementation:**
1. Create `src/services/feeds/` directory
2. Implement news, markets, commodities, credit fetchers
3. Add routes to `index.ts`
4. Test locally
5. Deploy to Fly.io
6. Verify endpoints respond

**Success Criteria:**
- All 4 endpoints return 200
- Data freshness labels accurate
- Cache working (TTLs respected)
- No API rate limit violations

---

### Phase 1: Complete Stack + Unified Tape (3-4 hours)
**Goal:** Add remaining endpoints + aggregator

**Deliverables:**
- ✅ `/live/vol` - FRED indices + VIX
- ✅ `/live/geo` - GDELT events + OFAC sanctions
- ✅ `/live/tape` - Unified control-centre payload

**Implementation:**
1. Implement volatility fetcher
2. Implement geopolitics fetcher (GDELT + OFAC)
3. Implement tape aggregator (calls all other feeds)
4. Update routes
5. Deploy
6. Performance test (ensure tape endpoint < 2s response time)

**Success Criteria:**
- All 7 endpoints live
- `/live/tape` successfully aggregates data
- Response times acceptable (< 2s for tape)
- Partial data handling working (warnings field populated)

---

### Phase 2: Polish & Observability (optional, 2-3 hours)
**Goal:** Production-grade reliability

**Enhancements:**
- 🔹 Add provider health endpoint (`/live/health`)
- 🔹 Implement retry logic with exponential backoff
- 🔹 Add request logging for feed endpoints
- 🔹 Create monitoring dashboard for provider status
- 🔹 Implement circuit breaker pattern for unreliable providers
- 🔹 Add `/live/historical` endpoints for time-series data

**Implementation:**
1. Add health check endpoint
2. Implement retry utilities
3. Add structured logging
4. Create provider status dashboard
5. Document in API reference

---

## 5. UI Consumption Notes

### 5.1 Dashboard Integration Pattern

**Recommended: v2 Dashboard Enhancement**

Add to `GET /dashboard/v2`:

```html
<!-- Breaking News Strip (top of page) -->
<div class="wg-breaking-strip">
  <div class="wg-breaking-label">BREAKING</div>
  <div class="wg-breaking-scroll">
    <!-- Fed from /live/news breaking[0-5] -->
    <span class="wg-breaking-item">
      <span class="wg-breaking-time">12:45</span>
      Fed Chair Powell: Rate cuts possible if inflation moderates
    </span>
    <!-- More items... -->
  </div>
</div>

<!-- Trading Floor Tape (horizontal scroll) -->
<div class="wg-section">
  <h2>MARKET TAPE</h2>
  <div class="wg-tape">
    <!-- Fed from /live/tape -->

    <!-- FX Block -->
    <div class="wg-tape-block">
      <div class="wg-tape-label">FX</div>
      <div class="wg-tape-item">
        <span class="wg-ticker">DXY</span>
        <span class="wg-value">103.45</span>
        <span class="wg-change wg-positive">+0.32%</span>
      </div>
      <!-- More FX... -->
    </div>

    <!-- Rates Block -->
    <div class="wg-tape-block">
      <div class="wg-tape-label">RATES</div>
      <div class="wg-tape-item">
        <span class="wg-ticker">2Y</span>
        <span class="wg-value">4.23%</span>
        <span class="wg-change wg-positive">+8bp</span>
      </div>
      <!-- More rates... -->
    </div>

    <!-- Repeat for: VOL, COMMODITIES, CREDIT -->
  </div>
</div>

<!-- Geopolitical Events Widget -->
<div class="wg-section">
  <h2>GEOPOLITICAL EVENTS</h2>
  <div class="wg-geo-feed">
    <!-- Fed from /live/geo -->
    <div class="wg-geo-event" data-intensity="85">
      <div class="wg-geo-header">
        <span class="wg-geo-region">Middle East</span>
        <span class="wg-geo-intensity">⚠️ 85</span>
      </div>
      <div class="wg-geo-headline">
        Iranian naval exercises in Strait of Hormuz
      </div>
      <div class="wg-geo-meta">
        <span>08:30 UTC</span>
        <span>GDELT</span>
      </div>
    </div>
    <!-- More events... -->
  </div>
</div>
```

### 5.2 CSS Styling (add to brand.css)

```css
/* Breaking News Strip */
.wg-breaking-strip {
  background: var(--wg-fault);
  color: var(--wg-bg);
  padding: 8px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  border-bottom: 2px solid var(--wg-border);
}

.wg-breaking-label {
  background: var(--wg-bg);
  color: var(--wg-fault);
  padding: 4px 10px;
  border-radius: 4px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.wg-breaking-scroll {
  display: flex;
  gap: 24px;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: none;
}

.wg-breaking-scroll::-webkit-scrollbar {
  display: none;
}

.wg-breaking-item {
  display: inline-flex;
  gap: 8px;
}

.wg-breaking-time {
  opacity: 0.7;
}

/* Trading Floor Tape */
.wg-tape {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  padding: 16px 0;
  border: 1px solid var(--wg-border);
  border-radius: 8px;
  background: var(--wg-surface);
}

.wg-tape-block {
  min-width: 180px;
  padding: 0 16px;
  border-right: 1px solid var(--wg-border);
}

.wg-tape-block:last-child {
  border-right: none;
}

.wg-tape-label {
  font-size: 11px;
  color: var(--wg-text-muted);
  font-weight: 700;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  text-transform: uppercase;
}

.wg-tape-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
  font-size: 13px;
}

.wg-ticker {
  color: var(--wg-telemetry);
  font-weight: 600;
}

.wg-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--wg-text);
}

.wg-change {
  font-size: 12px;
  font-weight: 600;
}

.wg-change.wg-positive {
  color: var(--wg-signal);
}

.wg-change.wg-negative {
  color: var(--wg-fault);
}

/* Geopolitical Events */
.wg-geo-feed {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.wg-geo-event {
  background: var(--wg-surface);
  border: 1px solid var(--wg-border);
  border-left: 3px solid var(--wg-warning);
  border-radius: 6px;
  padding: 14px;
  transition: border-left-color 0.2s;
}

.wg-geo-event[data-intensity^="8"],
.wg-geo-event[data-intensity^="9"] {
  border-left-color: var(--wg-fault);
}

.wg-geo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.wg-geo-region {
  font-size: 11px;
  color: var(--wg-telemetry);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.wg-geo-intensity {
  font-size: 12px;
  font-weight: 700;
}

.wg-geo-headline {
  font-size: 14px;
  color: var(--wg-text);
  margin-bottom: 8px;
  line-height: 1.4;
}

.wg-geo-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--wg-text-muted);
}
```

### 5.3 JavaScript for Live Updates

```javascript
// Fetch and update feeds every 60 seconds
async function updateFeeds() {
  try {
    const response = await fetch('/live/tape');
    const data = await response.json();

    // Update breaking news
    updateBreakingNews(data.data.breaking_news);

    // Update tape
    updateTape(data.data.tape);

    // Update geo events
    updateGeoEvents(data.data.geo);

  } catch (error) {
    console.error('Feed update failed:', error);
  }
}

// Update breaking news strip
function updateBreakingNews(items) {
  const container = document.querySelector('.wg-breaking-scroll');
  if (!container) return;

  container.innerHTML = items.slice(0, 5).map(item => `
    <span class="wg-breaking-item">
      <span class="wg-breaking-time">${formatTime(item.timestamp)}</span>
      ${item.headline}
    </span>
  `).join('');
}

// Update tape blocks
function updateTape(tape) {
  // Implementation depends on specific UI structure
  // Iterate through categories and update DOM
}

// Update geo events
function updateGeoEvents(events) {
  const container = document.querySelector('.wg-geo-feed');
  if (!container) return;

  container.innerHTML = events.slice(0, 10).map(event => `
    <div class="wg-geo-event" data-intensity="${event.intensity}">
      <div class="wg-geo-header">
        <span class="wg-geo-region">${event.region}</span>
        <span class="wg-geo-intensity">⚠️ ${event.intensity}</span>
      </div>
      <div class="wg-geo-headline">${event.headline}</div>
      <div class="wg-geo-meta">
        <span>${formatTime(event.timestamp)}</span>
        <span>${event.source}</span>
      </div>
    </div>
  `).join('');
}

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

// Start updates
setInterval(updateFeeds, 60000);
updateFeeds(); // Initial load
```

### 5.4 Data Freshness Labeling

**Critical:** Always display freshness warnings to judges.

```html
<div class="wg-freshness-notice">
  ⚠️ Market data is daily close (EOD). Geopolitics data updates every 15 minutes.
  Credit spreads update daily. See <a href="/live/tape">metadata</a> for details.
</div>
```

---

## 6. Error Handling & Observability

### 6.1 Error Handling Strategy

**Principle:** Graceful degradation. Never return 500 unless catastrophic.

```typescript
// Pattern for all feed fetchers
export async function fetchSomeFeed(): Promise<FeedResponse<SomeData>> {
  const warnings: string[] = [];
  let data: SomeData;

  try {
    // Attempt primary provider
    data = await fetchFromPrimary();
  } catch (primaryError) {
    warnings.push('Primary provider unavailable');

    try {
      // Attempt fallback
      data = await fetchFromFallback();
    } catch (fallbackError) {
      warnings.push('Fallback provider unavailable');

      // Return cached data if available
      const cached = getCachedStale('some-feed');
      if (cached) {
        warnings.push('Serving stale cached data');
        return {
          data: cached.data,
          metadata: {
            ...cached.metadata,
            warnings
          }
        };
      }

      // Last resort: return empty structure
      warnings.push('All providers failed - returning empty data');
      data = getEmptyStructure();
    }
  }

  return {
    data,
    metadata: {
      provider: determineProvider(),
      fetchedAt: new Date().toISOString(),
      ttlMs: getTTL(),
      freshness: determineFreshness(),
      warnings
    }
  };
}
```

### 6.2 Provider Health Monitoring

Add `/live/health` endpoint:

```typescript
app.get('/live/health', async (_req: Request, res: Response) => {
  const providers = [
    { name: 'FRED', endpoint: 'https://api.stlouisfed.org/fred/series/observations?series_id=DGS2&api_key=demo&file_type=json&limit=1' },
    { name: 'GDELT', endpoint: 'https://api.gdeltproject.org/api/v2/doc/doc?query=test&mode=artlist&maxrecords=1&format=json' },
    { name: 'Frankfurter', endpoint: 'https://api.frankfurter.app/latest?from=USD&to=EUR' }
  ];

  const results = await Promise.allSettled(
    providers.map(async (provider) => {
      const start = Date.now();
      try {
        const response = await fetch(provider.endpoint, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        return {
          name: provider.name,
          status: response.ok ? 'healthy' : 'degraded',
          latency: Date.now() - start
        };
      } catch (error) {
        return {
          name: provider.name,
          status: 'down',
          latency: null,
          error: error instanceof Error ? error.message : 'Unknown'
        };
      }
    })
  );

  res.json({
    timestamp: new Date().toISOString(),
    providers: results.map(r => r.status === 'fulfilled' ? r.value : { status: 'error' })
  });
});
```

### 6.3 Logging Strategy

```typescript
// Structured logging for feed operations
function logFeedOperation(
  endpoint: string,
  provider: string,
  success: boolean,
  latency: number,
  error?: string
) {
  const log = {
    timestamp: new Date().toISOString(),
    endpoint,
    provider,
    success,
    latency_ms: latency,
    error: error || null
  };

  console.log(JSON.stringify(log));
}

// Usage in fetchers
const start = Date.now();
try {
  const data = await fetchFromProvider();
  logFeedOperation('/live/news', 'GDELT', true, Date.now() - start);
  return data;
} catch (error) {
  logFeedOperation('/live/news', 'GDELT', false, Date.now() - start,
    error instanceof Error ? error.message : 'Unknown');
  throw error;
}
```

### 6.4 Rate Limit Handling

```typescript
class RateLimiter {
  private calls: number[] = [];
  private limit: number;
  private windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  async acquire(): Promise<void> {
    const now = Date.now();

    // Remove old calls outside window
    this.calls = this.calls.filter(time => now - time < this.windowMs);

    if (this.calls.length >= this.limit) {
      const oldestCall = this.calls[0];
      const waitTime = this.windowMs - (now - oldestCall);
      await new Promise(resolve => setTimeout(resolve, waitTime + 100));
      return this.acquire(); // Retry
    }

    this.calls.push(now);
  }
}

// Usage
const fredLimiter = new RateLimiter(120, 60000); // 120 calls/minute

async function fetchFromFRED(seriesId: string) {
  await fredLimiter.acquire();
  // ... make API call
}
```

---

## Appendix A: Testing Checklist

### Local Testing
- [ ] All 7 endpoints return 200
- [ ] Cached responses work (second call faster)
- [ ] TTLs expire correctly
- [ ] Partial data handling works (simulate provider failure)
- [ ] Warnings field populated on errors
- [ ] `/live/tape` aggregates all feeds
- [ ] Response times acceptable (< 2s for tape)

### Production Testing
- [ ] All endpoints accessible via HTTPS
- [ ] CORS headers correct
- [ ] API keys loaded from secrets
- [ ] Rate limits not exceeded
- [ ] Provider health endpoint works
- [ ] Logs visible in Fly.io dashboard

### Edge Cases
- [ ] Empty responses handled gracefully
- [ ] Network timeouts don't hang requests
- [ ] Malformed API responses caught
- [ ] Cache eviction works under memory pressure
- [ ] Concurrent requests don't cause race conditions

---

## Appendix B: API Key Setup

### FRED API Key (Recommended)
1. Visit https://fred.stlouisfed.org/docs/api/api_key.html
2. Create free account
3. Request API key (instant)
4. Add to `.env`: `FRED_API_KEY=your_key_here`
5. Set in Fly.io: `flyctl secrets set FRED_API_KEY=your_key_here`

### NewsAPI Key (Optional)
1. Visit https://newsapi.org/register
2. Create free account (100 calls/day)
3. Add to `.env`: `NEWSAPI_KEY=your_key_here`

### EIA API Key (Optional)
1. Visit https://www.eia.gov/opendata/register.php
2. Create free account
3. Add to `.env`: `EIA_API_KEY=your_key_here`

### ACLED Access (Optional)
1. Visit https://developer.acleddata.com/
2. Request access credentials
3. Follow their authentication flow
4. Add to `.env`: `ACLED_CLIENT_ID` and `ACLED_CLIENT_SECRET`

---

## Appendix C: Performance Targets

| Endpoint | Target Response Time | Cache Hit Rate Target |
|----------|---------------------|----------------------|
| `/live/news` | < 500ms | > 90% |
| `/live/markets` | < 300ms | > 95% |
| `/live/vol` | < 300ms | > 95% |
| `/live/commodities` | < 300ms | > 95% |
| `/live/geo` | < 600ms | > 85% |
| `/live/credit` | < 300ms | > 95% |
| `/live/tape` | < 2000ms | > 80% |

**Optimization notes:**
- Most latency comes from external API calls
- Aggressive caching is key (6h+ for daily data)
- `/live/tape` calls all other feeds - cache aggressively
- Consider prewarming cache on deploy

---

## Appendix D: Future Enhancements (Optional)

### WebSocket Streaming
For realtime updates without polling:

```typescript
// Server-sent events endpoint
app.get('/live/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendUpdate = () => {
    fetchTape().then(data => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    });
  };

  sendUpdate(); // Initial
  const interval = setInterval(sendUpdate, 60000);

  req.on('close', () => clearInterval(interval));
});
```

### Historical Data API
For backtesting and charting:

```typescript
// GET /live/historical/{feed}?start=2026-01-01&end=2026-02-01
app.get('/live/historical/:feed', async (req: Request, res: Response) => {
  const { feed } = req.params;
  const { start, end } = req.query;

  // Fetch time-series data from FRED
  // Return array of timestamped values
});
```

### Alert System
Push notifications when thresholds breach:

```typescript
interface Alert {
  type: 'credit_spread_widening' | 'vol_spike' | 'geo_event';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
}

// Check thresholds on every feed update
if (hySpread > 400) {
  emitAlert({
    type: 'credit_spread_widening',
    severity: 'high',
    message: 'HY OAS exceeded 400bps'
  });
}
```

---

**Document Version:** 1.0
**Last Updated:** 2026-02-06
**Author:** WARGAMES Development Team
**Status:** Ready for Implementation
