/**
 * Solana Network Health & Congestion Prediction
 * Predict network congestion BEFORE it happens
 * Critical for transaction success rates
 */

interface NetworkHealth {
  timestamp: string;
  current_status: 'healthy' | 'degraded' | 'congested' | 'critical';
  health_score: number; // 0-100
  metrics: {
    tps_current: number;
    tps_max: number;
    tps_utilization: number; // %
    failed_tx_rate: number; // %
    avg_confirmation_time: number; // seconds
    priority_fee_median: number; // lamports
    active_validators: number;
    stake_weighted_health: number; // %
  };
  congestion_prediction: {
    likelihood_next_hour: number; // 0-100
    likelihood_next_4h: number; // 0-100
    predicted_peak_time: string | null;
    confidence: number; // 0-1
  };
  tx_success_probability: {
    standard_priority: number; // %
    medium_priority: number; // %
    high_priority: number; // %
  };
  recommended_actions: string[];
  reasoning: string;
}

interface CongestionAlert {
  severity: 'info' | 'warning' | 'critical';
  type: 'congestion_imminent' | 'degraded_performance' | 'high_failure_rate' | 'validator_issues';
  description: string;
  expected_duration: string;
  recommended_priority_fee: number; // lamports
  alternative_actions: string[];
}

/**
 * Get current network health and congestion prediction
 */
export async function getNetworkHealth(): Promise<NetworkHealth> {
  // In production, would fetch from Solana RPC + validators
  // For now, simulating based on typical patterns

  const metrics = simulateNetworkMetrics();
  const status = determineNetworkStatus(metrics);
  const health_score = calculateHealthScore(metrics);
  const congestion_prediction = predictCongestion(metrics);
  const tx_success_probability = calculateTxSuccessProbability(metrics);
  const recommended_actions = generateRecommendations(status, metrics);
  const reasoning = generateReasoning(status, metrics, congestion_prediction);

  return {
    timestamp: new Date().toISOString(),
    current_status: status,
    health_score,
    metrics,
    congestion_prediction,
    tx_success_probability,
    recommended_actions,
    reasoning
  };
}

/**
 * Simulate network metrics
 */
function simulateNetworkMetrics(): NetworkHealth['metrics'] {
  const hour = new Date().getUTCHours();

  // Peak hours: 14-22 UTC (9 AM - 5 PM EST)
  const isPeakHours = hour >= 14 && hour <= 22;

  // Base TPS varies by time
  const baseTPS = isPeakHours ? 3200 : 2400;
  const variance = Math.random() * 800 - 400; // +/- 400
  const tps_current = Math.max(1000, Math.round(baseTPS + variance));
  const tps_max = 4000; // Theoretical max

  // Failed tx rate increases during congestion
  const baseFailureRate = isPeakHours ? 2.5 : 1.2;
  const failed_tx_rate = Math.max(0, Math.min(15, baseFailureRate + (Math.random() - 0.5) * 2));

  // Confirmation time increases with congestion
  const baseConfTime = isPeakHours ? 0.8 : 0.5;
  const avg_confirmation_time = Math.max(0.4, baseConfTime + (Math.random() - 0.5) * 0.4);

  // Priority fees spike during congestion
  const baseFee = isPeakHours ? 50000 : 10000;
  const priority_fee_median = Math.round(baseFee + Math.random() * 40000);

  // Validators
  const active_validators = 1800 + Math.floor(Math.random() * 200);
  const stake_weighted_health = 96 + Math.random() * 4;

  return {
    tps_current,
    tps_max,
    tps_utilization: Math.round((tps_current / tps_max) * 100),
    failed_tx_rate: Math.round(failed_tx_rate * 10) / 10,
    avg_confirmation_time: Math.round(avg_confirmation_time * 100) / 100,
    priority_fee_median,
    active_validators,
    stake_weighted_health: Math.round(stake_weighted_health * 10) / 10
  };
}

/**
 * Determine network status
 */
function determineNetworkStatus(metrics: NetworkHealth['metrics']): NetworkHealth['current_status'] {
  if (
    metrics.failed_tx_rate > 10 ||
    metrics.tps_utilization > 90 ||
    metrics.stake_weighted_health < 90
  ) {
    return 'critical';
  } else if (
    metrics.failed_tx_rate > 5 ||
    metrics.tps_utilization > 75 ||
    metrics.avg_confirmation_time > 1.5
  ) {
    return 'congested';
  } else if (
    metrics.failed_tx_rate > 2.5 ||
    metrics.tps_utilization > 60 ||
    metrics.avg_confirmation_time > 1.0
  ) {
    return 'degraded';
  } else {
    return 'healthy';
  }
}

/**
 * Calculate overall health score
 */
function calculateHealthScore(metrics: NetworkHealth['metrics']): number {
  let score = 100;

  // TPS utilization penalty
  if (metrics.tps_utilization > 80) {
    score -= (metrics.tps_utilization - 80) * 2; // -40 at 100%
  }

  // Failed tx rate penalty
  score -= metrics.failed_tx_rate * 3; // -30 at 10%

  // Confirmation time penalty
  if (metrics.avg_confirmation_time > 1.0) {
    score -= (metrics.avg_confirmation_time - 1.0) * 20; // -20 per second over 1s
  }

  // Validator health bonus/penalty
  const validatorDiff = metrics.stake_weighted_health - 95;
  score += validatorDiff * 2;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Predict congestion
 */
function predictCongestion(metrics: NetworkHealth['metrics']): NetworkHealth['congestion_prediction'] {
  const hour = new Date().getUTCHours();

  // Calculate likelihood based on current metrics + time patterns
  let likelihood_next_hour = 0;
  let likelihood_next_4h = 0;

  // Current utilization predicts near-term congestion
  if (metrics.tps_utilization > 70) {
    likelihood_next_hour += (metrics.tps_utilization - 70) * 2; // +60 at 100%
  }

  // Failed tx rate indicates stress
  if (metrics.failed_tx_rate > 3) {
    likelihood_next_hour += metrics.failed_tx_rate * 5; // +50 at 10%
  }

  // Time-based patterns
  if (hour >= 13 && hour < 14) {
    // Just before US market open
    likelihood_next_hour += 25;
    likelihood_next_4h += 40;
  } else if (hour >= 14 && hour < 18) {
    // US hours - high activity
    likelihood_next_hour += 15;
    likelihood_next_4h += 30;
  } else if (hour >= 18 && hour < 22) {
    // Afternoon EST - decreasing
    likelihood_next_hour += 10;
    likelihood_next_4h += 15;
  }

  likelihood_next_hour = Math.min(100, likelihood_next_hour);
  likelihood_next_4h = Math.min(100, likelihood_next_4h);

  // Predict peak time if congestion likely
  let predicted_peak_time: string | null = null;
  if (likelihood_next_4h > 50) {
    if (hour < 14) {
      predicted_peak_time = '14:00-16:00 UTC (US market open)';
    } else if (hour < 18) {
      predicted_peak_time = 'Next 2 hours (peak US hours)';
    } else {
      predicted_peak_time = 'Tomorrow 14:00-16:00 UTC';
    }
  }

  // Confidence based on current metrics clarity
  const confidence = metrics.tps_utilization > 50 || metrics.failed_tx_rate > 2
    ? 0.75 + Math.random() * 0.15
    : 0.55 + Math.random() * 0.15;

  return {
    likelihood_next_hour: Math.round(likelihood_next_hour),
    likelihood_next_4h: Math.round(likelihood_next_4h),
    predicted_peak_time,
    confidence: Math.round(confidence * 100) / 100
  };
}

/**
 * Calculate transaction success probability by priority level
 */
function calculateTxSuccessProbability(metrics: NetworkHealth['metrics']): NetworkHealth['tx_success_probability'] {
  const baseSuccess = 100 - metrics.failed_tx_rate;

  // Standard priority (no extra fee)
  const standard_priority = Math.max(60, baseSuccess - 5);

  // Medium priority (2x median fee)
  const medium_priority = Math.min(99, standard_priority + 10);

  // High priority (5x median fee)
  const high_priority = Math.min(99.8, medium_priority + 8);

  return {
    standard_priority: Math.round(standard_priority * 10) / 10,
    medium_priority: Math.round(medium_priority * 10) / 10,
    high_priority: Math.round(high_priority * 10) / 10
  };
}

/**
 * Generate recommendations
 */
function generateRecommendations(
  status: NetworkHealth['current_status'],
  metrics: NetworkHealth['metrics']
): string[] {
  const recommendations: string[] = [];

  if (status === 'critical') {
    recommendations.push('AVOID NON-CRITICAL TRANSACTIONS - Network severely congested');
    recommendations.push(`Use HIGH priority fees (${(metrics.priority_fee_median * 5).toLocaleString()} lamports minimum)`);
    recommendations.push('Implement retry logic with exponential backoff');
    recommendations.push('Consider batching transactions if possible');
    recommendations.push('Use commitment level "confirmed" not "finalized" for speed');
  } else if (status === 'congested') {
    recommendations.push('Use elevated priority fees for important transactions');
    recommendations.push(`Recommended: ${(metrics.priority_fee_median * 2).toLocaleString()} lamports`);
    recommendations.push('Monitor transaction status closely');
    recommendations.push('Delay non-urgent transactions if possible');
  } else if (status === 'degraded') {
    recommendations.push('Slight performance degradation detected');
    recommendations.push(`Use median priority fee: ${metrics.priority_fee_median.toLocaleString()} lamports`);
    recommendations.push('Monitor for further degradation');
  } else {
    recommendations.push('Network performing normally');
    recommendations.push('Standard priority fees sufficient');
    recommendations.push('Good time for batch operations');
  }

  return recommendations;
}

/**
 * Generate reasoning
 */
function generateReasoning(
  status: NetworkHealth['current_status'],
  metrics: NetworkHealth['metrics'],
  prediction: NetworkHealth['congestion_prediction']
): string {
  if (status === 'critical') {
    return `Network in CRITICAL state. TPS at ${metrics.tps_utilization}% capacity, ${metrics.failed_tx_rate}% transaction failure rate. Severe congestion. ${prediction.likelihood_next_hour > 70 ? 'Likely to worsen in next hour.' : 'Monitor closely.'} Avoid non-essential transactions.`;
  } else if (status === 'congested') {
    return `Network congested. TPS utilization: ${metrics.tps_utilization}%, failure rate: ${metrics.failed_tx_rate}%. Confirmation time elevated at ${metrics.avg_confirmation_time}s. ${prediction.predicted_peak_time ? `Peak expected: ${prediction.predicted_peak_time}` : 'Use elevated priority fees.'}`;
  } else if (status === 'degraded') {
    return `Minor degradation. TPS: ${metrics.tps_current} (${metrics.tps_utilization}% capacity). ${prediction.likelihood_next_hour > 50 ? `Congestion likely within next hour (${prediction.likelihood_next_hour}% probability).` : 'Performance slightly below optimal.'} Monitor for changes.`;
  } else {
    return `Network healthy (${metrics.tps_current} TPS, ${metrics.failed_tx_rate}% failure rate). Validators: ${metrics.active_validators} active, ${metrics.stake_weighted_health}% stake-weighted health. ${prediction.likelihood_next_4h > 40 ? `Congestion possible in next 4h (${prediction.likelihood_next_4h}% probability).` : 'Optimal conditions for transactions.'}`;
  }
}

/**
 * Get congestion alerts
 */
export async function getCongestionAlerts(): Promise<CongestionAlert[]> {
  const health = await getNetworkHealth();
  const alerts: CongestionAlert[] = [];

  // Critical congestion
  if (health.current_status === 'critical') {
    alerts.push({
      severity: 'critical',
      type: 'congestion_imminent',
      description: `Network severely congested (${health.metrics.failed_tx_rate}% failure rate). Immediate action required.`,
      expected_duration: '1-3 hours',
      recommended_priority_fee: health.metrics.priority_fee_median * 5,
      alternative_actions: [
        'Delay non-critical transactions',
        'Use retry logic with exponential backoff',
        'Consider L2 solutions if available'
      ]
    });
  }

  // High failure rate
  if (health.metrics.failed_tx_rate > 5) {
    alerts.push({
      severity: 'warning',
      type: 'high_failure_rate',
      description: `${health.metrics.failed_tx_rate}% of transactions failing. Network under stress.`,
      expected_duration: '30-120 minutes',
      recommended_priority_fee: health.metrics.priority_fee_median * 3,
      alternative_actions: [
        'Implement comprehensive error handling',
        'Use transaction simulation before sending',
        'Batch similar operations together'
      ]
    });
  }

  // Congestion predicted
  if (health.congestion_prediction.likelihood_next_hour > 70) {
    alerts.push({
      severity: 'warning',
      type: 'congestion_imminent',
      description: `${health.congestion_prediction.likelihood_next_hour}% probability of congestion in next hour. ${health.congestion_prediction.predicted_peak_time || 'Peak approaching.'}`,
      expected_duration: '1-2 hours',
      recommended_priority_fee: health.metrics.priority_fee_median * 2,
      alternative_actions: [
        'Complete critical transactions now',
        'Defer non-urgent operations',
        'Prepare for elevated fees'
      ]
    });
  }

  // Validator issues
  if (health.metrics.stake_weighted_health < 95) {
    alerts.push({
      severity: 'info',
      type: 'validator_issues',
      description: `Validator health at ${health.metrics.stake_weighted_health}% (${health.metrics.active_validators} active). Minor concerns.`,
      expected_duration: 'Ongoing',
      recommended_priority_fee: health.metrics.priority_fee_median,
      alternative_actions: [
        'Monitor validator performance',
        'Use multiple RPC endpoints',
        'Check for cluster updates'
      ]
    });
  }

  return alerts;
}

/**
 * Get optimal transaction timing
 */
export async function getOptimalTxTiming(): Promise<{
  send_now: boolean;
  optimal_window: string;
  reasoning: string;
  current_cost_estimate: number; // lamports
  optimal_cost_estimate: number; // lamports
  savings_pct: number;
}> {
  const health = await getNetworkHealth();
  const hour = new Date().getUTCHours();

  let send_now: boolean;
  let optimal_window: string;
  let reasoning: string;

  if (health.current_status === 'healthy' && health.congestion_prediction.likelihood_next_4h < 40) {
    send_now = true;
    optimal_window = 'Now';
    reasoning = 'Network healthy with low congestion probability. Optimal conditions.';
  } else if (health.congestion_prediction.likelihood_next_hour > 60) {
    send_now = false;
    if (hour >= 22 || hour < 10) {
      optimal_window = 'Next 2-4 hours (off-peak)';
      reasoning = 'Currently congested. Off-peak hours approaching. Wait for better conditions.';
    } else {
      optimal_window = 'After 22:00 UTC (off-peak hours)';
      reasoning = 'Peak hours congestion. Wait for off-peak (after 5 PM EST) for 40-60% fee savings.';
    }
  } else {
    send_now = health.current_status !== 'critical';
    optimal_window = send_now ? 'Now (acceptable)' : 'Wait 1-2 hours';
    reasoning = send_now
      ? 'Acceptable conditions. Proceed with recommended priority fees.'
      : 'Network stressed. Brief delay recommended for better conditions.';
  }

  const current_cost = health.current_status === 'critical'
    ? health.metrics.priority_fee_median * 5
    : health.current_status === 'congested'
    ? health.metrics.priority_fee_median * 2
    : health.metrics.priority_fee_median;

  const optimal_cost = 10000; // Typical off-peak cost
  const savings_pct = Math.round(((current_cost - optimal_cost) / current_cost) * 100);

  return {
    send_now,
    optimal_window,
    reasoning,
    current_cost_estimate: Math.round(current_cost),
    optimal_cost_estimate: optimal_cost,
    savings_pct: Math.max(0, savings_pct)
  };
}
