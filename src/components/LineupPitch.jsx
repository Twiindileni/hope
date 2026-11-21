import { useRef } from 'react';
import { formationSlots, roleOf, shirtName } from '../lib/lineup.js';

/** Flat 2D club shirt with the squad number on it. */
export function Shirt({ number, gk, empty }) {
  const body = empty ? 'rgba(255,255,255,.18)' : gk ? '#ffd400' : '#d0102b';
  const trim = empty ? 'rgba(255,255,255,.35)' : gk ? '#0e0d0f' : '#ffd400';
  const ink = gk ? '#0e0d0f' : '#fff';
  return (
    <svg className="shirt" viewBox="0 0 64 60" aria-hidden>
      <path d="M21 3 L27 1 Q32 7 37 1 L43 3 L61 14 L54 27 L47 23 L47 57 Q32 60 17 57 L17 23 L10 27 L3 14 Z" fill={body} />
      <path d="M3 14 L10 27 L13 25.4 L6 12.4 Z M61 14 L54 27 L51 25.4 L58 12.4 Z" fill={trim} />
      <path d="M27 1 Q32 7 37 1 L35 0.5 Q32 4.5 29 0.5 Z" fill={trim} />
      <path d="M17 23 L17 57 Q32 60 47 57 L47 23" fill="none" stroke="rgba(0,0,0,.12)" strokeWidth="1" />
      {!empty && (
        <text x="32" y="44" textAnchor="middle" fill={ink} fontFamily="Anton, Impact, sans-serif" fontSize="21">{number}</text>
      )}
      {empty && <text x="32" y="42" textAnchor="middle" fill="rgba(255,255,255,.8)" fontSize="20" fontWeight="700">+</text>}
    </svg>
  );
}

export function PlayerChip({ p, role, captain, vice, empty, active, onClick, style, sub }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`lchip ${empty ? 'lchip--empty' : ''} ${active ? 'is-active' : ''}`}
      style={style}
      onClick={onClick}
      title={p ? `${p.firstName} ${p.lastName} · #${p.number} · ${p.position}` : 'Choose a player'}
    >
      <span className="lchip__kit">
        <Shirt number={p?.number} gk={role === 'GK' || (p && roleOf(p) === 'GK' && !role)} empty={empty} />
        {captain && <i className="lchip__arm">C</i>}
        {vice && <i className="lchip__arm lchip__arm--v">V</i>}
      </span>
      <span className="lchip__plate">
        <b>{empty ? role : shirtName(p)}</b>
        <small>{sub ?? (empty ? 'Empty' : role || roleOf(p))}</small>
      </span>
    </Tag>
  );
}

function PitchLines() {
  return (
    <div className="lpitch__grass" aria-hidden>
      <svg viewBox="0 0 100 120" preserveAspectRatio="none">
        <g fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="1.4" vectorEffect="non-scaling-stroke">
          <rect x="3" y="2.5" width="94" height="115" />
          <line x1="3" y1="60" x2="97" y2="60" />
          <ellipse cx="50" cy="60" rx="12" ry="10" />
          <rect x="22" y="2.5" width="56" height="17" />
          <rect x="36" y="2.5" width="28" height="6" />
          <path d="M40 19.5 A 11 7 0 0 0 60 19.5" />
          <rect x="22" y="100.5" width="56" height="17" />
          <rect x="36" y="111.5" width="28" height="6" />
          <path d="M40 100.5 A 11 7 0 0 1 60 100.5" />
        </g>
      </svg>
    </div>
  );
}

/**
 * The 2D pitch. `byId` maps player ids to players.
 * Pass `onSlot` to make the slots clickable (admin editor).
 */
export default function LineupPitch({ lineup, byId, onSlot, activeSlot, label }) {
  const slots = formationSlots(lineup.formation);
  return (
    <div className="lpitch">
      <PitchLines />
      {label && <div className="lpitch__label">{label}</div>}
      {slots.map((s, i) => {
        const p = byId[lineup.starters[i]];
        return (
          <PlayerChip
            key={`${lineup.formation}-${i}`}
            p={p}
            role={s.role}
            empty={!p}
            captain={p && lineup.captain === p.id}
            vice={p && lineup.vice === p.id}
            active={activeSlot === i}
            onClick={onSlot ? () => onSlot(i) : undefined}
            style={{ left: `${s.x}%`, top: `${s.y}%`, '--d': `${i * 45}ms` }}
          />
        );
      })}
    </div>
  );
}

/**
 * 3D stadium view for the website: the pitch is tilted back and the players stand up on it.
 * Our goalkeeper is nearest the camera, attacking away from us. Follows the mouse a little.
 */
export function LineupPitch3D({ lineup, byId }) {
  const slots = formationSlots(lineup.formation);
  const stage = useRef(null);
  const move = (e) => {
    const el = stage.current;
    if (!el || e.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--rz', `${(-x * 7).toFixed(2)}deg`);
    el.style.setProperty('--rx', `${(40 + y * 5).toFixed(2)}deg`);
  };
  const leave = () => { stage.current?.style.removeProperty('--rz'); stage.current?.style.removeProperty('--rx'); };
  return (
    <div className="lp3d" ref={stage} onPointerMove={move} onPointerLeave={leave}>
      <div className="lp3d__lights" aria-hidden />
      <div className="lp3d__plane">
        <PitchLines />
        <div className="lp3d__edge" aria-hidden />
        {slots.map((s, i) => {
          const p = byId[lineup.starters[i]];
          if (!p) return null;
          return (
            <div key={`${lineup.formation}-${i}`} className="lp3d__spot" style={{ left: `${s.x}%`, top: `${100 - s.y}%`, '--d': `${i * 60}ms`, zIndex: Math.round(100 - s.y) }}>
              <i className="lp3d__shadow" aria-hidden />
              <PlayerChip p={p} role={s.role} captain={lineup.captain === p.id} vice={lineup.vice === p.id} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
