/**
 * News Feed - Breaking headlines with importance scoring
 * Source: GDELT (primary), NewsAPI (optional)
 */

import { getCached, setCache, FeedResponse, fetchGDELT } from './index';

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

export async function fetchNews(): Promise<FeedResponse<NewsData>> {
  const cacheKey = 'feed-news';
  const cached = getCached<FeedResponse<NewsData>>(cacheKey);
  if (cached) return cached;

  const warnings: string[] = [];
  const items: NewsItem[] = [];

  try {
    const gdeltQuery = 'FOMC OR "Federal Reserve" OR "rate cut" OR sanctions OR Iran OR Taiwan OR recession OR Bitcoin OR crypto OR "interest rates" OR inflation';
    const gdeltData = await fetchGDELT(gdeltQuery, 50);

    if (gdeltData.articles) {
      for (const article of gdeltData.articles) {
        const timestamp = article.seendate || new Date().toISOString();

        const item: NewsItem = {
          headline: article.title || '',
          source: article.domain || 'Unknown',
          timestamp,
          importance: calculateImportance(article, timestamp),
          category: categorizeNews(article.title || ''),
          url: article.url
        };
        items.push(item);
      }
    }
  } catch (error) {
    console.error('GDELT fetch failed:', error);
    warnings.push('GDELT API unavailable');
  }

  // Sort by importance
  items.sort((a, b) => b.importance - a.importance);

  const response: FeedResponse<NewsData> = {
    data: {
      breaking: items.slice(0, 10),
      recent: items
    },
    metadata: {
      provider: 'GDELT',
      fetchedAt: new Date().toISOString(),
      ttlMs: 60000,
      freshness: 'realtime',
      warnings
    }
  };

  setCache(cacheKey, response, 60000);
  return response;
}

function calculateImportance(article: any, timestamp: string): number {
  const headline = (article.title || '').toLowerCase();
  const now = Date.now();
  const articleTime = new Date(timestamp).getTime();
  const ageMinutes = (now - articleTime) / 60000;

  let score = Math.max(0, 100 - (ageMinutes * 2));

  // Keyword boosts
  const keywords: Record<string, number> = {
    'fomc': 30, 'cpi': 28, 'jobs report': 28, 'fed': 25,
    'federal reserve': 25, 'rate cut': 22, 'rate hike': 22,
    'sanctions': 22, 'missile': 20, 'default': 25,
    'recession': 20, 'war': 25, 'nuclear': 28,
    'bitcoin': 15, 'crypto': 12, 'sec': 18,
    'china': 18, 'taiwan': 22, 'iran': 20,
    'oil': 15, 'opec': 18, 'inflation': 20
  };

  for (const [keyword, boost] of Object.entries(keywords)) {
    if (headline.includes(keyword)) {
      score += boost;
    }
  }

  // Source credibility boost
  const domain = article.domain || '';
  if (domain.match(/reuters|bloomberg|wsj|ft\.com|ap\.org/i)) {
    score *= 1.2;
  }

  return Math.min(100, Math.round(score));
}

function categorizeNews(headline: string): NewsItem['category'] {
  const lower = headline.toLowerCase();

  if (lower.match(/fomc|fed|federal reserve|cpi|inflation|rate|jobs|unemployment|gdp/)) return 'macro';
  if (lower.match(/iran|china|taiwan|russia|war|sanctions|military|nuclear/)) return 'geopolitics';
  if (lower.match(/bitcoin|crypto|ethereum|solana|blockchain/)) return 'crypto';
  if (lower.match(/oil|energy|gas|opec|wti|brent/)) return 'energy';
  if (lower.match(/stocks|market|dow|nasdaq|s&p|trading/)) return 'markets';

  return 'other';
}
