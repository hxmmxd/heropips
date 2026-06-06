/**
 * B2: Economic Calendar — High-Impact Event Detection
 * Fetches upcoming economic events from Finnhub + static known schedule.
 * Auto-blocks signals within a configurable window around high-impact events.
 */

import { getPlatformConfig } from './platformConfig';

// ── Types ───────────────────────────────────────────────
export interface EconEvent {
  event: string;
  country: string;
  impact: 'high' | 'medium' | 'low';
  time: Date;
  actual?: string;
  estimate?: string;
}

export interface CalendarCheck {
  blocked: boolean;
  reason: string;
  upcomingEvents: EconEvent[];
  nextHighImpact: EconEvent | null;
  minutesUntilNext: number | null;
}

// ── Cache (30-min TTL — events don't change fast) ───────
const CALENDAR_CACHE: { events: EconEvent[]; expiresAt: number } = { events: [], expiresAt: 0 };
const CALENDAR_TTL = 30 * 60 * 1000;

// Block window: 30 min before, 15 min after high-impact events
const BLOCK_BEFORE_MS = 30 * 60 * 1000;
const BLOCK_AFTER_MS  = 15 * 60 * 1000;

// ── Currency → Country Mapping (for filtering relevant events) ──
const SYMBOL_CURRENCIES: Record<string, string[]> = {
  'XAU/USD': ['US', 'USD'],
  'EUR/USD': ['US', 'EU', 'USD', 'EUR'],
  'GBP/USD': ['US', 'GB', 'USD', 'GBP'],
  'USD/JPY': ['US', 'JP', 'USD', 'JPY'],
  'BTC/USD': ['US', 'USD'],
  'ETH/USD': ['US', 'USD'],
  'QQQ':     ['US'],
  'DIA':     ['US'],
  'SPY':     ['US'],
  'USO':     ['US'],
};

// ── Known High-Impact Event Keywords ────────────────────
const HIGH_IMPACT_KEYWORDS = [
  'nonfarm', 'non-farm', 'nfp', 'fomc', 'federal reserve',
  'interest rate', 'rate decision', 'cpi', 'consumer price',
  'gdp', 'gross domestic', 'ppi', 'producer price',
  'retail sales', 'unemployment', 'jobless claims',
  'pce', 'personal consumption', 'ism manufacturing',
  'ecb', 'boe', 'boj', 'rba', 'monetary policy',
  'jackson hole', 'powell', 'lagarde',
];

const MEDIUM_IMPACT_KEYWORDS = [
  'trade balance', 'industrial production', 'housing starts',
  'building permits', 'durable goods', 'consumer confidence',
  'ism services', 'adp employment', 'jolts',
  'treasury auction', 'bond auction', 'crude oil inventories',
];

function classifyImpact(eventName: string): 'high' | 'medium' | 'low' {
  const lower = eventName.toLowerCase();
  for (const kw of HIGH_IMPACT_KEYWORDS) {
    if (lower.includes(kw)) return 'high';
  }
  for (const kw of MEDIUM_IMPACT_KEYWORDS) {
    if (lower.includes(kw)) return 'medium';
  }
  return 'low';
}

// ── Finnhub Economic Calendar Fetcher ───────────────────
async function fetchFinnhubCalendar(): Promise<EconEvent[]> {
  try {
    const apiKey = await getPlatformConfig('finnhub_api_key', 'FINNHUB_API_KEY');
    if (!apiKey) return [];

    const now = new Date();
    const from = now.toISOString().split('T')[0];
    // Fetch next 3 days
    const to = new Date(now.getTime() + 3 * 86400 * 1000).toISOString().split('T')[0];

    const url = `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      console.warn(`[EconCalendar] Finnhub returned ${res.status}`);
      return [];
    }

    const data = await res.json();
    const rawEvents = data?.economicCalendar || [];

    if (!Array.isArray(rawEvents)) return [];

    const events: EconEvent[] = rawEvents
      .filter((e: any) => e.event && e.time)
      .map((e: any) => ({
        event: e.event,
        country: e.country || 'US',
        impact: e.impact ? (e.impact === 3 ? 'high' : e.impact === 2 ? 'medium' : 'low') : classifyImpact(e.event),
        time: new Date(`${e.time}`),
        actual: e.actual != null ? String(e.actual) : undefined,
        estimate: e.estimate != null ? String(e.estimate) : undefined,
      }))
      .filter((e: EconEvent) => !isNaN(e.time.getTime()));

    console.log(`[EconCalendar] Fetched ${events.length} events from Finnhub (${events.filter(e => e.impact === 'high').length} high-impact)`);
    return events;
  } catch (err) {
    console.warn('[EconCalendar] Finnhub calendar fetch failed:', err);
    return [];
  }
}

// ── Static Fallback: Known Recurring US Events ──────────
function getStaticHighImpactEvents(): EconEvent[] {
  const now = new Date();
  const events: EconEvent[] = [];

  // FOMC meetings 2025-2026 (approximate — 8 per year)
  const fomcDates = [
    '2026-01-28', '2026-03-18', '2026-05-06', '2026-06-17',
    '2026-07-29', '2026-09-16', '2026-11-04', '2026-12-16',
  ];
  for (const d of fomcDates) {
    const t = new Date(`${d}T18:00:00Z`);
    if (Math.abs(t.getTime() - now.getTime()) < 7 * 86400 * 1000) {
      events.push({ event: 'FOMC Rate Decision', country: 'US', impact: 'high', time: t });
    }
  }

  // NFP: First Friday of each month at 12:30 UTC
  const firstFriday = getFirstFriday(now.getFullYear(), now.getMonth());
  if (firstFriday) {
    const nfpTime = new Date(firstFriday);
    nfpTime.setUTCHours(12, 30, 0, 0);
    if (Math.abs(nfpTime.getTime() - now.getTime()) < 2 * 86400 * 1000) {
      events.push({ event: 'Non-Farm Payrolls', country: 'US', impact: 'high', time: nfpTime });
    }
  }

  // CPI: ~10th-15th of each month at 12:30 UTC
  const cpiDay = new Date(now.getFullYear(), now.getMonth(), 13, 12, 30, 0);
  if (Math.abs(cpiDay.getTime() - now.getTime()) < 2 * 86400 * 1000) {
    events.push({ event: 'CPI (Consumer Price Index)', country: 'US', impact: 'high', time: cpiDay });
  }

  return events;
}

function getFirstFriday(year: number, month: number): Date | null {
  for (let day = 1; day <= 7; day++) {
    const d = new Date(year, month, day);
    if (d.getDay() === 5) return d; // Friday = 5
  }
  return null;
}

// ── Main Public API ─────────────────────────────────────
export async function checkEconomicCalendar(symbol: string): Promise<CalendarCheck> {
  const now = Date.now();

  // Refresh cache if expired
  if (now > CALENDAR_CACHE.expiresAt) {
    const finnhubEvents = await fetchFinnhubCalendar();
    const staticEvents = getStaticHighImpactEvents();
    // Merge & deduplicate (prefer Finnhub)
    const allEvents = [...finnhubEvents];
    for (const se of staticEvents) {
      const alreadyExists = finnhubEvents.some(fe =>
        fe.event.toLowerCase().includes(se.event.toLowerCase().split(' ')[0]) &&
        Math.abs(fe.time.getTime() - se.time.getTime()) < 86400 * 1000
      );
      if (!alreadyExists) allEvents.push(se);
    }
    CALENDAR_CACHE.events = allEvents;
    CALENDAR_CACHE.expiresAt = now + CALENDAR_TTL;
  }

  // Filter events relevant to this symbol's currencies
  const relevantCountries = SYMBOL_CURRENCIES[symbol] || ['US'];
  const relevantEvents = CALENDAR_CACHE.events.filter(e =>
    relevantCountries.some(c => e.country.toUpperCase().includes(c.toUpperCase()))
  );

  // Find high-impact events within the block window
  const highImpact = relevantEvents.filter(e => e.impact === 'high');
  const blocking = highImpact.filter(e => {
    const diff = e.time.getTime() - now;
    return diff > -BLOCK_AFTER_MS && diff < BLOCK_BEFORE_MS;
  });

  // Find next upcoming high-impact event
  const upcoming = highImpact
    .filter(e => e.time.getTime() > now)
    .sort((a, b) => a.time.getTime() - b.time.getTime());

  const nextHighImpact = upcoming[0] || null;
  const minutesUntilNext = nextHighImpact
    ? Math.round((nextHighImpact.time.getTime() - now) / 60000)
    : null;

  if (blocking.length > 0) {
    const names = blocking.map(e => e.event).join(', ');
    return {
      blocked: true,
      reason: `⚠️ ${names} — within ${BLOCK_BEFORE_MS / 60000}min window`,
      upcomingEvents: upcoming.slice(0, 5),
      nextHighImpact,
      minutesUntilNext,
    };
  }

  return {
    blocked: false,
    reason: nextHighImpact
      ? `Clear — next event: ${nextHighImpact.event} in ${minutesUntilNext}min`
      : 'No high-impact events nearby',
    upcomingEvents: upcoming.slice(0, 5),
    nextHighImpact,
    minutesUntilNext,
  };
}
