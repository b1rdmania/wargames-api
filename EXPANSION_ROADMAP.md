# WARGAMES Expansion Roadmap

**Goal:** Become the ONE API agents use for ALL macro/data needs

**Current State:** 85% real data, missing Solana-specific sources
**Target State:** 95% real data, comprehensive Solana + macro coverage

---

## This Week (Feb 4-7): Solana Native + Dynamic Narratives

### 1. Pyth Network Integration (Day 2) - CRITICAL

**Why:** Solana-native oracle, every Solana agent expects Pyth data
**API:** Hermes API - https://hermes.pyth.network/docs/
**Free:** Yes, no rate limits for read-only
**Endpoint:** `GET /live/pyth`

**Implementation:**
```typescript
// src/services/pythIntegration.ts
export async function fetchPythPrices() {
  const priceIds = [
    '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43', // BTC/USD
    '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace', // ETH/USD
    '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d'  // SOL/USD
  ];

  const response = await fetch(
    `https://hermes.pyth.network/api/latest_price_feeds?ids[]=${priceIds.join('&ids[]=')}`
  );

  const data = await response.json();

  return data.map(feed => ({
    symbol: feed.id,
    price: parseFloat(feed.price.price) * Math.pow(10, feed.price.expo),
    confidence: parseFloat(feed.price.conf) * Math.pow(10, feed.price.expo),
    publish_time: feed.price.publish_time
  }));
}
```

**Response Format:**
```json
{
  "endpoint": "/live/pyth",
  "prices": [
    {
      "symbol": "SOL/USD",
      "price": 97.43,
      "confidence": 0.05,
      "publish_time": 1706918400,
      "source": "on-chain"
    },
    {
      "symbol": "BTC/USD",
      "price": 75478,
      "confidence": 2.1,
      "publish_time": 1706918401
    }
  ],
  "network": "solana",
  "updated": "2026-02-04T..."
}
```

**Value for Agents:**
- On-chain price data (more trusted than CEX prices)
- Confidence intervals (risk assessment)
- Solana-native (low latency)

---

### 2. DefiLlama Integration (Day 3) - HIGH PRIORITY

**Why:** Every DeFi agent needs TVL and protocol health data
**API:** https://api.llama.fi/
**Free:** Yes, generous rate limits
**Endpoint:** `GET /live/defi`

**Implementation:**
```typescript
// src/services/defillamaIntegration.ts
export async function fetchSolanaDeFi() {
  // Get Solana chain TVL
  const chainResponse = await fetch('https://api.llama.fi/v2/chains');
  const chains = await chainResponse.json();
  const solana = chains.find(c => c.name === 'Solana');

  // Get Solana protocols
  const protocolsResponse = await fetch('https://api.llama.fi/protocols');
  const allProtocols = await protocolsResponse.json();
  const solanaProtocols = allProtocols
    .filter(p => p.chains?.includes('Solana'))
    .sort((a, b) => b.tvl - a.tvl)
    .slice(0, 10); // Top 10

  return {
    chain_tvl: solana.tvl,
    total_protocols: solanaProtocols.length,
    protocols: solanaProtocols.map(p => ({
      name: p.name,
      tvl: p.tvl,
      change_24h: p.change_24h,
      category: p.category,
      url: p.url
    }))
  };
}
```

**Response Format:**
```json
{
  "endpoint": "/live/defi",
  "chain": "Solana",
  "total_tvl": 1200000000,
  "change_24h": -2.3,
  "protocols": [
    {
      "name": "Kamino",
      "tvl": 450000000,
      "change_24h": 2.3,
      "category": "Lending",
      "risk_score": 35
    },
    {
      "name": "MarginFi",
      "tvl": 380000000,
      "change_24h": -1.2,
      "category": "Lending",
      "risk_score": 28
    },
    {
      "name": "Drift Protocol",
      "tvl": 220000000,
      "change_24h": 0.8,
      "category": "Derivatives"
    }
  ],
  "updated": "2026-02-04T..."
}
```

**Value for Agents:**
- Protocol health monitoring
- TVL-based risk assessment
- Sector rotation signals (Lending up, DEXes down)

---

### 3. Solana Beach / RPC Network Metrics (Day 4) - MEDIUM

**Why:** Solana-specific blockchain health
**API:** Solana RPC or Solana Beach API
**Free:** Public RPC nodes available
**Endpoint:** `GET /live/solana`

**Implementation:**
```typescript
// src/services/solanaMetrics.ts
export async function fetchSolanaMetrics() {
  const rpcUrl = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

  const [perfSamples, voteAccounts, epochInfo] = await Promise.all([
    fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getRecentPerformanceSamples',
        params: [1]
      })
    }).then(r => r.json()),
    fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'getVoteAccounts'
      })
    }).then(r => r.json()),
    fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'getEpochInfo'
      })
    }).then(r => r.json())
  ]);

  const perfData = perfSamples.result[0];
  const tps = perfData.numTransactions / perfData.samplePeriodSecs;

  return {
    tps: Math.round(tps),
    validators: voteAccounts.result.current.length,
    epoch: epochInfo.result.epoch,
    slot: epochInfo.result.absoluteSlot,
    health: tps > 2000 ? 'healthy' : tps > 1000 ? 'degraded' : 'congested'
  };
}
```

**Response Format:**
```json
{
  "endpoint": "/live/solana",
  "network": "mainnet-beta",
  "tps": 3847,
  "validators": 1842,
  "epoch": 542,
  "slot": 234567890,
  "health": "healthy",
  "updated": "2026-02-04T..."
}
```

**Value for Agents:**
- Network congestion awareness
- Transaction success probability
- Validator decentralization metrics

---

### 4. Dynamic Narrative Scoring (Day 5) - CRITICAL FIX

**Why:** Static scores hurt trust
**Method:** Calculate from real data sources
**Endpoint:** Update `/narratives`

**Implementation:**
```typescript
// src/services/narrativeScoring.ts
export async function calculateNarrativeScores() {
  const [fearGreed, polymarket, crypto] = await Promise.all([
    fetchFearGreed(),
    fetchPolymarketOdds(),
    fetchCryptoPrices()
  ]);

  // Memecoin Mania = f(Fear & Greed, SOL volatility, social signals)
  const solData = crypto.find(c => c.id === 'solana');
  const solVolatility = Math.abs(solData.price_change_percentage_24h);

  const memecoinMania = Math.min(100, Math.round(
    (fearGreed.value * 0.4) +              // Greed = mania
    (solVolatility * 5 * 0.3) +            // High vol = activity
    (50 * 0.3)                              // Base social (TODO: real data)
  ));

  // Taiwan Semiconductor = Polymarket odds
  const taiwanEvent = polymarket.find(e => e.question.includes('Taiwan'));
  const taiwanScore = taiwanEvent ? taiwanEvent.probability * 100 : 50;

  // Fed Pivot = f(Polymarket Fed odds, economic indicators)
  const fedEvent = polymarket.find(e => e.question.includes('Fed') || e.question.includes('rate cut'));
  const fedScore = fedEvent ? fedEvent.probability * 100 : 45;

  // AI Bubble = f(tech stock vol, AI token performance)
  const aiScore = 55; // TODO: Add tech stock data

  return {
    'memecoin-mania': { score: memecoinMania, trend: detectTrend(memecoinMania) },
    'taiwan-semiconductor': { score: Math.round(taiwanScore), trend: detectTrend(taiwanScore) },
    'fed-pivot': { score: Math.round(fedScore), trend: detectTrend(fedScore) },
    'ai-bubble': { score: aiScore, trend: 'stable' }
    // ... other narratives
  };
}

function detectTrend(currentScore: number): 'rising' | 'falling' | 'stable' {
  // TODO: Compare to historical scores
  // For now, use simple heuristic
  return currentScore > 65 ? 'rising' : currentScore < 35 ? 'falling' : 'stable';
}
```

**Value:**
- Trust (scores change with market)
- Accuracy (based on real data)
- Actionability (agents can trade narratives)

---

## Next Week (Feb 8-12): Advanced Features

### 5. Birdeye API (Solana Token Analytics)

**Why:** Comprehensive Solana token data
**API:** https://docs.birdeye.so/
**Requires:** API key (free tier available)
**Endpoint:** `GET /live/tokens`

**Data:** Token prices, volume, top gainers/losers, trending tokens

### 6. Real Economic Calendar

**Why:** Fix hardcoded events
**API:** TradingEconomics or Finnhub
**Requires:** API key
**Endpoint:** Update `/events`

**Data:** Real FOMC/CPI/Jobs dates, consensus estimates, actual results

### 7. Dune Analytics Integration

**Why:** Deep on-chain metrics
**API:** https://dune.com/docs/api/
**Requires:** API key (free tier)
**Endpoint:** `GET /live/onchain`

**Data:** Solana DEX volume, wallet activity, protocol usage, staking metrics

---

## Technical Implementation Plan

### Day 2 (Today): Pyth
- [x] Research Pyth API
- [ ] Create src/services/pythIntegration.ts
- [ ] Add /live/pyth endpoint to index.ts
- [ ] Test with real data
- [ ] Update API_REFERENCE.md
- [ ] Deploy to Vercel
- [ ] Announce in forum

### Day 3: DefiLlama
- [ ] Create src/services/defillamaIntegration.ts
- [ ] Add /live/defi endpoint
- [ ] Cache TVL data (15 min TTL)
- [ ] Test with Kamino, MarginFi, Drift
- [ ] Update docs
- [ ] Deploy

### Day 4: Solana Metrics
- [ ] Create src/services/solanaMetrics.ts
- [ ] Add /live/solana endpoint
- [ ] Test RPC calls
- [ ] Add health status logic
- [ ] Deploy

### Day 5: Dynamic Narratives
- [ ] Create src/services/narrativeScoring.ts
- [ ] Implement scoring functions
- [ ] Update /narratives endpoint
- [ ] Add historical tracking
- [ ] Deploy

### Day 6-7: Polish & Document
- [ ] Update all docs with new endpoints
- [ ] Add integration examples to SKILLS.md
- [ ] Create agent showcase (who's using what)
- [ ] Performance optimization
- [ ] Error handling improvements

---

## API Key Management

**Current:** No API keys needed (all public APIs)

**Future Needs:**
- Birdeye: Free tier (1000 calls/day)
- TradingEconomics: Paid ($30/mo)
- Dune: Free tier (3 executions/day)
- Finnhub: Free tier (60 calls/min)

**Storage:** Use Vercel environment variables
**Fallbacks:** If API key missing, return static data with warning

---

## Success Metrics

**Goal:** Be the ONE API agents use

**Metrics:**
1. API calls/day: Current 0 → Target 1000+ by Feb 12
2. Unique integrators: Current 0 → Target 10+ by Feb 12
3. Data coverage: Current 85% real → Target 95% real
4. Response time: Current 200ms → Target <150ms
5. Uptime: Current 99.9% → Target 99.99%

**Tracking:** /stats endpoint + daily logs

---

## Agent Value Proposition After Expansion

**Before (Current):**
- "Get macro risk score"
- 85% real data, some gaps
- Missing Solana-specific data

**After (Week 1 Complete):**
- "Get ALL data your agent needs"
- Macro risk (Fear & Greed, events, narratives)
- Solana-native (Pyth prices, network health)
- DeFi-specific (protocol TVLs, health)
- On-chain metrics (Solana Beach)
- 95% real data, comprehensive coverage

**Pitch:** "One API for prices, risk, DeFi, and Solana metrics. Free. Fast. Simple."

---

## Competitive Advantage

**vs. Pyth alone:** We add macro context
**vs. DefiLlama alone:** We add risk scoring
**vs. CoinGecko alone:** We add narratives + events
**vs. building yourself:** We aggregate 10+ sources, one call

**Moat:** Comprehensive data + macro intelligence + Solana-native

---

## Next Steps

**Tonight (Day 1 End):**
1. Commit API_TEST_RESULTS.md and EXPANSION_ROADMAP.md
2. Start Pyth integration research

**Tomorrow (Day 2):**
1. Implement Pyth integration
2. Deploy /live/pyth endpoint
3. Post Day 2 update: "Added Pyth Network integration"
4. Check for AgentBounty/ClaudeCraft responses

**This Week:**
1. Ship Pyth, DefiLlama, Solana metrics, dynamic narratives
2. Get first real integration confirmed
3. Reach 5 agent votes
4. Build momentum

**Goal:** By Feb 12, be the go-to data API for Solana agents.
