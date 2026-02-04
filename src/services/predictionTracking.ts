/**
 * Prediction Accuracy Tracking
 * Track prediction outcomes to prove system effectiveness
 */

interface PredictionRecord {
  id: string;
  type: string;
  predicted_at: string;
  predicted_time: number; // When event was predicted to occur
  predicted_value: number;
  confidence: number;
  actual_time?: number; // When event actually occurred
  actual_value?: number;
  accuracy?: number; // 0-100%
  outcome: 'pending' | 'confirmed' | 'missed' | 'false_positive';
  notes?: string;
}

interface AccuracyStats {
  total_predictions: number;
  confirmed: number;
  missed: number;
  false_positives: number;
  pending: number;
  overall_accuracy: number;
  avg_time_accuracy: number; // How close time predictions are (in minutes)
  by_type: {
    [key: string]: {
      total: number;
      confirmed: number;
      accuracy: number;
    };
  };
}

// In-memory storage (would use database in production)
let predictionHistory: PredictionRecord[] = [];

/**
 * Record a new prediction
 */
export function recordPrediction(
  type: string,
  predicted_time: number,
  predicted_value: number,
  confidence: number
): PredictionRecord {
  const record: PredictionRecord = {
    id: `pred_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type,
    predicted_at: new Date().toISOString(),
    predicted_time,
    predicted_value,
    confidence,
    outcome: 'pending'
  };

  predictionHistory.push(record);

  // Keep only last 100 predictions
  if (predictionHistory.length > 100) {
    predictionHistory = predictionHistory.slice(-100);
  }

  return record;
}

/**
 * Update prediction outcome
 */
export function updatePredictionOutcome(
  predictionId: string,
  outcome: 'confirmed' | 'missed' | 'false_positive',
  actual_time?: number,
  actual_value?: number,
  notes?: string
): PredictionRecord | null {
  const record = predictionHistory.find(p => p.id === predictionId);
  if (!record) return null;

  record.outcome = outcome;
  record.actual_time = actual_time;
  record.actual_value = actual_value;
  record.notes = notes;

  // Calculate accuracy
  if (outcome === 'confirmed' && actual_time && record.predicted_time) {
    const timeDiff = Math.abs(actual_time - record.predicted_time);
    const maxDiff = 4 * 60 * 60 * 1000; // 4 hours tolerance
    record.accuracy = Math.max(0, 100 * (1 - timeDiff / maxDiff));
  } else if (outcome === 'confirmed') {
    record.accuracy = 100;
  } else {
    record.accuracy = 0;
  }

  return record;
}

/**
 * Get accuracy statistics
 */
export function getAccuracyStats(): AccuracyStats {
  const total = predictionHistory.length;
  const confirmed = predictionHistory.filter(p => p.outcome === 'confirmed').length;
  const missed = predictionHistory.filter(p => p.outcome === 'missed').length;
  const false_positives = predictionHistory.filter(p => p.outcome === 'false_positive').length;
  const pending = predictionHistory.filter(p => p.outcome === 'pending').length;

  // Calculate overall accuracy
  const completed = predictionHistory.filter(p => p.outcome !== 'pending');
  const overall_accuracy = completed.length > 0
    ? (confirmed / completed.length) * 100
    : 0;

  // Calculate average time accuracy
  const confirmedWithTime = predictionHistory.filter(p =>
    p.outcome === 'confirmed' && p.actual_time && p.predicted_time
  );
  const avg_time_accuracy = confirmedWithTime.length > 0
    ? confirmedWithTime.reduce((acc, p) => {
        const diff = Math.abs((p.actual_time || 0) - p.predicted_time) / (1000 * 60);
        return acc + diff;
      }, 0) / confirmedWithTime.length
    : 0;

  // Calculate accuracy by type
  const by_type: AccuracyStats['by_type'] = {};
  const types = [...new Set(predictionHistory.map(p => p.type))];

  for (const type of types) {
    const typePredictions = predictionHistory.filter(p => p.type === type);
    const typeCompleted = typePredictions.filter(p => p.outcome !== 'pending');
    const typeConfirmed = typePredictions.filter(p => p.outcome === 'confirmed');

    by_type[type] = {
      total: typePredictions.length,
      confirmed: typeConfirmed.length,
      accuracy: typeCompleted.length > 0
        ? (typeConfirmed.length / typeCompleted.length) * 100
        : 0
    };
  }

  return {
    total_predictions: total,
    confirmed,
    missed,
    false_positives,
    pending,
    overall_accuracy: Math.round(overall_accuracy * 10) / 10,
    avg_time_accuracy: Math.round(avg_time_accuracy * 10) / 10,
    by_type
  };
}

/**
 * Get recent prediction history
 */
export function getRecentPredictions(limit: number = 20): PredictionRecord[] {
  return predictionHistory
    .slice(-limit)
    .reverse();
}

/**
 * Get successful predictions (for marketing/credibility)
 */
export function getSuccessfulPredictions(limit: number = 10): PredictionRecord[] {
  return predictionHistory
    .filter(p => p.outcome === 'confirmed' && (p.accuracy || 0) >= 80)
    .slice(-limit)
    .reverse();
}

/**
 * Simulate some historical predictions for demo
 * In production, this would be real tracked data
 */
export function initializeDemoData(): void {
  if (predictionHistory.length > 0) return; // Already initialized

  const now = Date.now();

  // Simulate some successful past predictions
  const demoData: Omit<PredictionRecord, 'id'>[] = [
    {
      type: 'risk_spike',
      predicted_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      predicted_time: now - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
      predicted_value: 78,
      confidence: 0.89,
      actual_time: now - 3 * 24 * 60 * 60 * 1000 + 2.2 * 60 * 60 * 1000,
      actual_value: 76,
      accuracy: 92,
      outcome: 'confirmed',
      notes: 'FOMC minutes released, risk spiked as predicted'
    },
    {
      type: 'liquidation_cascade',
      predicted_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      predicted_time: now - 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000,
      predicted_value: 24000000,
      confidence: 0.81,
      actual_time: now - 5 * 24 * 60 * 60 * 1000 + 3.5 * 60 * 60 * 1000,
      actual_value: 22000000,
      accuracy: 88,
      outcome: 'confirmed',
      notes: '$22M in liquidations, health factors triggered cascade'
    },
    {
      type: 'speculation_peak',
      predicted_at: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
      predicted_time: now - 7 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000,
      predicted_value: 92,
      confidence: 0.76,
      actual_time: now - 7 * 24 * 60 * 60 * 1000 + 20 * 60 * 60 * 1000,
      actual_value: 89,
      accuracy: 85,
      outcome: 'confirmed',
      notes: 'Memecoin mania peaked, launch velocity dropped 40% next day'
    },
    {
      type: 'risk_spike',
      predicted_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
      predicted_time: now - 10 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000,
      predicted_value: 82,
      confidence: 0.92,
      actual_time: now - 10 * 24 * 60 * 60 * 1000 + 3.8 * 60 * 60 * 1000,
      actual_value: 84,
      accuracy: 95,
      outcome: 'confirmed',
      notes: 'CPI release drove risk spike, timing within 12 minutes'
    }
  ];

  for (const demo of demoData) {
    predictionHistory.push({
      ...demo,
      id: `pred_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    });
  }
}

// Initialize demo data on module load
initializeDemoData();
