/**
 * @wargames/sdk
 * Official SDK for WARGAMES - Macro intelligence for Solana agents
 *
 * "Your agent sees prices. It doesn't see the world."
 *
 * Example:
 * ```typescript
 * import { WARGAMES } from '@wargames/sdk';
 *
 * const wargames = new WARGAMES();
 * const { score } = await wargames.getRisk();
 *
 * if (score > 70) {
 *   // Reduce exposure
 * }
 * ```
 */

// Types
export interface RiskScore {
  score: number;
  bias: 'risk-on' | 'neutral' | 'risk-off';
  components: {
    sentiment: number;
    geopolitical: number;
    economic: number;
    crypto: number;
  };
  drivers: string[];
  timestamp: string;
}

export interface Narrative {
  id: string;
  title: string;
  description: string;
  current_score: number;
  trend: 'rising' | 'stable' | 'falling';
  impact: 'high' | 'medium' | 'low';
  last_updated: string;
}

export interface MacroEvent {
  date: string;
  title: string;
  description: string;
  category: string;
  impact: 'high' | 'medium' | 'low';
  region: string;
}

export interface WorldState {
  risk: RiskScore;
  crypto: any;
  sentiment: any;
  predictions: any;
  economic: any;
  commodities: any;
  timestamp: string;
}

export interface ProtocolData {
  tvl: string;
  tvl_usd: number;
  changes: {
    '1d': string;
    '7d': string;
    '1m': string;
  };
  insights: Record<string, any>;
  updated: string;
}

// Feed types
export interface FeedMetadata {
  provider: string;
  fetchedAt: string;
  ttlMs: number;
  freshness: 'realtime' | 'delayed' | 'eod' | 'daily' | 'monthly';
  warnings: string[];
}

export interface FeedResponse<T> {
  data: T;
  metadata: FeedMetadata;
}

export interface NewsItem {
  headline: string;
  source: string;
  timestamp: string;
  importance: number;
  category: 'macro' | 'geopolitics' | 'markets' | 'crypto' | 'energy' | 'other';
  url?: string;
}

export interface NewsData {
  breaking: NewsItem[];
  recent: NewsItem[];
}

export interface MarketTicker {
  symbol: string;
  value: number;
  change_24h: number | null;
  timestamp: string;
  unit: string;
  note?: string;
}

export interface MarketsData {
  tape: MarketTicker[];
  index: Record<string, MarketTicker>;
}

export interface VolTicker {
  symbol: string;
  value: number | null;
  change_24h: number | null;
  percentile_30d?: number;
  status: 'normal' | 'elevated' | 'extreme';
  timestamp: string;
  note?: string;
}

export interface VolData {
  indices: VolTicker[];
  volatility: VolTicker[];
  summary: {
    regime: 'risk-on' | 'neutral' | 'risk-off';
    vix_level: 'low' | 'normal' | 'elevated' | 'extreme';
  };
}

export interface CommodityTicker {
  symbol: string;
  value: number;
  change_24h: number | null;
  change_7d: number | null;
  unit: string;
  timestamp: string;
  frequency: 'daily' | 'monthly';
  note?: string;
}

export interface CommoditiesData {
  energy: CommodityTicker[];
  metals: CommodityTicker[];
  summary: {
    energy_stress: number;
    inflation_signal: 'deflationary' | 'neutral' | 'inflationary';
  };
}

export interface GeoEvent {
  region: string;
  country?: string;
  intensity: number;
  event_type: 'military' | 'diplomatic' | 'economic' | 'other';
  headline: string;
  timestamp: string;
  source: string;
  url?: string;
}

export interface GeoData {
  events: GeoEvent[];
  hotspots: Array<{
    region: string;
    event_count: number;
    avg_intensity: number;
  }>;
  sanctions_updates: any[];
}

export interface CreditSpread {
  type: 'IG' | 'HY' | 'EM';
  oas: number | null;
  change_24h: number | null;
  percentile_1y: number;
  status: 'tight' | 'normal' | 'widening' | 'stress';
  timestamp: string;
  note?: string;
}

export interface CreditData {
  spreads: CreditSpread[];
  summary: {
    systemic_stress: number;
    regime: 'low_stress' | 'moderate' | 'elevated' | 'crisis';
    note: string;
  };
}

export interface TapeData {
  breaking_news: NewsItem[];
  tape: Array<{
    category: 'fx' | 'rates' | 'indices' | 'vol' | 'commodities' | 'credit';
    items: Array<MarketTicker | VolTicker | CommodityTicker | CreditSpread>;
  }>;
  geo: GeoEvent[];
  summary: {
    market_regime: 'risk-on' | 'neutral' | 'risk-off';
    systemic_stress: number;
    top_risks: string[];
  };
}

// Configuration
export interface WARGAMESConfig {
  baseURL?: string;
  timeout?: number;
}

// Main SDK class
export class WARGAMES {
  private baseURL: string;
  private timeout: number;

  constructor(config: WARGAMESConfig = {}) {
    this.baseURL = config.baseURL || 'https://wargames-api.fly.dev';
    this.timeout = config.timeout || 10000;
  }

  /**
   * Live feed endpoints - Real-time market and geopolitical data
   */
  get live() {
    return {
      /**
       * Get breaking news with importance scoring
       * @returns {Promise<FeedResponse<NewsData>>} Breaking and recent news
       *
       * @example
       * const { data, metadata } = await wargames.live.news();
       * data.breaking.forEach(item => {
       *   if (item.importance > 80) console.log(`Critical: ${item.headline}`);
       * });
       */
      news: (): Promise<FeedResponse<NewsData>> => {
        return this.fetch<FeedResponse<NewsData>>('/live/news');
      },

      /**
       * Get FX rates and US rates (FRED + Frankfurter)
       * @returns {Promise<FeedResponse<MarketsData>>} Market data
       *
       * @example
       * const { data } = await wargames.live.markets();
       * const dxy = data.index['DXY'];
       * const ust10y = data.index['UST_10Y'];
       */
      markets: (): Promise<FeedResponse<MarketsData>> => {
        return this.fetch<FeedResponse<MarketsData>>('/live/markets');
      },

      /**
       * Get equity indices and VIX volatility
       * @returns {Promise<FeedResponse<VolData>>} Volatility data
       *
       * @example
       * const { data } = await wargames.live.vol();
       * if (data.summary.regime === 'risk-off') {
       *   console.log('Risk-off regime detected');
       * }
       */
      vol: (): Promise<FeedResponse<VolData>> => {
        return this.fetch<FeedResponse<VolData>>('/live/vol');
      },

      /**
       * Get commodity prices (energy + metals)
       * @returns {Promise<FeedResponse<CommoditiesData>>} Commodity data
       *
       * @example
       * const { data } = await wargames.live.commodities();
       * if (data.summary.energy_stress > 70) {
       *   console.log('Energy markets stressed');
       * }
       */
      commodities: (): Promise<FeedResponse<CommoditiesData>> => {
        return this.fetch<FeedResponse<CommoditiesData>>('/live/commodities');
      },

      /**
       * Get geopolitical events with intensity scoring
       * @returns {Promise<FeedResponse<GeoData>>} Geopolitical events
       *
       * @example
       * const { data } = await wargames.live.geo();
       * const highTension = data.events.filter(e => e.intensity > 80);
       */
      geo: (): Promise<FeedResponse<GeoData>> => {
        return this.fetch<FeedResponse<GeoData>>('/live/geo');
      },

      /**
       * Get credit spreads (IG/HY/EM)
       * @returns {Promise<FeedResponse<CreditData>>} Credit spread data
       *
       * @example
       * const { data } = await wargames.live.credit();
       * if (data.summary.systemic_stress > 70) {
       *   console.log('Credit markets showing stress');
       * }
       */
      credit: (): Promise<FeedResponse<CreditData>> => {
        return this.fetch<FeedResponse<CreditData>>('/live/credit');
      },

      /**
       * Get unified trading floor feed (aggregates all above)
       * @returns {Promise<FeedResponse<TapeData>>} Complete market snapshot
       *
       * @example
       * const { data } = await wargames.live.tape();
       * console.log(`Regime: ${data.summary.market_regime}`);
       * console.log(`Stress: ${data.summary.systemic_stress}/100`);
       * data.summary.top_risks.forEach(risk => console.log(`- ${risk}`));
       */
      tape: (): Promise<FeedResponse<TapeData>> => {
        return this.fetch<FeedResponse<TapeData>>('/live/tape');
      }
    };
  }

  /**
   * Get current global risk score
   * @returns {Promise<RiskScore>} Current risk assessment
   *
   * @example
   * const { score, bias } = await wargames.getRisk();
   * if (score > 70) {
   *   console.log('High risk detected - reducing exposure');
   * }
   */
  async getRisk(): Promise<RiskScore> {
    return this.fetch<RiskScore>('/live/risk');
  }

  /**
   * Get all active geopolitical narratives
   * @returns {Promise<Narrative[]>} List of narratives with scores
   *
   * @example
   * const narratives = await wargames.getNarratives();
   * const aiHype = narratives.find(n => n.id === 'ai-bubble');
   * if (aiHype.current_score > 70) {
   *   console.log('AI bubble warning');
   * }
   */
  async getNarratives(): Promise<Narrative[]> {
    return this.fetch<Narrative[]>('/narratives');
  }

  /**
   * Get specific narrative by ID
   * @param {string} id Narrative ID (e.g., 'ai-bubble', 'fed-pivot')
   * @returns {Promise<Narrative>} Narrative details
   */
  async getNarrative(id: string): Promise<Narrative> {
    return this.fetch<Narrative>(`/narratives/${id}`);
  }

  /**
   * Get upcoming macro events
   * @param {Object} filters Optional filters
   * @param {boolean} filters.high_impact Only high-impact events
   * @param {number} filters.days Number of days ahead
   * @returns {Promise<MacroEvent[]>} Upcoming events
   *
   * @example
   * const events = await wargames.getEvents({ high_impact: true, days: 7 });
   * const fomcToday = events.some(e => e.category === 'monetary_policy');
   */
  async getEvents(filters?: { high_impact?: boolean; days?: number }): Promise<MacroEvent[]> {
    const params = new URLSearchParams();
    if (filters?.high_impact) params.set('high_impact', 'true');
    if (filters?.days) params.set('days', filters.days.toString());

    const query = params.toString() ? `?${params}` : '';
    return this.fetch<MacroEvent[]>(`/events${query}`);
  }

  /**
   * Get complete world state (all data in one call)
   * @returns {Promise<WorldState>} Complete macro state
   *
   * @example
   * const world = await wargames.getWorldState();
   * console.log(`Risk: ${world.risk.score}, Fear & Greed: ${world.sentiment.value}`);
   */
  async getWorldState(): Promise<WorldState> {
    return this.fetch<WorldState>('/live/world');
  }

  /**
   * Get Solana DeFi protocol data
   * @param {string} protocol Protocol slug (e.g., 'kamino', 'drift-trade', 'meteora', 'marginfi')
   * @returns {Promise<ProtocolData>} Protocol TVL and metrics
   *
   * @example
   * const kamino = await wargames.getProtocol('kamino');
   * if (parseFloat(kamino.tvl_usd) > 1e9) {
   *   console.log('Major protocol - safe to use');
   * }
   */
  async getProtocol(protocol: 'kamino' | 'drift' | 'meteora' | 'marginfi'): Promise<ProtocolData> {
    const endpoint = `/live/${protocol}`;
    const response = await this.fetch<any>(endpoint);
    return {
      tvl: response.tvl || response.metrics?.tvl,
      tvl_usd: response.tvl_usd || response.metrics?.tvl_usd,
      changes: response.changes || {},
      insights: response.insights || {},
      updated: response.updated || new Date().toISOString()
    };
  }

  /**
   * Get Pyth Network on-chain prices
   * @returns {Promise<any>} Pyth price feeds
   */
  async getPythPrices(): Promise<any> {
    return this.fetch<any>('/live/pyth');
  }

  /**
   * Get Solana network health
   * @returns {Promise<any>} Network metrics (TPS, validators, etc.)
   */
  async getSolanaMetrics(): Promise<any> {
    return this.fetch<any>('/live/solana');
  }

  /**
   * Helper: Calculate position sizing multiplier based on risk
   * @param {number} baseSize Base position size
   * @returns {Promise<number>} Adjusted position size
   *
   * @example
   * const baseSize = 1000; // USDC
   * const adjustedSize = await wargames.getPositionSize(baseSize);
   * // If risk is 80, returns 400 (0.4x multiplier)
   */
  async getPositionSize(baseSize: number): Promise<number> {
    const { score } = await this.getRisk();
    const multiplier = 1.5 - (score / 100); // High risk = smaller positions
    return baseSize * multiplier;
  }

  /**
   * Helper: Check if it's safe to execute a trade
   * @returns {Promise<{safe: boolean, reason: string}>} Safety check
   *
   * @example
   * const { safe, reason } = await wargames.isSafeToTrade();
   * if (!safe) {
   *   console.log(`Skipping trade: ${reason}`);
   * }
   */
  async isSafeToTrade(): Promise<{ safe: boolean; reason: string }> {
    const [risk, events] = await Promise.all([
      this.getRisk(),
      this.getEvents({ high_impact: true, days: 1 })
    ]);

    if (risk.score > 80) {
      return { safe: false, reason: `Extreme risk (${risk.score}/100)` };
    }

    const criticalEventToday = events.some(e => {
      const eventDate = new Date(e.date);
      const today = new Date();
      return eventDate.toDateString() === today.toDateString() && e.impact === 'high';
    });

    if (criticalEventToday) {
      return { safe: false, reason: 'High-impact macro event today' };
    }

    return { safe: true, reason: 'Conditions favorable' };
  }

  // Private fetch helper
  private async fetch<T>(endpoint: string): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`WARGAMES API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;

      // Handle different response formats
      if (data.error) {
        throw new Error(data.error);
      }

      // Some endpoints wrap data in a property
      if (endpoint.startsWith('/live/')) {
        return data as T;
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.timeout}ms`);
        }
        throw error;
      }

      throw new Error('Unknown error occurred');
    }
  }
}

// Export default instance for convenience
const wargames = new WARGAMES();
export default wargames;
