# @wargames/sdk

Official TypeScript/JavaScript SDK for **WARGAMES** - Macro intelligence for Solana agents.

> "Your agent sees prices. It doesn't see the world."

## Installation

```bash
npm install @wargames/sdk
# or
yarn add @wargames/sdk
# or
pnpm add @wargames/sdk
```

## Quick Start

```typescript
import { WARGAMES } from '@wargames/sdk';

const wargames = new WARGAMES();

// Get current global risk
const { score, bias } = await wargames.getRisk();

if (score > 70) {
  console.log('High risk - reducing exposure');
  // Reduce position sizes, increase cash
}
```

## One-Line Integration

```typescript
// Simplest possible integration
import wargames from '@wargames/sdk';
const { score } = await wargames.getRisk();
```

## Complete Examples

### Trading Bot - Risk-Adjusted Position Sizing

```typescript
import { WARGAMES } from '@wargames/sdk';

const wargames = new WARGAMES();

async function executeTrade(baseSize: number) {
  // Check if it's safe to trade
  const { safe, reason } = await wargames.isSafeToTrade();

  if (!safe) {
    console.log(`❌ Skipping trade: ${reason}`);
    return;
  }

  // Adjust position size based on risk
  const adjustedSize = await wargames.getPositionSize(baseSize);

  console.log(`✅ Executing trade: $${adjustedSize} (${adjustedSize / baseSize}x)`);

  // Your trade logic here...
}

executeTrade(1000); // $1000 base size
```

### DeFi Agent - Protocol Safety Check

```typescript
import { WARGAMES } from '@wargames/sdk';

const wargames = new WARGAMES();

async function checkProtocol(protocol: 'kamino' | 'drift' | 'meteora' | 'marginfi') {
  const data = await wargames.getProtocol(protocol);

  console.log(`${protocol.toUpperCase()} TVL: ${data.tvl}`);
  console.log(`7-day change: ${data.changes['7d']}`);
  console.log(`Risk indicator: ${data.insights.risk_indicator}`);

  // Decide if safe to use
  if (data.tvl_usd > 100e6 && data.insights.risk_indicator === 'major_protocol') {
    console.log('✅ Safe to use');
    return true;
  }

  console.log('⚠️ Use with caution');
  return false;
}

checkProtocol('kamino');
```

### Treasury Manager - Event-Aware Rebalancing

```typescript
import { WARGAMES } from '@wargames/sdk';

const wargames = new WARGAMES();

async function rebalanceTreasury() {
  // Get risk + upcoming events
  const [risk, events] = await Promise.all([
    wargames.getRisk(),
    wargames.getEvents({ high_impact: true, days: 3 })
  ]);

  console.log(`Current risk: ${risk.score}/100 (${risk.bias})`);

  // High-impact event in next 3 days?
  const upcomingEvent = events[0];

  if (upcomingEvent) {
    console.log(`⚠️ Event: ${upcomingEvent.title} on ${upcomingEvent.date}`);
  }

  // Rebalancing logic
  const stableAllocation = risk.score > 70 ? 0.8 : risk.score > 50 ? 0.5 : 0.3;

  console.log(`Recommended stable allocation: ${stableAllocation * 100}%`);

  // Execute rebalance...
}

rebalanceTreasury();
```

### Yield Optimizer - Narrative-Driven Strategy

```typescript
import { WARGAMES } from '@wargames/sdk';

const wargames = new WARGAMES();

async function optimizeYield() {
  const narratives = await wargames.getNarratives();

  // Check AI bubble narrative
  const aiNarrative = narratives.find(n => n.id === 'ai-bubble');

  if (aiNarrative && aiNarrative.current_score > 75) {
    console.log('⚠️ AI bubble overheating - reduce AI token exposure');
    // Rotate out of AI tokens
  }

  // Check institutional adoption
  const institutionalNarrative = narratives.find(n => n.id === 'institutional-adoption');

  if (institutionalNarrative && institutionalNarrative.trend === 'rising') {
    console.log('✅ Institutional flows increasing - favor blue chips');
    // Increase allocation to SOL, BTC, ETH
  }
}

optimizeYield();
```

## API Reference

### Core Methods

#### `getRisk(): Promise<RiskScore>`

Get current global macro risk score (0-100).

```typescript
const { score, bias, components, drivers } = await wargames.getRisk();
```

**Returns:**
- `score`: 0-100 (higher = more risk)
- `bias`: 'risk-on' | 'neutral' | 'risk-off'
- `components`: Breakdown by sentiment, geopolitical, economic, crypto
- `drivers`: List of primary risk drivers

#### `getNarratives(): Promise<Narrative[]>`

Get all active geopolitical/macro narratives.

```typescript
const narratives = await wargames.getNarratives();
```

**Returns:** Array of narratives with:
- `id`: Narrative identifier
- `current_score`: 0-100
- `trend`: 'rising' | 'stable' | 'falling'
- `impact`: 'high' | 'medium' | 'low'

#### `getEvents(filters?): Promise<MacroEvent[]>`

Get upcoming macro events.

```typescript
const events = await wargames.getEvents({
  high_impact: true,
  days: 7
});
```

**Filters:**
- `high_impact`: Only high-impact events
- `days`: Number of days ahead (default: 30)

#### `getWorldState(): Promise<WorldState>`

Get complete world state in one call (all data).

```typescript
const world = await wargames.getWorldState();
```

**Returns:** Risk, crypto prices, sentiment, predictions, economic data, commodities, all in one object.

#### `getProtocol(protocol): Promise<ProtocolData>`

Get Solana DeFi protocol data (TVL, changes, insights).

```typescript
const kamino = await wargames.getProtocol('kamino');
// Also: 'drift', 'meteora', 'marginfi'
```

### Helper Methods

#### `getPositionSize(baseSize): Promise<number>`

Calculate risk-adjusted position size.

```typescript
const adjustedSize = await wargames.getPositionSize(1000);
// Returns: 400-1500 depending on risk
```

#### `isSafeToTrade(): Promise<{safe: boolean, reason: string}>`

Check if conditions are safe for trading.

```typescript
const { safe, reason } = await wargames.isSafeToTrade();

if (!safe) {
  console.log(`Skipping trade: ${reason}`);
}
```

## Configuration

```typescript
const wargames = new WARGAMES({
  baseURL: 'https://wargames-api.vercel.app', // Default
  timeout: 10000 // 10 seconds (default)
});
```

## TypeScript Support

Full TypeScript definitions included. Get autocomplete for all methods and types:

```typescript
import { WARGAMES, RiskScore, Narrative, MacroEvent } from '@wargames/sdk';
```

## Error Handling

```typescript
try {
  const { score } = await wargames.getRisk();
} catch (error) {
  console.error('Failed to fetch risk:', error.message);
  // Fallback logic...
}
```

## Rate Limiting

The WARGAMES API has no authentication and no rate limits. Use freely.

## Links

- **API:** https://wargames-api.vercel.app
- **Docs:** https://github.com/b1rdmania/wargames-api
- **Discord:** Coming soon
- **GitHub:** https://github.com/b1rdmania/wargames-api

## License

MIT

---

**Built by Ziggy (Agent #311) for the Colosseum Agent Hackathon**
