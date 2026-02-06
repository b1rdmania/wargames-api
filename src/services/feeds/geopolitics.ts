/**
 * Geopolitics Feed - Events + Sanctions
 * Sources: GDELT, OFAC
 */

import { getCached, setCache, FeedResponse, fetchGDELT } from './index';

export interface GeoEvent {
  region: string;
  country?: string;
  intensity: number;
  event_type: 'conflict' | 'sanctions' | 'diplomatic' | 'protest' | 'military' | 'other';
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
  sanctions_updates: Array<{
    entity: string;
    action: string;
    timestamp: string;
  }>;
}

export async function fetchGeopolitics(): Promise<FeedResponse<GeoData>> {
  const cacheKey = 'feed-geo';
  const cached = getCached<FeedResponse<GeoData>>(cacheKey);
  if (cached) return cached;

  const warnings: string[] = [];
  const events: GeoEvent[] = [];

  try {
    // GDELT for geopolitical events
    const queries = [
      'Iran military OR "Strait of Hormuz"',
      'China Taiwan OR "South China Sea"',
      'Russia Ukraine',
      'North Korea missile',
      'Israel Gaza OR "Red Sea"'
    ];

    for (const query of queries) {
      try {
        const gdeltData = await fetchGDELT(query, 20);

        if (gdeltData.articles) {
          for (const article of gdeltData.articles) {
            const event: GeoEvent = {
              region: determineRegion(article.title || ''),
              country: extractCountry(article.title || ''),
              intensity: calculateIntensity(article),
              event_type: categorizeEvent(article.title || ''),
              headline: article.title || '',
              timestamp: article.seendate || new Date().toISOString(),
              source: 'GDELT',
              url: article.url
            };
            events.push(event);
          }
        }
      } catch (error) {
        console.error(`GDELT query failed for "${query}":`, error);
      }
    }
  } catch (error) {
    console.error('GDELT geopolitics fetch failed:', error);
    warnings.push('Geopolitical data partially unavailable');
  }

  // Sort by intensity
  events.sort((a, b) => b.intensity - a.intensity);

  // Calculate hotspots
  const regionMap: Map<string, { count: number; totalIntensity: number }> = new Map();
  for (const event of events) {
    const existing = regionMap.get(event.region) || { count: 0, totalIntensity: 0 };
    regionMap.set(event.region, {
      count: existing.count + 1,
      totalIntensity: existing.totalIntensity + event.intensity
    });
  }

  const hotspots = Array.from(regionMap.entries()).map(([region, data]) => ({
    region,
    event_count: data.count,
    avg_intensity: Math.round(data.totalIntensity / data.count)
  })).sort((a, b) => b.avg_intensity - a.avg_intensity);

  const response: FeedResponse<GeoData> = {
    data: {
      events: events.slice(0, 50),
      hotspots,
      sanctions_updates: [] // OFAC integration optional
    },
    metadata: {
      provider: 'GDELT',
      fetchedAt: new Date().toISOString(),
      ttlMs: 900000, // 15 minutes
      freshness: 'realtime',
      warnings
    }
  };

  setCache(cacheKey, response, 900000);
  return response;
}

function determineRegion(text: string): string {
  const lower = text.toLowerCase();

  if (lower.match(/iran|iraq|saudi|gulf|strait of hormuz|israel|gaza|lebanon/)) return 'Middle East';
  if (lower.match(/china|taiwan|south china sea|korea|japan/)) return 'East Asia';
  if (lower.match(/russia|ukraine|belarus|poland|baltic/)) return 'Europe';
  if (lower.match(/venezuela|brazil|mexico|colombia/)) return 'Latin America';
  if (lower.match(/india|pakistan|afghanistan/)) return 'South Asia';
  if (lower.match(/nigeria|ethiopia|sudan|congo/)) return 'Africa';

  return 'Global';
}

function extractCountry(text: string): string | undefined {
  const countries = ['Iran', 'China', 'Russia', 'Ukraine', 'Israel', 'Taiwan', 'North Korea', 'Saudi Arabia'];
  for (const country of countries) {
    if (text.includes(country)) return country;
  }
  return undefined;
}

function calculateIntensity(article: any): number {
  const headline = (article.title || '').toLowerCase();

  let intensity = 50; // Base

  // Keyword boosts
  const keywords: Record<string, number> = {
    'missile': 25, 'nuclear': 30, 'war': 25,
    'invasion': 28, 'sanctions': 20, 'strike': 22,
    'attack': 25, 'drone': 18, 'naval': 15,
    'military': 15, 'conflict': 18, 'crisis': 20,
    'blockade': 22, 'embargo': 18
  };

  for (const [keyword, boost] of Object.entries(keywords)) {
    if (headline.includes(keyword)) {
      intensity += boost;
    }
  }

  return Math.min(100, intensity);
}

function categorizeEvent(headline: string): GeoEvent['event_type'] {
  const lower = headline.toLowerCase();

  if (lower.match(/missile|strike|attack|war|invasion|drone/)) return 'military';
  if (lower.match(/sanctions|embargo|blockade/)) return 'sanctions';
  if (lower.match(/protest|demonstration|riot/)) return 'protest';
  if (lower.match(/talks|meeting|summit|treaty|agreement/)) return 'diplomatic';
  if (lower.match(/conflict|tension|dispute/)) return 'conflict';

  return 'other';
}
