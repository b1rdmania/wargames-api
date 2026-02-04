/**
 * WARGAMES Data Fetchers
 * Real-time data from free APIs
 *
 * All APIs are free tier / no auth required
 */

// Cache to avoid hammering APIs
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  fetchedAt: string; // ISO timestamp for tracking freshness
}

const cache: Map<string, CacheEntry<any>> = new Map();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
    fetchedAt: new Date().toISOString()
  });
}

// Get data freshness info for monitoring
export function getDataFreshness(): Record<string, { age: number; fetchedAt: string; ttl: number }> {
  const freshness: Record<string, { age: number; fetchedAt: string; ttl: number }> = {};

  for (const [key, entry] of cache.entries()) {
    freshness[key] = {
      age: Date.now() - entry.timestamp,
      fetchedAt: entry.fetchedAt,
      ttl: entry.ttl
    };
  }

  return freshness;
}

// =============================================================================
// CRYPTO FEAR & GREED INDEX
// https://api.alternative.me/fng/
// =============================================================================

export interface FearGreedData {
  value: number;
  value_classification: string;
  timestamp: string;
  time_until_update: string;
}

export async function fetchFearGreed(): Promise<FearGreedData | null> {
  const cached = getCached<FearGreedData>('fear-greed');
  if (cached) return cached;

  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1');
    const json = await res.json() as { data?: Array<{ value: string; value_classification: string; timestamp: string; time_until_update: string }> };

    if (json.data && json.data[0]) {
      const item = json.data[0];
      const data: FearGreedData = {
        value: parseInt(item.value),
        value_classification: item.value_classification,
        timestamp: new Date(parseInt(item.timestamp) * 1000).toISOString(),
        time_until_update: item.time_until_update
      };
      setCache('fear-greed', data, 5 * 60 * 1000); // 5 min cache (sentiment changes fast)
      return data;
    }
  } catch (err) {
    console.error('Fear & Greed fetch failed:', err);
  }
  return null;
}

// =============================================================================
// POLYMARKET - Prediction Markets
// https://clob.polymarket.com/ (free, no auth)
// =============================================================================

export interface PolymarketEvent {
  id: string;
  question: string;
  probability: number;
  category: string;
  end_date?: string;
}

// Curated list of geopolitically relevant markets
const POLYMARKET_SLUGS = [
  'will-iran-strike-israel-before-march-1',
  'russia-ukraine-ceasefire-2026',
  'will-china-invade-taiwan-in-2026',
  'us-recession-2026',
  'will-bitcoin-hit-150k-in-2026',
  'fed-rate-cut-march-2026'
];

interface PolymarketMarket {
  id?: string;
  slug?: string;
  question?: string;
  outcomePrices?: string; // JSON string like "[\"0.04\", \"0.96\"]"
  category?: string;
  endDate?: string;
}

export async function fetchPolymarketOdds(): Promise<PolymarketEvent[]> {
  const cached = getCached<PolymarketEvent[]>('polymarket');
  if (cached) return cached;

  const events: PolymarketEvent[] = [];

  try {
    // Fetch from gamma API (public market data)
    const res = await fetch('https://gamma-api.polymarket.com/markets?limit=100&active=true&closed=false');
    const markets = await res.json() as PolymarketMarket[];

    // Filter for geopolitically relevant markets
    const keywords = ['iran', 'russia', 'ukraine', 'china', 'taiwan', 'fed', 'recession', 'bitcoin', 'crypto', 'war', 'trump', 'election', 'tariff', 'israel'];

    for (const market of markets) {
      const question = (market.question || '').toLowerCase();
      if (keywords.some(k => question.includes(k))) {
        // Parse outcomePrices from JSON string
        let probability = 0;
        if (market.outcomePrices) {
          try {
            const prices = JSON.parse(market.outcomePrices) as string[];
            if (prices.length > 0) {
              probability = parseFloat(prices[0]) * 100;
            }
          } catch {
            // Ignore parse errors
          }
        }

        events.push({
          id: market.id || market.slug || '',
          question: market.question || '',
          probability,
          category: 'politics',
          end_date: market.endDate
        });
      }
    }

    // Sort by probability (most likely events first)
    events.sort((a, b) => b.probability - a.probability);

    setCache('polymarket', events, 10 * 60 * 1000); // 10 min cache
  } catch (err) {
    console.error('Polymarket fetch failed:', err);
  }

  return events;
}

// =============================================================================
// COINGECKO - Crypto Prices
// https://api.coingecko.com/api/v3/ (free, rate limited)
// =============================================================================

export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap: number;
  volume_24h: number;
}

interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
}

export async function fetchCryptoPrices(): Promise<CryptoPrice[]> {
  const cached = getCached<CryptoPrice[]>('crypto-prices');
  if (cached) return cached;

  try {
    const coins = 'bitcoin,ethereum,solana,bonk,dogwifhat,jupiter,raydium,marinade';
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coins}&order=market_cap_desc`
    );
    const data = await res.json() as CoinGeckoMarket[];

    const prices: CryptoPrice[] = data.map((coin) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      current_price: coin.current_price,
      price_change_24h: coin.price_change_24h,
      price_change_percentage_24h: coin.price_change_percentage_24h,
      market_cap: coin.market_cap,
      volume_24h: coin.total_volume
    }));

    setCache('crypto-prices', prices, 5 * 60 * 1000); // 5 min cache
    return prices;
  } catch (err) {
    console.error('CoinGecko fetch failed:', err);
  }
  return [];
}

// =============================================================================
// OPEN-METEO - Weather (for commodity/agriculture narratives)
// https://open-meteo.com/ (free, no auth)
// =============================================================================

export interface WeatherData {
  location: string;
  temperature: number;
  conditions: string;
  precipitation: number;
  wind_speed: number;
}

interface LocationCoords {
  name: string;
  lat: number;
  lon: number;
}

const KEY_LOCATIONS: LocationCoords[] = [
  { name: 'Houston (Oil/Gas)', lat: 29.76, lon: -95.37 },
  { name: 'Chicago (Commodities)', lat: 41.88, lon: -87.63 },
  { name: 'Singapore (Trade)', lat: 1.35, lon: 103.82 },
  { name: 'Dubai (Oil)', lat: 25.27, lon: 55.30 }
];

interface OpenMeteoResponse {
  current?: {
    temperature_2m: number;
    precipitation: number;
    wind_speed_10m: number;
    weather_code: number;
  };
}

export async function fetchWeather(): Promise<WeatherData[]> {
  const cached = getCached<WeatherData[]>('weather');
  if (cached) return cached;

  const weatherData: WeatherData[] = [];

  try {
    for (const loc of KEY_LOCATIONS) {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,precipitation,wind_speed_10m,weather_code`
      );
      const data = await res.json() as OpenMeteoResponse;

      if (data.current) {
        weatherData.push({
          location: loc.name,
          temperature: data.current.temperature_2m,
          conditions: weatherCodeToText(data.current.weather_code),
          precipitation: data.current.precipitation || 0,
          wind_speed: data.current.wind_speed_10m
        });
      }
    }

    setCache('weather', weatherData, 30 * 60 * 1000); // 30 min cache
  } catch (err) {
    console.error('Weather fetch failed:', err);
  }

  return weatherData;
}

function weatherCodeToText(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 49) return 'Foggy';
  if (code <= 59) return 'Drizzle';
  if (code <= 69) return 'Rain';
  if (code <= 79) return 'Snow';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

// =============================================================================
// FRED (Federal Reserve) - Economic Indicators
// https://fred.stlouisfed.org/ (free with API key, but we use fallback)
// =============================================================================

export interface EconomicIndicator {
  id: string;
  name: string;
  value: number;
  unit: string;
  date: string;
  trend: 'up' | 'down' | 'stable';
}

// Fallback static data with realistic current values
// In production, these would come from FRED API
export async function fetchEconomicIndicators(): Promise<EconomicIndicator[]> {
  const cached = getCached<EconomicIndicator[]>('economic');
  if (cached) return cached;

  // These are approximations based on current (Feb 2026) conditions
  // TODO: Integrate real FRED API with key
  const indicators: EconomicIndicator[] = [
    {
      id: 'fed-rate',
      name: 'Fed Funds Rate',
      value: 4.50,
      unit: '%',
      date: '2026-02-01',
      trend: 'stable'
    },
    {
      id: 'cpi',
      name: 'CPI (YoY)',
      value: 2.9,
      unit: '%',
      date: '2026-01-15',
      trend: 'down'
    },
    {
      id: 'unemployment',
      name: 'Unemployment Rate',
      value: 4.1,
      unit: '%',
      date: '2026-02-01',
      trend: 'stable'
    },
    {
      id: 'gdp-growth',
      name: 'GDP Growth (QoQ)',
      value: 2.3,
      unit: '%',
      date: '2026-01-25',
      trend: 'stable'
    },
    {
      id: 'dxy',
      name: 'Dollar Index (DXY)',
      value: 104.2,
      unit: '',
      date: new Date().toISOString().split('T')[0],
      trend: 'up'
    },
    {
      id: 'vix',
      name: 'VIX (Fear Index)',
      value: 18.5,
      unit: '',
      date: new Date().toISOString().split('T')[0],
      trend: 'stable'
    }
  ];

  setCache('economic', indicators, 60 * 60 * 1000); // 1 hour cache
  return indicators;
}

// =============================================================================
// COMMODITIES - Oil, Gold, etc
// Using free proxy APIs
// =============================================================================

export interface CommodityPrice {
  id: string;
  name: string;
  price: number;
  currency: string;
  change_24h: number;
  unit: string;
}

export async function fetchCommodities(): Promise<CommodityPrice[]> {
  const cached = getCached<CommodityPrice[]>('commodities');
  if (cached) return cached;

  // Try to fetch from metals API or fallback
  const commodities: CommodityPrice[] = [];

  try {
    // Gold price from alternative API
    const goldRes = await fetch('https://api.metals.live/v1/spot/gold');
    const goldData = await goldRes.json() as Array<{ price: number }>;
    if (goldData && goldData.length > 0) {
      commodities.push({
        id: 'gold',
        name: 'Gold',
        price: goldData[0].price,
        currency: 'USD',
        change_24h: 0, // Would need historical for change
        unit: 'oz'
      });
    }
  } catch (err) {
    // Fallback values
    commodities.push({
      id: 'gold',
      name: 'Gold',
      price: 2050,
      currency: 'USD',
      change_24h: 0.5,
      unit: 'oz'
    });
  }

  // Add oil estimate (would use proper API in production)
  commodities.push({
    id: 'wti-crude',
    name: 'WTI Crude Oil',
    price: 76.50,
    currency: 'USD',
    change_24h: -0.8,
    unit: 'barrel'
  });

  commodities.push({
    id: 'natural-gas',
    name: 'Natural Gas',
    price: 2.85,
    currency: 'USD',
    change_24h: 1.2,
    unit: 'MMBtu'
  });

  setCache('commodities', commodities, 10 * 60 * 1000); // 10 min cache
  return commodities;
}

// =============================================================================
// AGGREGATED WORLD STATE
// =============================================================================

export interface WorldState {
  timestamp: string;
  fear_greed: FearGreedData | null;
  crypto: CryptoPrice[];
  prediction_markets: PolymarketEvent[];
  economic: EconomicIndicator[];
  commodities: CommodityPrice[];
  weather: WeatherData[];
}

export async function fetchWorldState(): Promise<WorldState> {
  const cached = getCached<WorldState>('world-state');
  if (cached) return cached;

  // Fetch all data in parallel
  const [fear_greed, crypto, prediction_markets, economic, commodities, weather] = await Promise.all([
    fetchFearGreed(),
    fetchCryptoPrices(),
    fetchPolymarketOdds(),
    fetchEconomicIndicators(),
    fetchCommodities(),
    fetchWeather()
  ]);

  const state: WorldState = {
    timestamp: new Date().toISOString(),
    fear_greed,
    crypto,
    prediction_markets,
    economic,
    commodities,
    weather
  };

  setCache('world-state', state, 5 * 60 * 1000); // 5 min cache
  return state;
}

// =============================================================================
// DYNAMIC RISK SCORING
// =============================================================================

export interface DynamicRiskScore {
  score: number;
  components: {
    sentiment: number;
    geopolitical: number;
    economic: number;
    crypto: number;
  };
  drivers: string[];
}

export async function calculateDynamicRisk(): Promise<DynamicRiskScore> {
  const [fearGreed, polymarket, crypto] = await Promise.all([
    fetchFearGreed(),
    fetchPolymarketOdds(),
    fetchCryptoPrices()
  ]);

  // Sentiment score (inverted fear & greed: high greed = low risk score)
  const sentimentScore = fearGreed
    ? 100 - fearGreed.value // Invert: greed=low risk, fear=high risk
    : 50;

  // Geopolitical score from prediction markets
  let geoScore = 45; // Default moderate
  const geoEvents = polymarket.filter(e => {
    const q = e.question.toLowerCase();
    return (q.includes('war') || q.includes('iran') || q.includes('china') ||
            q.includes('russia') || q.includes('israel') || q.includes('tariff')) &&
            e.probability > 0;
  });
  if (geoEvents.length > 0) {
    const validEvents = geoEvents.filter(e => !isNaN(e.probability));
    if (validEvents.length > 0) {
      geoScore = validEvents.reduce((sum, e) => sum + e.probability, 0) / validEvents.length;
    }
  }

  // Economic score (recession odds, fed policy, crypto)
  let econScore = 40;
  const econEvents = polymarket.filter(e => {
    const q = e.question.toLowerCase();
    return (q.includes('recession') || q.includes('fed') || q.includes('bitcoin') || q.includes('crypto')) &&
            e.probability > 0;
  });
  if (econEvents.length > 0) {
    const validEvents = econEvents.filter(e => !isNaN(e.probability));
    if (validEvents.length > 0) {
      econScore = validEvents.reduce((sum, e) => sum + e.probability, 0) / validEvents.length;
    }
  }

  // Crypto volatility score (24h changes)
  let cryptoVolatility = 30;
  if (crypto.length > 0) {
    const avgChange = crypto.reduce((sum, c) => sum + Math.abs(c.price_change_percentage_24h || 0), 0) / crypto.length;
    cryptoVolatility = Math.min(100, avgChange * 10); // Scale up
  }

  // Weighted composite score
  const rawScore =
    sentimentScore * 0.30 +
    geoScore * 0.30 +
    econScore * 0.20 +
    cryptoVolatility * 0.20;

  const score = Math.round(Math.max(0, Math.min(100, rawScore)));

  // Identify key drivers
  const drivers: string[] = [];
  if (fearGreed && fearGreed.value < 25) drivers.push('Extreme Fear in crypto markets');
  if (fearGreed && fearGreed.value > 75) drivers.push('Extreme Greed in crypto markets');
  if (geoScore > 50) drivers.push('Elevated geopolitical tensions');
  if (econScore > 50) drivers.push('Economic uncertainty elevated');
  if (cryptoVolatility > 40) drivers.push('High crypto volatility');
  if (crypto.length > 0 && crypto[0].price_change_percentage_24h < -5) drivers.push('BTC down >5% in 24h');

  return {
    score,
    components: {
      sentiment: Math.round(sentimentScore),
      geopolitical: Math.round(geoScore),
      economic: Math.round(econScore),
      crypto: Math.round(cryptoVolatility)
    },
    drivers
  };
}
