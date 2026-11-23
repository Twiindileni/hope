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

/**
 * Adds `.in` to elements with `.reveal` when they scroll into view.
 * Also keeps working after the page changes: elements that appear later (tab switches, filters)
 * are watched too, and an element that was already shown stays shown even when React rewrites
 * its class list (which would otherwise drop `.in` and leave it invisible).
 */
export function useReveal(deps = []) {
  useEffect(() => {
    const shown = new WeakSet();
    const show = (el) => { shown.add(el); el.classList.add('in'); };
    if (!('IntersectionObserver' in window)) {
      const all = () => document.querySelectorAll('.reveal:not(.in)').forEach(show);
      all();
      const mo = new MutationObserver(all);
      mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
      return () => mo.disconnect();
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => { if (en.isIntersecting) { show(en.target); io.unobserve(en.target); } }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    const scan = () => {
      document.querySelectorAll('.reveal:not(.in)').forEach((el) => {
        if (shown.has(el)) el.classList.add('in'); // React replaced its classes — put `.in` back
        else io.observe(el);                       // new element — reveal it when it scrolls into view
      });
    };
    scan();
    let queued = false;
    const mo = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; scan(); });
    });
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    return () => { mo.disconnect(); io.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
