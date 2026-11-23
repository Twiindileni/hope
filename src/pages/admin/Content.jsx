import { useEffect, useState } from 'react';
import { api, uploadImage } from '../../lib/api.js';
import { useSite } from '../../lib/SiteContext.jsx';
import { PageHead, Field, ImageInput, useAction } from './ui.jsx';

const TEXT_FIELDS = [
  ['clubName', 'Club name'], ['shortName', 'Short name'], ['founded', 'Founded (year)'], ['league', 'League'],
  ['season', 'Season'], ['city', 'City'], ['country', 'Country'], ['homeGround', 'Home ground'],
  ['email', 'Email'], ['phone', 'Phone'], ['address', 'Address'], ['motto', 'Motto'],
  ['facebook', 'Facebook URL'], ['instagram', 'Instagram URL'], ['tiktok', 'TikTok URL'],
];

export default function Content() {
  const { data } = useSite();
  const [c, setC] = useState(data.content);
  const [dirty, setDirty] = useState(false);
  const act = useAction();

  useEffect(() => { if (!dirty) setC(data.content); }, [data.content, dirty]);

  const upd = (patch) => { setC({ ...c, ...patch }); setDirty(true); };
  const save = async () => {
    await act(() => api('/content', { method: 'PUT', body: c }), 'Website updated');
    setDirty(false);
  };

  const setSlide = (i, patch) => upd({ slides: c.slides.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const moveGallery = (i, d) => {
    const g = [...c.gallery];
    const j = i + d;
    if (j < 0 || j >= g.length) return;
    [g[i], g[j]] = [g[j], g[i]];
    upd({ gallery: g });
  };
  const addGallery = async (e) => {
    const files = [...(e.target.files || [])];
    const urls = [];
    for (const f of files) { try { urls.push(await act(() => uploadImage(f))); } catch { /* toasted */ } }
    if (urls.length) upd({ gallery: [...c.gallery, ...urls] });
    e.target.value = '';
  };

  return (
    <>
      <PageHead title="Website Content" sub="Edit club details, hero slides and the photo gallery.">
        <button className="btn btn--primary" onClick={save} disabled={!dirty}>{dirty ? 'Save changes' : 'Saved'}</button>
      </PageHead>

      <section className="panel">
        <h3>Club details</h3>
        <div className="form-grid form-grid--3">
          {TEXT_FIELDS.map(([k, l]) => (
            <Field key={k} label={l}><input className="input" value={c[k] ?? ''} onChange={(e) => upd({ [k]: e.target.value })} /></Field>
          ))}
          <Field label="About the club" span={3}>
            <textarea className="input" rows="4" value={c.about} onChange={(e) => upd({ about: e.target.value })} />
          </Field>
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h3>Hero slides</h3>
          <button className="btn btn--sm btn--ghost" onClick={() => upd({ slides: [...c.slides, { title: 'New slide', text: '', image: '/images/hero-player.png', bigWord: 'HOPE' }] })}>+ Add slide</button>
        </div>
        <p className="muted small">Tip: use cut-out player photos with a transparent background (PNG) for the best effect.</p>
        <div className="slides">
          {c.slides.map((s, i) => (
            <div key={i} className="slide-ed">
              <div className="slide-ed__img"><ImageInput value={s.image} onChange={(v) => setSlide(i, { image: v })} contain /></div>
              <div className="form-grid">
                <Field label="Background word" span={2}><input className="input" value={s.bigWord} maxLength={8} onChange={(e) => setSlide(i, { bigWord: e.target.value.toUpperCase() })} /></Field>
                <Field label="Title" span={2}><input className="input" value={s.title} onChange={(e) => setSlide(i, { title: e.target.value })} /></Field>
                <Field label="Text" span={2}><input className="input" value={s.text} onChange={(e) => setSlide(i, { text: e.target.value })} /></Field>
                <div className="row-end field--span2">
                  <button className="btn btn--sm btn--ghost" disabled={c.slides.length < 2} onClick={() => upd({ slides: c.slides.filter((_, j) => j !== i) })}>Remove slide</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h3>Gallery ({c.gallery.length})</h3>
          <label className="btn btn--sm btn--ghost">
            + Upload photos
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={addGallery} />
          </label>
        </div>
        <div className="gal-ed">
          {c.gallery.map((src, i) => (
            <div key={src + i} className="gal-ed__item">
              <img src={src} alt="" loading="lazy" />
              <div className="gal-ed__bar">
                <button onClick={() => moveGallery(i, -1)} title="Move left">←</button>
                <button onClick={() => upd({ gallery: c.gallery.filter((_, j) => j !== i) })} title="Remove">×</button>
                <button onClick={() => moveGallery(i, 1)} title="Move right">→</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {dirty && (
        <div className="savebar">
          <span>You have unsaved changes</span>
          <button className="btn btn--ghost" onClick={() => { setC(data.content); setDirty(false); }}>Discard</button>
          <button className="btn btn--primary" onClick={save}>Save changes</button>
        </div>
      )}
    </>
  );
}
