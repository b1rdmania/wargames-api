# WARGAMES - Claude Context

**Last Updated:** 2026-02-06 02:00 UTC
**Status:** SUBMITTED | Production API live | Post-hackathon development phase

## Project Overview

WARGAMES is a **macro intelligence API for Solana agents**.

**Tagline:** "Your agent sees prices. It doesn't see the world."

**Live API:** https://wargames-api.fly.dev
**Repo:** https://github.com/b1rdmania/wargames-api
**Project:** https://colosseum.com/agent-hackathon/projects/wargames

## Agent Identity

**Name:** Ziggy
**Agent ID:** 311
**API Key:** Stored in `../.colosseum-credentials`
**Colosseum API:** `https://agents.colosseum.com/api`

## Current State

**Production Systems:**
- **Status:** Submitted to hackathon, fully operational
- **API:** 43+ endpoints live at https://wargames-api.fly.dev
- **Uptime:** 99.9%
- **Response Time:** ~100ms
- **SDK:** Published to npm (`npm install @wargames/sdk`)

**Solana Integrations (8):**
- Pyth Network - 50+ on-chain price feeds
- Drift Protocol - Perps funding rates, open interest
- Kamino Finance - Lending rates, utilization
- Meteora - DEX liquidity, volume
- MarginFi - Lending yields
- Jupiter DEX - Aggregator routing
- DefiLlama - Solana TVL tracking
- Solana RPC - Network health metrics

**Key Endpoints:**
- `GET /live/risk` - Global risk score (0-100) with drivers
- `GET /oracle/risk/trading` - Strategy-specific risk (perps, spot, leverage, yield)
- `GET /narratives` - 8 geopolitical narratives with scores
- `POST /oracle/agent-integrity` - Agent security + macro risk combined
- `GET /predictions/cross-check` - Cross-validate risk vs Polymarket
- Full list: https://wargames-api.fly.dev

**Dashboards:**
- Main: https://wargames-api.fly.dev/dashboard/v2
- Analytics: https://wargames-api.fly.dev/dashboard/analytics
- Predictions: https://wargames-api.fly.dev/dashboard/predictions
- Integration Proof: https://wargames-api.fly.dev/integrations/proof
- Agent Oracle: https://wargames-api.fly.dev/oracle/agents
- Pitch Deck: https://wargames-api.fly.dev/pitch.html

## Documentation

**Essential Reading:**
- **CLAUDE.md** (this file) - Current state and context
- **design.md** - NORAD design system for all UI
- **SKILLS.md** - Comprehensive integration guide (900+ lines)
- **API_REFERENCE.md** - Complete endpoint documentation

**Technical Details:**
- **DATA_SOURCES.md** - Integration implementation details
- **ZIGGY.md** - Voice and communication guidelines

## Architecture

```
src/
├── index.ts                      # Main Express server, all endpoints
├── services/
│   ├── dataFetchers.ts           # Live data from 10+ APIs with caching
│   └── pythIntegration.ts        # Pyth Network Solana oracle
├── new-oracle-endpoints.ts       # Agent integrity, trading risk, cross-check
├── data/
│   ├── narratives.ts             # 8 geopolitical narratives
│   └── events.ts                 # Macro event calendar
└── dashboards/                   # HTML dashboard generators

Root:
├── pitch.html                    # Judge-optimized pitch deck
├── design.md                     # Canonical design system
└── packages/sdk/                 # NPM package source
```

## Risk Scoring Algorithm

**Formula:** `score = (sentiment × 0.3) + (geopolitical × 0.3) + (economic × 0.2) + (crypto × 0.2)`

**Components:**
- **Sentiment (30%)** - Fear & Greed Index (inverted)
- **Geopolitical (30%)** - Polymarket odds + world tensions
- **Economic (20%)** - Inflation, Fed policy uncertainty
- **Crypto Volatility (20%)** - Top 10 coins 24h volatility

**Output:** 0-100 score + bias (risk-off/neutral/risk-on) + drivers + narratives

## Integration Status

**Live Integrations:**
- AgentDEX - Risk-aware DEX routing (shipped in 35min)
- Solder-Cortex - DeFi + predictions + macro (in progress)
- kai/SAID - Identity verification (in progress)
- Mistah - TradFi + crypto macro oracle (PR ready)

**Forum Engagement:**
- 90+ strategic comments posted
- 8 forum posts (including critique request #1664)
- Active discussion on integration opportunities

## Next Steps (Post-Hackathon)

**Primary Focus: API Quality & Quantity**

User will integrate WARGAMES into other projects. Priorities:

1. **Improve Existing Endpoints**
   - Add more granular data
   - Improve response times
   - Better error handling
   - Add request validation

2. **Build New Endpoints**
   - Based on actual usage patterns
   - User-requested features
   - Integration-driven development

3. **Data Quality**
   - More Solana protocol integrations
   - Better signal processing
   - Real-time data improvements
   - Validation against external sources

4. **Developer Experience**
   - Better documentation
   - More code examples
   - Improved SDK functionality
   - Clear error messages

**Not Focusing On:**
- Hackathon competition (submitted, judging in progress)
- Forum vote gathering (done)
- Marketing/promotion (focus on building)

## Commands

```bash
# Development
npm run dev

# Build
npm run build

# Deploy to production
flyctl deploy

# Test endpoints
curl https://wargames-api.fly.dev/live/risk
curl https://wargames-api.fly.dev/narratives

# Test with SDK
npm install @wargames/sdk
```

## Data Sources

All free tier, no authentication:
- Fear & Greed Index - Crypto sentiment
- Polymarket - Geopolitical prediction markets (24 markets)
- CoinGecko - Top crypto prices + volatility
- Pyth Network - On-chain Solana price feeds (50+)
- Drift Protocol - Perps data ($364M TVL)
- Kamino Finance - Lending data ($2.06B TVL)
- Meteora - DEX data ($501M TVL)
- MarginFi - Lending data ($88M TVL)
- Jupiter - DEX aggregator data
- DefiLlama - Solana DeFi TVL (15+ protocols)
- Solana RPC - Network metrics
- Open-Meteo - Weather for conflict zones
- Metals.live - Commodity prices

All data cached with appropriate TTLs (5-60 minutes).

## Important Notes

- **Never commit credentials** to git
- All responses in Ziggy's voice: calm, analytical, code-first
- **Forum posts:** Use plain text (no markdown - forum doesn't render it)
- Rate limits: Forum API allows 30 posts/comments/hour, 120 votes/hour
- Design system: See design.md for all UI decisions
- Integration guide: SKILLS.md is the canonical external documentation

## Quick Reference Links

- **Production API:** https://wargames-api.fly.dev
- **Main Dashboard:** https://wargames-api.fly.dev/dashboard/v2
- **GitHub:** https://github.com/b1rdmania/wargames-api
- **NPM Package:** https://www.npmjs.com/package/@wargames/sdk
- **Hackathon Project:** https://colosseum.com/agent-hackathon/projects/wargames
- **Forum:** https://colosseum.com/agent-hackathon/forum
