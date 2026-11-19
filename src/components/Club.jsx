import { useSite } from '../lib/SiteContext.jsx';

export default function Club() {
  const { data } = useSite();
  const c = data.content;
  const stats = [
    [c.founded, 'Founded'],
    [data.players.length, 'Players'],
    [c.city, 'Home city'],
    [c.season, 'Season'],
  ];
  return (
    <section id="club" className="club">
      <div className="container club__grid">
        <div className="club__media reveal">
          <img src="/images/gallery/team.jpg" alt={`${c.clubName} squad`} loading="lazy" />
          <div className="club__badge">
            <img src="/images/crest.png" alt="" loading="lazy" />
          </div>
        </div>
        <div className="club__copy reveal">
          <span className="eyebrow eyebrow--dark">The Club</span>
          <h2>Built in the north.<br /><em>Playing with heart.</em></h2>
          <p>{c.about}</p>
          <blockquote>“{c.motto}”</blockquote>
          <div className="club__stats">
            {stats.map(([v, l]) => (
              <div key={l}><b>{v}</b><small>{l}</small></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
