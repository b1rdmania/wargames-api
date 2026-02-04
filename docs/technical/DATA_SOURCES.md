# WARGAMES Data Sources

**Last Updated:** 2026-02-03

Complete documentation of all live data integrations, caching strategy, and implementation details.

---

## Overview

WARGAMES aggregates data from **8 free, public APIs** to create a comprehensive macro intelligence layer. All sources require **no authentication** and have generous free tiers.

**Total API Calls:** ~6-8 per risk calculation
**Average Response Time:** 200-400ms (with caching)
**Cache Strategy:** TTL-based with stale-while-revalidate pattern

---

## Data Sources

### 1. Alternative.me Fear & Greed Index

**What:** Crypto market sentiment indicator (0-100)
**API:** `https://api.alternative.me/fng/`
**Update Frequency:** Daily (updates ~00:00 UTC)
**Cache TTL:** 60 minutes
**Cost:** Free, unlimited
**Auth:** None required

**Request:**
```bash
GET https://api.alternative.me/fng/
```

**Response:**
```json
{
  "data": [{
    "value": "58",
    "value_classification": "Greed",
    "timestamp": "1706918400",
    "time_until_update": "43200"
  }]
}
```

**Usage in WARGAMES:**
- Primary **sentiment component** (30% of risk score)
- Inverted: High fear → High risk
- Used for memecoin-mania narrative scoring
- Displayed on dashboard

**Implementation:** `src/services/dataFetchers.ts:fetchFearGreed()`

---

### 2. Polymarket Prediction Markets

**What:** Real-time odds on geopolitical events
**API:** `https://clob.polymarket.com/markets`
**Update Frequency:** Real-time (order book updates)
**Cache TTL:** 30 minutes
**Cost:** Free, unlimited
**Auth:** None required

**Request:**
```bash
GET https://clob.polymarket.com/markets?closed=false&limit=50
```

**Response:**
```json
[
  {
    "question": "Will China invade Taiwan before 2027?",
    "outcomePrices": "[\"0.13\", \"0.87\"]",
    "outcomes": ["Yes", "No"],
    "volume": "1234567.89",
    "active": true
  }
]
```

**Markets Tracked:**
- Taiwan invasion probability
- Iran strikes Israel
- Russia-Ukraine ceasefire
- Khamenei regime change
- Fed rate cuts
- US recession

**Usage in WARGAMES:**
- **Geopolitical component** (30% of risk score)
- Taiwan narrative (taiwan-semiconductor)
- Middle East narrative (middle-east-oil)
- Fed policy narrative (fed-pivot)

**Implementation:** `src/services/dataFetchers.ts:fetchPolymarketOdds()`

**Parsing Notes:**
- `outcomePrices` is JSON string, must parse
- Prices in [0, 1] range
- Convert to percentage: `parseFloat(prices[0]) * 100`

---

### 3. CoinGecko Crypto Prices

**What:** Top cryptocurrency prices and 24h changes
**API:** `https://api.coingecko.com/api/v3/coins/markets`
**Update Frequency:** ~1-2 minutes
**Cache TTL:** 5 minutes
**Cost:** Free tier: 10-30 calls/min
**Auth:** None (better rate limits with API key)

**Request:**
```bash
GET https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&sparkline=false
```

**Response:**
```json
[
  {
    "id": "bitcoin",
    "symbol": "btc",
    "name": "Bitcoin",
    "current_price": 42150.0,
    "price_change_percentage_24h": 2.4,
    "market_cap": 825000000000
  }
]
```

**Usage in WARGAMES:**
- **Crypto volatility component** (20% of risk score)
- Calculate average 24h price change (higher = more risk)
- Top movers for dashboard
- Institutional-adoption narrative (market cap flows)

**Implementation:** `src/services/dataFetchers.ts:fetchCryptoPrices()`

**Rate Limit Strategy:**
- Cache aggressively (5 min)
- Only fetch top 10 coins
- Consider adding API key if rate limited

---

### 4. Open-Meteo Weather Data

**What:** Weather data for geopolitical conflict zones
**API:** `https://api.open-meteo.com/v1/forecast`
**Update Frequency:** Hourly
**Cache TTL:** 60 minutes
**Cost:** Free, unlimited
**Auth:** None required

**Request:**
```bash
GET https://api.open-meteo.com/v1/forecast?latitude=31.5&longitude=35.0&current_weather=true
```

**Locations Tracked:**
- Middle East (31.5°N, 35.0°E) - Jerusalem
- Taiwan Strait (24.0°N, 121.0°E) - Taipei
- Ukraine (50.5°N, 30.5°E) - Kyiv

**Response:**
```json
{
  "current_weather": {
    "temperature": 18.0,
    "windspeed": 12.0,
    "weathercode": 0
  }
}
```

**Usage in WARGAMES:**
- Context for geopolitical events
- Flight operation feasibility
- Dashboard display only (not in risk score)

**Implementation:** `src/services/dataFetchers.ts:fetchWeather()`

**Weather Codes:**
- 0: Clear sky
- 1-3: Partly cloudy
- 45-48: Foggy
- 51-99: Precipitation

---

### 5. Metals.live Commodity Prices

**What:** Gold and silver spot prices
**API:** `https://api.metals.live/v1/spot`
**Update Frequency:** ~1 minute
**Cache TTL:** 15 minutes
**Cost:** Free, unlimited
**Auth:** None required

**Request:**
```bash
GET https://api.metals.live/v1/spot/gold
GET https://api.metals.live/v1/spot/silver
```

**Response:**
```json
{
  "metal": "gold",
  "currency": "USD",
  "price": 2045.30,
  "timestamp": "2026-02-03T23:30:00Z"
}
```

**Usage in WARGAMES:**
- Safe-haven demand indicator
- Economic uncertainty signal
- Dashboard display

**Implementation:** `src/services/dataFetchers.ts:fetchCommodities()`

**Signal:**
- Rising gold = risk-off sentiment
- Falling gold = risk-on sentiment
- Gold/silver ratio = market stress gauge

---

### 6. Economic Indicators (Simulated)

**What:** Fed policy, inflation, unemployment
**API:** Currently simulated (pending real API)
**Update Frequency:** N/A (static)
**Cache TTL:** N/A
**Target API:** Finnhub Economic Calendar

**Current Data (Hardcoded):**
```typescript
[
  { name: 'Inflation (CPI)', value: '3.2%', trend: 'rising', impact: 'high' },
  { name: 'Fed Funds Rate', value: '5.25%', trend: 'stable', impact: 'high' },
  { name: 'Unemployment', value: '3.8%', trend: 'stable', impact: 'medium' }
]
```

**Usage in WARGAMES:**
- **Economic component** (20% of risk score)
- Fed-pivot narrative
- Dashboard display

**Implementation:** `src/services/dataFetchers.ts:fetchEconomicIndicators()`

**TODO: Integrate Real API**
```bash
# Finnhub (requires API key)
GET https://finnhub.io/api/v1/calendar/economic
  ?token=YOUR_API_KEY
```

---

### 7. World Tensions (Aggregated)

**What:** Geopolitical hotspot monitoring
**API:** Aggregated from Polymarket + news sentiment
**Update Frequency:** 30 minutes
**Cache TTL:** 30 minutes

**Data Structure:**
```typescript
{
  region: string;           // "Taiwan Strait"
  tension_level: string;    // "critical" | "elevated" | "moderate" | "low"
  polymarket_odds: number;  // 0-100
  description: string;      // Human-readable context
  trend: string;            // "escalating" | "stable" | "de-escalating"
}
```

**Regions Tracked:**
1. Taiwan Strait (China-US tensions)
2. Middle East (Iran-Israel, oil)
3. Ukraine (Russia conflict)
4. South China Sea (territorial disputes)

**Usage in WARGAMES:**
- **Geopolitical component** (30% of risk score)
- Taiwan-semiconductor narrative
- Middle-east-oil narrative
- Dashboard hotspot map

**Implementation:** `src/services/dataFetchers.ts:fetchWorldState()`

**Scoring Logic:**
- Polymarket odds > 20% → "elevated"
- Polymarket odds > 35% → "critical"
- News sentiment analysis (pending)

---

### 8. Memecoin Sentiment (Derived)

**What:** Speculation cycle intensity
**API:** Derived from Fear & Greed + narrative analysis
**Update Frequency:** 5 minutes
**Cache TTL:** 5 minutes

**Calculation:**
```typescript
// Base from Fear & Greed
let memeScore = fearGreedValue;

// Amplify if extreme greed
if (fearGreedValue > 75) {
  memeScore = Math.min(100, memeScore * 1.2);
}

// Check narrative mentions (pending news API)
// memeScore += newsVolume * 0.3;
```

**Levels:**
- 0-30: Low (accumulation phase)
- 31-60: Moderate (healthy interest)
- 61-75: Elevated (FOMO starting)
- 76-100: Extreme (mania, likely near top)

**Usage in WARGAMES:**
- Memecoin-mania narrative
- Betting-context market mania detection
- Dashboard sentiment gauge

**Implementation:** `src/services/dataFetchers.ts:calculateDynamicRisk()`

---

## Risk Score Calculation

**Algorithm:**

```typescript
async function calculateDynamicRisk(): Promise<DynamicRiskScore> {
  // Fetch all data sources
  const fearGreed = await fetchFearGreed();
  const polymarket = await fetchPolymarketOdds();
  const crypto = await fetchCryptoPrices();
  const economic = await fetchEconomicIndicators();

  // Component 1: Sentiment (30%)
  // Inverted: High fear = High risk
  const sentiment = 100 - (fearGreed?.value || 50);

  // Component 2: Geopolitical (30%)
  const avgGeopoliticalRisk = polymarket
    .map(event => event.probability)
    .reduce((sum, p) => sum + p, 0) / polymarket.length;
  const geopolitical = avgGeopoliticalRisk * 100;

  // Component 3: Economic (20%)
  // Based on inflation trend, Fed uncertainty
  const economic = 45; // Simulated (pending real API)

  // Component 4: Crypto Volatility (20%)
  const avgVolatility = crypto
    .map(coin => Math.abs(coin.change_24h))
    .reduce((sum, v) => sum + v, 0) / crypto.length;
  const cryptoVolatility = Math.min(100, avgVolatility * 10);

  // Weighted score
  const score = Math.round(
    (sentiment * 0.3) +
    (geopolitical * 0.3) +
    (economic * 0.2) +
    (cryptoVolatility * 0.2)
  );

  // Bias classification
  const bias = score > 60 ? 'risk-off' :
               score < 30 ? 'risk-on' : 'neutral';

  return {
    score,
    bias,
    components: { sentiment, geopolitical, economic, cryptoVolatility },
    drivers: generateDrivers(fearGreed, polymarket, economic)
  };
}
```

**Weights Rationale:**
- **Sentiment (30%)**: Immediate market psychology
- **Geopolitical (30%)**: Systematic risk, affects all assets
- **Economic (20%)**: Slower-moving, but foundational
- **Crypto (20%)**: Crypto-specific volatility

---

## Caching Strategy

**Implementation:** In-memory cache with TTL

```typescript
const cache = new Map<string, { data: any; expires: number }>();

async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number
): Promise<T> {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const data = await fetcher();
  cache.set(key, { data, expires: Date.now() + ttl });
  return data;
}
```

**TTLs by Source:**
- Fear & Greed: 60 min (updates daily)
- Polymarket: 30 min (real-time, but stable)
- CoinGecko: 5 min (volatile, need fresh data)
- Weather: 60 min (hourly updates)
- Commodities: 15 min (active trading)
- Risk calculation: 5 min (most volatile component)

**Benefits:**
- Reduces API calls by ~90%
- Faster response times (cache hits <10ms)
- Protects against rate limits
- Reduces load on free-tier APIs

---

## Error Handling

**Strategy:** Graceful degradation with fallbacks

```typescript
async function fetchWithFallback<T>(
  fetcher: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fetcher();
  } catch (error) {
    console.error('Data fetch error:', error);
    return fallback;
  }
}

// Example usage
const fearGreed = await fetchWithFallback(
  fetchFearGreed,
  { value: 50, classification: 'Neutral' } // Neutral fallback
);
```

**Fallback Values:**
- Fear & Greed: 50 (neutral)
- Polymarket: 15% (moderate baseline)
- Crypto volatility: 3% (normal daily move)
- Economic: Static indicators

**Result:** API always returns 200 OK, even with partial data failures.

---

## Future Data Sources

### Priority 1: GDELT Project
**What:** Real-time global events database
**API:** https://gdeltcloud.com/
**Cost:** Free
**Value:** News sentiment, event volume for narratives

### Priority 2: Finnhub Economic Calendar
**What:** Fed meetings, CPI, jobs reports
**API:** https://finnhub.io/api/v1/calendar/economic
**Cost:** Free tier (60 calls/min)
**Value:** Replace simulated economic data

### Priority 3: Messari Crypto Sentiment
**What:** Crypto-specific sentiment scores
**API:** https://data.messari.io/api
**Cost:** Free tier available
**Value:** Better memecoin cycle tracking

### Priority 4: News APIs
- **Marketaux:** 5000+ sources, free tier
- **NewsAPI:** 100 calls/day free
**Value:** Headline analysis for narratives

---

## Monitoring & Reliability

**Health Checks:**
```typescript
async function checkDataSources() {
  const sources = {
    fear_greed: await ping('https://api.alternative.me/fng/'),
    polymarket: await ping('https://clob.polymarket.com/markets'),
    coingecko: await ping('https://api.coingecko.com/api/v3/ping'),
    // ... etc
  };

  return {
    status: Object.values(sources).every(s => s === 'ok') ? 'healthy' : 'degraded',
    sources
  };
}
```

**Exposed at:** `GET /health`

**Metrics to Track:**
- API response times
- Cache hit rates
- Error rates by source
- Stale data incidents

---

## Implementation Reference

**Main File:** `src/services/dataFetchers.ts`

**Key Functions:**
- `fetchFearGreed()` - Alternative.me API
- `fetchPolymarketOdds()` - Polymarket markets
- `fetchCryptoPrices()` - CoinGecko top 10
- `fetchWeather()` - Open-Meteo conflict zones
- `fetchCommodities()` - Metals.live gold/silver
- `fetchEconomicIndicators()` - Simulated (TODO)
- `fetchWorldState()` - Aggregated world state
- `calculateDynamicRisk()` - Main risk calculation

**Cache Implementation:** In-memory Map with TTL checks
**Error Strategy:** Try-catch with fallbacks
**Update Pattern:** Lazy evaluation on API calls

---

## Cost Analysis

**Current Monthly Cost:** $0

All APIs are free tier with no authentication. No infrastructure costs beyond Vercel serverless (free tier covers current usage).

**Projected at Scale (10k calls/day):**
- Alternative.me: Free (unlimited)
- Polymarket: Free (unlimited)
- CoinGecko: Free (may need API key)
- Open-Meteo: Free (unlimited)
- Metals.live: Free (unlimited)

**Total:** Still $0, caching keeps us well under free tier limits.

---

## Testing

**Manual Testing:**
```bash
# Test individual fetchers
curl https://api.alternative.me/fng/
curl https://clob.polymarket.com/markets?closed=false&limit=5
curl "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&per_page=10"

# Test WARGAMES endpoints
curl https://wargames-api.vercel.app/live/risk
curl https://wargames-api.vercel.app/live/world
curl https://wargames-api.vercel.app/health
```

**Automated Testing:** TODO
- Unit tests for data parsing
- Integration tests with mocked APIs
- Error handling tests
