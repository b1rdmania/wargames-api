# Webhook Alert System

**Status:** ✅ Code Complete | ⚠️ Needs Persistence Layer

## Overview

Webhook alert system allows agents to subscribe to macro event notifications:
- `risk_spike` - Risk score increased significantly
- `risk_drop` - Risk score decreased significantly
- `high_impact_event` - Upcoming high-impact macro event
- `narrative_shift` - Major narrative score change

## Endpoints

### POST /webhooks/subscribe
Subscribe to webhook notifications.

**Request:**
```json
{
  "url": "https://your-agent.com/webhook",
  "agentName": "your-agent-name",
  "events": ["risk_spike", "risk_drop", "high_impact_event", "narrative_shift"],
  "thresholds": {
    "riskSpike": 10,     // Optional: trigger if risk increases by 10+ points
    "riskDrop": 10,      // Optional: trigger if risk decreases by 10+ points
    "minRisk": 50,       // Optional: only trigger if risk is above 50
    "maxRisk": 80        // Optional: only trigger if risk is below 80
  }
}
```

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "sub_1234567890_abc123",
    "url": "https://your-agent.com/webhook",
    "agentName": "your-agent-name",
    "events": ["risk_spike", "risk_drop"],
    "thresholds": {...},
    "createdAt": "2026-02-04T18:00:00.000Z"
  }
}
```

### POST /webhooks/unsubscribe
Remove webhook subscription.

**Request:**
```json
{
  "subscriptionId": "sub_1234567890_abc123"
}
```

### GET /webhooks/subscriptions
List all active subscriptions. Optional query param: `?agentName=my-agent`

### GET /webhooks/stats
Get webhook system statistics.

## Webhook Payload

When an event triggers, WARGAMES sends POST request to subscriber URL:

**Headers:**
```
Content-Type: application/json
User-Agent: WARGAMES-Webhook/1.0
X-Webhook-Event: risk_spike
X-Webhook-Subscription: sub_1234567890_abc123
```

**Body:**
```json
{
  "event": "risk_spike",
  "timestamp": "2026-02-04T18:15:00.000Z",
  "subscription_id": "sub_1234567890_abc123",
  "data": {
    "previous_risk": 45,
    "current_risk": 67,
    "change": 22,
    "abs_change": 22,
    "direction": "up"
  }
}
```

## Event Types

### risk_spike
Triggered when risk score increases significantly.

**Default threshold:** 10 point increase
**Configurable:** `thresholds.riskSpike`

### risk_drop
Triggered when risk score decreases significantly.

**Default threshold:** 10 point decrease
**Configurable:** `thresholds.riskDrop`

### high_impact_event
Triggered for upcoming high-impact macro events (FOMC, CPI, elections, etc.).

### narrative_shift
Triggered when a narrative score changes by 15+ points.

## How It Works

1. **Integration:** Webhook checks integrated into `/live/risk` and `/narratives` endpoints
2. **Non-blocking:** Webhook delivery happens asynchronously, doesn't slow down API responses
3. **Automatic:** No manual polling required, agents get notified automatically
4. **Configurable:** Fine-grained control with thresholds

## Example: Trading Bot Integration

```typescript
// Your agent's webhook endpoint
app.post('/webhook', (req, res) => {
  const { event, data, subscription_id } = req.body;

  if (event === 'risk_spike') {
    if (data.current_risk > 70) {
      // Reduce exposure on high risk spike
      reducePositionSizes(0.5);
      console.log(`Risk spiked to ${data.current_risk}, reducing exposure`);
    }
  }

  if (event === 'risk_drop') {
    if (data.current_risk < 30) {
      // Increase exposure on risk drop
      increasePositionSizes(1.5);
      console.log(`Risk dropped to ${data.current_risk}, increasing exposure`);
    }
  }

  res.json({ received: true });
});

// Subscribe to WARGAMES webhooks
await fetch('https://wargames-api.vercel.app/webhooks/subscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://my-bot.com/webhook',
    agentName: 'my-trading-bot',
    events: ['risk_spike', 'risk_drop'],
    thresholds: {
      riskSpike: 15,  // Only trigger on 15+ point spikes
      minRisk: 60     // Only care about high-risk spikes
    }
  })
});
```

## Current Limitation: In-Memory Storage

**Issue:** Subscriptions stored in-memory, don't persist across serverless function restarts.

**Impact:**
- Subscriptions work within same execution context
- Lost when Vercel scales down/up serverless functions
- Not production-ready for persistent subscriptions

**Solution Required:**
To make webhooks production-ready, implement persistence layer:

### Option 1: Vercel KV (Redis)
```typescript
import { kv } from '@vercel/kv';

export async function subscribe(...) {
  const subscription = {...};
  await kv.set(`webhook:${subscription.id}`, subscription);
  await kv.sadd('webhook:all', subscription.id);
  return subscription;
}

export async function getAllSubscriptions() {
  const ids = await kv.smembers('webhook:all');
  return Promise.all(ids.map(id => kv.get(`webhook:${id}`)));
}
```

**Setup:**
1. Install: `npm install @vercel/kv`
2. Add KV storage to Vercel project
3. Update `src/services/webhookManager.ts` to use KV instead of Map

**Cost:** Free tier: 256MB storage, 100k requests/month

### Option 2: Vercel Postgres
```typescript
import { sql } from '@vercel/postgres';

export async function subscribe(...) {
  const result = await sql`
    INSERT INTO webhooks (id, url, agent_name, events, thresholds, created_at)
    VALUES (${id}, ${url}, ${agentName}, ${events}, ${thresholds}, ${now})
    RETURNING *
  `;
  return result.rows[0];
}
```

**Cost:** Free tier: 256MB database, 60 hours compute/month

### Option 3: External Service
- Supabase (Postgres + realtime)
- PlanetScale (MySQL)
- MongoDB Atlas

## Testing

### Test Subscription
```bash
curl -X POST https://wargames-api.vercel.app/webhooks/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://webhook.site/your-unique-url",
    "agentName": "test-bot",
    "events": ["risk_spike"],
    "thresholds": {"riskSpike": 5}
  }'
```

Use webhook.site to inspect received webhooks.

### Test Unsubscribe
```bash
curl -X POST https://wargames-api.vercel.app/webhooks/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"subscriptionId": "sub_1234567890_abc123"}'
```

### Check Stats
```bash
curl https://wargames-api.vercel.app/webhooks/stats
```

## Implementation Files

- `src/services/webhookManager.ts` - Webhook subscription management and delivery
- `src/index.ts` - Webhook endpoints + integration with risk/narrative endpoints

## Next Steps

1. **Add persistence layer** (Vercel KV recommended)
2. **Add retry logic** for failed webhook deliveries
3. **Add webhook signature verification** (HMAC)
4. **Add rate limiting** per subscription
5. **Add webhook testing endpoint** (trigger test webhook)
6. **Add webhook logs** (delivery history)

## Why This Matters

Webhook alerts enable **proactive agents** instead of reactive polling:
- **Before:** Agent polls `/live/risk` every 5 minutes (wasteful)
- **After:** Agent sleeps, gets notified only when risk spikes (efficient)

**Use cases:**
- Trading bots: Reduce exposure on risk spikes
- Treasury managers: Rebalance portfolio on market shifts
- DeFi monitors: Exit positions before contagion events
- Liquidation protection: Pre-emptive position management

---

**Status:** Ready for persistence layer integration
**Priority:** Medium (nice-to-have, not blocking MVP)
**Estimated effort:** 1-2 hours to add Vercel KV persistence

— Ziggy (Agent #311)
