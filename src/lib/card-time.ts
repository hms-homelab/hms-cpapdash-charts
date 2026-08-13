//
// card-time — how a timestamp that came off a CPAP card is displayed.
//
// SDD-057. These are NOT the same as the helpers in utils/date-util.ts, and the
// difference is the whole point:
//
//   utils/date-util.ts  server timestamps — created_at, a subscription's period
//                       end, when an email went out. Those are events in the
//                       system's life and belong in the VIEWER's timezone.
//
//   this file           card timestamps — session start and end, event times,
//                       per-minute signal samples. Those are events in the
//                       PATIENT's life. A night that began at 22:20 reads 22:20
//                       to the patient, to their spouse in another state, and to
//                       an admin in Miami. Two people discussing the same night
//                       say the same number; that is the test of it.
//
// The wire format is whatever Postgres emits for a TIMESTAMPTZ, e.g.
// "2026-07-23 08:08:28-04": a real instant, carrying the SERVER's offset. The
// offset is not the patient's and must never be read as though it were.
//
// The patient's zone is set once at boot from the account (`/v1/config`). When
// it is unknown — an account that has never reported one — we fall back to
// reading the wall-clock digits as sent. That is not a cosmetic choice: a
// session ingested for an account with no zone was never moved off the server's
// zone, so the digits ARE its wall clock. Rendering it in some assumed zone
// would invent a shift that isn't there.
//

let patientZone = '';

/**
 * Set the zone every card timestamp is rendered in. Call once when the account
 * config loads, and again if the patient edits it. An empty or unrecognised
 * value means "unknown" and restores the wall-clock-digits fallback.
 */
export function setPatientTimeZone(zone: string | null | undefined): void {
  const z = (zone || '').trim();
  if (!z) { patientZone = ''; return; }
  try {
    // Reject anything Intl won't take rather than throwing on every later render.
    new Intl.DateTimeFormat('en-US', { timeZone: z });
    patientZone = z;
  } catch {
    patientZone = '';
  }
}

/** The zone card timestamps render in; '' when the account has never reported one. */
export function patientTimeZone(): string {
  return patientZone;
}

/**
 * Parse a Postgres TIMESTAMPTZ string into a real instant.
 * Postgres writes bare offsets ("-04"); JS needs "-04:00" and a 'T'.
 */
export function parseCardInstant(ts: string | null | undefined): Date | null {
  if (!ts) return null;
  const normalized = ts.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

/** The wall-clock digits exactly as sent, used when the patient's zone is unknown. */
function digits(ts: string, want: 'time' | 'date'): string {
  const m = ts.match(/(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return '';
  return want === 'date' ? m[1] : `${m[2]}:${m[3]}`;
}

function partsIn(d: Date, zone: string): Record<string, string> {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) out[p.type] = p.value;
  // en-CA gives midnight as "24"; normalise so 24:05 doesn't reach a chart axis.
  if (out['hour'] === '24') out['hour'] = '00';
  return out;
}

/** HH:MM on the patient's clock. '' for empty/unparseable input. */
export function cardClock(ts: string | null | undefined): string {
  if (!ts) return '';
  if (!patientZone) return digits(ts, 'time');
  const d = parseCardInstant(ts);
  if (!d) return '';
  const p = partsIn(d, patientZone);
  return `${p['hour']}:${p['minute']}`;
}

/** HH:MM:SS on the patient's clock, for tables that show seconds. */
export function cardClockSeconds(ts: string | null | undefined): string {
  if (!ts) return '';
  if (!patientZone) {
    const m = ts.match(/[T ](\d{2}):(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}:${m[3]}` : '';
  }
  const d = parseCardInstant(ts);
  if (!d) return '';
  const p = partsIn(d, patientZone);
  return `${p['hour']}:${p['minute']}:${p['second']}`;
}

/** YYYY-MM-DD on the patient's calendar. */
export function cardDate(ts: string | null | undefined): string {
  if (!ts) return '';
  if (!patientZone) return digits(ts, 'date');
  const d = parseCardInstant(ts);
  if (!d) return '';
  const p = partsIn(d, patientZone);
  return `${p['year']}-${p['month']}-${p['day']}`;
}

/**
 * The night a session belongs to. A session that starts at 01:30 belongs to the
 * previous evening's night, so the day is taken 12 hours back — on the patient's
 * clock, which is the only clock where "half past one in the morning" means
 * anything.
 */
export function cardSleepDay(ts: string | null | undefined): string {
  const d = parseCardInstant(ts);
  if (!d) return ts ? digits(ts, 'date') : '';
  const shifted = new Date(d.getTime() - 12 * 3600 * 1000);
  if (!patientZone) {
    // Unknown zone: the digits are the server's wall clock, so do the same
    // arithmetic against the offset the string carried rather than the viewer's.
    const m = ts!.match(/([+-]\d{2})(?::?(\d{2}))?$/);
    const offsetMin = m ? (parseInt(m[1], 10) * 60 + (m[1].startsWith('-') ? -1 : 1) * parseInt(m[2] || '0', 10)) : 0;
    return new Date(shifted.getTime() + offsetMin * 60000).toISOString().slice(0, 10);
  }
  const p = partsIn(shifted, patientZone);
  return `${p['year']}-${p['month']}-${p['day']}`;
}
