import { yymmdd } from './date';

let counter = 0;
/** Collision-resistant client id, e.g. "V-lx3k9a2b". */
export function uid(prefix: string): string {
  counter = (counter + 1) % 1296;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36).padStart(2, '0')}${Math.floor(Math.random() * 1296)
    .toString(36)
    .padStart(2, '0')}`;
}

/** Next number for daily-reset documents: "REG-261003-0012". */
export function nextDailyNo(prefix: string, existing: string[], width = 4, date = new Date()): string {
  const head = `${prefix}-${yymmdd(date)}-`;
  let max = 0;
  for (const no of existing) {
    if (!no?.startsWith(head)) continue;
    const n = Number(no.slice(head.length));
    if (n > max) max = n;
  }
  return `${head}${String(max + 1).padStart(width, '0')}`;
}

/** Next medical record number: "RM-000161". */
export function nextMrn(existing: string[]): string {
  let max = 0;
  for (const m of existing) {
    const n = Number(m.replace(/\D/g, ''));
    if (n > max) max = n;
  }
  return `RM-${String(max + 1).padStart(6, '0')}`;
}

/** Next queue number for a poli prefix today: "A-013". */
export function nextQueueNo(prefix: string, existingToday: string[]): string {
  let max = 0;
  for (const q of existingToday) {
    if (!q.startsWith(`${prefix}-`)) continue;
    const n = Number(q.slice(prefix.length + 1));
    if (n > max) max = n;
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

/** Dummy BPJS SEP number: "0301R001" + 11 digits. */
export function dummySep(): string {
  let digits = '';
  for (let i = 0; i < 11; i++) digits += Math.floor(Math.random() * 10);
  return `0301R001${digits}`;
}
