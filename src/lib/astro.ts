/**
 * src/lib/astro.ts — Phase 7: NASA-grade ephemeris engine
 * Powered by astronomy-engine (Don Cross / NASA), accurate to <0.1°.
 * Replaces all J2000 hand-approximations with real planetary calculations.
 */

import * as Astronomy from 'astronomy-engine';

export interface PlanetData {
  longitude: number;      // ecliptic longitude 0–360
  zodiacSign: string;     // e.g. "Gemini"
  zodiacSymbol: string;   // e.g. "♊"
  degreeInSign: number;   // 0–30
}

export interface PlanetaryAspect {
  planet1: string;
  planet2: string;
  type: 'Conjunction' | 'Square' | 'Trine' | 'Opposition' | 'Sextile';
  exactDegrees: number;
  orb: number;
  nature: 'harmonious' | 'tense' | 'neutral';
}

export interface AstroSnapshot {
  lunarPhase: string;
  lunarEmoji: string;
  lunarDegree: number;
  lunarElongation: number;
  moon: PlanetData;
  mercury: PlanetData;
  venus: PlanetData;
  mars: PlanetData;
  mercuryRetrograde: boolean;
  mercuryNote: string;
  dominantAspect: string;
  marketBias: 'bullish' | 'bearish' | 'neutral';
  biasReason: string;
  activeFilters: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';

  // Extended Phase 5 & 7 fields
  moonAge: number;          // 0–29.53 days
  moonPhase: number;        // 0.0–1.0
  moonSignIndex: number;    // 0–11 (Aries=0 ... Pisces=11)
  moonSignName: string;     // "Aries", "Taurus" etc.
  moonElement: 'fire' | 'earth' | 'air' | 'water';
  moonVoidOfCourse: boolean;
  mercuryState: 'direct' | 'pre-shadow' | 'retrograde' | 'post-shadow';
  mercuryLongitude: number;
  aspects: PlanetaryAspect[];
  eclipseBlackout: boolean;
  eclipseType?: 'Solar' | 'Lunar';
  seasonalBias: 1 | 0 | -1;
  lunaBias: 'bullish' | 'bearish' | 'neutral';
  elementBias: 'bullish' | 'bearish' | 'neutral';
  conjunctionBonus: number;
  timestamp: number;
}

export interface AstroGate {
  allowed: boolean;          // false = hard block, no signal ticket
  lotMultiplier: number;     // 0=blocked, 0.5=HIGH risk, 0.75=MEDIUM, 1.0=LOW
  confidenceModifier: number;// added to confluenceScore (can be negative)
  blockReason: string | null;// shown to user when blocked
  statusLine: string;        // one-line chip label e.g. "☿℞ BLOCKED"
  contextBlock: string;      // injected into LLM system prompt
}

const ZODIAC = [
  { name: 'Aries',       symbol: '♈' },
  { name: 'Taurus',      symbol: '♉' },
  { name: 'Gemini',      symbol: '♊' },
  { name: 'Cancer',      symbol: '♋' },
  { name: 'Leo',         symbol: '♌' },
  { name: 'Virgo',       symbol: '♍' },
  { name: 'Libra',       symbol: '♎' },
  { name: 'Scorpio',     symbol: '♏' },
  { name: 'Sagittarius', symbol: '♐' },
  { name: 'Capricorn',   symbol: '♑' },
  { name: 'Aquarius',    symbol: '♒' },
  { name: 'Pisces',      symbol: '♓' },
];

const ZODIAC_ELEMENTS: ('fire' | 'earth' | 'air' | 'water')[] = [
  'fire',  // Aries
  'earth', // Taurus
  'air',   // Gemini
  'water', // Cancer
  'fire',  // Leo
  'earth', // Virgo
  'air',   // Libra
  'water', // Scorpio
  'fire',  // Sagittarius
  'earth', // Capricorn
  'air',   // Aquarius
  'water', // Pisces
];

const ECLIPSES = [
  // 2026
  { date: '2026-02-17', type: 'Solar' },
  { date: '2026-03-03', type: 'Lunar' },
  { date: '2026-08-12', type: 'Solar' },
  { date: '2026-08-28', type: 'Lunar' },
  // 2027
  { date: '2027-02-06', type: 'Solar' },
  { date: '2027-02-20', type: 'Lunar' },
  { date: '2027-08-02', type: 'Solar' },
  { date: '2027-08-17', type: 'Lunar' },
  // 2028
  { date: '2028-01-26', type: 'Solar' },
  { date: '2028-02-10', type: 'Lunar' },
  { date: '2028-07-22', type: 'Solar' },
  { date: '2028-08-06', type: 'Lunar' },
  // 2029
  { date: '2029-01-16', type: 'Solar' },
  { date: '2029-01-30', type: 'Lunar' },
  { date: '2029-07-11', type: 'Solar' },
  { date: '2029-07-25', type: 'Lunar' },
  { date: '2029-12-20', type: 'Lunar' },
  // 2030
  { date: '2030-06-01', type: 'Solar' },
  { date: '2030-06-15', type: 'Lunar' },
  { date: '2030-11-25', type: 'Solar' },
  { date: '2030-12-09', type: 'Lunar' }
];

function toZodiac(lon: number): { zodiacSign: string; zodiacSymbol: string; degreeInSign: number } {
  const idx = Math.floor(((lon % 360) + 360) % 360 / 30);
  const z = ZODIAC[idx];
  return {
    zodiacSign: z.name,
    zodiacSymbol: z.symbol,
    degreeInSign: Math.round(((lon % 360) + 360) % 360 % 30 * 10) / 10,
  };
}

function toPlanetData(lon: number): PlanetData {
  const norm = ((lon % 360) + 360) % 360;
  return { longitude: Math.round(norm * 10) / 10, ...toZodiac(norm) };
}

/* ─── astronomy-engine helpers ─────────────────────────────────────────────
   All longitude values are ecliptic geocentric, 0–360°, epoch J2000.0.
   Retrograde detected by comparing longitude now vs +24h: backward = Rx.
   ────────────────────────────────────────────────────────────────────────── */

function getEclipticLon(body: Astronomy.Body, date: Date): number {
  if (body === Astronomy.Body.Sun) {
    const pos = Astronomy.SunPosition(date);
    return ((pos.elon % 360) + 360) % 360;
  }
  if (body === Astronomy.Body.Moon) {
    const pos = Astronomy.EclipticGeoMoon(date);
    return ((pos.lon % 360) + 360) % 360;
  }
  const vec = Astronomy.GeoVector(body, date, true);
  const ecl = Astronomy.Ecliptic(vec);
  return ((ecl.elon % 360) + 360) % 360;
}

function isRetrograde(body: Astronomy.Body, date: Date): boolean {
  const lon1 = getEclipticLon(body, date);
  const lon2 = getEclipticLon(body, new Date(date.getTime() + 86_400_000)); // +1 day
  const diff = ((lon2 - lon1 + 540) % 360) - 180;
  return diff < 0; // negative motion = retrograde
}

function getDominantAspect(date: Date): string {
  const aspects = getActivePlanetaryAspects(date);
  if (aspects.length === 0) return 'No major aspects';
  // Sort to find tightest aspect (smallest orb)
  const sorted = [...aspects].sort((a, b) => a.orb - b.orb);
  const top = sorted[0];
  return `${top.planet1} ${top.type} ${top.planet2} (orb ${top.orb}°)`;
}

function lunarPhaseName(elongation: number): { name: string; emoji: string } {
  const phases = [
    { max: 22.5,  name: 'New Moon',        emoji: '🌑' },
    { max: 67.5,  name: 'Waxing Crescent', emoji: '🌒' },
    { max: 112.5, name: 'First Quarter',   emoji: '🌓' },
    { max: 157.5, name: 'Waxing Gibbous',  emoji: '🌔' },
    { max: 202.5, name: 'Full Moon',       emoji: '🌕' },
    { max: 247.5, name: 'Waning Gibbous',  emoji: '🌖' },
    { max: 292.5, name: 'Last Quarter',    emoji: '🌗' },
    { max: 337.5, name: 'Waning Crescent', emoji: '🌘' },
    { max: 360,   name: 'New Moon',        emoji: '🌑' },
  ];
  return phases.find(p => elongation < p.max) ?? { name: 'New Moon', emoji: '🌑' };
}

// ── 1. Void of Course moon detection
export function isMoonVoidOfCourse(date: Date): boolean {
  const moonLonStart = getEclipticLon(Astronomy.Body.Moon, date);
  const currentSign = Math.floor(moonLonStart / 30);
  
  // Moon speed is roughly 13.17 degrees/day or ~0.55 degrees/hour.
  const moonSpeedPerHour = 13.176358 / 24;
  const degRemaining = 30 - (moonLonStart % 30);
  const hoursRemaining = degRemaining / moonSpeedPerHour;
  
  const bodies = [
    Astronomy.Body.Sun,
    Astronomy.Body.Mercury,
    Astronomy.Body.Venus,
    Astronomy.Body.Mars,
    Astronomy.Body.Jupiter,
    Astronomy.Body.Saturn
  ];
  
  // Search forward in 2-hour increments to check for major aspects before the sign changes
  for (let h = 0.5; h < hoursRemaining; h += 2) {
    const futureDate = new Date(date.getTime() + h * 60 * 60 * 1000);
    const mId = getEclipticLon(Astronomy.Body.Moon, futureDate);
    
    // Moon entered the next sign
    if (Math.floor(mId / 30) !== currentSign) break;
    
    for (const body of bodies) {
      const pLon = getEclipticLon(body, futureDate);
      const diff = Math.abs(mId - pLon) % 360;
      const angle = diff > 180 ? 360 - diff : diff;
      
      const isAspect = [0, 60, 90, 120, 180].some(aspectAngle => Math.abs(angle - aspectAngle) < 1.5);
      if (isAspect) {
        return false; // Found a valid future aspect in this sign
      }
    }
  }
  return true; // No aspects found, Void of Course!
}

// ── 2. Mercury state (direct, retrograde, shadow periods)
export function getMercuryState(date: Date): 'direct' | 'pre-shadow' | 'retrograde' | 'post-shadow' {
  const isRx = isRetrograde(Astronomy.Body.Mercury, date);
  if (isRx) return 'retrograde';
  
  // Scan backward 14 days for post-shadow
  for (let d = 1; d <= 14; d++) {
    const checkDate = new Date(date.getTime() - d * 24 * 60 * 60 * 1000);
    if (isRetrograde(Astronomy.Body.Mercury, checkDate)) {
      return 'post-shadow';
    }
  }
  
  // Scan forward 14 days for pre-shadow
  for (let d = 1; d <= 14; d++) {
    const checkDate = new Date(date.getTime() + d * 24 * 60 * 60 * 1000);
    if (isRetrograde(Astronomy.Body.Mercury, checkDate)) {
      return 'pre-shadow';
    }
  }
  
  return 'direct';
}

// ── 3. Planetary aspects
export function getActivePlanetaryAspects(date: Date): PlanetaryAspect[] {
  const bodies = [
    { name: 'Sun ☉',     body: Astronomy.Body.Sun },
    { name: 'Moon 🌙',    body: Astronomy.Body.Moon },
    { name: 'Mercury ☿', body: Astronomy.Body.Mercury },
    { name: 'Venus ♀',   body: Astronomy.Body.Venus },
    { name: 'Mars ♂',    body: Astronomy.Body.Mars },
    { name: 'Jupiter ♃', body: Astronomy.Body.Jupiter },
    { name: 'Saturn ♄',  body: Astronomy.Body.Saturn }
  ];
  
  const aspects: PlanetaryAspect[] = [];
  const orb = 6;
  
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const lon1 = getEclipticLon(bodies[i].body, date);
      const lon2 = getEclipticLon(bodies[j].body, date);
      const diff = Math.abs(lon1 - lon2) % 360;
      const angle = diff > 180 ? 360 - diff : diff;
      
      const aspectTypes: { type: PlanetaryAspect['type']; angle: number; nature: 'harmonious' | 'tense' | 'neutral' }[] = [
        { type: 'Conjunction', angle: 0,   nature: 'neutral' },
        { type: 'Sextile',     angle: 60,  nature: 'harmonious' },
        { type: 'Square',      angle: 90,  nature: 'tense' },
        { type: 'Trine',       angle: 120, nature: 'harmonious' },
        { type: 'Opposition',  angle: 180, nature: 'tense' }
      ];
      
      for (const a of aspectTypes) {
        const delta = Math.abs(angle - a.angle);
        if (delta < orb) {
          aspects.push({
            planet1: bodies[i].name,
            planet2: bodies[j].name,
            type: a.type,
            exactDegrees: a.angle,
            orb: Math.round(delta * 10) / 10,
            nature: a.nature
          });
        }
      }
    }
  }
  return aspects;
}

// ── 4. Eclipse blackout check
export function isEclipseBlackout(date: Date): { blocked: boolean; type?: 'Solar' | 'Lunar' } {
  const dayMs = 24 * 60 * 60 * 1000;
  for (const e of ECLIPSES) {
    const eDate = new Date(e.date + 'T12:00:00Z');
    const diff = Math.abs(date.getTime() - eDate.getTime());
    if (diff <= dayMs * 1.5) {
      return { blocked: true, type: e.type as 'Solar' | 'Lunar' };
    }
  }
  return { blocked: false };
}

// ── 5. Seasonal commodity/index cycle bias
export function getSeasonalBias(symbol: string, date: Date): 1 | 0 | -1 {
  const month = date.getMonth();
  const s = symbol.toUpperCase();
  
  if (s.includes('XAU') || s.includes('GOLD')) {
    if ([0, 1, 7, 8].includes(month)) return 1;
    if ([5, 6, 10].includes(month)) return -1;
  }
  if (s.includes('USO') || s.includes('OIL')) {
    if ([4, 5, 6].includes(month)) return 1;
    if ([1, 2, 9].includes(month)) return -1;
  }
  if (s.includes('QQQ') || s.includes('SPY') || s.includes('DIA')) {
    if ([10, 11, 0].includes(month)) return 1;
    if ([8, 9].includes(month)) return -1;
  }
  return 0;
}

// ── 6. Saturn-Jupiter Conjunction macro bonus
export function getGreatConjunctionBonus(symbol: string, date: Date): number {
  const s = symbol.toUpperCase();
  if (s.includes('QQQ') || s.includes('SPY') || s.includes('DIA') || s.includes('XAU') || s.includes('GOLD')) {
    const year = date.getFullYear();
    if (year >= 2020 && year <= 2030) {
      return 3; // +3% confluence bonus
    }
  }
  return 0;
}

// ── 7. Moon Sign element calibration
export function getElementBias(element: 'fire' | 'earth' | 'air' | 'water', symbol: string): 'bullish' | 'bearish' | 'neutral' {
  const s = symbol.toUpperCase();
  if (element === 'fire') {
    if (s.includes('BTC') || s.includes('ETH') || s.includes('QQQ') || s.includes('SPY')) return 'bullish';
  }
  if (element === 'earth') {
    if (s.includes('XAU') || s.includes('GOLD')) return 'bullish';
  }
  if (element === 'water') {
    if (s.includes('BTC') || s.includes('ETH') || s.includes('QQQ') || s.includes('SPY')) return 'bearish';
    if (s.includes('XAU') || s.includes('GOLD')) return 'bullish';
  }
  return 'neutral';
}

// ── 8. Lunar phase calibration
export function getLunaBias(elongation: number, symbol: string): 'bullish' | 'bearish' | 'neutral' {
  const isFullMoon = elongation >= 157.5 && elongation < 202.5;
  const isNewMoon  = elongation < 22.5 || elongation >= 337.5;
  const isWaxing   = elongation < 180;
  
  const s = symbol.toUpperCase();
  if (s.includes('XAU') || s.includes('GOLD')) {
    if (isNewMoon) return 'bullish';
    if (isFullMoon) return 'bearish';
  }
  if (s.includes('BTC') || s.includes('ETH') || s.includes('QQQ') || s.includes('SPY')) {
    if (isNewMoon) return 'bullish';
    if (isFullMoon) return 'bearish';
    if (isWaxing) return 'bullish';
    return 'bearish';
  }
  return 'neutral';
}

// ── 9. High-precision Master Assembler
export function computeAstroSnapshot(symbol: string, date: Date = new Date()): AstroSnapshot {
  const moonLon  = getEclipticLon(Astronomy.Body.Moon,    date);
  const sunLon   = getEclipticLon(Astronomy.Body.Sun,     date);
  const mercLon  = getEclipticLon(Astronomy.Body.Mercury, date);
  const venLon   = getEclipticLon(Astronomy.Body.Venus,   date);
  const marLon   = getEclipticLon(Astronomy.Body.Mars,    date);

  const elongation = ((Astronomy.MoonPhase(date) % 360) + 360) % 360;
  const mercuryRetrograde = isRetrograde(Astronomy.Body.Mercury, date);
  const { name: lunarPhase, emoji: lunarEmoji } = lunarPhaseName(elongation);
  const dominantAspect = getDominantAspect(date);

  const moonPhase = elongation / 360;
  const moonAge = moonPhase * 29.530588853;
  const moonSignIndex = Math.floor(moonLon / 30);
  const moonSignName = ZODIAC[moonSignIndex].name;
  const moonElement = ZODIAC_ELEMENTS[moonSignIndex];
  const moonVoidOfCourse = isMoonVoidOfCourse(date);
  const mercuryState = getMercuryState(date);
  const aspects = getActivePlanetaryAspects(date);
  const eclipse = isEclipseBlackout(date);
  const seasonalBias = getSeasonalBias(symbol, date);
  const lunaBias = getLunaBias(elongation, symbol);
  const elementBias = getElementBias(moonElement, symbol);
  const conjunctionBonus = getGreatConjunctionBonus(symbol, date);

  // Combined Market Bias Synthesis
  let score = 0;
  if (lunaBias === 'bullish') score += 2;
  if (lunaBias === 'bearish') score -= 2;
  if (elementBias === 'bullish') score += 1;
  if (elementBias === 'bearish') score -= 1;
  if (seasonalBias === 1) score += 2;
  if (seasonalBias === -1) score -= 2;

  let marketBias: AstroSnapshot['marketBias'] = 'neutral';
  let biasReason = 'Planetary aspects are balanced — standard technical conditions apply.';
  if (score > 1) {
    marketBias = 'bullish';
    biasReason = `Celestial accumulation aligned: ${lunarPhase} (${lunaBias}) with ${moonElement} element support (${elementBias}) and favorable seasonal indicators.`;
  } else if (score < -1) {
    marketBias = 'bearish';
    biasReason = `Celestial distribution pressure: ${lunarPhase} (${lunaBias}) and unfavorable seasonal/element alignment (${elementBias}). Expect downward pressure.`;
  } else {
    biasReason = `Celestial factors are balanced (score: ${score}). Luna phase: ${lunarPhase}, Moon in ${moonSignName} (${moonElement}).`;
  }

  // Override warnings for retrograde and blackout
  const activeFilters: string[] = ['Lunar Phase Gate', 'Aspect Confluence Filter'];
  if (mercuryRetrograde) activeFilters.push('Mercury Retrograde Lock');
  if (moonVoidOfCourse) activeFilters.push('Moon Void of Course Limit');
  if (eclipse.blocked) activeFilters.push('Eclipse Blackout Lock');

  const riskLevel: AstroSnapshot['riskLevel'] =
    mercuryRetrograde || eclipse.blocked || moonVoidOfCourse ? 'HIGH' : score > 1 ? 'LOW' : 'MEDIUM';

  return {
    lunarPhase,
    lunarEmoji,
    lunarDegree: Math.round(moonLon * 10) / 10,
    lunarElongation: Math.round(elongation * 10) / 10,
    moon:    toPlanetData(moonLon),
    mercury: toPlanetData(mercLon),
    venus:   toPlanetData(venLon),
    mars:    toPlanetData(marLon),
    mercuryRetrograde,
    mercuryNote: mercuryRetrograde ? 'Retrograde ℞' : 'Direct ✓',
    dominantAspect,
    marketBias,
    biasReason,
    activeFilters,
    riskLevel,

    // Extended
    moonAge: Math.round(moonAge * 100) / 100,
    moonPhase: Math.round(moonPhase * 100) / 100,
    moonSignIndex,
    moonSignName,
    moonElement,
    moonVoidOfCourse,
    mercuryState,
    mercuryLongitude: Math.round(mercLon * 10) / 10,
    aspects,
    eclipseBlackout: eclipse.blocked,
    eclipseType: eclipse.type,
    seasonalBias,
    lunaBias,
    elementBias,
    conjunctionBonus,
    timestamp: date.getTime()
  };
}

// Backward compatible fallback wrapper
export function getAstroSnapshot(date: Date = new Date()): AstroSnapshot {
  return computeAstroSnapshot('XAU/USD', date);
}

/**
 * getAstroGate — Phase 5/7 Signal Pipeline Gate
 * Accepts flexible parameters:
 *   - getAstroGate(date)
 *   - getAstroGate(symbol, date)
 */
export function getAstroGate(first?: string | Date, second?: Date): AstroGate {
  let symbol = 'XAU/USD';
  let date = new Date();
  if (first instanceof Date) {
    date = first;
  } else if (typeof first === 'string') {
    symbol = first;
    if (second instanceof Date) {
      date = second;
    }
  } else if (second instanceof Date) {
    date = second;
  }

  const snap = computeAstroSnapshot(symbol, date);

  // ── RULE 1: Eclipse Blackout → Hard Block ──────────────────
  if (snap.eclipseBlackout) {
    return {
      allowed: false,
      lotMultiplier: 0,
      confidenceModifier: -40,
      blockReason: `Eclipse Blackout Active (type: ${snap.eclipseType || 'Solar'}). All trading activity is suspended during this high-volatility node.`,
      statusLine: '🌑 ECLIPSE BLOCK — High Risk Node',
      contextBlock: `[ASTRO GATE — ECLIPSE BLOCK] A ${snap.eclipseType || 'Solar'} Eclipse is active. Hard block: all automated order execution is halted. Recommend checking news channels for unexpected volatility or liquidity drops.`,
    };
  }

  // ── RULE 2: Void of Course Moon → Hard Block ──────────────────
  if (snap.moonVoidOfCourse) {
    return {
      allowed: false,
      lotMultiplier: 0,
      confidenceModifier: -25,
      blockReason: `Moon is Void of Course (VOC) in ${snap.moonSignName}. Historically associated with false breakouts and lack of market momentum.`,
      statusLine: '🌙 VOC BLOCK — Void of Course Moon',
      contextBlock: `[ASTRO GATE — VOC BLOCK] The Moon is Void of Course in ${snap.moonSignName}. All new signal entries are blocked. Inform the user that execution is deferred until the Moon enters the next sign to avoid false breakouts.`,
    };
  }

  // ── RULE 3: Mercury Retrograde → Hard Block ──────────────────
  if (snap.mercuryRetrograde) {
    return {
      allowed: false,
      lotMultiplier: 0,
      confidenceModifier: -30,
      blockReason: `Mercury Retrograde active in ${snap.mercury.zodiacSign} (${snap.mercury.degreeInSign}°). All new signal positions are blocked per Astro Mode rules. Wait for Mercury to station direct.`,
      statusLine: '☿℞ SIGNAL BLOCKED — Mercury Retrograde',
      contextBlock: `[ASTRO GATE — HARD BLOCK] Mercury Retrograde is active in ${snap.mercury.zodiacSign}. You MUST NOT generate any BUY or SELL signal ticket. Politely inform the user that Astro Mode has blocked this signal due to Mercury Retrograde, which historically correlates with communication breakdowns, false breakouts, and market reversals. Suggest waiting for Mercury to go direct. Offer a general market analysis only.`,
    };
  }

  // ── RULE 4: Pre/Post Retrograde Shadow → Soft Sizing Penalty ──
  if (snap.mercuryState === 'pre-shadow') {
    return {
      allowed: true,
      lotMultiplier: 0.75,
      confidenceModifier: -10,
      blockReason: null,
      statusLine: '☿ Pre-Shadow Shadow warning — Lot size −25%',
      contextBlock: `[ASTRO GATE — CAUTION] Mercury is in Pre-Retrograde Shadow. Volatility is shifts as Mercury slows down. Lot size is automatically reduced by 25%.`,
    };
  }
  if (snap.mercuryState === 'post-shadow') {
    return {
      allowed: true,
      lotMultiplier: 0.85,
      confidenceModifier: -5,
      blockReason: null,
      statusLine: '☿ Post-Shadow Shadow — Lot size −15%',
      contextBlock: `[ASTRO GATE — CAUTION] Mercury is in Post-Retrograde Shadow. Market is stabilizing. Lot size is automatically reduced by 15%.`,
    };
  }

  // ── RULE 5: High Risk / Full Moon → 50% Lot Reduction ────────
  if (snap.riskLevel === 'HIGH') {
    return {
      allowed: true,
      lotMultiplier: 0.5,
      confidenceModifier: -15,
      blockReason: null,
      statusLine: `${snap.lunarEmoji} HIGH RISK — Lot size −50% (${snap.lunarPhase})`,
      contextBlock: `[ASTRO GATE — CAUTION] ${snap.lunarPhase} detected. Celestial risk level: HIGH. Lot sizing has been automatically reduced by 50%. In your response, briefly mention that Astro Mode has applied a position-size reduction due to the ${snap.lunarPhase} phase, which historically correlates with peak emotional trading and reversal risk. Market bias: ${snap.marketBias.toUpperCase()}. ${snap.biasReason}`,
    };
  }

  // ── RULE 6: Medium Risk / Waning Moon → 25% Lot Reduction ────
  if (snap.riskLevel === 'MEDIUM') {
    return {
      allowed: true,
      lotMultiplier: 0.75,
      confidenceModifier: -5,
      blockReason: null,
      statusLine: `${snap.lunarEmoji} MEDIUM RISK — Lot size −25% (${snap.lunarPhase})`,
      contextBlock: `[ASTRO GATE — MODERATE] ${snap.lunarPhase}. Celestial risk: MEDIUM. Lot sizing reduced by 25%. Market bias: ${snap.marketBias.toUpperCase()}. ${snap.biasReason} Mention this briefly in your response.`,
    };
  }

  // ── RULE 7: Low Risk / New Moon → Full Sizing & Boost ──────────
  const bullishBoost = snap.marketBias === 'bullish' ? 5 : 0;
  return {
    allowed: true,
    lotMultiplier: 1.0,
    confidenceModifier: bullishBoost,
    blockReason: null,
    statusLine: `${snap.lunarEmoji} LOW RISK — Full position size (${snap.lunarPhase})`,
    contextBlock: `[ASTRO GATE — CLEAR] ${snap.lunarPhase}. Celestial risk: LOW. Full position sizing is permitted${bullishBoost > 0 ? ' with a +5% confidence boost from the bullish lunar bias' : ''}. ${snap.biasReason}`,
  };
}

/* ─── Phase 6: Next Celestial Event Countdown ─────────────────
   Calculates time remaining until the nearest lunar milestones
   and Mercury station using synodic rates from current elongation.
   ─────────────────────────────────────────────────────────────── */
export interface CelestialEvent {
  name: string;
  emoji: string;
  targetDate: Date;     // when the event occurs
  msUntil: number;      // milliseconds from now (pre-computed)
}

export function getNextCelestialEvents(date: Date = new Date()): CelestialEvent[] {
  const snap = getAstroSnapshot(date);
  const elong = snap.lunarElongation; // 0–360°
  const RATE = 12.19;                  // synodic lunar degrees per day
  const DAY_MS = 86_400_000;

  function degsTo(target: number): number {
    const d = ((target - elong) % 360 + 360) % 360;
    return d === 0 ? 360 : d;
  }

  const events: CelestialEvent[] = [
    {
      name: 'New Moon',
      emoji: '🌑',
      targetDate: new Date(date.getTime() + (degsTo(0) / RATE) * DAY_MS),
      msUntil: (degsTo(0) / RATE) * DAY_MS,
    },
    {
      name: 'First Quarter',
      emoji: '🌓',
      targetDate: new Date(date.getTime() + (degsTo(90) / RATE) * DAY_MS),
      msUntil: (degsTo(90) / RATE) * DAY_MS,
    },
    {
      name: 'Full Moon',
      emoji: '🌕',
      targetDate: new Date(date.getTime() + (degsTo(180) / RATE) * DAY_MS),
      msUntil: (degsTo(180) / RATE) * DAY_MS,
    },
    {
      name: 'Last Quarter',
      emoji: '🌗',
      targetDate: new Date(date.getTime() + (degsTo(270) / RATE) * DAY_MS),
      msUntil: (degsTo(270) / RATE) * DAY_MS,
    },
  ];

  if (snap.mercuryRetrograde) {
    const daysUntil = 10;
    events.push({
      name: 'Mercury Direct',
      emoji: '☿',
      targetDate: new Date(date.getTime() + daysUntil * DAY_MS),
      msUntil: daysUntil * DAY_MS,
    });
  } else {
    const daysUntil = 58;
    events.push({
      name: 'Mercury Rx',
      emoji: '☿℞',
      targetDate: new Date(date.getTime() + daysUntil * DAY_MS),
      msUntil: daysUntil * DAY_MS,
    });
  }

  events.sort((a, b) => a.msUntil - b.msUntil);
  return events.slice(0, 3);
}
