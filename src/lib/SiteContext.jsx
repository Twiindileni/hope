import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const SiteContext = createContext(null);

/**
 * Loads the public site data once, then keeps it fresh through the
 * server-sent event stream: `live` events carry the live match, `site`
 * events tell us something changed in the admin so we re-fetch.
 */
export function SiteProvider({ children }) {
  const [data, setData] = useState(null);
  const [live, setLive] = useState(null);
  const [offset, setOffset] = useState(0); // server time − client time
  const [error, setError] = useState(null);
  const timer = useRef();

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/site');
      if (!res.ok) throw new Error('Could not load site data');
      const json = await res.json();
      setData(json);
      setLive(json.live);
      setOffset(json.serverTime - Date.now());
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
    const es = new EventSource('/api/live/stream');
    es.addEventListener('live', (e) => {
      const { match, serverTime } = JSON.parse(e.data);
      setLive(match);
      setOffset(serverTime - Date.now());
    });
    es.addEventListener('site', () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(load, 250);
    });
    es.onerror = () => { /* EventSource reconnects automatically */ };
    return () => { es.close(); clearTimeout(timer.current); };
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
