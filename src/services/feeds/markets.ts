/**
 * Markets Feed - FX + Rates tape
 * Sources: FRED (rates, DXY), Frankfurter (FX)
 */

import { getCached, setCache, FeedResponse, fetchFREDBatch, fetchFrankfurter } from './index';

export interface MarketTicker {
  symbol: string;
  value: number | null;
  change_24h: number | null;
  timestamp: string;
  unit: string;
  note?: string;
}

export interface MarketsData {
  tape: MarketTicker[];
  index: Record<string, MarketTicker>;
}

const FRED_SERIES = {
  DXY: 'DTWEXBGS',
  UST_2Y: 'DGS2',
  UST_10Y: 'DGS10',
  SOFR: 'SOFR',
  EFFR: 'EFFR'
};

export async function fetchMarkets(): Promise<FeedResponse<MarketsData>> {
  const cacheKey = 'feed-markets';
  const cached = getCached<FeedResponse<MarketsData>>(cacheKey);
  if (cached) return cached;

  const warnings: string[] = [];
  const tickers: MarketTicker[] = [];

  // Fetch FX from Frankfurter
  try {
    const fxData = await fetchFrankfurter('USD', ['EUR', 'JPY', 'GBP']);

    if (fxData.rates) {
      tickers.push({
        symbol: 'EURUSD',
        value: fxData.rates.EUR ? 1 / fxData.rates.EUR : null,
        change_24h: null,
        timestamp: fxData.date ? `${fxData.date}T16:00:00Z` : new Date().toISOString(),
        unit: 'ratio'
      });

      tickers.push({
        symbol: 'USDJPY',
        value: fxData.rates.JPY || null,
        change_24h: null,
        timestamp: fxData.date ? `${fxData.date}T16:00:00Z` : new Date().toISOString(),
        unit: 'ratio'
      });

      tickers.push({
        symbol: 'GBPUSD',
        value: fxData.rates.GBP ? 1 / fxData.rates.GBP : null,
        change_24h: null,
        timestamp: fxData.date ? `${fxData.date}T16:00:00Z` : new Date().toISOString(),
        unit: 'ratio'
      });
    }
  } catch (error) {
    console.error('Frankfurter fetch failed:', error);
    warnings.push('FX data unavailable');
  }

  // Fetch rates from FRED
  try {
    const fredData = await fetchFREDBatch(Object.values(FRED_SERIES));

    // DXY
    const dxyObs = fredData[FRED_SERIES.DXY]?.observations;
    if (dxyObs && dxyObs.length >= 2) {
      const current = parseFloat(dxyObs[0].value);
      const previous = parseFloat(dxyObs[1].value);
      tickers.push({
        symbol: 'DXY',
        value: current,
        change_24h: ((current - previous) / previous) * 100,
        timestamp: `${dxyObs[0].date}T16:00:00Z`,
        unit: 'points',
        note: 'Trade-weighted USD index (FRED: DTWEXBGS, daily close)'
      });
    }

    // UST 2Y
    const ust2yObs = fredData[FRED_SERIES.UST_2Y]?.observations;
    if (ust2yObs && ust2yObs.length >= 2) {
      const current = parseFloat(ust2yObs[0].value);
      const previous = parseFloat(ust2yObs[1].value);
      tickers.push({
        symbol: 'UST_2Y',
        value: current,
        change_24h: current - previous,
        timestamp: `${ust2yObs[0].date}T16:00:00Z`,
        unit: '%'
      });
    }

    // UST 10Y
    const ust10yObs = fredData[FRED_SERIES.UST_10Y]?.observations;
    if (ust10yObs && ust10yObs.length >= 2) {
      const current = parseFloat(ust10yObs[0].value);
      const previous = parseFloat(ust10yObs[1].value);
      tickers.push({
        symbol: 'UST_10Y',
        value: current,
        change_24h: current - previous,
        timestamp: `${ust10yObs[0].date}T16:00:00Z`,
        unit: '%'
      });
    }

    // SOFR
    const sofrObs = fredData[FRED_SERIES.SOFR]?.observations;
    if (sofrObs && sofrObs.length >= 2) {
      const current = parseFloat(sofrObs[0].value);
      const previous = parseFloat(sofrObs[1].value);
      tickers.push({
        symbol: 'SOFR',
        value: current,
        change_24h: current - previous,
        timestamp: `${sofrObs[0].date}T16:00:00Z`,
        unit: '%'
      });
    }

    // EFFR
    const effrObs = fredData[FRED_SERIES.EFFR]?.observations;
    if (effrObs && effrObs.length >= 2) {
      const current = parseFloat(effrObs[0].value);
      const previous = parseFloat(effrObs[1].value);
      tickers.push({
        symbol: 'EFFR',
        value: current,
        change_24h: current - previous,
        timestamp: `${effrObs[0].date}T16:00:00Z`,
        unit: '%',
        note: 'Effective Fed Funds Rate'
      });
    }
  } catch (error) {
    console.error('FRED fetch failed:', error);
    warnings.push('Rates data unavailable');
  }

  // Build index
  const index: Record<string, MarketTicker> = {};
  for (const ticker of tickers) {
    index[ticker.symbol] = ticker;
  }

  const response: FeedResponse<MarketsData> = {
    data: {
      tape: tickers,
      index
    },
    metadata: {
      provider: 'FRED + Frankfurter',
      fetchedAt: new Date().toISOString(),
      ttlMs: 21600000, // 6 hours
      freshness: 'daily',
      warnings
    }
  };

  setCache(cacheKey, response, 21600000);
  return response;
}
