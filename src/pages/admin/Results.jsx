import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useSite } from '../../lib/SiteContext.jsx';
import { fmtDate } from '../../lib/format.js';
import TeamLogo from '../../components/TeamLogo.jsx';
import { PageHead, Modal, Field, Confirm, useAction, Empty } from './ui.jsx';

const blankGame = () => ({ homeId: '', awayId: '', hs: '', as: '' });

function RoundForm({ initial, teams, rounds: initialRounds, onClose }) {
  const [r, setR] = useState(() => ({
    ...initial,
    games: initial.games.length ? initial.games.map((g) => ({ ...g, hs: g.hs ?? '', as: g.as ?? '' })) : [blankGame()],
  }));
  const act = useAction();
  const setGame = (i, patch) => setR({ ...r, games: r.games.map((g, j) => (j === i ? { ...g, ...patch } : g)) });
  const used = new Set(r.games.flatMap((g) => [g.homeId, g.awayId]).filter(Boolean));

  const save = async (e) => {
    e.preventDefault();
    const games = r.games.filter((g) => g.homeId && g.awayId);
    const body = { round: Number(r.round), date: r.date, title: r.title, games };
    await act(async () => {
      if (!games.length) throw new Error('Add at least one game');
      const clash = initialRounds.find((x) => x.round === body.round && x.id !== r.id);
      if (clash) throw new Error(`Round ${body.round} already exists — edit it instead`);
      return r.id ? api(`/rounds/${r.id}`, { method: 'PUT', body }) : api('/rounds', { method: 'POST', body });
    }, r.id ? 'Round updated' : 'Round saved');
    onClose();
  };

  const teamSelect = (value, onChange) => (
    <select className="input input--sm" value={value} onChange={(e) => onChange(e.target.value)} required>
      <option value="">Choose team…</option>
      {teams.map((t) => <option key={t.id} value={t.id} disabled={used.has(t.id) && t.id !== value}>{t.name}</option>)}
    </select>
  );

  return (
    <Modal title={r.id ? `Edit Round ${initial.round}` : 'Add round results'} onClose={onClose} wide>
      <form onSubmit={(e) => save(e).catch(() => {})}>
        <div className="form-grid">
          <Field label="Round number"><input className="input" type="number" min="1" value={r.round} onChange={(e) => setR({ ...r, round: e.target.value })} required /></Field>
          <Field label="Date played"><input className="input" type="date" value={r.date} onChange={(e) => setR({ ...r, date: e.target.value })} /></Field>
          <Field label="Title (optional)" hint="Leave empty to show “Round N”." span={2}>
            <input className="input" value={r.title} placeholder="e.g. Cup Quarter-finals" onChange={(e) => setR({ ...r, title: e.target.value })} />
          </Field>
        </div>

        <h4 className="rgames__h">Games <small>Home team · score · away team. Leave scores empty for a game not played yet.</small></h4>
        <div className="rgames">
          {r.games.map((g, i) => (
            <div key={i} className="rgame">
              {teamSelect(g.homeId, (v) => setGame(i, { homeId: v }))}
              <input className="input input--sm num" type="number" min="0" value={g.hs} onChange={(e) => setGame(i, { hs: e.target.value })} aria-label="Home score" />
              <span className="muted">:</span>
              <input className="input input--sm num" type="number" min="0" value={g.as} onChange={(e) => setGame(i, { as: e.target.value })} aria-label="Away score" />
              {teamSelect(g.awayId, (v) => setGame(i, { awayId: v }))}
              <button type="button" className="icon-btn" title="Remove game" onClick={() => setR({ ...r, games: r.games.filter((_, j) => j !== i) })}>×</button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setR({ ...r, games: [...r.games, blankGame()] })} disabled={r.games.length >= Math.floor(teams.length / 2) + 2}>+ Add game</button>

        <div className="row-end" style={{ marginTop: 22 }}>
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary">{r.id ? 'Save changes' : 'Save round'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Results() {
  const { data } = useSite();
  const act = useAction();
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const rounds = [...(data.rounds || [])].sort((a, b) => b.round - a.round);
  const teams = [...data.teams].sort((a, b) => a.name.localeCompare(b.name));
  const name = (id, fallback) => data.teams.find((t) => t.id === id)?.name || fallback;
  const logo = (id) => data.teams.find((t) => t.id === id)?.logo || '';
  const next = rounds.length ? rounds[0].round + 1 : 1;

  return (
    <>
      <PageHead title="League Results" sub="Every game of every round, saved permanently and shown on the website in the Results archive.">
        <button className="btn btn--primary" onClick={() => setEdit({ round: next, date: new Date().toISOString().slice(0, 10), title: '', games: [] })}>+ Add round</button>
      </PageHead>

      {!rounds.length && <Empty>No rounds yet. Add the results from the league’s official results sheet.</Empty>}

      {rounds.map((r) => (
        <section key={r.id} className="panel">
          <div className="panel__head">
            <h3>{r.title || `Round ${r.round}`} <small className="muted">{r.date && fmtDate(r.date)} · {r.games.length} games</small></h3>
            <div className="row-end">
              <button className="btn btn--ghost btn--sm" onClick={() => setEdit(r)}>Edit</button>
              <button className="btn btn--ghost btn--sm" onClick={() => setDel(r)}>Delete</button>
            </div>
          </div>
          <div className="rlist">
            {r.games.map((g, i) => (
              <div key={i} className={`rlist__row ${g.homeId === 't-hope' || g.awayId === 't-hope' ? 'is-hope' : ''}`}>
                <span className="rlist__team"><TeamLogo src={logo(g.homeId)} name={name(g.homeId, g.homeName)} /> {name(g.homeId, g.homeName)}</span>
                <b className="mono">{g.hs ?? '–'} : {g.as ?? '–'}</b>
                <span className="rlist__team rlist__team--r">{name(g.awayId, g.awayName)} <TeamLogo src={logo(g.awayId)} name={name(g.awayId, g.awayName)} /></span>
              </div>
            ))}
          </div>
        </section>
      ))}

      {edit && <RoundForm initial={edit} teams={teams} rounds={rounds} onClose={() => setEdit(null)} />}
      {del && (
        <Confirm
          text={`Delete all results for ${del.title || `Round ${del.round}`}? This removes them from the website archive.`}
          onNo={() => setDel(null)}
          onYes={async () => { await act(() => api(`/rounds/${del.id}`, { method: 'DELETE' }), 'Round deleted'); setDel(null); }}
        />
      )}
    </>
  );
}
