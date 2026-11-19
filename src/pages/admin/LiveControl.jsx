import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useSite, useTick } from '../../lib/SiteContext.jsx';
import { PERIOD_LABEL, fmtDate, fmtTime, fullName, minuteLabel, opponentLogo } from '../../lib/format.js';
import TeamLogo from '../../components/TeamLogo.jsx';
import MatchCard from '../../components/MatchCard.jsx';
import { PageHead, useAction, Empty } from './ui.jsx';

const PERIODS = [
  ['pre', 'Pre-match'],
  ['1H', 'Kick-off 1st half'],
  ['HT', 'Half-time'],
  ['2H', 'Start 2nd half'],
  ['ET1', 'Extra time'],
  ['PEN', 'Penalties'],
  ['FT', 'Full-time'],
];
const EVENT_TYPES = [['goal', '⚽ Goal'], ['yellow', '🟨 Yellow card'], ['red', '🟥 Red card'], ['sub', '🔁 Substitution']];

export default function LiveControl() {
  const { data, live, offset } = useSite();
  const act = useAction();
  useTick(1000, !!live?.clock?.running);
  const [pick, setPick] = useState('');
  const [ev, setEv] = useState({ type: 'goal', team: 'hope', playerId: '', player: '', minute: '' });
  const [setMin, setSetMin] = useState('');

  const send = (body, msg) => act(() => api(`/live/${live.id}`, { method: 'POST', body }), msg);

  /* ---------------- not live: choose a match ---------------- */
  if (!live) {
    const now = Date.now();
    const options = [...data.matches].sort((a, b) => Math.abs(new Date(a.date) - now) - Math.abs(new Date(b.date) - now));
    return (
      <>
        <PageHead title="Live Match" sub="Turn on live coverage and the scoreboard appears on the homepage instantly." />
        {options.length === 0 ? (
          <Empty>You need a match first. <Link to="/admin/matches">Create a match →</Link></Empty>
        ) : (
          <section className="panel golive">
            <h3>Choose a match to cover</h3>
            <div className="golive__list">
              {options.map((m) => (
                <label key={m.id} className={`golive__opt ${pick === m.id ? 'is-on' : ''}`}>
                  <input type="radio" name="m" value={m.id} checked={pick === m.id} onChange={() => setPick(m.id)} />
                  <TeamLogo src={opponentLogo(data, m)} name={m.opponent} />
                  <span>
                    <b>{m.home ? `${data.content.shortName} vs ${m.opponent}` : `${m.opponent} vs ${data.content.shortName}`}</b>
                    <small>{fmtDate(m.date)} · {fmtTime(m.date)} · {m.status === 'finished' ? `Finished ${m.hopeScore}-${m.oppScore}` : m.status}</small>
                  </span>
                </label>
              ))}
            </div>
            <button
              className="btn btn--live btn--lg"
              disabled={!pick}
              onClick={() => act(() => api(`/live/activate/${pick}`, { method: 'POST' }), 'You are live! The scoreboard is now on the homepage.')}
            >
              ● Go live
            </button>
            <p className="muted small">Going live on a match that hasn't started resets its score to 0–0.</p>
          </section>
        )}
      </>
    );
  }

  /* ---------------- live controls ---------------- */
  const m = live;
  const club = data.content.shortName;
  const finished = m.period === 'FT';
  const addEvent = () => {
    const p = data.players.find((x) => x.id === ev.playerId);
    const body = { ...ev, player: ev.team === 'hope' && p ? fullName(p) : ev.player };
    if (ev.minute === '') delete body.minute;
    send({ event: body }, ev.type === 'goal' ? 'GOAL! Score updated.' : 'Event added');
    setEv({ ...ev, playerId: '', player: '', minute: '' });
  };

  return (
    <>
      <PageHead title="Live Match" sub={`${m.competition} · ${m.venue}`}>
        <button className="btn btn--ghost" onClick={() => act(() => api('/live/deactivate', { method: 'POST' }), 'Scoreboard hidden from the homepage')}>
          Hide scoreboard
        </button>
      </PageHead>

      <div className="live-grid">
        <section className="panel board">
          <div className="board__top">
            <span className={`badge ${finished ? '' : 'badge--live'}`}>{finished ? 'FULL-TIME' : '● LIVE ON WEBSITE'}</span>
            <span className="board__clock">{minuteLabel(m, offset)}</span>
            <span className="badge">{PERIOD_LABEL[m.period]}</span>
          </div>

          <div className="board__score">
            {[['hope', club, '/images/crest-sm.png', m.hopeScore, 'hopeScore'], ['opp', m.opponent, opponentLogo(data, m), m.oppScore, 'oppScore']].map(([k, name, logo, score, field]) => (
              <div key={k} className="board__team">
                <TeamLogo src={logo} name={name} />
                <b>{name}</b>
                <div className="board__num">{score}</div>
                <div className="board__btns">
                  <button className="btn btn--ghost" onClick={() => send({ [field]: score - 1 })} disabled={score <= 0}>−</button>
                  <button className="btn btn--primary" onClick={() => send({ [field]: score + 1 }, 'Score updated')}>+ Goal</button>
                </div>
              </div>
            ))}
          </div>

          <h4>Match period</h4>
          <div className="periods">
            {PERIODS.map(([p, l]) => (
              <button key={p} className={`chip ${m.period === p ? 'is-on' : ''}`} onClick={() => send({ period: p }, `${l}`)}>{l}</button>
            ))}
          </div>

          <h4>Clock</h4>
          <div className="clockrow">
            {m.clock.running
              ? <button className="btn btn--ghost" onClick={() => send({ clock: 'pause' })}>❚❚ Pause clock</button>
              : <button className="btn btn--ghost" onClick={() => send({ clock: 'resume' })} disabled={finished}>▶ Resume clock</button>}
            <input className="input input--sm" type="number" min="0" max="130" placeholder="Set minute" value={setMin} onChange={(e) => setSetMin(e.target.value)} />
            <button className="btn btn--ghost" disabled={setMin === ''} onClick={() => { send({ clockSetMinute: Number(setMin) }, 'Clock set'); setSetMin(''); }}>Set</button>
          </div>

          {finished && (
            <div className="board__done">
              <p>Final score saved: <b>{club} {m.hopeScore} – {m.oppScore} {m.opponent}</b>. It's now listed under Results on the website.</p>
              <button className="btn btn--primary" onClick={() => act(() => api('/live/deactivate', { method: 'POST' }), 'Live coverage ended')}>
                End live coverage
              </button>
            </div>
          )}
        </section>

        <div className="live-side">
          <section className="panel preview">
            <h3>Homepage preview</h3>
            <div className="preview__stage"><MatchCard /></div>
          </section>

          <section className="panel">
            <h3>Add match event</h3>
            <div className="evform">
              <select className="input" value={ev.type} onChange={(e) => setEv({ ...ev, type: e.target.value })}>
                {EVENT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select className="input" value={ev.team} onChange={(e) => setEv({ ...ev, team: e.target.value })}>
                <option value="hope">{club}</option>
                <option value="opp">{m.opponent}</option>
              </select>
              {ev.team === 'hope' ? (
                <select className="input" value={ev.playerId} onChange={(e) => setEv({ ...ev, playerId: e.target.value })}>
                  <option value="">Player (optional)</option>
                  {data.players.map((p) => <option key={p.id} value={p.id}>#{p.number} {fullName(p)}</option>)}
                </select>
              ) : (
                <input className="input" placeholder="Player name (optional)" value={ev.player} onChange={(e) => setEv({ ...ev, player: e.target.value })} />
              )}
              <input className="input" type="number" min="1" max="130" placeholder={`Minute (now ${minuteLabel(m, offset)})`} value={ev.minute} onChange={(e) => setEv({ ...ev, minute: e.target.value })} />
              <button className="btn btn--primary" onClick={addEvent}>Add event</button>
            </div>
            <p className="muted small">Adding a goal updates the score automatically and credits the scorer.</p>

            <ul className="evlist">
              {m.events.length === 0 && <li className="muted">No events yet.</li>}
              {[...m.events].reverse().map((e) => (
                <li key={e.id}>
                  <span className="evlist__min">{e.minute}'</span>
                  <span>{EVENT_TYPES.find(([v]) => v === e.type)?.[1]} · <b>{e.player || (e.team === 'hope' ? club : m.opponent)}</b></span>
                  <button className="icon-btn" title="Remove" onClick={() => send({ removeEvent: e.id }, 'Event removed')}>×</button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
