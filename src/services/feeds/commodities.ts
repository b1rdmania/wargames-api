/**
 * Commodities Feed - Energy + Metals
 * Source: FRED
 */

import { getCached, setCache, FeedResponse, fetchFREDBatch } from './index';

export interface CommodityTicker {
  symbol: string;
  value: number | null;
  change_24h: number | null;
  change_7d: number | null;
  unit: string;
  timestamp: string;
  frequency: 'daily' | 'weekly' | 'monthly';
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

const FRED_SERIES = {
  WTI: 'DCOILWTICO',
  BRENT: 'DCOILBRENTEU',
  NATGAS: 'DHHNGSP',
  GOLD: 'GOLDAMGBD228NLBM',
  COPPER: 'PCOPPUSDM'
};

export async function fetchCommodities(): Promise<FeedResponse<CommoditiesData>> {
  const cacheKey = 'feed-commodities';
  const cached = getCached<FeedResponse<CommoditiesData>>(cacheKey);
  if (cached) return cached;

  const warnings: string[] = [];
  const energy: CommodityTicker[] = [];
  const metals: CommodityTicker[] = [];

  try {
    const fredData = await fetchFREDBatch(Object.values(FRED_SERIES));

    // WTI
    const wtiObs = fredData[FRED_SERIES.WTI]?.observations;
    if (wtiObs && wtiObs.length >= 2) {
      const current = parseFloat(wtiObs[0].value);
      const previous = parseFloat(wtiObs[1].value);
      energy.push({
        symbol: 'WTI',
        value: current,
        change_24h: ((current - previous) / previous) * 100,
        change_7d: null,
        unit: 'USD/bbl',
        timestamp: `${wtiObs[0].date}T16:00:00Z`,
        frequency: 'daily'
      });
    }

    // BRENT
    const brentObs = fredData[FRED_SERIES.BRENT]?.observations;
    if (brentObs && brentObs.length >= 2) {
      const current = parseFloat(brentObs[0].value);
      const previous = parseFloat(brentObs[1].value);
      energy.push({
        symbol: 'BRENT',
        value: current,
        change_24h: ((current - previous) / previous) * 100,
        change_7d: null,
        unit: 'USD/bbl',
        timestamp: `${brentObs[0].date}T16:00:00Z`,
        frequency: 'daily'
      });
    }

    // NATGAS
    const natgasObs = fredData[FRED_SERIES.NATGAS]?.observations;
    if (natgasObs && natgasObs.length >= 2) {
      const current = parseFloat(natgasObs[0].value);
      const previous = parseFloat(natgasObs[1].value);
      energy.push({
        symbol: 'NATGAS',
        value: current,
        change_24h: ((current - previous) / previous) * 100,
        change_7d: null,
        unit: 'USD/mmBtu',
        timestamp: `${natgasObs[0].date}T16:00:00Z`,
        frequency: 'daily',
        note: 'Henry Hub spot price'
      });
    }

    // GOLD
    const goldObs = fredData[FRED_SERIES.GOLD]?.observations;
    if (goldObs && goldObs.length >= 2) {
      const current = parseFloat(goldObs[0].value);
      const previous = parseFloat(goldObs[1].value);
      metals.push({
        symbol: 'GOLD',
        value: current,
        change_24h: ((current - previous) / previous) * 100,
        change_7d: null,
        unit: 'USD/oz',
        timestamp: `${goldObs[0].date}T16:00:00Z`,
        frequency: 'daily',
        note: 'LBMA AM fix'
      });
    }

    // COPPER (monthly data)
    const copperObs = fredData[FRED_SERIES.COPPER]?.observations;
    if (copperObs && copperObs.length >= 1) {
      const current = parseFloat(copperObs[0].value);
      metals.push({
        symbol: 'COPPER',
        value: current,
        change_24h: null,
        change_7d: null,
        unit: 'USD/ton',
        timestamp: `${copperObs[0].date}T00:00:00Z`,
        frequency: 'monthly',
        note: 'Monthly data only (FRED: PCOPPUSDM)'
      });
    }

    // Calculate energy stress
    const wtiChange = energy[0]?.change_24h || 0;
    const natgasChange = energy[2]?.change_24h || 0;
    const energyStress = Math.min(100, Math.round(
      Math.abs(wtiChange) * 5 + Math.abs(natgasChange) * 3
    ));

    // Calculate inflation signal
    const goldChange = metals[0]?.change_24h || 0;
    const inflationSignal: 'deflationary' | 'neutral' | 'inflationary' =
      (wtiChange > 5 && goldChange > 2) ? 'inflationary' :
      (wtiChange < -5 && goldChange < -2) ? 'deflationary' :
      'neutral';

    const response: FeedResponse<CommoditiesData> = {
      data: {
        energy,
        metals,
        summary: {
          energy_stress: energyStress,
          inflation_signal: inflationSignal
        }
      },
      metadata: {
        provider: 'FRED',
        fetchedAt: new Date().toISOString(),
        ttlMs: 21600000, // 6 hours
        freshness: 'daily',
        warnings: warnings.concat(['Copper data is monthly, not daily'])
      }
    };

    setCache(cacheKey, response, 21600000);
    return response;
  } catch (error) {
    console.error('Commodities fetch failed:', error);
    throw error;
  }
}
