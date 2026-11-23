import { useMemo, useState } from 'react';
import { useSite } from '../lib/SiteContext.jsx';
import { fmtDate } from '../lib/format.js';
import TeamLogo from './TeamLogo.jsx';

const isHopeId = (id, name = '') => id === 't-hope' || /\bhope\b/i.test(name);
const roundOf = (m) => Number((m.competition || '').match(/Round\s+(\d+)/i)?.[1]) || null;

/**
 * Every round of the league, kept as an archive. Rounds entered in Admin → Results show all games;
 * for older rounds that only have Hope's own match, that match is shown so no round is missing.
 */
function useRounds(data) {
  return useMemo(() => {
    const teams = Object.fromEntries((data.teams || []).map((t) => [t.id, t]));
    const hopeTeam = (data.teams || []).find((t) => isHopeId(t.id, t.name));
    const club = hopeTeam?.name || data.content.clubName;
    const side = (id, name) => ({ id, name: teams[id]?.name || name || 'TBC', logo: teams[id]?.logo || '' });

    const map = new Map();
    for (const r of data.rounds || []) {
      map.set(r.round, {
        round: r.round, date: r.date, title: r.title, full: true,
        games: r.games.map((g) => ({ home: side(g.homeId, g.homeName), away: side(g.awayId, g.awayName), hs: g.hs, as: g.as })),
      });
    }
    for (const m of data.matches || []) {
      const n = roundOf(m);
      if (!n || m.status !== 'finished' || map.has(n)) continue;
      const us = { id: hopeTeam?.id || 't-hope', name: club, logo: '/images/crest-sm.png' };
      const them = { id: '', name: m.opponent, logo: m.opponentLogo || (data.teams || []).find((t) => t.name === m.opponent)?.logo || '' };
      const home = m.home !== false;
      map.set(n, {
        round: n, date: m.date, full: false,
        games: [{ home: home ? us : them, away: home ? them : us, hs: home ? m.hopeScore : m.oppScore, as: home ? m.oppScore : m.hopeScore }],
      });
    }
    return [...map.values()].sort((a, b) => a.round - b.round);
  }, [data]);
}

export default function LeagueResults() {
  const { data } = useSite();
  const rounds = useRounds(data);
  const [pick, setPick] = useState(null);
  if (!rounds.length) return null;

  const idx = pick == null ? rounds.length - 1 : Math.min(pick, rounds.length - 1);
  const cur = rounds[idx];
  const goals = cur.games.reduce((s, g) => s + (g.hs ?? 0) + (g.as ?? 0), 0);

  return (
    <section id="results" className="lres">
      <div className="container">
        <div className="section-head reveal">
          <div>
            <span className="eyebrow eyebrow--dark">Results archive</span>
            <h2>Round by round</h2>
          </div>
          <p className="lres__note">Every result of the {data.content.league} season, kept for the record. Pick a round to look back.</p>
        </div>

        <div className="lres__bar reveal">
          <button className="lres__arrow" onClick={() => setPick(Math.max(0, idx - 1))} disabled={idx === 0} aria-label="Previous round">‹</button>
          <div className="lres__chips" role="tablist">
            {rounds.map((r, i) => (
              <button key={r.round} role="tab" aria-selected={i === idx} className={i === idx ? 'is-on' : ''} onClick={() => setPick(i)}>
                <small>Round</small><b>{r.round}</b>
              </button>
            ))}
          </div>
          <button className="lres__arrow" onClick={() => setPick(Math.min(rounds.length - 1, idx + 1))} disabled={idx === rounds.length - 1} aria-label="Next round">›</button>
        </div>

        <div className="lres__panel" key={cur.round}>
          <div className="lres__meta">
            <h3>{cur.title || `Round ${cur.round}`}</h3>
            <span>
              {cur.date && fmtDate(cur.date, { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}
              {cur.full && <> · {cur.games.length} games · {goals} goals</>}
            </span>
          </div>
          <div className="lres__grid">
            {cur.games.map((g, i) => {
              const hope = isHopeId(g.home.id, g.home.name) || isHopeId(g.away.id, g.away.name);
              const played = g.hs != null && g.as != null;
              const win = played ? (g.hs > g.as ? 'home' : g.hs < g.as ? 'away' : '') : '';
              return (
                <article key={i} className={`lgame ${hope ? 'lgame--hope' : ''}`} style={{ '--d': `${i * 60}ms` }}>
                  <span className={`lgame__team ${win === 'home' ? 'is-win' : ''}`}>
                    <TeamLogo src={g.home.logo} name={g.home.name} /> <b>{g.home.name}</b>
                  </span>
                  <span className="lgame__score">{played ? <>{g.hs}<i>–</i>{g.as}</> : <em>vs</em>}</span>
                  <span className={`lgame__team lgame__team--r ${win === 'away' ? 'is-win' : ''}`}>
                    <b>{g.away.name}</b> <TeamLogo src={g.away.logo} name={g.away.name} />
                  </span>
                </article>
              );
            })}
          </div>
          {!cur.full && <p className="lres__partial">Only our match is on record for this round. Full round results can be added in the admin dashboard.</p>}
        </div>
      </div>
    </section>
  );
}
