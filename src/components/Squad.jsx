import { useEffect, useMemo, useRef, useState } from 'react';
import { useSite } from '../lib/SiteContext.jsx';
import { POSITIONS, POSITION_PLURAL } from '../lib/format.js';

const FILTERS = ['All', ...POSITIONS];

export default function Squad() {
  const { data } = useSite();
  const [tab, setTab] = useState('players');
  const [filter, setFilter] = useState('All');
  const [active, setActive] = useState(0);
  const drag = useRef(null);

  const items = useMemo(() => {
    if (tab === 'staff') {
      return data.staff.map((s) => ({ id: s.id, first: s.name.split(' ')[0], last: s.name.split(' ').slice(1).join(' ') || s.name, photo: s.photo, badge: '', label: s.role, staff: true }));
    }
    return data.players
      .filter((p) => filter === 'All' || p.position === filter)
      .map((p) => ({ id: p.id, first: p.firstName, last: p.lastName, photo: p.photo, badge: p.number, label: p.position, captain: p.captain, p }));
  }, [data, tab, filter]);

  // start roughly in the middle so the carousel looks full
  useEffect(() => { setActive(Math.floor((items.length - 1) / 2)); }, [tab, filter, items.length]);

  const go = (i) => setActive(Math.max(0, Math.min(items.length - 1, i)));

  useEffect(() => {
    const onKey = (e) => {
      const el = document.getElementById('squad');
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top > window.innerHeight * 0.5 || r.bottom < window.innerHeight * 0.5) return;
      if (e.key === 'ArrowRight') go(active + 1);
      if (e.key === 'ArrowLeft') go(active - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onDown = (e) => { drag.current = e.clientX ?? e.touches?.[0]?.clientX; };
  const onUp = (e) => {
    if (drag.current == null) return;
    const x = e.clientX ?? e.changedTouches?.[0]?.clientX;
    const dx = x - drag.current;
    drag.current = null;
    if (Math.abs(dx) > 40) go(active + (dx < 0 ? 1 : -1));
  };

  const current = items[active];

  return (
    <section id="squad" className="squad">
      <div className="squad__bg" aria-hidden />
      <div className="container squad__top reveal">
        <div className="chips">
          <button className={tab === 'players' ? 'is-on' : ''} onClick={() => setTab('players')}>Players</button>
          <button className={tab === 'staff' ? 'is-on' : ''} onClick={() => setTab('staff')}>Management</button>
        </div>
        {tab === 'players' && (
          <div className="chips chips--right">
            {FILTERS.map((f) => (
              <button key={f} className={filter === f ? 'is-on' : ''} onClick={() => setFilter(f)}>
                {f === 'All' ? 'All' : POSITION_PLURAL[f]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="squad__head container reveal">
        <span className="eyebrow">The Squad · {data.content.season}</span>
        <h2>{tab === 'players' ? 'Meet our players' : 'The people behind the club'}</h2>
      </div>

      <div
        className="deck"
        onMouseDown={onDown} onMouseUp={onUp} onMouseLeave={() => (drag.current = null)}
        onTouchStart={onDown} onTouchEnd={onUp}
      >
        {items.length === 0 && <p className="deck__empty">No {filter === 'All' ? 'players' : POSITION_PLURAL[filter].toLowerCase()} added yet.</p>}
        {items.map((it, i) => {
          const off = i - active;
          const abs = Math.abs(off);
          if (abs > 3) return null;
          const X = [0, 295, 530, 712][abs] * Math.sign(off);
          return (
            <article
              key={it.id}
              className={`pcard ${off === 0 ? 'is-center' : ''}`}
              style={{ '--x': X, '--s': [1, 0.8, 0.6, 0.46][abs], zIndex: 10 - abs }}
              onClick={() => off !== 0 && go(i)}
              aria-hidden={abs > 2}
            >
              <div className="pcard__frame">
                <img src={it.photo || '/images/crest.png'} alt={`${it.first} ${it.last}`} draggable="false" loading="lazy" />
                <div className="pcard__shade" />
                {off !== 0 && (
                  <div className="pcard__mini">
                    {it.badge !== '' && <span className="num">{it.badge}</span>}
                    <b>{it.first} {it.last}</b>
                  </div>
                )}
              </div>
              {off === 0 && it.badge !== '' && <span className="pcard__num">{it.badge}</span>}
              {off === 0 && it.captain && <span className="pcard__capt" title="Captain">C</span>}
            </article>
          );
        })}

        {current && (
          <>
            <div className="deck__label" key={`l${current.id}`}>{current.staff ? 'Management' : POSITION_PLURAL[current.label]}</div>
            {current.p && (
              <div className="deck__stats" key={`s${current.id}`}>
                <div><b>{current.p.appearances}</b><small>Apps</small></div>
                {current.p.position === 'Goalkeeper'
                  ? <div><b>{current.p.cleanSheets}</b><small>Clean sheets</small></div>
                  : <div><b>{current.p.goals}</b><small>Goals</small></div>}
                <div><b>{current.p.assists}</b><small>Assists</small></div>
              </div>
            )}
            <div className="deck__name" key={`n${current.id}`}>
              <span>{current.first}</span>
              <strong>{current.last}</strong>
              {current.staff && <em>{current.label}</em>}
            </div>
          </>
        )}
      </div>

      <div className="deck__nav">
        <button onClick={() => go(active - 1)} disabled={active === 0} aria-label="Previous">←</button>
        <span>{String(active + 1).padStart(2, '0')} <i>/ {String(items.length).padStart(2, '0')}</i></span>
        <button onClick={() => go(active + 1)} disabled={active >= items.length - 1} aria-label="Next">→</button>
      </div>
    </section>
  );
}
