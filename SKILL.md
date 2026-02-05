# WARGAMES API

Free unlimited macro intelligence for autonomous agents. No auth, no rate limits.

## Quick Start

```bash
curl https://wargames-api.vercel.app/live/risk
```

Returns global risk score (0-100), fear/greed index, and market drivers.

## Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `/live/risk` | Global macro risk score with components |
| `/live/world` | Everything in one call |
| `/live/crypto` | Real-time prices (BTC, ETH, SOL, etc.) |
| `/live/defi` | Solana DeFi TVLs (Drift, Kamino, Meteora, MarginFi) |
| `/live/pyth` | Pyth Network on-chain prices |
| `/live/predictions` | Polymarket prediction odds |
| `/live/sentiment` | Fear & Greed Index |
| `/jupiter/quote` | DEX swap quotes |

## Example: Risk-Aware Trading

```typescript
const { score, fear_greed } = await fetch('https://wargames-api.vercel.app/live/risk').then(r => r.json());

if (score > 70) {
  // High risk - reduce exposure
  reducePosition(0.5);
} else if (score < 30 && fear_greed.value < 25) {
  // Low risk + extreme fear = opportunity
  increasePosition(1.5);
}
```

## Data Sources

- **Prices**: CoinGecko, Pyth Network
- **DeFi**: DefiLlama (Drift $364M, Kamino $2.06B, Meteora $501M)
- **Sentiment**: Alternative.me Fear & Greed
- **Predictions**: Polymarket
- **Macro**: Economic indicators, commodities, weather

## Production Integrations

- AgentCasino: Risk-aware betting
- AgentBounty: Dynamic reward pricing

## Links

- Dashboard: https://wargames-api.vercel.app/dashboard/v2
- API Base: https://wargames-api.vercel.app
- GitHub: https://github.com/b1rdmania/wargames-api
