/**
 * Real Economic Events Calendar
 * Sources: Alpha Vantage Economic Calendar + Fed Calendar
 */

export interface EconomicEvent {
  id: string;
  event: string;
  date: string;
  time?: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  country: string;
  category: 'monetary_policy' | 'economic_data' | 'earnings' | 'geopolitical';
  description?: string;
  source: 'alpha_vantage' | 'fed_calendar' | 'manual';
}

// Cache for economic calendar data
let calendarCache: { data: EconomicEvent[]; timestamp: number } | null = null;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Known FOMC meeting dates (manually updated from Fed calendar)
 * Source: https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
 */
const FOMC_2026_DATES = [
  { date: '2026-01-28', time: '14:00 EST' },
  { date: '2026-03-18', time: '14:00 EST' },
  { date: '2026-05-06', time: '14:00 EST' },
  { date: '2026-06-17', time: '14:00 EST' },
  { date: '2026-07-29', time: '14:00 EST' },
  { date: '2026-09-16', time: '14:00 EST' },
  { date: '2026-11-04', time: '14:00 EST' },
  { date: '2026-12-16', time: '14:00 EST' }
];

/**
 * Get Fed FOMC meeting dates
 */
function getFOMCEvents(): EconomicEvent[] {
  const now = new Date();
  return FOMC_2026_DATES
    .filter(meeting => new Date(meeting.date) > now)
    .map(meeting => ({
      id: `fomc-${meeting.date}`,
      event: 'FOMC Meeting & Press Conference',
      date: meeting.date,
      time: meeting.time,
      impact: 'critical',
      country: 'US',
      category: 'monetary_policy',
      description: 'Federal Reserve interest rate decision and economic projections',
      source: 'fed_calendar'
    }));
}

/**
 * Get economic events from Financial Modeling Prep
 * NOTE: FMP economic calendar is a legacy endpoint (deprecated Aug 2025)
 * Keeping function for future alternative API integration
 */
async function getFMPEvents(): Promise<EconomicEvent[]> {
  // FMP economic calendar endpoint deprecated for new users (as of Aug 2025)
  // Returning empty array - using Fed calendar + manual curation instead
  return [];
}

/**
 * Get known high-impact events (manual curation from BLS/Fed schedules)
 * Sources: BLS calendar, Fed calendar, standard release schedules
 */
function getKnownEvents(): EconomicEvent[] {
  const now = new Date();
  const events: EconomicEvent[] = [
    // CPI releases (2nd week of each month, typically Wed/Thu)
    {
      id: 'cpi-feb-2026',
      event: 'US CPI (Inflation)',
      date: '2026-02-12',
      time: '08:30 EST',
      impact: 'critical',
      country: 'US',
      category: 'economic_data',
      description: 'Consumer Price Index - January data',
      source: 'manual'
    },
    {
      id: 'cpi-mar-2026',
      event: 'US CPI (Inflation)',
      date: '2026-03-11',
      time: '08:30 EST',
      impact: 'critical',
      country: 'US',
      category: 'economic_data',
      description: 'Consumer Price Index - February data',
      source: 'manual'
    },
    {
      id: 'cpi-apr-2026',
      event: 'US CPI (Inflation)',
      date: '2026-04-14',
      time: '08:30 EST',
      impact: 'critical',
      country: 'US',
      category: 'economic_data',
      description: 'Consumer Price Index - March data',
      source: 'manual'
    },
    // NFP releases (first Friday of each month)
    {
      id: 'nfp-feb-2026',
      event: 'US Non-Farm Payrolls',
      date: '2026-02-06',
      time: '08:30 EST',
      impact: 'critical',
      country: 'US',
      category: 'economic_data',
      description: 'January employment report',
      source: 'manual'
    },
    {
      id: 'nfp-mar-2026',
      event: 'US Non-Farm Payrolls',
      date: '2026-03-06',
      time: '08:30 EST',
      impact: 'critical',
      country: 'US',
      category: 'economic_data',
      description: 'February employment report',
      source: 'manual'
    },
    {
      id: 'nfp-apr-2026',
      event: 'US Non-Farm Payrolls',
      date: '2026-04-03',
      time: '08:30 EST',
      impact: 'critical',
      country: 'US',
      category: 'economic_data',
      description: 'March employment report',
      source: 'manual'
    },
    // GDP releases (quarterly, end of month)
    {
      id: 'gdp-q4-2025',
      event: 'US GDP (Preliminary)',
      date: '2026-02-27',
      time: '08:30 EST',
      impact: 'high',
      country: 'US',
      category: 'economic_data',
      description: 'Q4 2025 GDP second estimate',
      source: 'manual'
    },
    {
      id: 'gdp-q1-2026-adv',
      event: 'US GDP (Advance)',
      date: '2026-04-30',
      time: '08:30 EST',
      impact: 'high',
      country: 'US',
      category: 'economic_data',
      description: 'Q1 2026 GDP advance estimate',
      source: 'manual'
    },
    // Retail Sales (mid-month)
    {
      id: 'retail-feb-2026',
      event: 'US Retail Sales',
      date: '2026-02-13',
      time: '08:30 EST',
      impact: 'medium',
      country: 'US',
      category: 'economic_data',
      description: 'January retail sales data',
      source: 'manual'
    },
    {
      id: 'retail-mar-2026',
      event: 'US Retail Sales',
      date: '2026-03-13',
      time: '08:30 EST',
      impact: 'medium',
      country: 'US',
      category: 'economic_data',
      description: 'February retail sales data',
      source: 'manual'
    }
  ];

  return events.filter(e => new Date(e.date) > now);
}

/**
 * Get all upcoming economic events
 */
export async function getEconomicEvents(): Promise<EconomicEvent[]> {
  // Check cache
  if (calendarCache && Date.now() - calendarCache.timestamp < CACHE_TTL) {
    return calendarCache.data;
  }

  // Fetch from multiple sources
  const [fomcEvents, fmpEvents, knownEvents] = await Promise.all([
    Promise.resolve(getFOMCEvents()),
    getFMPEvents().catch(() => []),
    Promise.resolve(getKnownEvents())
  ]);

  // Combine and deduplicate
  const allEvents = [...fomcEvents, ...fmpEvents, ...knownEvents];

  // Remove duplicates based on date + event name
  const uniqueEvents = allEvents.reduce((acc, event) => {
    const key = `${event.date}-${event.event}`;
    if (!acc.has(key)) {
      acc.set(key, event);
    } else {
      // Prefer higher impact sources
      const existing = acc.get(key)!;
      const impactOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      if (impactOrder[event.impact] > impactOrder[existing.impact]) {
        acc.set(key, event);
      }
    }
    return acc;
  }, new Map<string, EconomicEvent>());

  const events = Array.from(uniqueEvents.values())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Update cache
  calendarCache = {
    data: events,
    timestamp: Date.now()
  };

  return events;
}

/**
 * Get events within next N days
 */
export async function getUpcomingEvents(days: number = 14): Promise<EconomicEvent[]> {
  const allEvents = await getEconomicEvents();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  return allEvents.filter(e => new Date(e.date) <= cutoff);
}

/**
 * Get high-impact events only
 */
export async function getHighImpactEvents(): Promise<EconomicEvent[]> {
  const allEvents = await getEconomicEvents();
  return allEvents.filter(e => e.impact === 'high' || e.impact === 'critical');
}

/**
 * Get next critical event (within 7 days)
 */
export async function getNextCriticalEvent(): Promise<EconomicEvent | null> {
  const events = await getUpcomingEvents(7);
  return events.find(e => e.impact === 'critical') || null;
}
