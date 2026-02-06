/**
 * Unified Tape Feed - Aggregates all feeds
 * Single endpoint for control-centre dashboard
 */

import { FeedResponse } from './index';
import { fetchNews, NewsItem } from './news';
import { fetchMarkets, MarketTicker } from './markets';
import { fetchVolatility, VolTicker } from './volatility';
import { fetchCommodities, CommodityTicker } from './commodities';
import { fetchGeopolitics, GeoEvent } from './geopolitics';
import { fetchCredit, CreditSpread } from './credit';

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

export async function fetchTape(): Promise<FeedResponse<TapeData>> {
  // Fetch all feeds in parallel
  const [newsData, marketsData, volData, commoditiesData, geoData, creditData] = await Promise.all([
    fetchNews().catch(() => null),
    fetchMarkets().catch(() => null),
    fetchVolatility().catch(() => null),
    fetchCommodities().catch(() => null),
    fetchGeopolitics().catch(() => null),
    fetchCredit().catch(() => null)
  ]);

  const warnings: string[] = [];
  const sources: string[] = [];

  // Breaking news (top 5)
  const breaking_news = newsData?.data.breaking.slice(0, 5) || [];
  if (newsData) sources.push('GDELT');

  // Build tape sections
  const tape: TapeData['tape'] = [];

  // FX + Rates from markets
  if (marketsData) {
    const fxItems = marketsData.data.tape.filter(t =>
      ['EURUSD', 'USDJPY', 'GBPUSD', 'DXY'].includes(t.symbol)
    );
    if (fxItems.length > 0) {
      tape.push({ category: 'fx', items: fxItems });
    }

    const ratesItems = marketsData.data.tape.filter(t =>
      ['UST_2Y', 'UST_10Y', 'SOFR', 'EFFR'].includes(t.symbol)
    );
    if (ratesItems.length > 0) {
      tape.push({ category: 'rates', items: ratesItems });
    }

    sources.push('FRED');
    sources.push('Frankfurter');
  }

  // Indices from vol
  if (volData) {
    if (volData.data.indices.length > 0) {
      tape.push({ category: 'indices', items: volData.data.indices });
    }
    if (volData.data.volatility.length > 0) {
      tape.push({ category: 'vol', items: volData.data.volatility });
    }
  }

  // Commodities
  if (commoditiesData) {
    const allCommodities = [
      ...commoditiesData.data.energy,
      ...commoditiesData.data.metals
    ];
    if (allCommodities.length > 0) {
      tape.push({ category: 'commodities', items: allCommodities });
    }
  }

  // Credit
  if (creditData) {
    tape.push({ category: 'credit', items: creditData.data.spreads });
  }

  // Geo events (top 5)
  const geo = geoData?.data.events.slice(0, 5) || [];

  // Summary
  const market_regime = volData?.data.summary.regime || 'neutral';
  const systemic_stress = creditData?.data.summary.systemic_stress || 0;

  const top_risks: string[] = [];
  if (geo[0]) {
    top_risks.push(`${geo[0].headline.slice(0, 60)}... (intensity: ${geo[0].intensity})`);
  }
  if (creditData && creditData.data.spreads[1]?.status === 'widening' && creditData.data.spreads[1].change_24h !== null) {
    top_risks.push(`Credit spreads widening (HY ${creditData.data.spreads[1].change_24h > 0 ? '+' : ''}${creditData.data.spreads[1].change_24h}bps)`);
  }
  if (commoditiesData && commoditiesData.data.summary.energy_stress > 60) {
    top_risks.push('Oil volatility elevated');
  }

  // Aggregate warnings
  if (!newsData) warnings.push('News feed unavailable');
  if (!marketsData) warnings.push('Markets feed unavailable');
  if (!volData) warnings.push('Volatility feed unavailable');
  if (!commoditiesData) warnings.push('Commodities feed unavailable');
  if (!geoData) warnings.push('Geopolitics feed unavailable');
  if (!creditData) warnings.push('Credit feed unavailable');

  const combinedWarnings = Array.from(new Set([
    ...warnings,
    'Most data is daily close (not realtime)',
    'MOVE index unavailable',
    'EM spreads unavailable'
  ]));

  const response: FeedResponse<TapeData> = {
    data: {
      breaking_news,
      tape,
      geo,
      summary: {
        market_regime,
        systemic_stress,
        top_risks
      }
    },
    metadata: {
      provider: Array.from(new Set(sources)).join(' + '),
      fetchedAt: new Date().toISOString(),
      ttlMs: 60000, // 1 minute
      freshness: 'mixed' as any,
      warnings: combinedWarnings
    }
  };

  return response;
}
