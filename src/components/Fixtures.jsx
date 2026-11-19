import { useState } from 'react';
import { useSite } from '../lib/SiteContext.jsx';
import { fmtDate, fmtTime, matchResult, opponentLogo } from '../lib/format.js';
import TeamLogo from './TeamLogo.jsx';

function Row({ m, club, data }) {
  const home = m.home !== false;
  const res = matchResult(m);
  const showScore = m.status === 'finished' || m.status === 'live';
  const pending = m.status === 'scheduled' && new Date(m.date) < Date.now();
  const sides = [
    { name: club, logo: '/images/crest-sm.png', score: m.hopeScore, us: true },
    { name: m.opponent, logo: opponentLogo(data, m), score: m.oppScore },
  ];
  const [a, b] = home ? sides : sides.reverse();
  return (
    <article className={`fx reveal ${m.status === 'live' ? 'fx--live' : ''}`}>
      <div className="fx__date">
        <b>{fmtDate(m.date, { day: '2-digit' })}</b>
        <span>{fmtDate(m.date, { month: 'short' })}</span>
      </div>
      <div className="fx__body">
        <small className="fx__comp">{m.competition}</small>
        <div className="fx__teams">
          <span className={`fx__team ${a.us ? 'us' : ''}`}>
            <TeamLogo src={a.logo} name={a.name} /> {a.name}
          </span>
          <span className="fx__score">
            {showScore ? <>{a.score}<i>–</i>{b.score}</> : <em>{fmtTime(m.date, m.timeTbc)}</em>}
          </span>
          <span className={`fx__team fx__team--r ${b.us ? 'us' : ''}`}>
            {b.name} <TeamLogo src={b.logo} name={b.name} />
          </span>
        </div>
        <small className="fx__venue">{m.home ? 'Home' : 'Away'}{m.venue ? ` · ${m.venue}` : ''}</small>
      </div>
      <div className="fx__tag">
        {m.status === 'live' && <span className="tag tag--live"><i className="live-dot" /> Live</span>}
        {res && <span className={`tag tag--${res}`}>{res}</span>}
        {m.status === 'postponed' && <span className="tag">PPD</span>}
        {pending && <span className="tag">TBC</span>}
        {m.status === 'scheduled' && !pending && <span className="tag tag--soon">{home ? 'Home' : 'Away'}</span>}
      </div>
    </article>
  );
}

export default function Fixtures() {
  const { data } = useSite();
  const [tab, setTab] = useState('fixtures');
  const now = Date.now();
  const club = data.content.shortName || 'Hope FFC';

  const fixtures = data.matches.filter((m) => m.status === 'live' || (m.status !== 'finished' && new Date(m.date) >= now) || m.status === 'postponed');
  const results = data.matches.filter((m) => m.status === 'finished' || (m.status === 'scheduled' && new Date(m.date) < now)).reverse();
  const list = tab === 'fixtures' ? fixtures : results;

  const played = data.matches.filter((m) => m.status === 'finished');
  const w = played.filter((m) => m.hopeScore > m.oppScore).length;
  const d = played.filter((m) => m.hopeScore === m.oppScore).length;
  const gf = played.reduce((s, m) => s + m.hopeScore, 0);

  return (
    <section id="matches" className="matches">
      <div className="container">
        <div className="section-head reveal">
          <div>
            <span className="eyebrow eyebrow--dark">Match Centre</span>
            <h2>Fixtures &amp; Results</h2>
          </div>
          <div className="seg">
            <button className={tab === 'fixtures' ? 'is-on' : ''} onClick={() => setTab('fixtures')}>Fixtures</button>
            <button className={tab === 'results' ? 'is-on' : ''} onClick={() => setTab('results')}>Results</button>
          </div>
        </div>

        <div className="matches__grid">
          <div className="fx-list">
            {list.length === 0 && (
              <p className="empty reveal">
                {tab === 'fixtures' ? 'New fixtures will be announced soon.' : 'No results yet this season.'}
              </p>
            )}
            {list.map((m) => <Row key={m.id} m={m} club={club} data={data} />)}
          </div>

          <aside className="season reveal">
            <img src="/images/gallery/strike.jpg" alt="" loading="lazy" />
            <div className="season__body">
              <span className="eyebrow">Season {data.content.season}</span>
              <h3>{data.content.league}</h3>
              <div className="season__stats">
                <div><b>{played.length}</b><small>Played</small></div>
                <div><b>{w}</b><small>Won</small></div>
                <div><b>{d}</b><small>Drawn</small></div>
                <div><b>{gf}</b><small>Goals</small></div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
