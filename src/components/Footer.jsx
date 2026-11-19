import { Link } from 'react-router-dom';
import { useSite } from '../lib/SiteContext.jsx';

export default function Footer() {
  const { data } = useSite();
  const c = data.content;
  const socials = [['Facebook', c.facebook], ['Instagram', c.instagram], ['TikTok', c.tiktok]].filter(([, u]) => u);
  return (
    <footer id="contact" className="footer">
      <div className="footer__cta container reveal">
        <h2>Support <em>Hope</em> this season.</h2>
        <p>Sponsorship, partnerships, trials or just a hello — we would love to hear from you.</p>
        <a className="pill pill--accent" href={`mailto:${c.email}`}>Get in touch <span aria-hidden>↗</span></a>
      </div>
      <div className="footer__grid container">
        <div className="footer__brand">
          <img src="/images/crest.png" alt="" loading="lazy" />
          <div>
            <b>{c.clubName}</b>
            <span>{c.league} · {c.city}, {c.country}</span>
          </div>
        </div>
        <div>
          <h4>Explore</h4>
          <a href="#squad">Squad</a>
          <a href="#matches">Fixtures &amp; Results</a>
          <a href="#table">League Table</a>
          <a href="#club">The Club</a>
          <a href="#gallery">Gallery</a>
        </div>
        <div>
          <h4>Contact</h4>
          {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
          {c.phone && <a href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a>}
          <span>{c.address}</span>
          <span>Home ground: {c.homeGround}</span>
        </div>
        <div>
          <h4>Follow</h4>
          {socials.length ? socials.map(([n, u]) => <a key={n} href={u} target="_blank" rel="noreferrer">{n}</a>) : <span>Social links coming soon</span>}
        </div>
      </div>
      <div className="footer__bottom container">
        <span>© {new Date().getFullYear()} {c.clubName}. All rights reserved.</span>
        <Link to="/admin">Admin</Link>
      </div>
    </footer>
  );
}
