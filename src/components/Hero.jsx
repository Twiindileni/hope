import { useCallback, useEffect, useState } from 'react';
import { useSite } from '../lib/SiteContext.jsx';
import Navbar from './Navbar.jsx';
import MatchCard from './MatchCard.jsx';

export default function Hero() {
  const { data } = useSite();
  const slides = data.content.slides?.length ? data.content.slides : [];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length || 1;

  const go = useCallback((i) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (paused || count < 2) return;
    const id = setTimeout(() => go(index + 1), 7000);
    return () => clearTimeout(id);
  }, [index, paused, count, go]);

  // parallax on pointer
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 });
  };

  const slide = slides[index] || {};
  const players = data.players;

  return (
    <section
      id="top"
      className="hero"
      onMouseMove={onMove}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => { setPaused(false); setTilt({ x: 0, y: 0 }); }}
      style={{ '--tx': tilt.x, '--ty': tilt.y }}
    >
      <div className="hero__bg" aria-hidden>
        <div className="hero__stripes" />
        <div className="hero__glow" />
      </div>

      <Navbar />

      {/* Giant word behind the player */}
      <div className="hero__word" aria-hidden key={`w${index}`}>
        {(slide.bigWord || 'HOPE').split('').map((c, i) => (
          <span key={i} style={{ '--d': `${i * 60}ms` }}>{c}</span>
        ))}
      </div>

      {/* Player cut-outs */}
      <div className="hero__stage">
        {slides.map((s, i) => (
          <img
            key={i}
            src={s.image}
            alt={s.title}
            className={`hero__player ${i === index ? 'is-active' : ''}`}
            draggable="false"
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}
      </div>

      {/* Slide indicators (left) */}
      <div className="hero__dots" role="tablist" aria-label="Slides">
        {slides.map((s, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === index}
            aria-label={`Slide ${i + 1}`}
            className={i === index ? 'is-active' : ''}
            onClick={() => go(i)}
          />
        ))}
      </div>

      {/* Headline (right) */}
      <div className="hero__copy" key={`c${index}`}>
        <span className="hero__tag">{data.content.league} · {data.content.season}</span>
        <p className="hero__kicker">{slide.kicker}</p>
        <h1 className="hero__title">{slide.title}</h1>
        <p className="hero__text">{slide.text}</p>
        <div className="hero__cta">
          <a href="#squad" className="pill pill--accent">Meet the Squad</a>
          <a href="#matches" className="pill pill--light">Fixtures <span aria-hidden>→</span></a>
        </div>
      </div>

      {/* Live / next match card (bottom-left) */}
      <div className="hero__card">
        <MatchCard />
      </div>

      {/* Squad avatars + arrows (bottom-right) */}
      <div className="hero__aside">
        <a href="#squad" className="avatars">
          <span className="avatars__stack">
            {players.slice(0, 4).map((p) => (
              <img key={p.id} src={p.photo} alt="" loading="lazy" />
            ))}
          </span>
          <span className="avatars__text">
            <b><em>{players.length}</em> Players</b>
            <small>Meet the squad</small>
          </span>
        </a>
        <div className="hero__arrows">
          <button aria-label="Previous slide" onClick={() => go(index - 1)}>↑</button>
          <span>{String(index + 1).padStart(2, '0')}<i>/{String(count).padStart(2, '0')}</i></span>
          <button aria-label="Next slide" onClick={() => go(index + 1)}>↓</button>
        </div>
      </div>

    </section>
  );
}
