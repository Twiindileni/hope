import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { uploadImage } from '../../lib/api.js';

/* ---------- toasts ---------- */
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = (msg, type = 'ok') => {
    const id = Math.random();
    setItems((x) => [...x, { id, msg, type }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3200);
  };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts">
        {items.map((t) => <div key={t.id} className={`toast toast--${t.type}`}>{t.msg}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/** Wraps an async action with error toast handling. */
export function useAction() {
  const toast = useToast();
  return async (fn, okMsg) => {
    try {
      const r = await fn();
      if (okMsg) toast(okMsg);
      return r;
    } catch (e) {
      toast(e.message, 'err');
      throw e;
    }
  };
}

/* ---------- layout bits ---------- */
export function PageHead({ title, sub, children }) {
  return (
    <div className="ahead">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      <div className="ahead__actions">{children}</div>
    </div>
  );
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="amodal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`amodal__box ${wide ? 'amodal__box--wide' : ''}`} role="dialog" aria-modal="true">
        <div className="amodal__head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, hint, children, span }) {
  return (
    <label className={`field ${span ? `field--span${span}` : ''}`}>
      <span className="field__label">{label}</span>
      {children}
      {hint && <small className="field__hint">{hint}</small>}
    </label>
  );
}

export function ImageInput({ value, onChange, round, contain }) {
  const ref = useRef();
  const [busy, setBusy] = useState(false);
  const act = useAction();
  const pick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try { onChange(await act(() => uploadImage(f), 'Image uploaded')); } catch { /* toasted */ }
    setBusy(false);
    e.target.value = '';
  };
  return (
    <div className={`imgin ${round ? 'imgin--round' : ''}`}>
      <div className="imgin__preview" onClick={() => ref.current.click()}>
        {value ? <img src={value} alt="" style={{ objectFit: contain ? 'contain' : 'cover' }} /> : <span>No image</span>}
        <div className="imgin__over">{busy ? 'Uploading…' : 'Change'}</div>
      </div>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pick} />
      <input className="input input--sm" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="/images/… or upload" />
    </div>
  );
}

export function Confirm({ text, onYes, onNo }) {
  return (
    <Modal title="Are you sure?" onClose={onNo}>
      <p className="muted" style={{ marginBottom: 20 }}>{text}</p>
      <div className="row-end">
        <button className="btn btn--ghost" onClick={onNo}>Cancel</button>
        <button className="btn btn--danger" onClick={onYes}>Delete</button>
      </div>
    </Modal>
  );
}

export function Empty({ children }) {
  return <div className="aempty">{children}</div>;
}
