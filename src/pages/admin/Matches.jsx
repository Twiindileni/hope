import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useSite } from '../../lib/SiteContext.jsx';
import { fmtDate, fmtTime, opponentLogo } from '../../lib/format.js';
import TeamLogo from '../../components/TeamLogo.jsx';
import { PageHead, Modal, Field, ImageInput, Confirm, useAction, Empty } from './ui.jsx';

const blank = () => ({
  opponent: '', opponentLogo: '', competition: "FNB Women's Super League · Round ", venue: 'SKGA Sport Stadium, Oshakati',
  date: '', home: true, status: 'scheduled', hopeScore: 0, oppScore: 0, timeTbc: false,
});

// <input type="datetime-local"> wants local "YYYY-MM-DDTHH:mm"
const toLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

function MatchForm({ initial, onClose, teams }) {
  const [m, setM] = useState({ ...initial, date: toLocal(initial.date) });
  const act = useAction();
  const set = (k) => (e) => setM({ ...m, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e });
  const save = async (e) => {
    e.preventDefault();
    const body = { ...m, date: new Date(m.date).toISOString(), hopeScore: Number(m.hopeScore), oppScore: Number(m.oppScore) };
    await act(() => (m.id ? api(`/matches/${m.id}`, { method: 'PUT', body }) : api('/matches', { method: 'POST', body })), m.id ? 'Match updated' : 'Match created');
    onClose();
  };
  return (
    <Modal title={m.id ? 'Edit match' : 'New match'} onClose={onClose} wide>
      <form onSubmit={save} className="form-grid">
        <Field label="Opponent" hint="Pick a league team to use its logo automatically.">
          <input
            className="input" list="league-teams" value={m.opponent} required
            onChange={(e) => {
              const t = teams.find((x) => x.name === e.target.value);
              setM({ ...m, opponent: e.target.value, opponentLogo: t ? t.logo : m.opponentLogo });
            }}
          />
          <datalist id="league-teams">{teams.filter((t) => !/\bhope\b/i.test(t.name)).map((t) => <option key={t.id} value={t.name} />)}</datalist>
        </Field>
        <Field label="Competition"><input className="input" value={m.competition} onChange={set('competition')} /></Field>
        <Field label="Date & kick-off time"><input className="input" type="datetime-local" value={m.date} onChange={set('date')} required /></Field>
        <Field label="Venue"><input className="input" value={m.venue} onChange={set('venue')} /></Field>
        <Field label="Kick-off time">
          <label className="check"><input type="checkbox" checked={!!m.timeTbc} onChange={set('timeTbc')} /> Time not confirmed yet (show “TBC”)</label>
        </Field>
        <Field label="Home or away">
          <select className="input" value={m.home ? 'home' : 'away'} onChange={(e) => setM({ ...m, home: e.target.value === 'home' })}>
            <option value="home">Home</option>
            <option value="away">Away</option>
          </select>
        </Field>
        <Field label="Status">
          <select className="input" value={m.status} onChange={set('status')}>
            <option value="scheduled">Scheduled</option>
            <option value="finished">Finished (enter final score)</option>
            <option value="postponed">Postponed</option>
            {m.status === 'live' && <option value="live">Live</option>}
          </select>
        </Field>
        {(m.status === 'finished' || m.status === 'live') && (
          <>
            <Field label="Hope FFC goals"><input className="input" type="number" min="0" value={m.hopeScore} onChange={set('hopeScore')} /></Field>
            <Field label={`${m.opponent || 'Opponent'} goals`}><input className="input" type="number" min="0" value={m.oppScore} onChange={set('oppScore')} /></Field>
          </>
        )}
        <Field label="Opponent logo" span={2}><ImageInput value={m.opponentLogo} onChange={set('opponentLogo')} contain /></Field>
        <div className="row-end field--span2">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary">Save match</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Matches() {
  const { data, live } = useSite();
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const act = useAction();
  const nav = useNavigate();
  const list = [...data.matches].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <>
      <PageHead title="Matches" sub="Create fixtures, record results and start live coverage.">
        <button className="btn btn--primary" onClick={() => setEdit(blank())}>+ New match</button>
      </PageHead>

      {list.length === 0 ? <Empty>No matches yet.</Empty> : (
        <div className="table">
          <div className="table__head"><span>Match</span><span>Date</span><span>Score</span><span>Status</span><span /></div>
          {list.map((m) => (
            <div key={m.id} className="table__row">
              <span className="table__match">
                <TeamLogo src={opponentLogo(data, m)} name={m.opponent} />
                <span><b>{m.home ? 'vs' : '@'} {m.opponent}</b><small>{m.competition}</small></span>
              </span>
              <span>{fmtDate(m.date)}<small>{fmtTime(m.date, m.timeTbc)}</small></span>
              <span className="mono">{m.status === 'scheduled' || m.status === 'postponed' ? '—' : `${m.hopeScore} – ${m.oppScore}`}</span>
              <span>
                <span className={`badge ${live?.id === m.id ? 'badge--live' : m.status === 'finished' ? 'badge--ok' : ''}`}>
                  {live?.id === m.id ? '● Live' : m.status}
                </span>
              </span>
              <span className="table__actions">
                {live?.id !== m.id && m.status !== 'finished' && (
                  <button className="btn btn--sm btn--live" onClick={async () => { await act(() => api(`/live/activate/${m.id}`, { method: 'POST' }), 'You are live!'); nav('/admin/live'); }}>Go live</button>
                )}
                <button className="btn btn--sm btn--ghost" onClick={() => setEdit(m)}>Edit</button>
                <button className="btn btn--sm btn--ghost" onClick={() => setDel(m)}>Delete</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {edit && <MatchForm initial={edit} teams={data.teams || []} onClose={() => setEdit(null)} />}
      {del && (
        <Confirm
          text={`Delete the match against ${del.opponent}? This can't be undone.`}
          onNo={() => setDel(null)}
          onYes={async () => { await act(() => api(`/matches/${del.id}`, { method: 'DELETE' }), 'Match deleted'); setDel(null); }}
        />
      )}
    </>
  );
}
