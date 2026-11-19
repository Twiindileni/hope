import { useSite } from '../lib/SiteContext.jsx';
import { standings } from '../lib/format.js';
import TeamLogo from './TeamLogo.jsx';

const isHope = (t) => t.id === 't-hope' || /\bhope\b/i.test(t.name);

export default function Standings() {
  const { data } = useSite();
  const rows = standings(data.table, data.teams);
  if (!rows.length) return null;
  const hope = rows.find((r) => isHope(r.team));

  return (
    <section id="table" className="standings">
      <div className="container">
        <div className="section-head reveal">
          <div className="standings__title">
            <img src="/images/teams/wsl-logo.png" alt="FNB Women's Super League" />
            <div>
              <span className="eyebrow">League table</span>
              <h2>{data.table.title || data.content.league}</h2>
            </div>
          </div>
          {data.table.updated && <p className="section-head__note">Official log · updated {data.table.updated}</p>}
        </div>

        <div className="standings__grid">
          <div className="log reveal" role="table" aria-label="League table">
            <div className="log__row log__row--head" role="row">
              <span>#</span><span>Club</span><span>P</span><span className="hide-xs">W</span><span className="hide-xs">D</span><span className="hide-xs">L</span>
              <span className="hide-sm">F</span><span className="hide-sm">A</span><span>GD</span><span>Pts</span>
            </div>
            {rows.map((r) => (
              <div key={r.teamId} role="row" className={`log__row ${isHope(r.team) ? 'is-hope' : ''}`} style={{ '--i': Math.min(r.pos, 8) }}>
                <span className={`log__pos ${r.pos <= 3 ? `top top--${r.pos}` : ''}`}>{r.pos}</span>
                <span className="log__team"><TeamLogo src={r.team.logo} name={r.team.name} /> <b>{r.team.name}</b></span>
                <span>{r.p}</span><span className="hide-xs">{r.w}</span><span className="hide-xs">{r.d}</span><span className="hide-xs">{r.l}</span>
                <span className="hide-sm">{r.f}</span><span className="hide-sm">{r.a}</span>
                <span>{r.gd > 0 ? `+${r.gd}` : r.gd}</span>
                <span className="log__pts">{r.pts}</span>
              </div>
            ))}
          </div>

          {hope && (
            <aside className="hopelog reveal">
              <img src="/images/crest.png" alt="" />
              <span className="eyebrow">Hope FFC this season</span>
              <div className="hopelog__pos"><b>{hope.pos}</b><sup>{['th', 'st', 'nd', 'rd'][(hope.pos % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][hope.pos % 100] || 'th'}</sup></div>
              <p>place · {hope.pts} {hope.pts === 1 ? 'point' : 'points'} from {hope.p} {hope.p === 1 ? 'match' : 'matches'}</p>
              <div className="hopelog__stats">
                <div><b>{hope.w}</b><small>Won</small></div>
                <div><b>{hope.d}</b><small>Drawn</small></div>
                <div><b>{hope.l}</b><small>Lost</small></div>
                <div><b>{hope.f}:{hope.a}</b><small>Goals</small></div>
              </div>
              <a href="#matches" className="pill pill--accent">See our fixtures</a>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
