/**
 * Webhook Alert System
 * Allows agents to subscribe to macro event notifications
 *
 * Event types:
 * - risk_spike: Risk score increased significantly
 * - risk_drop: Risk score decreased significantly
 * - high_impact_event: Upcoming high-impact macro event
 * - narrative_shift: Major narrative score change
 */

interface WebhookSubscription {
  id: string;
  url: string;
  agentName: string;
  events: WebhookEventType[];
  thresholds?: {
    riskSpike?: number; // Trigger if risk increases by this amount
    riskDrop?: number; // Trigger if risk decreases by this amount
    minRisk?: number; // Only trigger if risk is above this
    maxRisk?: number; // Only trigger if risk is below this
  };
  createdAt: string;
  lastTriggered?: string;
}

type WebhookEventType =
  | 'risk_spike'
  | 'risk_drop'
  | 'high_impact_event'
  | 'narrative_shift'
  | 'prediction_risk_spike'
  | 'prediction_liquidation_cascade'
  | 'prediction_speculation_peak'
  | 'prediction_capital_outflow'
  | 'prediction_execution_window';

interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: any;
  subscription_id: string;
}

// In-memory storage (will persist across requests in serverless via global)
let subscriptions: WebhookSubscription[] = [];
let lastRiskScore: number | null = null;
let lastNarrativeScores: Record<string, number> = {};

/**
 * Subscribe to webhook notifications
 */
export function subscribe(
  url: string,
  agentName: string,
  events: WebhookEventType[],
  thresholds?: WebhookSubscription['thresholds']
): WebhookSubscription {
  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new Error('Invalid webhook URL');
  }

  // Check if already subscribed with this URL
  const existing = subscriptions.find(s => s.url === url);
  if (existing) {
    // Update existing subscription
    existing.events = events;
    existing.thresholds = thresholds;
    existing.agentName = agentName;
    return existing;
  }

  // Create new subscription
  const subscription: WebhookSubscription = {
    id: generateId(),
    url,
    agentName,
    events,
    thresholds,
    createdAt: new Date().toISOString()
  };

  subscriptions.push(subscription);
  return subscription;
}

/**
 * Unsubscribe from webhook notifications
 */
export function unsubscribe(subscriptionId: string): boolean {
  const index = subscriptions.findIndex(s => s.id === subscriptionId);
  if (index === -1) return false;

  subscriptions.splice(index, 1);
  return true;
}

/**
 * Get all active subscriptions
 */
export function getAllSubscriptions(): WebhookSubscription[] {
  return subscriptions;
}

/**
 * Get subscription by ID
 */
export function getSubscription(id: string): WebhookSubscription | undefined {
  return subscriptions.find(s => s.id === id);
}

/**
 * Check for risk changes and trigger webhooks
 */
export async function checkRiskChanges(currentRisk: number): Promise<void> {
  if (lastRiskScore === null) {
    lastRiskScore = currentRisk;
    return;
  }

  const change = currentRisk - lastRiskScore;
  const absChange = Math.abs(change);

  // Find subscriptions that should be triggered
  const toTrigger = subscriptions.filter(sub => {
    // Check if subscribed to risk events
    if (change > 0 && !sub.events.includes('risk_spike')) return false;
    if (change < 0 && !sub.events.includes('risk_drop')) return false;

    // Check thresholds
    if (sub.thresholds) {
      if (change > 0 && sub.thresholds.riskSpike && absChange < sub.thresholds.riskSpike) return false;
      if (change < 0 && sub.thresholds.riskDrop && absChange < sub.thresholds.riskDrop) return false;
      if (sub.thresholds.minRisk && currentRisk < sub.thresholds.minRisk) return false;
      if (sub.thresholds.maxRisk && currentRisk > sub.thresholds.maxRisk) return false;
    } else {
      // Default threshold: 10 point change
      if (absChange < 10) return false;
    }

    return true;
  });

  // Trigger webhooks
  const eventType: WebhookEventType = change > 0 ? 'risk_spike' : 'risk_drop';
  await Promise.all(
    toTrigger.map(sub =>
      triggerWebhook(sub, eventType, {
        previous_risk: lastRiskScore,
        current_risk: currentRisk,
        change: change,
        abs_change: absChange,
        direction: change > 0 ? 'up' : 'down'
      })
    )
  );

  lastRiskScore = currentRisk;
}

/**
 * Check for narrative shifts and trigger webhooks
 */
export async function checkNarrativeShifts(narratives: Array<{ id: string; current_score: number }>): Promise<void> {
  const shifts: Array<{ narrative: string; from: number; to: number; change: number }> = [];

  for (const narrative of narratives) {
    const lastScore = lastNarrativeScores[narrative.id];
    if (lastScore !== undefined) {
      const change = narrative.current_score - lastScore;
      if (Math.abs(change) >= 15) { // Significant shift: 15+ points
        shifts.push({
          narrative: narrative.id,
          from: lastScore,
          to: narrative.current_score,
          change
        });
      }
    }
    lastNarrativeScores[narrative.id] = narrative.current_score;
  }

  if (shifts.length === 0) return;

  // Trigger webhooks for narrative shifts
  const subscribers = subscriptions.filter(s => s.events.includes('narrative_shift'));
  await Promise.all(
    subscribers.map(sub =>
      triggerWebhook(sub, 'narrative_shift', { shifts })
    )
  );
}

/**
 * Trigger webhook for high-impact events
 */
export async function notifyHighImpactEvent(event: any): Promise<void> {
  const subscribers = subscriptions.filter(s => s.events.includes('high_impact_event'));

  await Promise.all(
    subscribers.map(sub =>
      triggerWebhook(sub, 'high_impact_event', {
        event_title: event.title,
        event_date: event.date,
        impact: event.impact,
        category: event.category,
        description: event.description
      })
    )
  );
}

/**
 * Send webhook payload to subscriber
 */
async function triggerWebhook(
  subscription: WebhookSubscription,
  event: WebhookEventType,
  data: any
): Promise<void> {
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
    subscription_id: subscription.id
  };

  try {
    const response = await fetch(subscription.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WARGAMES-Webhook/1.0',
        'X-Webhook-Event': event,
        'X-Webhook-Subscription': subscription.id
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error(`Webhook delivery failed for ${subscription.url}: ${response.status}`);
    } else {
      // Update last triggered time
      subscription.lastTriggered = new Date().toISOString();
    }
  } catch (error) {
    console.error(`Webhook delivery error for ${subscription.url}:`, error);
  }
}

/**
 * Generate unique subscription ID
 */
function generateId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Get webhook stats
 */
export function getWebhookStats() {
  return {
    total_subscriptions: subscriptions.length,
    by_event_type: {
      risk_spike: subscriptions.filter(s => s.events.includes('risk_spike')).length,
      risk_drop: subscriptions.filter(s => s.events.includes('risk_drop')).length,
      high_impact_event: subscriptions.filter(s => s.events.includes('high_impact_event')).length,
      narrative_shift: subscriptions.filter(s => s.events.includes('narrative_shift')).length,
      prediction_risk_spike: subscriptions.filter(s => s.events.includes('prediction_risk_spike')).length,
      prediction_liquidation_cascade: subscriptions.filter(s => s.events.includes('prediction_liquidation_cascade')).length,
      prediction_speculation_peak: subscriptions.filter(s => s.events.includes('prediction_speculation_peak')).length,
      prediction_capital_outflow: subscriptions.filter(s => s.events.includes('prediction_capital_outflow')).length,
      prediction_execution_window: subscriptions.filter(s => s.events.includes('prediction_execution_window')).length
    },
    active_agents: new Set(subscriptions.map(s => s.agentName)).size,
    recent_triggers: subscriptions
      .filter(s => s.lastTriggered)
      .sort((a, b) => (b.lastTriggered || '').localeCompare(a.lastTriggered || ''))
      .slice(0, 5)
      .map(s => ({
        agent: s.agentName,
        last_triggered: s.lastTriggered
      }))
  };
}

// =============================================================================
// PREDICTIVE WEBHOOKS
// =============================================================================

/**
 * Check predictions and trigger webhooks for critical events
 */
export async function checkPredictiveAlerts(): Promise<void> {
  try {
    // Import prediction functions
    const {
      predictRiskSpikes,
      predictLiquidationCascades,
      predictSpeculationPeak,
      predictExecutionWindows
    } = await import('./predictiveEngine');

    const {
      getCapitalFlowAnalysis
    } = await import('./bridgeIntegration');

    // Check risk spike predictions
    const riskSpikes = await predictRiskSpikes();
    for (const prediction of riskSpikes) {
      // Alert if spike predicted within 2 hours AND impact is critical/high
      if (
        prediction.time_to_event < 2 * 60 * 60 * 1000 &&
        (prediction.impact === 'critical' || prediction.impact === 'high')
      ) {
        await notifyPrediction('prediction_risk_spike', {
          prediction_type: 'risk_spike',
          time_to_event: prediction.time_to_event_readable,
          predicted_value: prediction.predicted_value,
          current_value: prediction.current_value,
          confidence: prediction.confidence,
          reasoning: prediction.reasoning,
          recommended_action: prediction.recommended_action,
          impact: prediction.impact
        });
      }
    }

    // Check liquidation cascade predictions
    const cascade = await predictLiquidationCascades();
    if (cascade && cascade.confidence > 0.7 && cascade.impact === 'critical') {
      await notifyPrediction('prediction_liquidation_cascade', {
        prediction_type: 'liquidation_cascade',
        time_to_event: cascade.time_to_event_readable,
        at_risk_usd: cascade.predicted_value,
        confidence: cascade.confidence,
        reasoning: cascade.reasoning,
        recommended_action: cascade.recommended_action
      });
    }

    // Check speculation peak predictions
    const speculationPeak = await predictSpeculationPeak();
    if (speculationPeak && speculationPeak.confidence > 0.75 && speculationPeak.impact === 'high') {
      await notifyPrediction('prediction_speculation_peak', {
        prediction_type: 'speculation_peak',
        time_to_event: speculationPeak.time_to_event_readable,
        predicted_score: speculationPeak.predicted_value,
        current_score: speculationPeak.current_value,
        confidence: speculationPeak.confidence,
        reasoning: speculationPeak.reasoning,
        recommended_action: speculationPeak.recommended_action
      });
    }

    // Check capital outflow alerts
    const capitalFlows = await getCapitalFlowAnalysis();
    if (
      capitalFlows.flow_direction === 'outflow' &&
      Math.abs(capitalFlows.net_flow_24h) > 10000000 && // > $10M outflow
      capitalFlows.confidence > 0.7
    ) {
      await notifyPrediction('prediction_capital_outflow', {
        prediction_type: 'capital_outflow',
        net_flow_24h: capitalFlows.net_flow_24h,
        total_outflow_24h: capitalFlows.total_outflow_24h,
        confidence: capitalFlows.confidence,
        interpretation: capitalFlows.interpretation,
        bridges: capitalFlows.bridges.map(b => ({
          bridge: b.bridge,
          outflow: b.outflow_24h,
          net_flow: b.net_flow_24h
        }))
      });
    }

    // Check optimal execution windows
    const executionWindows = await predictExecutionWindows();
    for (const window of executionWindows) {
      // Alert if window opening within 1 hour AND high quality
      if (
        window.time_to_event < 60 * 60 * 1000 &&
        window.confidence > 0.8
      ) {
        await notifyPrediction('prediction_execution_window', {
          prediction_type: 'execution_window',
          time_to_event: window.time_to_event_readable,
          window_quality: window.predicted_value,
          confidence: window.confidence,
          reasoning: window.reasoning,
          recommended_action: window.recommended_action
        });
      }
    }

  } catch (error) {
    console.error('Predictive alerts check error:', error);
  }
}

/**
 * Notify subscribers of prediction events
 */
async function notifyPrediction(
  eventType: WebhookEventType,
  data: any
): Promise<void> {
  const subscribers = subscriptions.filter(s => s.events.includes(eventType));

  await Promise.all(
    subscribers.map(sub =>
      triggerWebhook(sub, eventType, data)
    )
  );
}
