import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { useSite } from '../../lib/SiteContext.jsx';
import { POSITIONS, fmtDate, fmtTime } from '../../lib/format.js';
import { BENCH_MAX, FORMATION_NAMES, autoFill, emptyLineup, formationSlots, roleOf } from '../../lib/lineup.js';
import LineupPitch from '../../components/LineupPitch.jsx';
import { Modal, useAction } from './ui.jsx';

export default function LineupEditor({ match, onClose }) {
  const { data } = useSite();
  const act = useAction();
  const [L, setL] = useState(null);
  const [slot, setSlot] = useState(0);
  const [busy, setBusy] = useState(false);

  // The public site data hides lineups that aren't released yet, so load the full match.
  useEffect(() => {
    api('/matches').then((all) => {
      const full = all.find((m) => m.id === match.id);
      const base = { ...emptyLineup(), ...(full?.lineup || {}) };
      base.starters = Array.from({ length: 11 }, (_, i) => base.starters?.[i] || '');
      setL(base);
    }).catch(() => setL(emptyLineup()));
  }, [match.id]);

  const players = data.players;
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
  if (!L) return <Modal title="Lineup" onClose={onClose}><p className="muted">Loading…</p></Modal>;

  const slots = formationSlots(L.formation);
  const starterSet = new Set(L.starters.filter(Boolean));
  const picked = L.starters.filter(Boolean).length;

  const assign = (pid) => {
    const starters = [...L.starters];
    const from = starters.indexOf(pid);
    if (from === slot) { starters[slot] = ''; }          // tap again to take them out
    else {
      if (from > -1) starters[from] = starters[slot];    // swap places on the pitch
      starters[slot] = pid;
    }
    setL({ ...L, starters, bench: L.bench.filter((id) => id !== pid) });
    // jump to the next empty slot
    const next = starters.findIndex((id, i) => !id && i > slot);
    const first = starters.findIndex((id) => !id);
    if (from !== slot) setSlot(next > -1 ? next : first > -1 ? first : slot);
  };
  const toggleBench = (pid) => {
    if (L.bench.includes(pid)) return setL({ ...L, bench: L.bench.filter((id) => id !== pid) });
    if (L.bench.length >= BENCH_MAX) return;
    setL({ ...L, bench: [...L.bench, pid], starters: L.starters.map((id) => (id === pid ? '' : id)) });
  };

  const save = async (published) => {
    setBusy(true);
    try {
      await act(() => api(`/matches/${match.id}/lineup`, { method: 'PUT', body: { ...L, published } }),
        published ? 'Lineup released on the website' : L.published ? 'Lineup hidden from the website' : 'Lineup saved (not public yet)');
      onClose();
    } catch { /* toasted */ }
    setBusy(false);
  };

  const s = slots[slot];
  const inSlot = byId[L.starters[slot]];

  return (
    <Modal title={`Lineup · ${match.home ? 'vs' : '@'} ${match.opponent}`} onClose={onClose} wide>
      <div className="lineup-ed">
        <div className="lineup-ed__top">
          <label>Formation
            <select className="input input--sm" value={L.formation} onChange={(e) => setL({ ...L, formation: e.target.value })}>
              {FORMATION_NAMES.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <label>Captain
            <select className="input input--sm" value={L.captain} onChange={(e) => setL({ ...L, captain: e.target.value, vice: L.vice === e.target.value ? '' : L.vice })}>
              <option value="">—</option>
              {L.starters.filter(Boolean).map((id) => <option key={id} value={id}>{byId[id] ? `${byId[id].number}. ${byId[id].firstName} ${byId[id].lastName}` : id}</option>)}
            </select>
          </label>
          <label>Vice-captain
            <select className="input input--sm" value={L.vice} onChange={(e) => setL({ ...L, vice: e.target.value })}>
              <option value="">—</option>
              {L.starters.filter((id) => id && id !== L.captain).map((id) => <option key={id} value={id}>{byId[id] ? `${byId[id].number}. ${byId[id].firstName} ${byId[id].lastName}` : id}</option>)}
            </select>
          </label>
          <div className="lineup-ed__tools">
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => setL(autoFill(L, players))}>Auto-fill</button>
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => { setL({ ...L, starters: Array(11).fill(''), bench: [], captain: '', vice: '' }); setSlot(0); }}>Clear</button>
          </div>
        </div>

        <p className="muted small">{fmtDate(match.date)} · {fmtTime(match.date, match.timeTbc)} — tap a position on the pitch, then pick the player. {picked}/11 starters · {L.bench.length} subs.
          {' '}<b className={L.published ? 'ok' : ''}>{L.published ? 'Currently visible on the website.' : 'Not visible on the website yet.'}</b></p>

        <div className="lineup-ed__body">
          <LineupPitch lineup={L} byId={byId} onSlot={setSlot} activeSlot={slot} />

          <div className="lineup-ed__pick">
            <h4>Position {slot + 1} · {s?.role}{inSlot ? ` — ${inSlot.firstName} ${inSlot.lastName}` : ''}</h4>
            <div className="lpick">
              {POSITIONS.map((pos) => {
                const group = players.filter((p) => p.position === pos).sort((a, b) => a.number - b.number);
                if (!group.length) return null;
                return (
                  <div key={pos} className="lpick__group">
                    <small className={roleOf(group[0]) === s?.role ? 'is-match' : ''}>{pos}s</small>
                    {group.map((p) => {
                      const onPitch = starterSet.has(p.id);
                      const onBench = L.bench.includes(p.id);
                      return (
                        <div key={p.id} className={`lpick__row ${L.starters[slot] === p.id ? 'is-here' : ''}`}>
                          <button type="button" className="lpick__main" onClick={() => assign(p.id)}>
                            <span className="lpick__n">{p.number}</span>
                            <span className="lpick__name">{p.firstName} {p.lastName}</span>
                            {onPitch && <em className="lpick__tag">XI</em>}
                          </button>
                          <button type="button" className={`lpick__bench ${onBench ? 'is-on' : ''}`} onClick={() => toggleBench(p.id)}
                            title={onBench ? 'Remove from substitutes' : 'Add to substitutes'}>
                            {onBench ? 'SUB ✓' : '+ SUB'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="row-end lineup-ed__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          {L.published && <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => save(false)}>Hide from website</button>}
          {!L.published && <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => save(false)}>Save draft</button>}
          <button type="button" className="btn btn--primary" disabled={busy || picked === 0} onClick={() => save(true)}>
            {L.published ? 'Update on website' : 'Release lineup'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
