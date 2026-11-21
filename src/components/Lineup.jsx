import { useMemo, useState } from 'react';
import { useSite } from '../lib/SiteContext.jsx';
import { fmtDate, fmtTime, opponentLogo } from '../lib/format.js';
import { formationSlots, roleOf } from '../lib/lineup.js';
import LineupPitch, { PlayerChip } from './LineupPitch.jsx';
import TeamLogo from './TeamLogo.jsx';

/** The match whose released lineup the website should show (live → next → just played). */
export function useLineupMatch() {
  const { data, live } = useSite();
  return useMemo(() => {
    if (!data) return null;
    const withXI = data.matches.filter((m) => m.lineup?.published && m.lineup.starters?.some(Boolean));
    if (!withXI.length) return null;
    const now = Date.now();
    const liveM = live && withXI.find((m) => m.id === live.id);
    if (liveM) return liveM;
    const next = withXI
      .filter((m) => m.status === 'scheduled' && new Date(m.date) > now - 3 * 36e5)
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
    if (next) return next;
    return withXI
      .filter((m) => m.status === 'finished' && now - new Date(m.date) < 2 * 864e5)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;
  }, [data, live]);
}

const ROLE_NAME = { GK: 'Goalkeeper', DEF: 'Defence', MID: 'Midfield', FWD: 'Attack' };

export default function Lineup() {
  const { data, live } = useSite();
  const match = useLineupMatch();
  const [view, setView] = useState('pitch');
  if (!match) return null;

  const L = match.lineup;
  const byId = Object.fromEntries(data.players.map((p) => [p.id, p]));
  const slots = formationSlots(L.formation);
  const starters = slots.map((s, i) => ({ s, p: byId[L.starters[i]] })).filter((x) => x.p);
  const bench = L.bench.map((id) => byId[id]).filter(Boolean);
  const club = data.content.shortName || 'Hope FFC';
  const isLive = live?.id === match.id;
  const capt = byId[L.captain];

  return (
    <section id="lineup" className="lineup">
      <div className="container">
        <div className="section-head reveal">
          <div>
            <span className="eyebrow">{isLive ? '● Live now' : match.status === 'finished' ? 'Final whistle' : 'Team news'}</span>
            <h2>Matchday lineup</h2>
          </div>
          <div className="lineup__fixture">
            <div className="lineup__teams">
              <span><img src="/images/crest-sm.png" alt="" /><b>{club}</b></span>
              <em>{match.status === 'scheduled' ? 'vs' : `${match.hopeScore} – ${match.oppScore}`}</em>
              <span><TeamLogo src={opponentLogo(data, match)} name={match.opponent} /><b>{match.opponent}</b></span>
            </div>
            <small>{fmtDate(match.date)} · {fmtTime(match.date, match.timeTbc)} · {match.home ? 'Home' : 'Away'}{match.venue ? ` · ${match.venue}` : ''}</small>
          </div>
        </div>

        <div className="lineup__bar reveal">
          <div className="lseg" role="tablist">
            <button className={view === 'pitch' ? 'is-on' : ''} onClick={() => setView('pitch')}>Pitch</button>
            <button className={view === 'list' ? 'is-on' : ''} onClick={() => setView('list')}>List</button>
          </div>
          <span className="lineup__formation">Formation <b>{L.formation}</b></span>
        </div>

        <div className={`lineup__grid reveal is-${view}`}>
          <div className="lineup__pitchwrap">
            <LineupPitch lineup={L} byId={byId} />
            {bench.length > 0 && (
              <div className="lbench">
                <h4>Substitutes</h4>
                <div className="lbench__row">
                  {bench.map((p, i) => (
                    <PlayerChip key={p.id} p={p} captain={L.captain === p.id} vice={L.vice === p.id} style={{ '--d': `${(11 + i) * 45}ms` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="lineup__list">
            {['GK', 'DEF', 'MID', 'FWD'].map((role) => {
              const group = starters.filter((x) => x.s.role === role);
              if (!group.length) return null;
              return (
                <div key={role} className="lgroup">
                  <h4>{ROLE_NAME[role]}</h4>
                  {group.map(({ p }) => (
                    <div key={p.id} className="lrow">
                      <span className="lrow__n">{p.number}</span>
                      <img src={p.photo || '/images/crest-sm.png'} alt="" loading="lazy" />
                      <span className="lrow__name"><b>{p.firstName} {p.lastName}</b><small>{p.position}</small></span>
                      {L.captain === p.id && <i className="lrow__tag">C</i>}
                      {L.vice === p.id && <i className="lrow__tag lrow__tag--v">V</i>}
                    </div>
                  ))}
                </div>
              );
            })}
            {bench.length > 0 && (
              <div className="lgroup">
                <h4>Substitutes</h4>
                {bench.map((p) => (
                  <div key={p.id} className="lrow lrow--sub">
                    <span className="lrow__n">{p.number}</span>
                    <img src={p.photo || '/images/crest-sm.png'} alt="" loading="lazy" />
                    <span className="lrow__name"><b>{p.firstName} {p.lastName}</b><small>{roleOf(p)}</small></span>
                  </div>
                ))}
              </div>
            )}
            {capt && <p className="lineup__capt">Captain: <b>{capt.firstName} {capt.lastName}</b></p>}
          </aside>
        </div>
      </div>
    </section>
  );
}
