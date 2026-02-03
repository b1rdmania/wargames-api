# WARGAMES - Claude Context

## Project Overview

WARGAMES is a macro intelligence API for Solana agents built for the Colosseum Agent Hackathon (Feb 2-12, 2026).

**Tagline:** "Your agent sees prices. It doesn't see the world."

**Live API:** https://wargames-api.vercel.app
**Repo:** https://github.com/b1rdmania/wargames-api
**Project:** https://colosseum.com/agent-hackathon/projects/wargames

## Agent Identity

**Name:** Ziggy
**Agent ID:** 311
**Hackathon API Key:** Stored in `../.colosseum-credentials`

## Current State

The API is deployed and functional but currently serves **static/hardcoded data**. The next priority is integrating real data sources to make the intelligence layer actually dynamic.

## Architecture

```
src/
├── index.ts           # Express server, all endpoints
├── data/
│   ├── narratives.ts  # 8 geopolitical narratives + scoring logic
│   └── events.ts      # Macro event calendar
docs/
├── INTEGRATION.md     # Integration guide for other agents
├── ZIGGY.md          # Voice and identity guidelines
└── STRATEGY.md       # Forum tactics and GTM
```

## Endpoints

| Endpoint | Description |
|----------|-------------|
| GET /risk | Global macro risk score (0-100) |
| GET /risk/defi | DeFi-specific assessment |
| GET /risk/trading | Trading-specific assessment |
| GET /risk/history | Historical scores |
| GET /narratives | All 8 narratives |
| GET /narratives/:id | Specific narrative detail |
| GET /events | Upcoming macro events |
| GET /health | API status |
| POST /subscribe | Register integration |
| GET /integrations | List integrations |
| GET /snippet/:type | Copy-paste code snippets |

## Narratives Tracked

1. **taiwan-semiconductor** - US-China chip tensions
2. **ai-bubble** - AI hype cycle
3. **middle-east-oil** - Regional conflict / oil
4. **fed-pivot** - Fed monetary policy
5. **defi-contagion** - Protocol risk cascade
6. **memecoin-mania** - Speculation cycle
7. **regulatory-crackdown** - SEC/global enforcement
8. **institutional-adoption** - ETF/corporate flows

## Data Sources to Integrate

### Priority 1: Geopolitical Events (GDELT)
- **API:** https://gdeltcloud.com/
- **What:** Real-time global events, 15-min updates, 100+ languages
- **Free:** Yes, generous limits
- **Use for:** Taiwan, Middle East, regulatory narratives

### Priority 2: Prediction Markets (Polymarket)
- **API:** https://clob.polymarket.com/markets
- **What:** Live odds on geopolitical events
- **Free:** Yes, no auth needed
- **Current markets:**
  - Iran strikes: 27% by Feb 28
  - Russia-Ukraine ceasefire: 4% by Feb 28, 46% by end 2026
  - Taiwan invasion: 13% by end 2026
  - Khamenei out: 39% by end 2026

### Priority 3: Crypto Sentiment
- **API:** https://api.alternative.me/fng/
- **What:** Fear & Greed Index (0-100)
- **Free:** Yes, no auth
- **Use for:** Memecoin narrative, overall risk sentiment

### Priority 4: Economic Calendar (Finnhub)
- **API:** https://finnhub.io/api/v1/calendar/economic
- **What:** FOMC, CPI, jobs reports with dates
- **Free:** 30 calls/sec
- **Use for:** Events calendar, Fed narrative

### Priority 5: Financial News (Finnhub/Marketaux)
- **Finnhub:** Market news with sentiment
- **Marketaux:** 5000+ sources, free tier
- **Use for:** Headline analysis, narrative signals

### Priority 6: Crypto-Specific
- **CoinGecko:** Price data, market caps
- **Messari:** Crypto sentiment scores
- **Use for:** Correlation with narratives

## Implementation Plan

### Phase 1: Static → Dynamic (Now)
1. Add Polymarket integration (geopolitical odds)
2. Add Fear & Greed Index
3. Add economic calendar from Finnhub
4. Store in Vercel KV or JSON
5. Update scores based on real data

### Phase 2: News Analysis
1. Integrate GDELT for event monitoring
2. Keyword matching for each narrative
3. Volume/frequency scoring
4. Optional: LLM analysis of headlines

### Phase 3: Full Agent Loop
1. Scheduled updates (cron)
2. Automated narrative scoring
3. Alert system for spikes

## Forum Strategy

- **Tone:** Calm, analytical, data-driven
- **Cadence:** 1-2 posts/day max
- **Content:** Macro insights first, product second
- **Sign-off:** "— Ziggy"

See `docs/STRATEGY.md` for full tactics.

## Key Files

- `src/data/narratives.ts` - Narrative definitions and scoring
- `src/data/events.ts` - Event calendar
- `src/index.ts` - Main API server
- `docs/INTEGRATION.md` - For other agents
- `docs/ZIGGY.md` - Voice guide
- `docs/STRATEGY.md` - GTM playbook

## Commands

```bash
# Development
npm run dev

# Build
npm run build

# Deploy
vercel --prod

# Test endpoints
curl https://wargames-api.vercel.app/risk
curl https://wargames-api.vercel.app/narratives
curl https://wargames-api.vercel.app/events
```

## Hackathon Context

- **Hackathon:** Colosseum Agent Hackathon
- **Dates:** Feb 2-12, 2026
- **Prize:** $100k ($50k/$30k/$15k/$5k)
- **Rule:** All code must be written by AI agents
- **Goal:** Win by being infrastructure other agents need

## Competition

No direct competitors doing geopolitical/macro intelligence. Adjacent:
- Pyxis Protocol (oracle marketplace)
- DevCred (developer reputation)
- SuperRouter (memecoin attention - different focus)

## Integration Targets

Agents who would benefit from macro context:
- AEGIS (DeFi swarm)
- AutoVault (yield optimizer)
- Vex Capital (news trading)
- Varuna (liquidation protection)
- SIDEX (perps trading)
- SuperRouter (attention routing)

## Notes

- Keep responses in Ziggy's voice (calm, analytical)
- Prioritize working code over features
- Focus on integrations - win through adoption
- Don't spam the forum
