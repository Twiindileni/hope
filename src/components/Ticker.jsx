import { useSite } from '../lib/SiteContext.jsx';

export default function Ticker() {
  const { data } = useSite();
  const c = data.content;
  const words = [c.clubName, c.league, `Season ${c.season}`, `${c.city} · ${c.country}`, c.motto, `Est. ${c.founded}`].filter(Boolean);
  const row = (
    <div className="ticker__row">
      {words.map((w, i) => (
        <span key={i}>{w}<img src="/images/crest-sm.png" alt="" /></span>
      ))}
    </div>
  );
  return (
    <div className="ticker" aria-hidden>
      <div className="ticker__track">{row}{row}</div>
    </div>
  );
}
