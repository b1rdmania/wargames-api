## Trading-Floor Feed Stack (Next Builds) — Free Feeds Only (Sources + Implementation Plan)

This plan turns the “control centre feed stack” into **production-grade `/live/*` endpoints** with sane caching, normalized schemas, and a strict constraint:

- **Free feeds only** (public or free-with-free-key).
- If a datapoint can’t be sourced for free (e.g. true real-time futures, MOVE), we return `null` + a clear `freshness`/`note`.

### What “free” means here
- **FRED** is free (you may want a free API key for reliability/rate limits).
- **GDELT** is free.
- **Frankfurter** is free (ECB-based FX; daily).
- **OFAC SLS** is free.
- **ACLED** may be accessible depending on account/tier; treat it as optional.

---

## 1) Breaking news wire

### Endpoint
`GET /live/news`

### Normalized fields
- `headline` (string)
- `source` (string)
- `timestamp` (ISO string)
- `importance` (number 0–100)
- `category` (string, e.g. `macro`, `geopolitics`, `markets`, `crypto`, `energy`)
- `url` (optional string)

### Best free sources
- **GDELT** (global news monitoring; strong for geopolitics/macro) — docs portal: `https://docs.gdeltcloud.com/`
- Optional (free tier, key + terms apply): **NewsAPI** — docs: `https://newsapi.org/docs/endpoints/top-headlines`

### Implementation notes
- **Importance scoring**: combine heuristics:
  - keyword matches (FOMC/CPI/jobs, “sanctions”, “missile”, “default”, “SEC”, etc.)
  - source weight (wire > aggregator > blogs)
  - recency decay (newer = higher)
  - category boost (geopolitics/central banks > other)
- Cache: 30–90s (headline streams move fast, but don’t hammer APIs).

---

## 2) FX + rates tape

### Endpoint
`GET /live/markets`

### Assets requested
- **FX**: “DXY proxy”, EURUSD, USDJPY, GBPUSD
- **Rates**: UST 2Y/10Y, SOFR, Fed Funds (EFFR)

### Best free sources
- **Rates + USD index proxy**: **FRED** — API docs: `https://fred.stlouisfed.org/docs/api/fred/series_observations.html`
  - UST 2Y: `DGS2` (`https://fred.stlouisfed.org/series/DGS2`)
  - UST 10Y: `DGS10` (`https://fred.stlouisfed.org/series/DGS10`)
  - SOFR: `SOFR` (`https://fred.stlouisfed.org/series/SOFR`)
  - Effective Fed Funds: `EFFR` (`https://fred.stlouisfed.org/series/EFFR`)
  - USD index proxy (trade-weighted): `DTWEXBGS` (`https://fred.stlouisfed.org/series/DTWEXBGS`)
- **Spot FX (daily, ECB-based)**: **Frankfurter** (no key) — docs: `https://www.frankfurter.app/docs/`

### Implementation notes
- We’ll implement the endpoint to return **a tape structure** (ordered list) plus a keyed map.
- Data freshness labels: `realtime|delayed|eod` so judges understand constraints.
- Cache:
  - FX (Frankfurter): 6–24h (daily)
  - Rates + USD index (FRED): 6–24h (daily)

---

## 3) Equity index futures + volatility

### Endpoint
`GET /live/vol`

### Assets requested
- ES/NQ/RTY futures (free sources are not realistically available)
- VIX
- MOVE

### Best free sources
- **Equity index levels (daily close)**: **FRED**
  - S&P 500: `SP500` (`https://fred.stlouisfed.org/series/SP500`)
  - Nasdaq Composite: `NASDAQCOM` (`https://fred.stlouisfed.org/series/NASDAQCOM`)
- **VIX (daily close)**: FRED `VIXCLS` (`https://fred.stlouisfed.org/series/VIXCLS`)
- **MOVE**: not reliably available for free (treat as `null` + note).

### Implementation notes
- For free-only, ship **index close levels + VIX close** as the risk-on/off baseline.

---

## 4) Commodities + energy

### Endpoint
`GET /live/commodities`

### Assets requested
- WTI/Brent, Gold, Copper, Nat Gas

### Best sources (tiered)
### Best free sources
- **FRED** (free, daily/weekly/monthly depending on series):
  - WTI: `DCOILWTICO` (`https://fred.stlouisfed.org/series/DCOILWTICO`)
  - Brent: `DCOILBRENTEU` (`https://fred.stlouisfed.org/series/DCOILBRENTEU`)
  - Nat Gas (Henry Hub): `DHHNGSP` (`https://fred.stlouisfed.org/series/DHHNGSP`)
  - Gold (LBMA AM fix): `GOLDAMGBD228NLBM` (daily LBMA USD fix; available in FRED)
  - Copper: `PCOPPUSDM` (`https://fred.stlouisfed.org/series/PCOPPUSDM`) (monthly)
- Optional: **EIA Open Data** (also free) — docs: `https://www.eia.gov/opendata/documentation.php`

### Implementation notes
- Cache: 5–30 minutes (commodities don’t need 1-second updates for your use case).

---

## 5) Geopolitical event feed (GDELT / ACLED / sanctioned sources)

### Endpoint
`GET /live/geo`

### Normalized fields
- `region` (string)
- `intensity` (number 0–100)
- `event_type` (string)
- `headline` (string)
- `timestamp` (ISO string)
- `source` (string)
- `url` (optional)

### Best sources
- **GDELT** (broad, near-real-time global monitoring) — docs portal: `https://docs.gdeltcloud.com/`
- **ACLED** (conflict/event database, strong taxonomy; auth required) — docs: `https://apidocs.acleddata.com/`
- **OFAC sanctions list service** (sanctions/events relevant for macro risk) — official site: `https://ofac.treasury.gov/sanctions-list-service`

### Implementation notes
- Event “intensity”:
  - map provider severity (if available) → 0–100
  - boost if keywords/regions match your narrative list (Taiwan, Iran, Red Sea, etc.)
- Cache:
  - GDELT: 5–15 minutes
  - ACLED: 6–24h (depending on plan + update cadence)
  - OFAC: 6–24h

---

## 6) Credit / spreads

### Endpoint
`GET /live/credit`

### Assets requested
- IG/HY OAS
- EM spreads (if available)

### Best sources
- **FRED** (daily, reliable, free):
  - IG OAS: `BAMLC0A0CM` — `https://fred.stlouisfed.org/series/BAMLC0A0CM`
  - HY OAS: `BAMLH0A0HYM2` — `https://fred.stlouisfed.org/series/BAMLH0A0HYM2`

### Implementation notes
- Cache: 6–24h
- Compute derived “systemic stress” score:
  - normalize OAS percentile vs trailing 1y/3y window
  - combine IG + HY + (optional) EM

---

## Architecture in this codebase

### Where to put this
You already have `src/services/dataFetchers.ts` with:
- in-memory cache (`setCache/getCached`)
- TTL-based freshness (`getDataFreshness`)

Add new fetchers there or split into:
- `src/services/feeds/news.ts`
- `src/services/feeds/markets.ts`
- `src/services/feeds/geo.ts`
- etc.

Then add routes in `src/index.ts`:
- `GET /live/news`
- `GET /live/markets`
- `GET /live/vol`
- `GET /live/commodities`
- `GET /live/geo`
- `GET /live/credit`

### Cross-cutting concerns (do these once)
- **Secrets**: env vars (Fly secrets):
  - `NEWSAPI_KEY`
  - `FRED_KEY` (optional but recommended)
  - `EIA_KEY` (optional but recommended)
  - `ACLED_CLIENT_ID`/`ACLED_CLIENT_SECRET` or token workflow (per ACLED docs)
- **Rate limiting**: stay under provider quotas by caching + batching.
- **Observability**:
  - include `metadata: { provider, fetchedAt, ttlMs, freshness }` in responses
  - add provider failures to logs and surface a soft warning field

---

## Rollout plan (fastest value first)

### Phase 0 (1–2 hours): ship endpoints with free baselines
- `/live/news`: GDELT-based headlines (optionally also NewsAPI free tier if you want)
- `/live/markets`: FRED rates (DGS2/DGS10/SOFR/EFFR) + DTWEXBGS + FX from Frankfurter (daily)
- `/live/commodities`: FRED commodities (WTI/Brent/NatGas/Gold/Copper)
- `/live/credit`: FRED OAS (IG first)

### Phase 1 (half-day): unify into a single tape object
- Add `/live/tape` that returns:
  - `breaking_news[]`
  - `tape[]` (ordered: FX → rates → indices/vol → commodities → credit)
  - `geo[]`
This becomes the “control centre feed” payload for the UI.

### Phase 2 (optional improvements)
Still free-only by design. Improvements here are about better normalization, scoring, and UI consumption (not paid feeds).

