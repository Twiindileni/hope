import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../lib/SiteContext.jsx';
import { useLineupMatch } from './Lineup.jsx';

const LINKS = [
  ['Squad', '#squad'],
  ['Matches', '#matches'],
  ['Table', '#table'],
  ['Results', '#results'],
  ['Club', '#club'],
  ['Gallery', '#gallery'],
];

export default function Navbar() {
  const { data, live } = useSite();
  const lineupMatch = useLineupMatch();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);

  const go = () => setOpen(false);

  return (
    <header className={`nav ${scrolled ? 'nav--solid' : ''} ${open ? 'nav--open' : ''}`}>
      <a href="#top" className="nav__brand" onClick={go} aria-label="Home">
        <img src="/images/crest-sm.png" alt="" />
        <span>
          <b>{data.content.shortName || 'Hope FFC'}</b>
          <small>Est. {data.content.founded}</small>
        </span>
      </a>

      <nav className="nav__links" aria-label="Main">
        <span className="nav__line" aria-hidden />
        {lineupMatch && <a href="#lineup" onClick={go}>Lineup</a>}
        {LINKS.map(([label, href]) => (
          <a key={href} href={href} onClick={go}>{label}</a>
        ))}
        {live && (
          <a href="#top" className="nav__live" onClick={go}>
            <i /> Live now
          </a>
        )}
      </nav>

      <div className="nav__actions">
        <a href="#contact" className="pill pill--light pill--arrow" onClick={go}>
          Contact Us <span className="pill__dot">↗</span>
        </a>
        <button className="nav__burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span /><span /><span />
        </button>
      </div>

      <div className="nav__drawer" onClick={(e) => e.target === e.currentTarget && go()}>
        <div className="nav__drawer-inner">
          {LINKS.map(([label, href], i) => (
            <a key={href} href={href} onClick={go} style={{ '--i': i }}>{label}</a>
          ))}
          <a href="#contact" onClick={go} style={{ '--i': 5 }}>Contact</a>
          <Link to="/admin" onClick={go} className="nav__admin" style={{ '--i': 6 }}>Admin login →</Link>
        </div>
      </div>
    </header>
  );
}
