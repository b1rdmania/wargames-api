/**
 * WARGAMES Event Calendar
 * Upcoming macro events that could move markets
 */

export interface MacroEvent {
  id: string;
  event: string;
  date: string;
  time?: string;
  risk_impact: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  narratives_affected: string[];
}

// Events are relative to current date for demo purposes
const now = new Date();
const addDays = (days: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const events: MacroEvent[] = [
  {
    id: 'fomc-feb',
    event: 'FOMC Meeting',
    date: addDays(2),
    time: '14:00 EST',
    risk_impact: 'high',
    description: 'Federal Reserve interest rate decision and economic projections',
    narratives_affected: ['fed-pivot', 'institutional-adoption']
  },
  {
    id: 'cpi-feb',
    event: 'US CPI Release',
    date: addDays(5),
    time: '08:30 EST',
    risk_impact: 'high',
    description: 'Consumer Price Index - key inflation indicator',
    narratives_affected: ['fed-pivot', 'middle-east-oil']
  },
  {
    id: 'nvda-earnings',
    event: 'NVIDIA Earnings',
    date: addDays(7),
    time: '16:00 EST',
    risk_impact: 'high',
    description: 'NVIDIA Q4 earnings - bellwether for AI sector',
    narratives_affected: ['ai-bubble', 'institutional-adoption']
  },
  {
    id: 'ecb-meeting',
    event: 'ECB Rate Decision',
    date: addDays(4),
    time: '08:15 EST',
    risk_impact: 'medium',
    description: 'European Central Bank monetary policy decision',
    narratives_affected: ['fed-pivot']
  },
  {
    id: 'opec-meeting',
    event: 'OPEC+ Meeting',
    date: addDays(9),
    risk_impact: 'medium',
    description: 'OPEC production quota decision',
    narratives_affected: ['middle-east-oil']
  },
  {
    id: 'sec-deadline',
    event: 'SEC Comment Period Closes',
    date: addDays(12),
    risk_impact: 'medium',
    description: 'Deadline for comments on proposed crypto custody rules',
    narratives_affected: ['regulatory-crackdown']
  },
  {
    id: 'jobs-report',
    event: 'US Jobs Report',
    date: addDays(3),
    time: '08:30 EST',
    risk_impact: 'high',
    description: 'Non-farm payrolls and unemployment rate',
    narratives_affected: ['fed-pivot']
  },
  {
    id: 'tsmc-earnings',
    event: 'TSMC Earnings Call',
    date: addDays(14),
    risk_impact: 'medium',
    description: 'Taiwan Semiconductor Q4 results and guidance',
    narratives_affected: ['taiwan-semiconductor', 'ai-bubble']
  }
];

export function getUpcomingEvents(days: number = 14): MacroEvent[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  return events
    .filter(e => new Date(e.date) <= cutoff)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function getHighImpactEvents(): MacroEvent[] {
  return events.filter(e => e.risk_impact === 'high' || e.risk_impact === 'critical');
}
