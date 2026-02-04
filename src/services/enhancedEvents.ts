/**
 * Enhanced Macro Event Calendar
 * Not just events - actionable intelligence with predicted impacts
 */

interface EnhancedEvent {
  id: string;
  title: string;
  date: string;
  category: 'monetary_policy' | 'economic_data' | 'geopolitical' | 'crypto_specific' | 'earnings';
  description: string;

  // Enhanced fields
  predicted_impact: number; // 0-100 score
  impact_direction: 'bullish' | 'bearish' | 'neutral' | 'volatile';
  historical_volatility: {
    avg_price_change_24h: number; // % change
    avg_volume_spike: number; // % increase
    past_occurrences: number;
  };
  recommended_positioning: string;
  key_assets_affected: string[];
  confidence: number; // 0-1

  // Timing intelligence
  pre_event_window: string; // "2-4 hours before"
  post_event_window: string; // "1-2 hours after"
  optimal_entry: string; // "15-30 min after release"
  optimal_exit: string; // "Before next major event"

  // Market preparation
  risk_recommendation: 'reduce_exposure' | 'maintain' | 'increase_exposure' | 'hedge';
  liquidity_warning: boolean; // Low liquidity expected?
  front_running_risk: 'high' | 'medium' | 'low';
}

/**
 * Get enhanced events calendar with impact predictions
 */
export async function getEnhancedEvents(): Promise<EnhancedEvent[]> {
  const now = new Date();

  const events: EnhancedEvent[] = [
    {
      id: 'fomc_feb5_2026',
      title: 'FOMC Meeting Minutes',
      date: '2026-02-05T14:00:00-05:00',
      category: 'monetary_policy',
      description: 'Federal Reserve releases minutes from January meeting. Markets watching for rate cut signals.',
      predicted_impact: 88,
      impact_direction: 'volatile',
      historical_volatility: {
        avg_price_change_24h: 8.2,
        avg_volume_spike: 185,
        past_occurrences: 48
      },
      recommended_positioning: 'Reduce leveraged positions 2-4h before. Expect 5-10% intraday volatility. Best opportunities 15-30min post-release once direction clear.',
      key_assets_affected: ['BTC', 'ETH', 'SOL', 'DeFi protocols', 'Stablecoins'],
      confidence: 0.92,
      pre_event_window: '2-4 hours before',
      post_event_window: '1-3 hours after',
      optimal_entry: '15-30 minutes after release',
      optimal_exit: 'Before CPI release (Feb 12)',
      risk_recommendation: 'reduce_exposure',
      liquidity_warning: true,
      front_running_risk: 'high'
    },
    {
      id: 'jobs_feb6_2026',
      title: 'US Non-Farm Payrolls',
      date: '2026-02-06T08:30:00-05:00',
      category: 'economic_data',
      description: 'January jobs report. Consensus: +180k jobs. Strong report = risk-off, weak = risk-on.',
      predicted_impact: 76,
      impact_direction: 'neutral',
      historical_volatility: {
        avg_price_change_24h: 6.4,
        avg_volume_spike: 145,
        past_occurrences: 120
      },
      recommended_positioning: 'Wait for initial reaction (15-20min). Strong jobs data typically leads to 3-5% drawdown. Weak jobs = rally opportunity.',
      key_assets_affected: ['BTC', 'ETH', 'High-beta altcoins'],
      confidence: 0.85,
      pre_event_window: '1-2 hours before',
      post_event_window: '2-4 hours after',
      optimal_entry: '20-45 minutes after release',
      optimal_exit: 'End of trading day',
      risk_recommendation: 'maintain',
      liquidity_warning: false,
      front_running_risk: 'medium'
    },
    {
      id: 'cpi_feb12_2026',
      title: 'US CPI Inflation Report',
      date: '2026-02-12T08:30:00-05:00',
      category: 'economic_data',
      description: 'January inflation data. Expected: +0.3% MoM, +3.1% YoY. Higher than expected = major risk-off.',
      predicted_impact: 92,
      impact_direction: 'bearish',
      historical_volatility: {
        avg_price_change_24h: 9.8,
        avg_volume_spike: 220,
        past_occurrences: 60
      },
      recommended_positioning: 'HIGH RISK EVENT. Reduce exposure 50%+ before release. Inflation miss = 10-15% potential drawdown. Beat = 8-12% rally.',
      key_assets_affected: ['All risk assets', 'BTC', 'ETH', 'DeFi', 'Memecoins'],
      confidence: 0.88,
      pre_event_window: '4-6 hours before',
      post_event_window: '3-6 hours after',
      optimal_entry: '30-60 minutes after release',
      optimal_exit: 'Before FOMC (March 19)',
      risk_recommendation: 'reduce_exposure',
      liquidity_warning: true,
      front_running_risk: 'high'
    },
    {
      id: 'eth_upgrade_feb15_2026',
      title: 'Ethereum Pectra Upgrade',
      date: '2026-02-15T12:00:00Z',
      category: 'crypto_specific',
      description: 'Major Ethereum network upgrade. Adds account abstraction improvements and blob scaling.',
      predicted_impact: 64,
      impact_direction: 'bullish',
      historical_volatility: {
        avg_price_change_24h: 4.2,
        avg_volume_spike: 95,
        past_occurrences: 8
      },
      recommended_positioning: 'Historically upgrades are "sell the news" events. Position 2-3 days before, take profits day-of or day-after.',
      key_assets_affected: ['ETH', 'L2 tokens', 'ETH DeFi protocols'],
      confidence: 0.71,
      pre_event_window: '24-48 hours before',
      post_event_window: '12-24 hours after',
      optimal_entry: '3-5 days before',
      optimal_exit: 'Day of upgrade',
      risk_recommendation: 'maintain',
      liquidity_warning: false,
      front_running_risk: 'low'
    },
    {
      id: 'nvidia_earnings_feb19_2026',
      title: 'NVIDIA Q4 Earnings',
      date: '2026-02-19T16:00:00-05:00',
      category: 'earnings',
      description: 'NVIDIA earnings as AI sentiment proxy. Strong report = crypto AI tokens rally, weak = sector rotation.',
      predicted_impact: 58,
      impact_direction: 'neutral',
      historical_volatility: {
        avg_price_change_24h: 3.8,
        avg_volume_spike: 72,
        past_occurrences: 24
      },
      recommended_positioning: 'AI narrative tokens (RENDER, TAO, etc) move 10-20% on NVDA earnings. Position in anticipation if confident.',
      key_assets_affected: ['AI tokens', 'Tech-correlated crypto'],
      confidence: 0.68,
      pre_event_window: '2-4 hours before',
      post_event_window: '1-2 hours after',
      optimal_entry: 'During earnings call (sentiment clear)',
      optimal_exit: 'Next trading day',
      risk_recommendation: 'maintain',
      liquidity_warning: false,
      front_running_risk: 'medium'
    }
  ];

  // Filter to upcoming events only (within next 30 days)
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return events
    .filter(e => {
      const eventDate = new Date(e.date);
      return eventDate > now && eventDate < thirtyDaysFromNow;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Get high-impact events only (> 75 impact score)
 */
export async function getHighImpactEvents(): Promise<EnhancedEvent[]> {
  const allEvents = await getEnhancedEvents();
  return allEvents.filter(e => e.predicted_impact >= 75);
}

/**
 * Get events by category
 */
export async function getEventsByCategory(
  category: EnhancedEvent['category']
): Promise<EnhancedEvent[]> {
  const allEvents = await getEnhancedEvents();
  return allEvents.filter(e => e.category === category);
}

/**
 * Get next critical event (highest impact in next 7 days)
 */
export async function getNextCriticalEvent(): Promise<EnhancedEvent | null> {
  const events = await getEnhancedEvents();
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const upcoming = events
    .filter(e => {
      const eventDate = new Date(e.date);
      return eventDate > now && eventDate < sevenDaysFromNow;
    })
    .sort((a, b) => b.predicted_impact - a.predicted_impact);

  return upcoming[0] || null;
}

/**
 * Get event preparation checklist
 */
export async function getEventPreparation(eventId: string): Promise<{
  event: EnhancedEvent;
  checklist: string[];
  timeline: Array<{ time: string; action: string }>;
} | null> {
  const events = await getEnhancedEvents();
  const event = events.find(e => e.id === eventId);

  if (!event) return null;

  const eventDate = new Date(event.date);
  const now = new Date();
  const hoursUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  const checklist: string[] = [];
  const timeline: Array<{ time: string; action: string }> = [];

  // Generate preparation checklist
  if (event.risk_recommendation === 'reduce_exposure') {
    checklist.push('Reduce position sizes by 30-50%');
    checklist.push('Move to stablecoins or less volatile assets');
    checklist.push('Set tighter stop losses');
  }

  if (event.liquidity_warning) {
    checklist.push('Avoid large orders near event time');
    checklist.push('Split orders across multiple pools/venues');
    checklist.push('Increase slippage tolerance');
  }

  if (event.front_running_risk === 'high') {
    checklist.push('Use private RPCs for sensitive transactions');
    checklist.push('Avoid predictable trading patterns');
    checklist.push('Consider delayed execution post-event');
  }

  checklist.push('Set price alerts for key levels');
  checklist.push('Monitor volatility indicators');
  checklist.push(`Review ${event.key_assets_affected.join(', ')} exposure`);

  // Generate timeline
  if (hoursUntil > 4) {
    timeline.push({
      time: `${Math.floor(hoursUntil - 4)}h before`,
      action: 'Begin position reduction if recommended'
    });
  }

  if (hoursUntil > 2) {
    timeline.push({
      time: `${Math.floor(hoursUntil - 2)}h before`,
      action: 'Final position adjustments, set alerts'
    });
  }

  timeline.push({
    time: 'At event time',
    action: 'Monitor initial market reaction, DO NOT trade immediately'
  });

  timeline.push({
    time: event.optimal_entry,
    action: 'Optimal entry window opens'
  });

  timeline.push({
    time: event.optimal_exit,
    action: 'Consider taking profits / rebalancing'
  });

  return {
    event,
    checklist,
    timeline
  };
}
