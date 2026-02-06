/**
 * Volatility Feed - Equity indices + VIX
 * Source: FRED
 */

import { getCached, setCache, FeedResponse, fetchFREDBatch } from './index';

export interface VolTicker {
  symbol: string;
  value: number | null;
  change_24h: number | null;
  percentile_30d?: number;
  status: 'low' | 'normal' | 'elevated' | 'extreme';
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

const FRED_SERIES = {
  SPX: 'SP500',
  NDX: 'NASDAQCOM',
  VIX: 'VIXCLS'
};

export async function fetchVolatility(): Promise<FeedResponse<VolData>> {
  const cacheKey = 'feed-volatility';
  const cached = getCached<FeedResponse<VolData>>(cacheKey);
  if (cached) return cached;

  const warnings: string[] = [];
  const indices: VolTicker[] = [];
  const volatility: VolTicker[] = [];

  try {
    const fredData = await fetchFREDBatch(Object.values(FRED_SERIES));

    // SPX
    const spxObs = fredData[FRED_SERIES.SPX]?.observations;
    if (spxObs && spxObs.length >= 2) {
      const current = parseFloat(spxObs[0].value);
      const previous = parseFloat(spxObs[1].value);
      const change = ((current - previous) / previous) * 100;

      indices.push({
        symbol: 'SPX',
        value: current,
        change_24h: change,
        percentile_30d: 50,
        status: 'normal',
        timestamp: `${spxObs[0].date}T21:00:00Z`,
        note: 'S&P 500 daily close (FRED: SP500)'
      });
    }

    // NDX
    const ndxObs = fredData[FRED_SERIES.NDX]?.observations;
    if (ndxObs && ndxObs.length >= 2) {
      const current = parseFloat(ndxObs[0].value);
      const previous = parseFloat(ndxObs[1].value);
      const change = ((current - previous) / previous) * 100;

      indices.push({
        symbol: 'NDX',
        value: current,
        change_24h: change,
        percentile_30d: 50,
        status: 'normal',
        timestamp: `${ndxObs[0].date}T21:00:00Z`,
        note: 'Nasdaq Composite close (FRED: NASDAQCOM)'
      });
    }

    // VIX
    const vixObs = fredData[FRED_SERIES.VIX]?.observations;
    let vixValue = null;
    let vixChange = null;
    if (vixObs && vixObs.length >= 2) {
      const current = parseFloat(vixObs[0].value);
      const previous = parseFloat(vixObs[1].value);
      vixValue = current;
      vixChange = current - previous;

      const vixStatus =
        current < 15 ? 'low' :
        current < 20 ? 'normal' :
        current < 30 ? 'elevated' : 'extreme';

      volatility.push({
        symbol: 'VIX',
        value: current,
        change_24h: vixChange,
        percentile_30d: current < 15 ? 25 : current < 20 ? 50 : current < 30 ? 75 : 90,
        status: vixStatus,
        timestamp: `${vixObs[0].date}T21:00:00Z`
      });
    }

    // MOVE (not available)
    volatility.push({
      symbol: 'MOVE',
      value: null,
      change_24h: null,
      status: 'normal',
      timestamp: '',
      note: 'MOVE index not available via free sources'
    });

    // Calculate regime
    const spxChange = indices[0]?.change_24h || 0;
    const vix = vixValue || 18;

    const regime: 'risk-on' | 'neutral' | 'risk-off' =
      (vix < 15 && spxChange > 0) ? 'risk-on' :
      (vix > 25 || spxChange < -2) ? 'risk-off' :
      'neutral';

    const vixLevel: 'low' | 'normal' | 'elevated' | 'extreme' =
      vix < 15 ? 'low' :
      vix < 20 ? 'normal' :
      vix < 30 ? 'elevated' : 'extreme';

    const response: FeedResponse<VolData> = {
      data: {
        indices,
        volatility,
        summary: {
          regime,
          vix_level: vixLevel
        }
      },
      metadata: {
        provider: 'FRED',
        fetchedAt: new Date().toISOString(),
        ttlMs: 21600000, // 6 hours
        freshness: 'eod',
        warnings: warnings.concat(['MOVE index unavailable (paid data only)'])
      }
    };

    setCache(cacheKey, response, 21600000);
    return response;
  } catch (error) {
    console.error('Volatility fetch failed:', error);
    throw error;
  }
}
