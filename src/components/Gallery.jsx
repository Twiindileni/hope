import { useEffect, useState } from 'react';
import { useSite } from '../lib/SiteContext.jsx';

export default function Gallery() {
  const { data } = useSite();
  const imgs = data.content.gallery || [];
  const [open, setOpen] = useState(null);

  useEffect(() => {
    if (open == null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') setOpen((i) => (i + 1) % imgs.length);
      if (e.key === 'ArrowLeft') setOpen((i) => (i - 1 + imgs.length) % imgs.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, imgs.length]);

  if (!imgs.length) return null;

  return (
    <section id="gallery" className="gallery">
      <div className="container">
        <div className="section-head reveal">
          <div>
            <span className="eyebrow">Gallery</span>
            <h2>Moments that make us</h2>
          </div>
          <p className="section-head__note">Matchdays, training and everything in between.</p>
        </div>
        <div className="masonry">
          {imgs.map((src, i) => (
            <button key={src + i} className="masonry__item reveal" onClick={() => setOpen(i)} style={{ '--i': i % 4 }}>
              <img src={src} alt={`Hope FFC photo ${i + 1}`} loading="lazy" />
              <span className="masonry__zoom">＋</span>
            </button>
          ))}
        </div>
      </div>

      {open != null && (
        <div className="lightbox" onClick={() => setOpen(null)} role="dialog" aria-modal="true">
          <button className="lightbox__close" aria-label="Close">×</button>
          <button className="lightbox__nav lightbox__nav--l" aria-label="Previous" onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + imgs.length) % imgs.length); }}>←</button>
          <img src={imgs[open]} alt="" onClick={(e) => e.stopPropagation()} />
          <button className="lightbox__nav lightbox__nav--r" aria-label="Next" onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % imgs.length); }}>→</button>
          <span className="lightbox__count">{open + 1} / {imgs.length}</span>
        </div>
      )}
    </section>
  );
}
