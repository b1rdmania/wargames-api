/**
 * Feed Stack Utilities
 * Shared types and helpers for all feed endpoints
 */

import { getCached as getFromCache, setCache as putInCache } from '../dataFetchers';

// Re-export cache utilities
export const getCached = getFromCache;
export const setCache = putInCache;

// Common types
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

// FRED helper
export async function fetchFRED(seriesId: string): Promise<any> {
  const apiKey = process.env.FRED_API_KEY || '';
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=2`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`FRED API error: ${response.status}`);
  }

  return response.json();
}

// FRED batch fetch
export async function fetchFREDBatch(seriesIds: string[]): Promise<Record<string, any>> {
  const results: Record<string, any> = {};

  await Promise.all(
    seriesIds.map(async (id) => {
      try {
        results[id] = await fetchFRED(id);
      } catch (error) {
        console.error(`FRED fetch failed for ${id}:`, error);
        results[id] = null;
      }
    })
  );

  return results;
}

// GDELT helper
export async function fetchGDELT(query: string, maxRecords = 100): Promise<any> {
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=${maxRecords}&format=json&timespan=24h`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GDELT API error: ${response.status}`);
  }

  return response.json();
}

// Frankfurter helper
export async function fetchFrankfurter(base = 'USD', symbols: string[] = ['EUR', 'JPY', 'GBP']): Promise<any> {
  const url = `https://api.frankfurter.app/latest?from=${base}&to=${symbols.join(',')}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Frankfurter API error: ${response.status}`);
  }

  return response.json();
}

// Get stale cache (for fallback)
export function getCachedStale<T>(key: string): { data: T; metadata: FeedMetadata } | null {
  // Access cache map directly (implementation depends on dataFetchers structure)
  return null; // TODO: implement if needed
}
