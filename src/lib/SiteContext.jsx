import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const SiteContext = createContext(null);

/**
 * Loads the public site data, then checks /api/live every few seconds.
 * Every save on the server bumps a revision number; when it changes we
 * re-fetch, so the live scoreboard and any admin edits appear on their own.
 */
export function SiteProvider({ children }) {
  const [data, setData] = useState(null);
  const [live, setLive] = useState(null);
  const [offset, setOffset] = useState(0); // server time − client time
  const [error, setError] = useState(null);
  const rev = useRef(0);
  const loading = useRef(false);

  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const res = await fetch('/api/site', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.content) throw new Error(json.error || 'Could not load the club website');
      rev.current = json.rev || 0;
      setData(json);
      setLive(json.live);
      setOffset(json.serverTime - Date.now());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      loading.current = false;
    }
  }, []);

  useEffect(() => {
    load();

    // Check for live-score / content changes every few seconds while the tab is visible.
    const poll = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch('/api/live');
        if (!res.ok) return;
        const snap = await res.json();
        if (snap.rev > rev.current) {
          setLive(snap.match);
          setOffset(snap.serverTime - Date.now());
          load();
        }
      } catch { /* offline — try again next tick */ }
    };
    const id = setInterval(poll, 3000);
    const onVisible = () => !document.hidden && poll();
    const onChanged = () => load(); // the admin just saved something
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('hopefc:changed', onChanged);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('hopefc:changed', onChanged);
    };
  }, [load]);

  return (
    <SiteContext.Provider value={{ data, live, offset, error, reload: load }}>{children}</SiteContext.Provider>
  );
}

export const useSite = () => useContext(SiteContext);

/** Re-renders every `ms` milliseconds — used for running match clocks. */
export function useTick(ms = 1000, active = true) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms, active]);
}

/** Adds `.in` to elements with `.reveal` when they scroll into view. */
export function useReveal(deps = []) {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('in')); return; }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
