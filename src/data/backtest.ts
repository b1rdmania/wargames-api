/**
 * Backtesting Dataset
 * Historical risk predictions vs actual outcomes
 * Built for transparency and validation
 */

export interface BacktestEntry {
  date: string;
  prediction: {
    volatility_24h: number;
    regime: 'high_risk' | 'elevated' | 'neutral' | 'low_risk';
    liquidity_stress: number;
    risk_score: number;
  };
  actual: {
    realized_vol: number;
    max_drawdown: number;
    avg_spread_bps: number;
    major_events: string[];
  };
  accuracy: {
    vol_error: number;
    regime_correct: boolean;
    liquidity_prediction_accuracy: number;
  };
}

/**
 * Generate 30 days of historical backtest data
 * In production, this would be real historical predictions stored in database
 * For now, generating realistic mock data
 */
export function generateBacktestData(): BacktestEntry[] {
  const data: BacktestEntry[] = [];
  const today = new Date();

  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Generate realistic predictions and outcomes
    const baseVol = 0.35 + Math.random() * 0.3;
    const predictedVol = baseVol + (Math.random() - 0.5) * 0.1;
    const actualVol = baseVol + (Math.random() - 0.5) * 0.15;

    const riskScore = Math.round(30 + baseVol * 100 + Math.random() * 20);
    const regime = riskScore < 35 ? 'low_risk' : riskScore < 50 ? 'neutral' : riskScore < 70 ? 'elevated' : 'high_risk';

    const liquidityStress = 0.2 + Math.random() * 0.6;
    const avgSpread = 5 + liquidityStress * 20 + Math.random() * 5;

    const maxDrawdown = -(baseVol * 15 + Math.random() * 10);

    // Occasional major events
    const majorEvents: string[] = [];
    if (Math.random() > 0.9) majorEvents.push('Fed announcement');
    if (Math.random() > 0.95) majorEvents.push('Exchange outage');
    if (Math.random() > 0.92) majorEvents.push('Protocol hack');

    data.push({
      date: date.toISOString().split('T')[0],
      prediction: {
        volatility_24h: Math.round(predictedVol * 100) / 100,
        regime,
        liquidity_stress: Math.round(liquidityStress * 100) / 100,
        risk_score: riskScore
      },
      actual: {
        realized_vol: Math.round(actualVol * 100) / 100,
        max_drawdown: Math.round(maxDrawdown * 10) / 10,
        avg_spread_bps: Math.round(avgSpread),
        major_events: majorEvents
      },
      accuracy: {
        vol_error: Math.round(Math.abs(predictedVol - actualVol) * 100) / 100,
        regime_correct: Math.abs(riskScore - (actualVol * 100 + 30)) < 20,
        liquidity_prediction_accuracy: Math.round((1 - Math.abs(liquidityStress - avgSpread / 50)) * 100)
      }
    });
  }

  return data;
}

/**
 * Calculate aggregate accuracy metrics
 */
export function calculateBacktestMetrics(data: BacktestEntry[]) {
  const totalEntries = data.length;

  const avgVolError = data.reduce((sum, entry) => sum + entry.accuracy.vol_error, 0) / totalEntries;
  const regimeAccuracy = data.filter(e => e.accuracy.regime_correct).length / totalEntries;
  const avgLiquidityAccuracy = data.reduce((sum, entry) => sum + entry.accuracy.liquidity_prediction_accuracy, 0) / totalEntries;

  return {
    period: `${data[0].date} to ${data[data.length - 1].date}`,
    total_predictions: totalEntries,
    volatility: {
      avg_error: Math.round(avgVolError * 100) / 100,
      interpretation: avgVolError < 0.1 ? 'excellent' : avgVolError < 0.2 ? 'good' : avgVolError < 0.3 ? 'acceptable' : 'needs_improvement'
    },
    regime_classification: {
      accuracy: Math.round(regimeAccuracy * 100),
      interpretation: regimeAccuracy > 0.7 ? 'reliable' : regimeAccuracy > 0.5 ? 'moderate' : 'unreliable'
    },
    liquidity_stress: {
      avg_accuracy: Math.round(avgLiquidityAccuracy),
      interpretation: avgLiquidityAccuracy > 70 ? 'reliable' : avgLiquidityAccuracy > 50 ? 'moderate' : 'unreliable'
    }
  };
}
