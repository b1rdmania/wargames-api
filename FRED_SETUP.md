# FRED API Key Setup (2 minutes)

**Status:** Required for `/live/markets`, `/live/vol`, `/live/commodities`, `/live/credit`

## Quick Setup

1. **Register** (30 seconds)
   - Go to: https://fredaccount.stlouisfed.org/login/secure/
   - Click "Register"
   - Enter email + create password
   - Verify email

2. **Get API Key** (30 seconds)
   - Log in to: https://fredaccount.stlouisfed.org/apikeys
   - Click "Request API Key"
   - Give it a name (e.g., "WARGAMES")
   - Copy the 32-character key

3. **Set in Fly.io** (30 seconds)
   ```bash
   flyctl secrets set FRED_API_KEY=your_32_char_key_here
   ```

4. **Verify** (30 seconds)
   ```bash
   curl "https://wargames-api.fly.dev/live/markets"
   # Should return rates data now
   ```

## What This Unlocks

**Currently Limited (without key):**
- `/live/markets` - Missing: USD rates (2Y, 10Y, SOFR, EFFR), DXY index
- `/live/vol` - Missing: S&P 500, Nasdaq, VIX
- `/live/commodities` - Missing: WTI, Brent, Gold, Copper, Nat Gas
- `/live/credit` - Missing: IG/HY credit spreads

**After Setup:**
- All 50+ FRED series accessible
- Daily data: rates, indices, commodities, credit spreads
- 120 calls/minute rate limit (plenty for our use)

## Rate Limits

- **Without key:** Blocked
- **With key:** 120 requests/minute
- **Our usage:** ~10 requests/hour (cached 6h)

## Testing Without Key

Endpoints return partial data + warnings:
```json
{
  "data": { "tape": [...], "index": {...} },
  "metadata": {
    "warnings": ["Rates data unavailable - FRED API key required"]
  }
}
```

## Alternative

If you can't get a FRED key, the feed stack still works with:
- FX data (Frankfurter - no key required)
- News (GDELT - no key required)
- Geopolitics (GDELT - no key required)

But most macro data (rates, indices, commodities) won't populate.

---

**FRED API Docs:** https://fred.stlouisfed.org/docs/api/fred/
**Registration:** https://fredaccount.stlouisfed.org/apikeys
