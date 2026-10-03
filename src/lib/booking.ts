import seedAppointments from '../data/seed/appointments.json';
import { hydrateDates, yymmdd } from './date';
import type { Appointment } from './types';

export const PENDING_KEY = 'rsd:bookings-pending';
const APP_KEY = 'rsd:appointments';

function readJson<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]') as T[];
  } catch {
    return [];
  }
}

/** All bookings known to this browser: pending public bookings, app store, and the seed. */
export function readAllAppointments(): Appointment[] {
  const pending = readJson<Appointment>(PENDING_KEY);
  const app = readJson<Appointment>(APP_KEY);
  const seed = hydrateDates(seedAppointments as Appointment[]);
  const seen = new Set<string>();
  const out: Appointment[] = [];
  for (const a of [...pending, ...app, ...(app.length ? [] : seed)]) {
    if (seen.has(a.code)) continue;
    seen.add(a.code);
    out.push(a);
  }
  return out;
}

export function nextBookingCode(date: string, existing: string[]): string {
  const head = `BK-${yymmdd(new Date(date + 'T00:00:00'))}-`;
  let max = 0;
  for (const c of existing) if (c.startsWith(head)) max = Math.max(max, Number(c.slice(head.length)) || 0);
  return `${head}${String(max + 1).padStart(3, '0')}`;
}

export function savePendingBooking(a: Appointment): void {
  const list = readJson<Appointment>(PENDING_KEY);
  list.push(a);
  localStorage.setItem(PENDING_KEY, JSON.stringify(list));
}

export function timeSlots(start: string, end: string, stepMin = 30): string[] {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const s = toMin(start);
  let e = toMin(end);
  if (e <= s) e = s + 6 * 60;
  const out: string[] = [];
  for (let m = s; m < e; m += stepMin) out.push(`${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  return out;
}
