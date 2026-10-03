import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $ready, initDb } from '../../stores/db';
import { toast } from '../../stores/ui';

/**
 * Ensures demo data is initialised. Returns true right after hydration (the first client render must match the
 * server-rendered skeleton, otherwise Preact keeps stale markup); no artificial delay.
 */
export function useReady(_delay?: number): boolean {
  const ready = useStore($ready);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (!$ready.get()) initDb();
  }, []);
  return ready && mounted;
}

/** Read a query-string parameter (client side; pages are static). */
export function useParam(name: string): string | null {
  const [value, setValue] = useState<string | null>(() => (typeof location === 'undefined' ? null : new URLSearchParams(location.search).get(name)));
  useEffect(() => {
    setValue(new URLSearchParams(location.search).get(name));
  }, [name]);
  return value;
}

/** Run an action; toast on success, toast the error message on failure. Returns the result or undefined. */
export function run<T>(fn: () => T, success?: string | ((r: T) => string), message?: string): T | undefined {
  try {
    const r = fn();
    if (success) toast(typeof success === 'function' ? success(r) : success, { message });
    return r;
  } catch (e) {
    toast('Tidak dapat diproses', { tone: 'error', message: (e as Error).message, duration: 6000 });
    return undefined;
  }
}

export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** Navigate with Astro view transitions when available. */
export async function go(href: string): Promise<void> {
  try {
    const { navigate } = await import('astro:transitions/client');
    await navigate(href);
  } catch {
    location.href = href;
  }
}

export function useDebounced<T>(value: T, ms = 200): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function useHotkey(key: string, handler: (e: KeyboardEvent) => void, deps: unknown[] = []): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === key) {
        e.preventDefault();
        handler(e);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, deps);
}
