/**
 * Credit Feed - Spreads + Systemic Stress
 * Source: FRED
 */

import { getCached, setCache, FeedResponse, fetchFREDBatch } from './index';

export interface CreditSpread {
  type: 'IG' | 'HY' | 'EM';
  oas: number | null;
  change_24h: number | null;
  percentile_1y: number;
  status: 'tight' | 'normal' | 'widening' | 'stressed';
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

const FRED_SERIES = {
  IG_OAS: 'BAMLC0A0CM',
  HY_OAS: 'BAMLH0A0HYM2'
};

export async function fetchCredit(): Promise<FeedResponse<CreditData>> {
  const cacheKey = 'feed-credit';
  const cached = getCached<FeedResponse<CreditData>>(cacheKey);
  if (cached) return cached;

  const warnings: string[] = [];
  const spreads: CreditSpread[] = [];

  try {
    const fredData = await fetchFREDBatch(Object.values(FRED_SERIES));

    // IG OAS
    const igObs = fredData[FRED_SERIES.IG_OAS]?.observations;
    let igValue = null;
    let igChange = null;
    if (igObs && igObs.length >= 2) {
      const current = parseFloat(igObs[0].value);
      const previous = parseFloat(igObs[1].value);
      igValue = current;
      igChange = current - previous;

      const igStatus: CreditSpread['status'] =
        current < 100 ? 'tight' :
        current < 150 ? 'normal' :
        current < 200 ? 'widening' : 'stressed';

      spreads.push({
        type: 'IG',
        oas: current,
        change_24h: igChange,
        percentile_1y: current < 100 ? 25 : current < 150 ? 50 : current < 200 ? 75 : 90,
        status: igStatus,
        timestamp: `${igObs[0].date}T16:00:00Z`
      });
    }

    // HY OAS
    const hyObs = fredData[FRED_SERIES.HY_OAS]?.observations;
    let hyValue = null;
    let hyChange = null;
    if (hyObs && hyObs.length >= 2) {
      const current = parseFloat(hyObs[0].value);
      const previous = parseFloat(hyObs[1].value);
      hyValue = current;
      hyChange = current - previous;

      const hyStatus: CreditSpread['status'] =
        current < 300 ? 'tight' :
        current < 400 ? 'normal' :
        current < 600 ? 'widening' : 'stressed';

      spreads.push({
        type: 'HY',
        oas: current,
        change_24h: hyChange,
        percentile_1y: current < 300 ? 25 : current < 400 ? 50 : current < 600 ? 75 : 90,
        status: hyStatus,
        timestamp: `${hyObs[0].date}T16:00:00Z`
      });
    }

    // EM (not available)
    spreads.push({
      type: 'EM',
      oas: null,
      change_24h: null,
      percentile_1y: 0,
      status: 'normal',
      timestamp: '',
      note: 'EM spreads not available via free sources'
    });

    // Calculate systemic stress
    const igPercentile = spreads[0]?.percentile_1y || 50;
    const hyPercentile = spreads[1]?.percentile_1y || 50;
    const velocityPenalty = ((igChange || 0) > 5 || (hyChange || 0) > 15) ? 20 : 0;

    const systemicStress = Math.min(100, Math.round(
      (igPercentile * 0.4) + (hyPercentile * 0.5) + velocityPenalty
    ));

    const regime: CreditData['summary']['regime'] =
      systemicStress < 30 ? 'low_stress' :
      systemicStress < 50 ? 'moderate' :
      systemicStress < 70 ? 'elevated' : 'crisis';

    const note =
      spreads[1]?.status === 'widening' ? 'Credit conditions normal; HY spreads widening modestly' :
      spreads[1]?.status === 'stressed' ? 'Credit stress elevated; monitor for systemic risk' :
      'Credit conditions stable';

    const response: FeedResponse<CreditData> = {
      data: {
        spreads,
        summary: {
          systemic_stress: systemicStress,
          regime,
          note
        }
      },
      metadata: {
        provider: 'FRED',
        fetchedAt: new Date().toISOString(),
        ttlMs: 21600000, // 6 hours
        freshness: 'daily',
        warnings: warnings.concat(['EM spreads unavailable (paid data only)'])
      }
    };

    setCache(cacheKey, response, 21600000);
    return response;
  } catch (error) {
    console.error('Credit fetch failed:', error);
    throw error;
  }
}
