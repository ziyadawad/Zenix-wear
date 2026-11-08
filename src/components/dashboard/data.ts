'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DASHBOARD_CONFIG as C } from '../../../config/dashboard.config';

type Raw = { ok: true; data: unknown } | { ok: false };
export type Sec<T> = { data: T | undefined; stale: boolean };

/** Last good value of every card, kept across refreshes and tab switches for this browser session. */
const memory = new Map<string, unknown>();

/**
 * Loads one dashboard page and refreshes it in place every `refreshSeconds`.
 * A card whose query fails keeps its last good value and is marked stale ("مش متصل"); it never drops to 0.
 */
export function usePage(page: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  const key = `${page}?${qs}`;
  const [state, setState] = useState<{ at: string | null; fresh: Record<string, boolean>; tick: number }>({ at: null, fresh: {}, tick: 0 });
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await fetch(`/api/dashboard/${page}${qs ? `?${qs}` : ''}`, { cache: 'no-store', credentials: 'same-origin' });
      if (res.status === 401) { window.location.href = '/dashboard/login'; return; }
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { at: string; data: Record<string, Raw> };
      const fresh: Record<string, boolean> = {};
      for (const [k, s] of Object.entries(body.data)) {
        fresh[k] = s.ok;
        if (s.ok) memory.set(`${key}#${k}`, s.data);
      }
      setState((p) => ({ at: body.at, fresh, tick: p.tick + 1 }));
      window.dispatchEvent(new CustomEvent('dash:updated', { detail: body.at }));
    } catch {
      // Whole request failed (offline, server down): every card keeps its last value and goes stale.
      setState((p) => ({ ...p, fresh: {}, tick: p.tick + 1 }));
    } finally {
      busy.current = false;
    }
  }, [page, qs, key]);

  useEffect(() => {
    load();
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(); }, C.refreshSeconds * 1000);
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('dash:refresh', load);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('dash:refresh', load); };
  }, [load]);

  function sec<T>(name: string): Sec<T> {
    const data = memory.get(`${key}#${name}`) as T | undefined;
    return { data, stale: state.tick > 0 && !state.fresh[name] };
  }
  return { sec, at: state.at, reload: load, loaded: state.tick > 0 };
}

/** One-off detail fetch for a panel (order, wallet, stock log, customer). */
export function useDetail<T>(page: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const [s, setS] = useState<{ data?: T; failed: boolean; loading: boolean }>({ failed: false, loading: true });
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/${page}?${qs}`, { cache: 'no-store' });
      if (res.status === 401) { window.location.href = '/dashboard/login'; return; }
      if (!res.ok) throw new Error();
      const body = (await res.json()) as { data: T };
      setS({ data: body.data, failed: false, loading: false });
    } catch {
      setS((p) => ({ ...p, failed: true, loading: false }));
    }
  }, [page, qs]);
  useEffect(() => { load(); }, [load]);
  return { ...s, reload: load };
}

export async function act(action: string, input: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/dashboard/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, input }) });
    if (res.status === 401) { window.location.href = '/dashboard/login'; return { ok: false }; }
    return (await res.json()) as { ok: boolean; error?: string };
  } catch {
    return { ok: false, error: 'مش متصل بالإنترنت، جرّب تاني' };
  }
}
