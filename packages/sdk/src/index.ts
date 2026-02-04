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
    this.baseURL = config.baseURL || 'https://wargames-api.vercel.app';
    this.timeout = config.timeout || 10000;
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
