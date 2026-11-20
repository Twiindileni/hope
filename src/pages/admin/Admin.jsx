import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, Link } from 'react-router-dom';
import { api, auth } from '../../lib/api.js';
import { SiteProvider, useSite } from '../../lib/SiteContext.jsx';
import { ToastProvider } from './ui.jsx';
import Overview from './Overview.jsx';
import LiveControl from './LiveControl.jsx';
import Matches from './Matches.jsx';
import League from './League.jsx';
import Players from './Players.jsx';
import Content from './Content.jsx';
import Invoices from './Invoices.jsx';
import Settings from './Settings.jsx';
import '../../styles/admin.css';

function Login({ onDone }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: form });
      auth.set(token);
      onDone(user);
    } catch (e2) { setErr(e2.message); }
    setBusy(false);
  };
  return (
    <div className="login">
      <div className="login__art">
        <img src="/images/hero-player.png" alt="" />
        <div className="login__word">HOPE</div>
      </div>
      <form className="login__card" onSubmit={submit}>
        <img src="/images/crest.png" alt="Hope FFC" className="login__crest" />
        <h1>Club Admin</h1>
        <p>Sign in to manage the squad, matches, live scores and invoices.</p>
        <label className="field">
          <span className="field__label">Username</span>
          <input className="input" autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required autoFocus />
        </label>
        <label className="field">
          <span className="field__label">Password</span>
          <input className="input" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </label>
        {err && <div className="login__err">{err}</div>}
        <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <Link to="/" className="login__back">← Back to website</Link>
      </form>
    </div>
  );
}

const NAV = [
  ['', 'Overview', '◧'],
  ['live', 'Live Match', '●'],
  ['matches', 'Matches', '⚽'],
  ['league', 'League Table', '☰'],
  ['players', 'Players & Staff', '👥'],
  ['content', 'Website Content', '✎'],
  ['invoices', 'Invoices', '₪'],
  ['settings', 'Settings', '⚙'],
];

function Shell({ user, onLogout }) {
  const { data, live } = useSite();
  const [menu, setMenu] = useState(false);
  if (!data) return <div className="boot"><img src="/images/crest-sm.png" alt="" /></div>;
  return (
    <div className={`admin ${menu ? 'admin--menu' : ''}`}>
      <aside className="aside">
        <Link to="/admin" className="aside__brand" onClick={() => setMenu(false)}>
          <img src="/images/crest-sm.png" alt="" />
          <span><b>{data.content.shortName}</b><small>Admin dashboard</small></span>
        </Link>
        <nav>
          {NAV.map(([to, label, ic]) => (
            <NavLink key={to} to={`/admin/${to}`} end={to === ''} onClick={() => setMenu(false)}>
              <i className={to === 'live' && live ? 'is-live' : ''}>{ic}</i> {label}
              {to === 'live' && live && <em>LIVE</em>}
            </NavLink>
          ))}
        </nav>
        <div className="aside__foot">
          <a href="/" target="_blank" rel="noreferrer">View website ↗</a>
          <button onClick={onLogout}>Log out</button>
          <small>Signed in as {user.username}</small>
        </div>
      </aside>
      <button className="aside__toggle" onClick={() => setMenu((v) => !v)} aria-label="Menu">☰</button>
      <main className="amain">
        {data.storage === 'memory' && (
          <div className="dbwarn">
            <b>Database not connected — nothing you change here will be saved.</b> In Vercel, open this project → <b>Storage</b> → create or connect an <b>Upstash for Redis</b> (or <b>Redis</b>) database to this project, and a <b>Blob</b> store for photo uploads. Then go to <b>Deployments</b> → <b>Redeploy</b>.
          </div>
        )}
        <Routes>
          <Route index element={<Overview />} />
          <Route path="live" element={<LiveControl />} />
          <Route path="matches" element={<Matches />} />
          <Route path="league" element={<League />} />
          <Route path="players" element={<Players />} />
          <Route path="content" element={<Content />} />
          <Route path="invoices/*" element={<Invoices />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function Admin() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    document.title = 'Admin · Hope FFC';
    if (!auth.token) { setUser(null); return; }
    api('/auth/me').then(setUser).catch(() => setUser(null));
    const out = () => setUser(null);
    window.addEventListener('hopefc:logout', out);
    return () => window.removeEventListener('hopefc:logout', out);
  }, []);

  if (user === undefined) return <div className="boot"><img src="/images/crest-sm.png" alt="" /></div>;

  return (
    <ToastProvider>
      {user ? (
        <SiteProvider>
          <Shell user={user} onLogout={() => { auth.clear(); setUser(null); }} />
        </SiteProvider>
      ) : (
        <Login onDone={setUser} />
      )}
    </ToastProvider>
  );
}
