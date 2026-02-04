/**
 * Request Analytics Service
 * Tracks API calls, integrations, response times
 */

export interface APICall {
  timestamp: string;
  endpoint: string;
  integration: string | null;
  responseTime: number;
  statusCode: number;
  error?: string;
  userAgent?: string;
}

export interface IntegrationUsage {
  integrationId: string;
  calls: number;
  lastSeen: string;
  endpoints: Record<string, number>;
  avgResponseTime: number;
  errors: number;
}

// In-memory storage (last 10,000 calls)
const MAX_CALLS = 10000;
const apiCalls: APICall[] = [];

/**
 * Log an API call
 */
export function logAPICall(call: APICall): void {
  apiCalls.push(call);

  // Keep only last MAX_CALLS
  if (apiCalls.length > MAX_CALLS) {
    apiCalls.shift();
  }
}

/**
 * Get all calls (for analysis)
 */
export function getAllCalls(): APICall[] {
  return apiCalls;
}

/**
 * Get calls from last N hours
 */
export function getCallsSince(hours: number): APICall[] {
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);
  return apiCalls.filter(call =>
    new Date(call.timestamp).getTime() > cutoff
  );
}

/**
 * Get real-time stats
 */
export function getRealtimeStats() {
  const calls24h = getCallsSince(24);
  const calls1h = getCallsSince(1);

  // Calculate response times
  const responseTimes = calls24h.map(c => c.responseTime);
  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;

  // Calculate error rate
  const errors = calls24h.filter(c => c.statusCode >= 400).length;
  const errorRate = calls24h.length > 0 ? errors / calls24h.length : 0;

  // Get active integrations
  const activeIntegrations = new Set(
    calls24h
      .filter(c => c.integration && c.integration !== 'unknown')
      .map(c => c.integration)
  );

  return {
    total_calls_24h: calls24h.length,
    calls_per_hour: Math.round(calls24h.length / 24),
    calls_last_hour: calls1h.length,
    active_integrations: activeIntegrations.size,
    avg_response_time_ms: Math.round(avgResponseTime),
    error_rate: Math.round(errorRate * 100) / 100,
    total_tracked: apiCalls.length
  };
}

/**
 * Get per-integration stats
 */
export function getIntegrationStats(integrationId?: string): IntegrationUsage[] {
  const calls = integrationId
    ? apiCalls.filter(c => c.integration === integrationId)
    : apiCalls;

  // Group by integration
  const byIntegration: Record<string, APICall[]> = {};
  for (const call of calls) {
    const id = call.integration || 'unknown';
    if (!byIntegration[id]) byIntegration[id] = [];
    byIntegration[id].push(call);
  }

  // Calculate stats for each
  const stats: IntegrationUsage[] = [];
  for (const [id, integrationCalls] of Object.entries(byIntegration)) {
    if (id === 'unknown') continue; // Skip unknown

    const endpoints: Record<string, number> = {};
    let totalResponseTime = 0;
    let errors = 0;

    for (const call of integrationCalls) {
      endpoints[call.endpoint] = (endpoints[call.endpoint] || 0) + 1;
      totalResponseTime += call.responseTime;
      if (call.statusCode >= 400) errors++;
    }

    // Get last seen (most recent call)
    const lastCall = integrationCalls[integrationCalls.length - 1];

    stats.push({
      integrationId: id,
      calls: integrationCalls.length,
      lastSeen: lastCall.timestamp,
      endpoints,
      avgResponseTime: Math.round(totalResponseTime / integrationCalls.length),
      errors
    });
  }

  // Sort by call count (descending)
  return stats.sort((a, b) => b.calls - a.calls);
}

/**
 * Get top endpoints
 */
export function getTopEndpoints(limit: number = 10): Array<{ endpoint: string; calls: number; percent: number }> {
  const endpointCounts: Record<string, number> = {};
  const total = apiCalls.length;

  for (const call of apiCalls) {
    endpointCounts[call.endpoint] = (endpointCounts[call.endpoint] || 0) + 1;
  }

  const sorted = Object.entries(endpointCounts)
    .map(([endpoint, calls]) => ({
      endpoint,
      calls,
      percent: Math.round((calls / total) * 100)
    }))
    .sort((a, b) => b.calls - a.calls);

  return sorted.slice(0, limit);
}

/**
 * Get calls per hour (last 24 hours)
 */
export function getCallsPerHour(): Array<{ hour: string; calls: number }> {
  const calls24h = getCallsSince(24);
  const hourCounts: Record<string, number> = {};

  // Initialize last 24 hours
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(Date.now() - (i * 60 * 60 * 1000));
    const hourKey = `${hour.getHours()}:00`;
    hourCounts[hourKey] = 0;
  }

  // Count calls per hour
  for (const call of calls24h) {
    const callDate = new Date(call.timestamp);
    const hourKey = `${callDate.getHours()}:00`;
    hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1;
  }

  return Object.entries(hourCounts).map(([hour, calls]) => ({ hour, calls }));
}

/**
 * Get response time percentiles
 */
export function getResponseTimePercentiles(): { p50: number; p95: number; p99: number } {
  const times = apiCalls.map(c => c.responseTime).sort((a, b) => a - b);

  if (times.length === 0) {
    return { p50: 0, p95: 0, p99: 0 };
  }

  const p50Index = Math.floor(times.length * 0.5);
  const p95Index = Math.floor(times.length * 0.95);
  const p99Index = Math.floor(times.length * 0.99);

  return {
    p50: Math.round(times[p50Index]),
    p95: Math.round(times[p95Index]),
    p99: Math.round(times[p99Index])
  };
}

/**
 * Get integration activity status
 */
export function getIntegrationActivity(integrationId: string): 'active' | 'idle' | 'inactive' {
  const recentCalls = getCallsSince(1).filter(c => c.integration === integrationId);

  if (recentCalls.length > 0) return 'active'; // Called in last hour

  const calls24h = getCallsSince(24).filter(c => c.integration === integrationId);
  if (calls24h.length > 0) return 'idle'; // Called in last 24h but not last hour

  return 'inactive'; // No calls in last 24h
}

/**
 * Format time ago
 */
export function timeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}
