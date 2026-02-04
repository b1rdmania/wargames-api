/**
 * Protocol Health Scores
 * Per-protocol risk scoring for DeFi protocols
 * Early warning system for protocol issues
 */

interface ProtocolHealth {
  protocol: string;
  health_score: number; // 0-100
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  trend: 'improving' | 'stable' | 'declining';
  metrics: {
    tvl_7d_change: number; // %
    volume_7d_change: number; // %
    utilization_rate: number; // %
    bad_debt: number; // USD
    liquidation_risk: number; // 0-100
    governance_activity: number; // 0-100
  };
  risk_factors: Array<{
    factor: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
  }>;
  recommendation: 'increase_exposure' | 'maintain' | 'reduce_exposure' | 'exit_immediately';
  reasoning: string;
}

interface ProtocolComparison {
  timestamp: string;
  protocols: ProtocolHealth[];
  safest: string;
  riskiest: string;
  avg_health: number;
}

/**
 * Get health scores for all major Solana protocols
 */
export async function getAllProtocolHealth(): Promise<ProtocolComparison> {
  const protocols = [
    'Drift',
    'Kamino',
    'MarginFi',
    'Solend',
    'Meteora',
    'Raydium',
    'Orca',
    'Jupiter',
    'Jito'
  ];

  const healthScores = await Promise.all(
    protocols.map(p => getProtocolHealth(p))
  );

  // Calculate stats
  const avgHealth = healthScores.reduce((sum, p) => sum + p.health_score, 0) / healthScores.length;
  const safest = healthScores.reduce((a, b) => a.health_score > b.health_score ? a : b).protocol;
  const riskiest = healthScores.reduce((a, b) => a.health_score < b.health_score ? a : b).protocol;

  return {
    timestamp: new Date().toISOString(),
    protocols: healthScores,
    safest,
    riskiest,
    avg_health: Math.round(avgHealth)
  };
}

/**
 * Get health score for specific protocol
 */
export async function getProtocolHealth(protocol: string): Promise<ProtocolHealth> {
  // In production, would fetch real data from protocol APIs
  // For now, using intelligent simulation based on protocol characteristics

  const metrics = simulateProtocolMetrics(protocol);
  const health_score = calculateHealthScore(metrics);
  const risk_level = classifyRiskLevel(health_score);
  const trend = determineTrend(metrics);
  const risk_factors = identifyRiskFactors(protocol, metrics, health_score);
  const recommendation = getRecommendation(health_score, risk_factors);
  const reasoning = generateReasoning(protocol, health_score, metrics, risk_factors);

  return {
    protocol,
    health_score,
    risk_level,
    trend,
    metrics,
    risk_factors,
    recommendation,
    reasoning
  };
}

/**
 * Simulate protocol metrics (in production, fetch real data)
 */
function simulateProtocolMetrics(protocol: string): ProtocolHealth['metrics'] {
  // Base metrics vary by protocol type
  const baseMetrics: Record<string, Partial<ProtocolHealth['metrics']>> = {
    'Drift': { utilization_rate: 65, liquidation_risk: 35 },
    'Kamino': { utilization_rate: 72, liquidation_risk: 28 },
    'MarginFi': { utilization_rate: 58, liquidation_risk: 42 },
    'Solend': { utilization_rate: 68, liquidation_risk: 38 },
    'Meteora': { utilization_rate: 45, liquidation_risk: 15 },
    'Raydium': { utilization_rate: 52, liquidation_risk: 18 },
    'Orca': { utilization_rate: 48, liquidation_risk: 12 },
    'Jupiter': { utilization_rate: 35, liquidation_risk: 8 },
    'Jito': { utilization_rate: 42, liquidation_risk: 10 }
  };

  const base = baseMetrics[protocol] || { utilization_rate: 50, liquidation_risk: 25 };

  // Add variance
  const tvl_7d_change = -10 + Math.random() * 25; // -10% to +15%
  const volume_7d_change = -15 + Math.random() * 40; // -15% to +25%
  const utilization_rate = Math.max(0, Math.min(100, (base.utilization_rate || 50) + (Math.random() - 0.5) * 20));
  const bad_debt = Math.random() * 5000000; // 0-5M
  const liquidation_risk = Math.max(0, Math.min(100, (base.liquidation_risk || 25) + (Math.random() - 0.5) * 20));
  const governance_activity = 40 + Math.random() * 40; // 40-80

  return {
    tvl_7d_change: Math.round(tvl_7d_change * 10) / 10,
    volume_7d_change: Math.round(volume_7d_change * 10) / 10,
    utilization_rate: Math.round(utilization_rate),
    bad_debt: Math.round(bad_debt),
    liquidation_risk: Math.round(liquidation_risk),
    governance_activity: Math.round(governance_activity)
  };
}

/**
 * Calculate overall health score
 */
function calculateHealthScore(metrics: ProtocolHealth['metrics']): number {
  // Health score calculation (higher = healthier)
  let score = 100;

  // TVL decline is bad
  if (metrics.tvl_7d_change < 0) {
    score += metrics.tvl_7d_change * 2; // -20 for -10% TVL decline
  } else {
    score += Math.min(10, metrics.tvl_7d_change); // +10 max for growth
  }

  // Volume decline is concerning
  if (metrics.volume_7d_change < -10) {
    score -= 15;
  }

  // High utilization is risky for lending protocols
  if (metrics.utilization_rate > 80) {
    score -= (metrics.utilization_rate - 80) * 2; // -40 at 100% utilization
  } else if (metrics.utilization_rate < 30) {
    score -= (30 - metrics.utilization_rate) * 0.5; // Underutilization also bad
  }

  // Bad debt is very bad
  if (metrics.bad_debt > 1000000) {
    score -= Math.min(30, (metrics.bad_debt / 1000000) * 10);
  }

  // Liquidation risk
  score -= metrics.liquidation_risk * 0.5;

  // Governance activity (good sign)
  score += (metrics.governance_activity - 50) * 0.2;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Classify risk level based on health score
 */
function classifyRiskLevel(score: number): ProtocolHealth['risk_level'] {
  if (score < 40) return 'critical';
  if (score < 60) return 'high';
  if (score < 75) return 'medium';
  return 'low';
}

/**
 * Determine trend
 */
function determineTrend(metrics: ProtocolHealth['metrics']): ProtocolHealth['trend'] {
  const trendScore = metrics.tvl_7d_change + metrics.volume_7d_change * 0.5;

  if (trendScore > 10) return 'improving';
  if (trendScore < -10) return 'declining';
  return 'stable';
}

/**
 * Identify specific risk factors
 */
function identifyRiskFactors(
  protocol: string,
  metrics: ProtocolHealth['metrics'],
  health_score: number
): ProtocolHealth['risk_factors'] {
  const factors: ProtocolHealth['risk_factors'] = [];

  // TVL decline
  if (metrics.tvl_7d_change < -15) {
    factors.push({
      factor: 'TVL Decline',
      severity: 'critical',
      description: `TVL down ${Math.abs(metrics.tvl_7d_change).toFixed(1)}% in 7 days. Capital flight in progress.`
    });
  } else if (metrics.tvl_7d_change < -5) {
    factors.push({
      factor: 'TVL Decline',
      severity: 'medium',
      description: `TVL down ${Math.abs(metrics.tvl_7d_change).toFixed(1)}% in 7 days. Monitor closely.`
    });
  }

  // High utilization
  if (metrics.utilization_rate > 90) {
    factors.push({
      factor: 'Extreme Utilization',
      severity: 'critical',
      description: `${metrics.utilization_rate}% utilization. Withdrawal risk imminent. Bank run possible.`
    });
  } else if (metrics.utilization_rate > 80) {
    factors.push({
      factor: 'High Utilization',
      severity: 'high',
      description: `${metrics.utilization_rate}% utilization. Limited liquidity for withdrawals.`
    });
  }

  // Bad debt
  if (metrics.bad_debt > 2000000) {
    factors.push({
      factor: 'Bad Debt',
      severity: 'high',
      description: `$${(metrics.bad_debt / 1000000).toFixed(1)}M in bad debt. Solvency concerns.`
    });
  } else if (metrics.bad_debt > 500000) {
    factors.push({
      factor: 'Bad Debt',
      severity: 'medium',
      description: `$${(metrics.bad_debt / 1000000).toFixed(1)}M in bad debt. Monitor liquidation engine.`
    });
  }

  // Liquidation risk
  if (metrics.liquidation_risk > 60) {
    factors.push({
      factor: 'Liquidation Risk',
      severity: 'critical',
      description: `${metrics.liquidation_risk}% liquidation risk. Cascade imminent on price drop.`
    });
  } else if (metrics.liquidation_risk > 40) {
    factors.push({
      factor: 'Liquidation Risk',
      severity: 'high',
      description: `${metrics.liquidation_risk}% liquidation risk. Vulnerable to volatility.`
    });
  }

  // Low governance activity
  if (metrics.governance_activity < 35) {
    factors.push({
      factor: 'Governance Decline',
      severity: 'medium',
      description: `Low governance activity (${metrics.governance_activity}/100). Community disengaging.`
    });
  }

  // If no factors identified but low health, add generic
  if (factors.length === 0 && health_score < 60) {
    factors.push({
      factor: 'Multiple Minor Issues',
      severity: 'medium',
      description: 'Combination of minor issues affecting overall health.'
    });
  }

  return factors;
}

/**
 * Get recommendation
 */
function getRecommendation(
  health_score: number,
  risk_factors: ProtocolHealth['risk_factors']
): ProtocolHealth['recommendation'] {
  const hasCritical = risk_factors.some(f => f.severity === 'critical');

  if (hasCritical || health_score < 30) {
    return 'exit_immediately';
  } else if (health_score < 50) {
    return 'reduce_exposure';
  } else if (health_score < 70) {
    return 'maintain';
  } else {
    return 'increase_exposure';
  }
}

/**
 * Generate reasoning
 */
function generateReasoning(
  protocol: string,
  health_score: number,
  metrics: ProtocolHealth['metrics'],
  risk_factors: ProtocolHealth['risk_factors']
): string {
  if (health_score >= 80) {
    return `${protocol} showing strong health (${health_score}/100). TVL ${metrics.tvl_7d_change > 0 ? 'growing' : 'stable'}, utilization balanced at ${metrics.utilization_rate}%, minimal risk factors. Safe for continued use.`;
  } else if (health_score >= 65) {
    return `${protocol} in good condition (${health_score}/100). Some ${risk_factors.length > 0 ? 'minor concerns' : 'optimization opportunities'} but overall stable. Monitor ${risk_factors[0]?.factor || 'key metrics'}.`;
  } else if (health_score >= 50) {
    return `${protocol} showing concerning signals (${health_score}/100). ${risk_factors.length} risk factor(s) identified. ${risk_factors[0]?.description || 'Multiple issues detected'}. Consider reducing exposure.`;
  } else if (health_score >= 30) {
    return `${protocol} in high-risk state (${health_score}/100). Critical issues: ${risk_factors.filter(f => f.severity === 'critical' || f.severity === 'high').map(f => f.factor).join(', ')}. Reduce exposure significantly.`;
  } else {
    return `${protocol} in CRITICAL condition (${health_score}/100). ${risk_factors.filter(f => f.severity === 'critical').length} critical risk(s). EXIT IMMEDIATELY. Protocol stability at risk.`;
  }
}

/**
 * Compare protocol health
 */
export async function compareProtocols(protocols: string[]): Promise<{
  protocols: ProtocolHealth[];
  best: string;
  worst: string;
  recommendation: string;
}> {
  const healthScores = await Promise.all(
    protocols.map(p => getProtocolHealth(p))
  );

  const sorted = healthScores.sort((a, b) => b.health_score - a.health_score);
  const best = sorted[0].protocol;
  const worst = sorted[sorted.length - 1].protocol;

  const recommendation = `For optimal risk-adjusted returns, prefer ${best} (${sorted[0].health_score}/100) over ${worst} (${sorted[sorted.length - 1].health_score}/100). Health gap: ${sorted[0].health_score - sorted[sorted.length - 1].health_score} points.`;

  return {
    protocols: healthScores,
    best,
    worst,
    recommendation
  };
}

/**
 * Get protocols by risk level
 */
export async function getProtocolsByRisk(risk_level: ProtocolHealth['risk_level']): Promise<string[]> {
  const all = await getAllProtocolHealth();
  return all.protocols
    .filter(p => p.risk_level === risk_level)
    .map(p => p.protocol);
}
