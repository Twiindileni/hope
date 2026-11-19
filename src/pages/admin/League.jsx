import { useEffect, useRef, useState } from 'react';
import { api, uploadImage } from '../../lib/api.js';
import { useSite } from '../../lib/SiteContext.jsx';
import TeamLogo from '../../components/TeamLogo.jsx';
import { PageHead, Field, Confirm, useAction } from './ui.jsx';

const COLS = [['p', 'P'], ['w', 'W'], ['d', 'D'], ['l', 'L'], ['f', 'F'], ['a', 'A']];
const blankRow = (teamId) => ({ teamId, p: 0, w: 0, d: 0, l: 0, f: 0, a: 0 });

function LogoPicker({ team, onChange }) {
  const ref = useRef();
  const act = useAction();
  const pick = async (e) => {
    const f = e.target.files?.[0];
    if (f) { try { onChange(await act(() => uploadImage(f), 'Logo uploaded')); } catch { /* toasted */ } }
    e.target.value = '';
  };
  return (
    <button type="button" className="logo-pick" onClick={() => ref.current.click()} title="Upload logo">
      <TeamLogo src={team.logo} name={team.name} />
      <span>{team.logo ? 'Change' : 'Add logo'}</span>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pick} />
    </button>
  );
}

export default function League() {
  const { data } = useSite();
  const act = useAction();
  const [teams, setTeams] = useState(data.teams);
  const [table, setTable] = useState(data.table);
  const [dirty, setDirty] = useState(false);
  const [del, setDel] = useState(null);
  const [newName, setNewName] = useState('');

  useEffect(() => { if (!dirty) { setTeams(data.teams); setTable(data.table); } }, [data.teams, data.table, dirty]);

  const rowFor = (id) => table.rows.find((r) => r.teamId === id) || blankRow(id);
  const setRow = (id, k, v) => {
    const rows = table.rows.some((r) => r.teamId === id)
      ? table.rows.map((r) => (r.teamId === id ? { ...r, [k]: Number(v) } : r))
      : [...table.rows, { ...blankRow(id), [k]: Number(v) }];
    setTable({ ...table, rows }); setDirty(true);
  };
  const setTeam = (id, patch) => { setTeams(teams.map((t) => (t.id === id ? { ...t, ...patch } : t))); setDirty(true); };

  const save = async () => {
    await act(async () => {
      for (const t of teams) {
        const orig = data.teams.find((x) => x.id === t.id);
        if (orig && (orig.name !== t.name || orig.logo !== t.logo)) await api(`/teams/${t.id}`, { method: 'PUT', body: t });
      }
      const rows = teams.map((t) => rowFor(t.id));
      await api('/table', { method: 'PUT', body: { ...table, rows } });
    }, 'League table saved');
    setDirty(false);
  };

  const addTeam = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await act(() => api('/teams', { method: 'POST', body: { name: newName.trim(), logo: '' } }), 'Team added');
    setNewName('');
  };

  const sorted = [...teams].map((t) => {
    const r = rowFor(t.id);
    return { t, r, pts: r.w * 3 + r.d, gd: r.f - r.a };
  }).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.r.f - a.r.f);

  return (
    <>
      <PageHead title="League Table" sub="Copy the numbers from each official log. Points and goal difference are calculated for you.">
        <button className="btn btn--primary" onClick={save} disabled={!dirty}>{dirty ? 'Save table' : 'Saved'}</button>
      </PageHead>

      <section className="panel">
        <div className="form-grid">
          <Field label="Table title"><input className="input" value={table.title} onChange={(e) => { setTable({ ...table, title: e.target.value }); setDirty(true); }} /></Field>
          <Field label="Last updated (as shown on the website)"><input className="input" value={table.updated} placeholder="15 November 2026" onChange={(e) => { setTable({ ...table, updated: e.target.value }); setDirty(true); }} /></Field>
        </div>
      </section>

      <section className="panel">
        <div className="ltable">
          <div className="ltable__head">
            <span>#</span><span>Logo</span><span>Team</span>{COLS.map(([, l]) => <span key={l}>{l}</span>)}<span>GD</span><span>Pts</span><span />
          </div>
          {sorted.map(({ t, r, pts, gd }, i) => (
            <div key={t.id} className="ltable__row">
              <span className="muted">{i + 1}</span>
              <LogoPicker team={t} onChange={(logo) => setTeam(t.id, { logo })} />
              <input className="input input--sm" value={t.name} onChange={(e) => setTeam(t.id, { name: e.target.value })} />
              {COLS.map(([k]) => (
                <input key={k} className="input input--sm num" type="number" min="0" value={r[k]} onChange={(e) => setRow(t.id, k, e.target.value)} />
              ))}
              <span className="mono">{gd > 0 ? `+${gd}` : gd}</span>
              <span className="mono"><b>{pts}</b></span>
              <button className="icon-btn" title="Remove team from the league" onClick={() => setDel(t)}>×</button>
            </div>
          ))}
        </div>
        <form className="addteam" onSubmit={addTeam}>
          <input className="input" placeholder="New team name (e.g. a promoted club)" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button className="btn btn--ghost" disabled={!newName.trim()}>+ Add team</button>
        </form>
        <p className="muted small">Removing a team (for example after relegation) also removes its row from the table. Its past results against Hope FFC stay in Matches.</p>
      </section>

      {dirty && (
        <div className="savebar">
          <span>You have unsaved changes</span>
          <button className="btn btn--ghost" onClick={() => { setTeams(data.teams); setTable(data.table); setDirty(false); }}>Discard</button>
          <button className="btn btn--primary" onClick={save}>Save table</button>
        </div>
      )}

      {del && (
        <Confirm
          text={`Remove ${del.name} from the league?`}
          onNo={() => setDel(null)}
          onYes={async () => {
            await act(async () => {
              await api(`/teams/${del.id}`, { method: 'DELETE' });
              await api('/table', { method: 'PUT', body: { ...data.table, rows: data.table.rows.filter((r) => r.teamId !== del.id) } });
            }, 'Team removed');
            setDel(null);
          }}
        />
      )}
    </>
  );
}
