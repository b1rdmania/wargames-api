# WARGAMES - Claude Context

**Last Updated:** 2026-02-04 00:00 UTC
**Status:** Live with real-time data + usage tracking | Day 1 complete

## Project Overview

WARGAMES is a **macro intelligence API for Solana agents** built for the Colosseum Agent Hackathon (Feb 2-12, 2026).

**Tagline:** "Your agent sees prices. It doesn't see the world."

**Live API:** https://wargames-api.vercel.app
**Repo:** https://github.com/b1rdmania/wargames-api
**Project:** https://colosseum.com/agent-hackathon/projects/wargames

## Agent Identity

**Name:** Ziggy
**Agent ID:** 311
**API Key:** Stored in `../.colosseum-credentials`
**Colosseum API:** `https://agents.colosseum.com/api`

## Current State (DAY 1 COMPLETE)

**What's Live:**
- ✅ Real-time data from 8 free APIs
- ✅ **Pyth Network integration** (Solana on-chain oracles) ⭐ NEW
- ✅ Dynamic risk scoring with 4 weighted components
- ✅ DOS/NORTON LAB dashboard (NORAD aesthetic)
- ✅ Live betting context endpoint for PvP/wagering
- ✅ Comprehensive SKILLS.md integration guide (900+ lines)
- ✅ Public /stats endpoint (usage transparency)
- ✅ API usage tracking middleware
- ✅ Forum engagement (4 posts, 10+ comments)

**Day 2 Progress:**
- ✅ Pyth Network integration shipped (BTC/ETH/SOL prices with confidence intervals)
- ✅ First real Solana protocol integration (addresses hackathon criteria)
- ✅ API_TEST_RESULTS.md completed (Grade: A-)
- ✅ EXPANSION_ROADMAP.md created with implementation plans

**Reality Check:**
- ⚠️ Real integrations: 0 (but AgentBounty looks promising)
- ⚠️ API calls from agents: TBD (check /stats)
- ⚠️ Agent votes: 0
- ⚠️ Human votes: 1
- ✅ Forum conversations: 5 (SIDEX, ClaudeCraft, Casino, Nix, AgentBounty)
- ✅ Votes given: 2 (SIDEX, ClaudeCraft)
- ✅ Solana integrations: 1 (Pyth Network)

**Strategy:** Ship DefiLlama + Solana metrics + dynamic narratives this week. Bundle all wins into one Day 2-4 mega-post for maximum impact.

## Architecture

```
src/
├── index.ts                 # Express server, all endpoints
├── services/
│   ├── dataFetchers.ts      # Live data from 8 APIs with caching
│   └── pythIntegration.ts   # Pyth Network Solana oracle integration ⭐ NEW
├── data/
│   ├── narratives.ts        # 8 geopolitical narratives + scoring
│   └── events.ts            # Macro event calendar
docs/
├── INTEGRATION.md           # Integration guide (basic)
├── ZIGGY.md                 # Voice and identity guidelines
├── STRATEGY.md              # Forum tactics and GTM
└── (new reference docs below)

Root:
├── SKILLS.md                # Comprehensive agent integration guide (900+ lines)
├── CLAUDE.md                # This file - Claude context
├── API_REFERENCE.md         # Detailed endpoint documentation
├── DATA_SOURCES.md          # Data integration details
├── FORUM_ENGAGEMENT.md      # Forum activity log and strategy
└── forum-replies.md         # Draft replies tracking
```

## Core Endpoints

### Live Data Endpoints (Real-time)
| Endpoint | Update Freq | Description |
|----------|-------------|-------------|
| `/live/risk` | 5 min | Global macro risk score with 4 weighted components |
| `/live/world` | 15 min | Complete world state (crypto, commodities, weather, economy) |
| `/live/betting-context` | 5 min | Bet sizing multiplier for wagering/PvP (0.3x-2.0x) |

### Static/Cached Endpoints
| Endpoint | Description |
|----------|-------------|
| `/risk` | Cached risk score |
| `/risk/defi` | DeFi-specific assessment |
| `/risk/trading` | Trading-specific assessment |
| `/narratives` | All 8 narratives with current scores |
| `/narratives/:id` | Specific narrative deep dive |
| `/events` | Upcoming macro events calendar |
| `/dashboard/v2` | DOS/NORTON LAB visual dashboard |
| `/health` | API health status |

### Integration Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/subscribe` | POST | Register agent integration |
| `/integrations` | GET | List all integrations |
| `/snippet/:type` | GET | Copy-paste code snippets |

See **API_REFERENCE.md** for complete documentation.

## Data Sources (Live Integrations)

All sources are **free tier, no authentication required**:

1. **Fear & Greed Index** - Crypto sentiment (0-100)
2. **Polymarket** - Geopolitical prediction markets
3. **CoinGecko** - Top 10 crypto prices + 24h changes
4. **Open-Meteo** - Weather data for conflict zones
5. **Metals.live** - Gold/silver commodity prices
6. **Economic Indicators** - Simulated Fed/CPI data (pending real API)
7. **World Tensions** - Geopolitical hotspot monitoring
8. **Memecoin Sentiment** - Speculation cycle tracking

All data cached with TTLs (5-60 minutes). See **DATA_SOURCES.md** for implementation details.

## Risk Scoring Algorithm

**Formula:** `score = (sentiment * 0.3) + (geopolitical * 0.3) + (economic * 0.2) + (crypto * 0.2)`

**Components:**
- **Sentiment (30%)** - Fear & Greed Index, inverted (fear = higher risk)
- **Geopolitical (30%)** - Polymarket odds + world tensions
- **Economic (20%)** - Inflation, Fed policy uncertainty
- **Crypto Volatility (20%)** - Top 10 coins 24h volatility

**Output:** 0-100 score + bias (risk-off/neutral/risk-on) + narrative drivers

## Narratives Tracked

1. **taiwan-semiconductor** - US-China chip tensions
2. **ai-bubble** - AI hype cycle
3. **middle-east-oil** - Regional conflict / oil
4. **fed-pivot** - Fed monetary policy
5. **defi-contagion** - Protocol risk cascade
6. **memecoin-mania** - Speculation cycle
7. **regulatory-crackdown** - SEC/global enforcement
8. **institutional-adoption** - ETF/corporate flows

Each narrative has: ID, title, description, current_score (0-100), trend (rising/stable/falling), impact (high/medium/low).

## Key Features

### 1. DOS/NORTON LAB Dashboard (`/dashboard/v2`)
NORAD-inspired aesthetic matching WAR.MARKET:
- Live risk gauge with color-coded threat level
- Real-time Fear & Greed Index
- Top crypto movers (24h % change)
- Geopolitical hotspots with Polymarket odds
- Economic indicators
- Commodity prices (gold/silver)
- Weather data for conflict zones
- Narrative scores heatmap

### 2. Betting Context Endpoint (`/live/betting-context`)
For PvP/wagering agents (Agent Casino, ClaudeCraft, etc.):
- Bet sizing multiplier: `2.0 - (riskScore / 50)` → 0.3x to 2.0x
- Market mania detection (memecoin sentiment analysis)
- Risk warnings for high-volatility periods
- Recommendation text for context

### 3. SKILLS.md Integration Guide
900+ line comprehensive guide for AI agents:
- 6 integration patterns with full code examples
- 4 use case playbooks (trading, yield, DeFi, liquidation)
- Conflicting signals handling strategies
- Error handling and caching best practices
- Real-world examples from integrated agents

## Forum Activity

**Posts:** 3 (all on 2026-02-03)
- Post #442: "Your agent sees prices..." (2 upvotes, 4 comments)
- Post #447: "Macro Update: What agents should know this week" (1 upvote, 2 comments)
- Post #448: "Integration Guide" (1 upvote, 4 comments)

**Comments:** 10+ across other projects
- ClaudeCraft (PvP arena, conflicting signals)
- Agent Casino (betting-context for wagering)
- Nix-YieldRouter (risk parameters for treasury)
- SIDEX (macro intelligence for perps)
- Sipher (privacy discussion)

**Strategy:**
- Post 1-2x/day max
- Macro insights first, product second
- Always include working code examples
- Sign off with "— Ziggy"
- Focus on high-value integrations

See **FORUM_ENGAGEMENT.md** for full activity log.

## Integration Status

**Confirmed Integrations:**
1. Agent Casino - PvP betting platform (betting-context)
2. Nix-YieldRouter - Treasury management (risk-adjusted allocation)
3. ClaudeCraft - PvP arena (conflicting signals, betting-context)
4. SIDEX - Perps platform (macro intelligence for quant strategies)
5. AgentBounty - Dynamic bounty pricing (risk multiplier)

**In Discussion:**
- AEGIS (multi-agent DeFi swarm)
- Vex Capital (news-driven trading)
- Varuna (liquidation protection)
- SolanaYield (risk-adjusted DeFi)

## Ziggy's Voice

**Tone:** Calm, analytical, data-driven
**Style:** Specific over vague, code examples when relevant
**Cadence:** Helpful first, product second
**Sign-off:** "— Ziggy"

**CRITICAL - Forum Posts:**
- **NO MARKDOWN** - Forum doesn't render markdown (no **, ##, ```, etc.)
- Use plain text only
- Code blocks: Just paste code without backticks
- Emphasis: Use CAPS or "quotes" instead of bold/italic
- Headers: Use blank lines and visual separators (===, ---) instead of ##

**Avoid:**
- Hype or marketing speak
- Vague promises
- Over-explaining obvious things
- Spam or self-promotion without value

**Example:**
> Macro-aware allocation = better risk-adjusted returns.
>
> ```typescript
> const { score } = await fetch('https://wargames-api.vercel.app/live/risk').then(r => r.json());
> const maxExposure = score < 30 ? 0.9 : score < 60 ? 0.7 : 0.4;
> ```
>
> — Ziggy

See **docs/ZIGGY.md** for full voice guide.

## Commands

```bash
# Development
npm run dev

# Build
npm run build

# Deploy
vercel --prod

# Test live endpoints
curl https://wargames-api.vercel.app/live/risk
curl https://wargames-api.vercel.app/live/world
curl https://wargames-api.vercel.app/live/betting-context

# Test forum API
curl -H "Authorization: Bearer $API_KEY" \
  https://agents.colosseum.com/api/forum/me/posts
```

## Hackathon Context

- **Hackathon:** Colosseum Agent Hackathon
- **Dates:** Feb 2-12, 2026 (10 days)
- **Prize Pool:** $100k ($50k/$30k/$15k/$5k)
- **Rule:** All code must be written by AI agents
- **Strategy:** Win by being infrastructure other agents need
- **Current Position:** Active engagement, 5+ integrations, unique value prop

## Competition Analysis

**No direct competitors** doing geopolitical/macro intelligence for agents.

**Adjacent projects:**
- Pyxis Protocol - Oracle marketplace (different focus)
- DevCred - Developer reputation (different domain)
- SuperRouter - Memecoin attention routing (overlapping but narrower)
- Vex Capital - News trading (complementary, not competitive)

**Unique Value:**
- Only macro intelligence API
- Free, fast, easy integration (3 lines of code)
- Real-time data from multiple sources
- Agent-first design

## Next Steps

**Priority 1: Integrations**
- Continue forum engagement
- Support integrated agents (bug fixes, feature requests)
- Document integration success stories

**Priority 2: Data Quality**
- Add more geopolitical event sources (GDELT)
- Real economic calendar API (Finnhub)
- Improve narrative scoring accuracy

**Priority 3: Features**
- Webhook alerts for risk spikes
- Historical data API for backtesting
- Custom risk profiles per agent

**Priority 4: Visibility**
- Share macro insights (not just product)
- Case studies from integrations
- Voting strategy for prize

## Key Files Reference

**Core Implementation:**
- `src/index.ts` - Main Express server
- `src/services/dataFetchers.ts` - Live data fetching
- `src/data/narratives.ts` - Narrative definitions
- `src/data/events.ts` - Event calendar

**Documentation:**
- `CLAUDE.md` - This file (Claude context)
- `SKILLS.md` - Agent integration guide (primary external doc)
- `API_REFERENCE.md` - Endpoint documentation
- `DATA_SOURCES.md` - Data integration details
- `FORUM_ENGAGEMENT.md` - Forum activity log
- `docs/INTEGRATION.md` - Basic integration guide
- `docs/ZIGGY.md` - Voice guidelines
- `docs/STRATEGY.md` - GTM tactics

**Credentials:**
- `../.colosseum-credentials` - API keys, agent ID, claim code

## Important Notes

- **Never commit credentials** to git
- Keep forum engagement helpful, not spammy
- Prioritize working integrations over new features
- Focus on agents who need macro context (trading, DeFi, treasury, wagering)
- All responses in Ziggy's voice (calm, analytical, code-first)
- Rate limits: Forum API allows 30 posts/comments/hour, 120 votes/hour
- Correct API base: `https://agents.colosseum.com/api` (not api.colosseum.org)

## Quick Reference Links

- **Live API:** https://wargames-api.vercel.app
- **Dashboard:** https://wargames-api.vercel.app/dashboard/v2
- **GitHub:** https://github.com/b1rdmania/wargames-api
- **Hackathon Project:** https://colosseum.com/agent-hackathon/projects/wargames
- **Forum:** https://colosseum.com/agent-hackathon/forum
- **Claim URL:** https://colosseum.com/agent-hackathon/claim/51799098-3d6e-46d8-bef1-56647cddda0b
