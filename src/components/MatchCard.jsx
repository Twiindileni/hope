import { useEffect, useRef, useState } from 'react';
import { useSite, useTick } from '../lib/SiteContext.jsx';
import { PERIOD_LABEL, clockSeconds, fmtDate, fmtTime, minuteLabel, opponentLogo } from '../lib/format.js';
import TeamLogo from './TeamLogo.jsx';

const TICKS = 46; // bars in the match-progress strip

function Countdown({ to }) {
  useTick(1000);
  const diff = Math.max(0, new Date(to) - Date.now());
  const d = Math.floor(diff / 864e5);
  const h = Math.floor((diff % 864e5) / 36e5);
  const m = Math.floor((diff % 36e5) / 6e4);
  const s = Math.floor((diff % 6e4) / 1e3);
  return (
    <div className="mc__count">
      {[[d, 'Days'], [h, 'Hrs'], [m, 'Min'], [s, 'Sec']].map(([v, l]) => (
        <span key={l}><b>{String(v).padStart(2, '0')}</b><small>{l}</small></span>
      ))}
    </div>
  );
}

/** Flashes its children whenever `value` changes (used for goals). */
function Flash({ value, children }) {
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      setFlash(true);
      const id = setTimeout(() => setFlash(false), 1600);
      prev.current = value;
      return () => clearTimeout(id);
    }
  }, [value]);
  return <b className={flash ? 'is-flash' : ''}>{children}</b>;
}

export default function MatchCard() {
  const { data, live, offset } = useSite();
  useTick(1000, !!live?.clock?.running);

  const now = Date.now();
  const upcoming = data.matches.filter((m) => m.status === 'scheduled' && new Date(m.date) > now);
  const finished = data.matches.filter((m) => m.status === 'finished');
  const pending = data.matches.filter((m) => m.status === 'scheduled' && new Date(m.date) <= now);
  const match = live || upcoming[0] || finished[finished.length - 1] || pending[pending.length - 1];
  if (!match) return null;

  const isLive = !!live;
  const isNext = !isLive && match.status === 'scheduled';
  const isPast = isNext && new Date(match.date) <= now;
  const club = data.content.shortName || 'Hope FFC';
  const home = match.home !== false;

  // progress strip
  const secs = isLive ? clockSeconds(match.clock, offset) : match.status === 'finished' ? 90 * 60 : 0;
  const total = Math.max(90 * 60, secs);
  const filled = Math.round((Math.min(secs, total) / total) * TICKS);
  const goalTicks = new Map();
  (match.events || []).filter((e) => e.type === 'goal').forEach((e) => {
    goalTicks.set(Math.min(TICKS - 1, Math.floor(((e.minute * 60) / total) * TICKS)), e.team);
  });

  const oppLogo = opponentLogo(data, match);
  const left = home ? { name: club, score: match.hopeScore, logo: '/images/crest-sm.png' } : { name: match.opponent, score: match.oppScore, logo: oppLogo };
  const right = home ? { name: match.opponent, score: match.oppScore, logo: oppLogo } : { name: club, score: match.hopeScore, logo: '/images/crest-sm.png' };

  return (
    <div className={`mc ${isLive ? 'mc--live' : ''}`} key={match.id + (isLive ? 'L' : '')}>
      <div className="mc__label">
        {isLive ? (
          <><i className="live-dot" /> Live · {match.competition || 'Match'}</>
        ) : isPast ? (
          <>Latest match · {match.competition || 'Fixture'}</>
        ) : isNext ? (
          <>Next match · {match.competition || 'Fixture'}</>
        ) : (
          <>Latest result · {match.competition || 'Match'}</>
        )}
      </div>

      <div className="mc__card">
        <div className={`mc__teams ${isNext ? 'mc__teams--crests' : ''}`}>
          <div className="mc__team">
            {isNext ? <TeamLogo src={left.logo} name={left.name} /> : <Flash value={left.score}>{left.score}</Flash>}
            <span>{left.name}</span>
          </div>
          {isNext && <span className="mc__vs">VS</span>}
          <div className="mc__team mc__team--right">
            {isNext ? <TeamLogo src={right.logo} name={right.name} /> : <Flash value={right.score}>{right.score}</Flash>}
            <span>{right.name}</span>
          </div>
        </div>

        {isPast ? (
          <div className="mc__tbc">Result to be confirmed</div>
        ) : isNext ? (
          <Countdown to={match.date} />
        ) : (
          <>
            <div className="mc__meta">
              <div>
                <small>Kick-off</small>
                <b>{fmtTime(match.date, match.timeTbc)}</b>
              </div>
              <span className="mc__pill">
                <i>◷</i> {isLive ? minuteLabel(match, offset) : 'FT'}
              </span>
              <div className="mc__right">
                <small>Status</small>
                <b>{isLive ? PERIOD_LABEL[match.period] || 'Live' : 'Full-time'}</b>
              </div>
            </div>
            <div className="mc__bars" aria-hidden>
              {Array.from({ length: TICKS }).map((_, i) => (
                <i key={i} className={`${i < filled ? 'on' : ''} ${goalTicks.has(i) ? `goal goal--${goalTicks.get(i)}` : ''}`} />
              ))}
            </div>
          </>
        )}

        {isNext && (
          <div className="mc__foot">
            <span>{fmtDate(match.date)} · {fmtTime(match.date, match.timeTbc)}</span>
            <span>{match.venue}</span>
          </div>
        )}
        {isLive && match.events?.filter((e) => e.type === 'goal').length > 0 && (
          <div className="mc__scorers">
            {match.events.filter((e) => e.type === 'goal').slice(-3).map((e) => (
              <span key={e.id} className={e.team === 'hope' ? 'is-hope' : ''}>⚽ {e.player || (e.team === 'hope' ? club : match.opponent)} {e.minute}'</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
