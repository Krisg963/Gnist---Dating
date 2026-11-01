import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import type { CalendarBusyInterval, ProposedTimeSlot } from '../types';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const calendarAuth = getAuth(app);

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/calendar.events',
];

// Strictly cache OAuth access tokens in memory only — NEVER localStorage or sessionStorage
let cachedAccessToken: string | null = null;
let cachedAccountEmail: string | null = null;

type AuthListener = (state: {
  connected: boolean;
  email: string | null;
}) => void;

const listeners = new Set<AuthListener>();

function emitAuthChange() {
  const snapshot = {
    connected: Boolean(cachedAccessToken),
    email: cachedAccountEmail,
  };
  for (const listener of listeners) {
    listener(snapshot);
  }
}

onAuthStateChanged(calendarAuth, (user) => {
  if (!user) {
    cachedAccessToken = null;
    cachedAccountEmail = null;
  } else {
    cachedAccountEmail = user.email || null;
  }
  emitAuthChange();
});

export function subscribeGoogleCalendarAuth(listener: AuthListener): () => void {
  listeners.add(listener);
  listener({
    connected: Boolean(cachedAccessToken),
    email: cachedAccountEmail,
  });
  return () => {
    listeners.delete(listener);
  };
}

export function getGoogleCalendarAuthSnapshot(): {
  connected: boolean;
  email: string | null;
} {
  return {
    connected: Boolean(cachedAccessToken),
    email: cachedAccountEmail,
  };
}

export async function signInWithGoogleCalendar(): Promise<{
  ok: boolean;
  email: string | null;
  error?: string;
}> {
  try {
    const provider = new GoogleAuthProvider();
    for (const scope of GOOGLE_CALENDAR_SCOPES) {
      provider.addScope(scope);
    }
    provider.setCustomParameters({ prompt: 'consent' });

    const result = await signInWithPopup(calendarAuth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || null;

    if (!token) {
      return {
        ok: false,
        email: null,
        error:
          'Google-innloggingen returnerte ikke tilgang til Google Calendar. Prøv å logge inn på nytt.',
      };
    }

    cachedAccessToken = token;
    cachedAccountEmail = result.user?.email || null;
    emitAuthChange();

    return {
      ok: true,
      email: cachedAccountEmail,
    };
  } catch (err) {
    const code = (err as { code?: string })?.code || '';
    if (code === 'auth/popup-closed-by-user') {
      return {
        ok: false,
        email: null,
        error: 'Innloggingsvinduet ble lukket før Google Calendar ble koblet til.',
      };
    }
    if (code === 'auth/popup-blocked') {
      return {
        ok: false,
        email: null,
        error:
          'Nettleseren blokkerte innloggingsvinduet. Tillat sprettoppvinduer for å koble til Google Calendar.',
      };
    }
    return {
      ok: false,
      email: null,
      error:
        'Kunne ikke koble til Google Calendar akkurat nå. Prøv igjen om et øyeblikk.',
    };
  }
}

export async function disconnectGoogleCalendar(): Promise<void> {
  cachedAccessToken = null;
  cachedAccountEmail = null;
  emitAuthChange();
  try {
    await signOut(calendarAuth);
  } catch {
    // Ignore sign-out errors
  }
}

export interface UserCalendarAvailabilityResult {
  ok: boolean;
  needsAuth?: boolean;
  busyIntervals: CalendarBusyInterval[];
  upcomingCount: number;
  error?: string;
}

export async function fetchUserGoogleCalendarAvailability(
  daysAhead = 7
): Promise<UserCalendarAvailabilityResult> {
  if (!cachedAccessToken) {
    return {
      ok: false,
      needsAuth: true,
      busyIntervals: [],
      upcomingCount: 0,
    };
  }

  const now = new Date();
  const end = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const timeMin = now.toISOString();
  const timeMax = end.toISOString();

  try {
    const freeBusyRes = await fetch(
      'https://www.googleapis.com/calendar/v3/freeBusy',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cachedAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeMin,
          timeMax,
          items: [{ id: 'primary' }],
        }),
      }
    );

    if (freeBusyRes.status === 401 || freeBusyRes.status === 403) {
      cachedAccessToken = null;
      emitAuthChange();
      return {
        ok: false,
        needsAuth: true,
        busyIntervals: [],
        upcomingCount: 0,
        error:
          'Sesjonen for Google Calendar er utløpt. Logg inn med Google på nytt for å sjekke kalenderen din.',
      };
    }

    if (!freeBusyRes.ok) {
      throw new Error(`Calendar API status ${freeBusyRes.status}`);
    }

    const freeBusyJson = (await freeBusyRes.json()) as {
      calendars?: {
        primary?: {
          busy?: Array<{ start?: string; end?: string }>;
        };
      };
    };

    const rawBusy = freeBusyJson.calendars?.primary?.busy || [];
    const busyIntervals: CalendarBusyInterval[] = rawBusy
      .filter(
        (b): b is { start: string; end: string } =>
          typeof b.start === 'string' && typeof b.end === 'string'
      )
      .map((b) => ({
        startIso: b.start,
        endIso: b.end,
        label: 'Opptatt i Google Calendar',
      }));

    return {
      ok: true,
      busyIntervals,
      upcomingCount: busyIntervals.length,
    };
  } catch {
    return {
      ok: false,
      busyIntervals: [],
      upcomingCount: 0,
      error:
        'Kunne ikke lese tilgjengelighet fra Google Calendar akkurat nå. Prøv igjen.',
    };
  }
}

export async function createGoogleCalendarDateEvent(params: {
  title: string;
  description: string;
  location: string;
  startIso: string;
  endIso: string;
}): Promise<{
  ok: boolean;
  needsAuth?: boolean;
  eventId?: string;
  htmlLink?: string;
  error?: string;
}> {
  if (!cachedAccessToken) {
    return {
      ok: false,
      needsAuth: true,
      error: 'Logg inn med Google først for å legge til avtalen i Google Calendar.',
    };
  }

  try {
    const timeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Oslo';

    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cachedAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: params.title,
          description: params.description,
          location: params.location,
          start: {
            dateTime: params.startIso,
            timeZone,
          },
          end: {
            dateTime: params.endIso,
            timeZone,
          },
        }),
      }
    );

    if (res.status === 401 || res.status === 403) {
      cachedAccessToken = null;
      emitAuthChange();
      return {
        ok: false,
        needsAuth: true,
        error:
          'Google Calendar-tilgangen må fornyes. Logg inn med Google og prøv på nytt.',
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        error: 'Kunne ikke opprette kalenderhendelsen i Google Calendar.',
      };
    }

    const created = (await res.json()) as {
      id?: string;
      htmlLink?: string;
    };

    return {
      ok: true,
      eventId: created.id || `evt-${Date.now()}`,
      htmlLink: created.htmlLink || 'https://calendar.google.com',
    };
  } catch {
    return {
      ok: false,
      error: 'Nettverksfeil ved lagring til Google Calendar.',
    };
  }
}

function intervalsOverlapWithBuffer(
  slotStartMs: number,
  slotEndMs: number,
  busyList: CalendarBusyInterval[],
  bufferMinutes = 15
): boolean {
  const bufferMs = bufferMinutes * 60 * 1000;
  for (const item of busyList) {
    const bStart = Date.parse(item.startIso);
    const bEnd = Date.parse(item.endIso);
    if (!Number.isFinite(bStart) || !Number.isFinite(bEnd)) continue;
    if (slotStartMs < bEnd + bufferMs && slotEndMs > bStart - bufferMs) {
      return true;
    }
  }
  return false;
}

function formatNorwegianDayLabel(date: Date): string {
  const weekday = date.toLocaleDateString('nb-NO', { weekday: 'long' });
  const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const dayMonth = date.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short',
  });
  return `${capWeekday} ${dayMonth}`;
}

function formatTimeRange(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
  return `${fmt(start)}–${fmt(end)}`;
}

function buildActivitySuggestions(
  partnerCity: string,
  partnerInterests: string[]
): [string, string, string] {
  const lower = partnerInterests.map((i) => i.toLowerCase());
  const first = lower.some((i) => i.includes('mat') || i.includes('kaffe'))
    ? `Kaffe og bakst i ${partnerCity}`
    : `Rolig kaffeprat i ${partnerCity}`;

  const second = lower.some((i) => i.includes('friluft') || i.includes('sport'))
    ? `Gåtur langs vannet i ${partnerCity} med termos`
    : lower.some((i) => i.includes('kunst') || i.includes('foto'))
      ? `Galleri-runde og et glass i ${partnerCity}`
      : `Ettermiddagstur i ${partnerCity}`;

  const third = lower.some((i) => i.includes('musikk'))
    ? `Småretter og rolig musikkbar i ${partnerCity}`
    : `Uformell kveldsdate med småretter i ${partnerCity}`;

  return [first, second, third];
}

export function computeThreeOpenDateSlots(params: {
  userBusyIntervals: CalendarBusyInterval[];
  partnerBusyIntervals: CalendarBusyInterval[];
  partnerCity: string;
  partnerInterests: string[];
}): ProposedTimeSlot[] {
  const {
    userBusyIntervals,
    partnerBusyIntervals,
    partnerCity,
    partnerInterests,
  } = params;

  const activities = buildActivitySuggestions(partnerCity, partnerInterests);
  const now = new Date();
  const minStartMs = now.getTime() + 2 * 60 * 60 * 1000;

  const candidates: Array<{ start: Date; end: Date; dayKey: string }> = [];

  for (let dayOffset = 0; dayOffset <= 9; dayOffset += 1) {
    const base = new Date(now);
    base.setDate(now.getDate() + dayOffset);
    base.setSeconds(0, 0);

    const dayOfWeek = base.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const windows: Array<[number, number, number]> = isWeekend
      ? [
          [12, 0, 90],
          [15, 0, 90],
          [18, 0, 90],
        ]
      : [
          [17, 30, 90],
          [19, 15, 90],
        ];

    for (const [hour, minute, durationMin] of windows) {
      const start = new Date(base);
      start.setHours(hour, minute, 0, 0);
      if (start.getTime() < minStartMs) continue;

      const end = new Date(start.getTime() + durationMin * 60 * 1000);
      const startMs = start.getTime();
      const endMs = end.getTime();

      const busyUser = intervalsOverlapWithBuffer(
        startMs,
        endMs,
        userBusyIntervals
      );
      const busyPartner = intervalsOverlapWithBuffer(
        startMs,
        endMs,
        partnerBusyIntervals
      );

      if (!busyUser && !busyPartner) {
        const dayKey = `${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`;
        candidates.push({ start, end, dayKey });
      }
    }
  }

  // Prefer 3 slots on distinct days first for better choice diversity
  const chosen: Array<{ start: Date; end: Date; dayKey: string }> = [];
  const usedDays = new Set<string>();

  for (const cand of candidates) {
    if (chosen.length >= 3) break;
    if (!usedDays.has(cand.dayKey)) {
      chosen.push(cand);
      usedDays.add(cand.dayKey);
    }
  }

  for (const cand of candidates) {
    if (chosen.length >= 3) break;
    if (!chosen.includes(cand)) {
      chosen.push(cand);
    }
  }

  // Fallback if calendars are packed solid for 10 days
  let fallbackDay = 1;
  while (chosen.length < 3) {
    const fallbackStart = new Date(now);
    fallbackStart.setDate(now.getDate() + fallbackDay);
    fallbackStart.setHours(18, 0, 0, 0);
    const fallbackEnd = new Date(fallbackStart.getTime() + 90 * 60 * 1000);
    chosen.push({
      start: fallbackStart,
      end: fallbackEnd,
      dayKey: `fb-${fallbackDay}`,
    });
    fallbackDay += 1;
  }

  chosen.sort((a, b) => a.start.getTime() - b.start.getTime());

  return chosen.slice(0, 3).map((slot, index) => ({
    id: `slot-${index + 1}-${slot.start.getTime()}`,
    startIso: slot.start.toISOString(),
    endIso: slot.end.toISOString(),
    dayLabel: formatNorwegianDayLabel(slot.start),
    timeRangeLabel: formatTimeRange(slot.start, slot.end),
    activitySuggestion: activities[index % activities.length],
  }));
}
