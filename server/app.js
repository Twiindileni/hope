import express from 'express';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { put } from '@vercel/blob';
import { db, jwtSecret, UPLOADS_DIR } from './db.js';

// The Express app. server/index.js runs it as a normal Node server;
// api/index.js hands it to Vercel as a serverless function.
const app = express();
export default app;

app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Load the latest data before every API call, and make sure any change has
// been written to storage before the response goes out (needed on serverless).
app.use('/api', async (req, res, next) => {
  try {
    await db.refresh();
    if (db.mode === 'memory' && req.method !== 'GET' && !req.path.startsWith('/auth/login')) {
      return res.status(503).json({ error: 'Not saved: no database is connected to this Vercel project. Connect Upstash for Redis in Vercel → Storage, then redeploy.' });
    }
    const json = res.json.bind(res);
    const savesBefore = db.saves;
    res.json = (body) => {
      if (db.saves === savesBefore) { db.settle().then(() => json(body)); return res; }
      db.flush().then(() => json(body), (e) => {
        if (res.statusCode >= 400) return json(body);
        res.status(500);
        json({ error: `Not saved — the database rejected the change (${e?.message || 'write failed'}). Please try again.` });
      });
      return res;
    };
    next();
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'The club database is not reachable right now. Please try again shortly.' });
  }
});

function liveMatch() {
  const s = db.get();
  return s.live.matchId ? s.matches.find((m) => m.id === s.live.matchId) || null : null;
}

/* ------------------------------------------------------------------ */
/* Live updates — browsers check this every few seconds                */
/* ------------------------------------------------------------------ */
app.get('/api/live', async (req, res) => {
  const snap = await db.liveSnapshot();
  // let Vercel's CDN share one answer between all visitors for 2 seconds
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=2, stale-while-revalidate=2');
  res.json({ ...snap, serverTime: Date.now() });
});

/* ------------------------------------------------------------------ */
/* Public data                                                         */
/* ------------------------------------------------------------------ */
app.get('/api/site', (req, res) => {
  const s = db.get();
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    content: s.content,
    players: [...s.players].sort((a, b) => a.number - b.number),
    staff: s.staff,
    matches: [...s.matches].sort((a, b) => new Date(a.date) - new Date(b.date)),
    teams: s.teams,
    table: s.table,
    live: liveMatch(),
    rev: s.rev,
    storage: db.mode,
    serverTime: Date.now(),
  });
});

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */
const attempts = new Map();
app.post('/api/auth/login', (req, res) => {
  const ip = req.ip;
  const a = attempts.get(ip) || { n: 0, until: 0 };
  if (a.until > Date.now()) return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
  const { username = '', password = '' } = req.body || {};
  const user = db.get().users.find((u) => u.username.toLowerCase() === String(username).toLowerCase().trim());
  if (!user || !bcrypt.compareSync(String(password), user.hash)) {
    a.n += 1;
    if (a.n >= 5) { a.until = Date.now() + 5 * 60 * 1000; a.n = 0; }
    attempts.set(ip, a);
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }
  attempts.delete(ip);
  const token = jwt.sign({ sub: user.id, name: user.name }, jwtSecret(), { expiresIn: '12h' });
  res.json({ token, user: { id: user.id, username: user.username, name: user.name } });
});

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  try {
    const payload = jwt.verify(token, jwtSecret());
    req.user = db.get().users.find((u) => u.id === payload.sub);
    if (!req.user) throw new Error('gone');
    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
}

app.get('/api/auth/me', auth, (req, res) =>
  res.json({ id: req.user.id, username: req.user.username, name: req.user.name })
);

app.put('/api/auth/password', auth, (req, res) => {
  const { current, next: nextPw } = req.body || {};
  if (!bcrypt.compareSync(String(current || ''), req.user.hash)) return res.status(400).json({ error: 'Current password is wrong.' });
  if (!nextPw || String(nextPw).length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  req.user.hash = bcrypt.hashSync(String(nextPw), 10);
  db.save();
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Uploads                                                             */
/* ------------------------------------------------------------------ */
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const upload = multer({
  storage: useBlob || db.mode !== 'file'
    ? multer.memoryStorage()
    : multer.diskStorage({
      destination: UPLOADS_DIR,
      filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt(file.originalname)}`),
    }),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)),
});
function safeExt(name) {
  return (path.extname(name) || '.jpg').toLowerCase().replace(/[^.a-z0-9]/g, '');
}
app.post('/api/upload', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Please choose a JPG, PNG or WebP image under 4 MB.' });
  if (useBlob) {
    const blob = await put(`uploads/${Date.now()}${safeExt(req.file.originalname)}`, req.file.buffer, {
      access: 'public', contentType: req.file.mimetype, addRandomSuffix: true,
    });
    return res.json({ url: blob.url });
  }
  if (db.mode !== 'file') {
    return res.status(400).json({ error: 'Image uploads need Vercel Blob storage. Connect a Blob store to this project in Vercel → Storage, then redeploy.' });
  }
  res.json({ url: `/uploads/${req.file.filename}` });
});
if (db.mode === 'file') app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));

/* ------------------------------------------------------------------ */
/* Generic collection CRUD                                             */
/* ------------------------------------------------------------------ */
function crud(name, prefix, { sanitize = (x) => x } = {}) {
  const list = () => db.get()[name];
  app.get(`/api/${name}`, auth, (req, res) => res.json(list()));
  app.post(`/api/${name}`, auth, (req, res) => {
    const item = { ...sanitize(req.body || {}), id: db.id(prefix) };
    list().push(item);
    db.save();
    res.status(201).json(item);
  });
  app.put(`/api/${name}/:id`, auth, (req, res) => {
    const item = list().find((x) => x.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    Object.assign(item, sanitize({ ...item, ...req.body }), { id: item.id });
    db.save();
    res.json(item);
  });
  app.delete(`/api/${name}/:id`, auth, (req, res) => {
    const arr = list();
    const i = arr.findIndex((x) => x.id === req.params.id);
    if (i === -1) return res.status(404).json({ error: 'Not found' });
    arr.splice(i, 1);
    if (name === 'matches' && db.get().live.matchId === req.params.id) { db.get().live.matchId = null; }
    db.save();
    res.json({ ok: true });
  });
}

const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const str = (v, d = '') => (v == null ? d : String(v).slice(0, 2000));

crud('players', 'p', {
  sanitize: (p) => ({
    firstName: str(p.firstName), lastName: str(p.lastName), number: num(p.number),
    position: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'].includes(p.position) ? p.position : 'Midfielder',
    photo: str(p.photo), captain: !!p.captain, nationality: str(p.nationality),
    appearances: num(p.appearances), goals: num(p.goals), assists: num(p.assists), cleanSheets: num(p.cleanSheets),
    bio: str(p.bio),
  }),
});
crud('teams', 't', { sanitize: (t) => ({ name: str(t.name), logo: str(t.logo) }) });
app.put('/api/table', auth, (req, res) => {
  const b = req.body || {};
  const ids = new Set(db.get().teams.map((t) => t.id));
  db.get().table = {
    title: str(b.title), updated: str(b.updated),
    rows: (Array.isArray(b.rows) ? b.rows : []).filter((r) => ids.has(r.teamId)).map((r) => ({
      teamId: r.teamId, p: num(r.p), w: num(r.w), d: num(r.d), l: num(r.l), f: num(r.f), a: num(r.a),
    })),
  };
  db.save();
  res.json(db.get().table);
});
crud('staff', 's', { sanitize: (s) => ({ name: str(s.name), role: str(s.role), photo: str(s.photo) }) });
crud('matches', 'm', {
  sanitize: (m) => ({
    opponent: str(m.opponent), opponentLogo: str(m.opponentLogo), competition: str(m.competition),
    venue: str(m.venue), date: str(m.date), home: m.home !== false, timeTbc: !!m.timeTbc,
    status: ['scheduled', 'live', 'finished', 'postponed'].includes(m.status) ? m.status : 'scheduled',
    hopeScore: num(m.hopeScore), oppScore: num(m.oppScore), period: str(m.period, 'pre'),
    clock: m.clock || { running: false, base: 0, startedAt: null },
    events: Array.isArray(m.events) ? m.events : [],
  }),
});
app.post('/api/invoices', auth, (req, res, next) => {
  const st = db.get().invoiceSettings;
  if (req.body?.number === previewNumber(st)) st.nextNumber += 1;
  next();
});
crud('invoices', 'i', {
  sanitize: (inv) => ({
    number: str(inv.number), date: str(inv.date), dueDate: str(inv.dueDate),
    status: ['draft', 'sent', 'paid', 'overdue'].includes(inv.status) ? inv.status : 'draft',
    billTo: { name: str(inv.billTo?.name), address: str(inv.billTo?.address), email: str(inv.billTo?.email), phone: str(inv.billTo?.phone) },
    items: (Array.isArray(inv.items) ? inv.items : []).map((it) => ({ description: str(it.description), qty: num(it.qty, 1), price: num(it.price) })),
    taxRate: num(inv.taxRate), discount: num(inv.discount), notes: str(inv.notes), currency: str(inv.currency, 'N$'),
  }),
});

// Invoice numbers: the editor shows the next number as a preview; it is only
// "used up" when an invoice carrying that number is actually saved.
const previewNumber = (s) => `${s.prefix}-${new Date().getFullYear()}-${String(s.nextNumber).padStart(3, '0')}`;
app.get('/api/invoices/next-number', auth, (req, res) => res.json({ number: previewNumber(db.get().invoiceSettings) }));
app.get('/api/invoice-settings', auth, (req, res) => res.json(db.get().invoiceSettings));
app.put('/api/invoice-settings', auth, (req, res) => {
  const s = db.get().invoiceSettings;
  const b = req.body || {};
  Object.assign(s, {
    prefix: str(b.prefix, s.prefix), nextNumber: Math.max(1, num(b.nextNumber, s.nextNumber)),
    currency: str(b.currency, s.currency), taxRate: num(b.taxRate, s.taxRate), bank: str(b.bank, s.bank), footer: str(b.footer, s.footer),
  });
  db.save();
  res.json(s);
});

app.put('/api/content', auth, (req, res) => {
  const c = db.get().content;
  const allowed = ['clubName', 'shortName', 'founded', 'league', 'season', 'city', 'country', 'homeGround', 'about', 'motto',
    'email', 'phone', 'address', 'facebook', 'instagram', 'tiktok', 'slides', 'gallery'];
  for (const k of allowed) if (req.body[k] !== undefined) c[k] = req.body[k];
  db.save();
  res.json(c);
});

/* ------------------------------------------------------------------ */
/* Live match control                                                  */
/* ------------------------------------------------------------------ */
const clockSeconds = (c) => (c.running ? c.base + (Date.now() - c.startedAt) / 1000 : c.base);
const PERIOD_START = { '1H': 0, '2H': 45 * 60, ET1: 90 * 60, ET2: 105 * 60 };

function findMatch(req, res) {
  const m = db.get().matches.find((x) => x.id === req.params.id);
  if (!m) res.status(404).json({ error: 'Match not found' });
  return m;
}

// Show / hide the scoreboard on the website
app.post('/api/live/activate/:id', auth, (req, res) => {
  const m = findMatch(req, res); if (!m) return;
  db.get().live.matchId = m.id;
  if (m.status === 'scheduled' || m.status === 'postponed') {
    Object.assign(m, { status: 'live', period: 'pre', hopeScore: 0, oppScore: 0, events: [], clock: { running: false, base: 0, startedAt: null } });
  } else if (m.status === 'finished') {
    m.status = 'live';
  }
  db.save();
  res.json(m);
});

app.post('/api/live/deactivate', auth, (req, res) => {
  db.get().live.matchId = null;
  db.save();
  res.json({ ok: true });
});

// Update score / period / clock / events on the live match
app.post('/api/live/:id', auth, (req, res) => {
  const m = findMatch(req, res); if (!m) return;
  const b = req.body || {};
  const s = db.get();

  if (b.hopeScore !== undefined) m.hopeScore = Math.max(0, num(b.hopeScore));
  if (b.oppScore !== undefined) m.oppScore = Math.max(0, num(b.oppScore));

  if (b.period) {
    m.period = b.period;
    if (PERIOD_START[b.period] !== undefined) {
      m.clock = { running: true, base: PERIOD_START[b.period], startedAt: Date.now() };
      m.status = 'live';
    }
    if (b.period === 'HT' || b.period === 'pre') m.clock = { running: false, base: clockSeconds(m.clock), startedAt: null };
    if (b.period === 'FT') {
      m.clock = { running: false, base: clockSeconds(m.clock), startedAt: null };
      m.status = 'finished';
    }
  }
  if (b.clock === 'pause' && m.clock.running) m.clock = { running: false, base: clockSeconds(m.clock), startedAt: null };
  if (b.clock === 'resume' && !m.clock.running) m.clock = { ...m.clock, running: true, startedAt: Date.now() };
  if (b.clockSetMinute !== undefined) {
    const base = Math.max(0, num(b.clockSetMinute)) * 60;
    m.clock = { running: m.clock.running, base, startedAt: m.clock.running ? Date.now() : null };
  }

  if (b.event) {
    const minute = b.event.minute ?? Math.floor(clockSeconds(m.clock) / 60) + 1;
    const ev = {
      id: db.id('e'), minute: num(minute), type: str(b.event.type, 'goal'), team: b.event.team === 'opp' ? 'opp' : 'hope',
      playerId: str(b.event.playerId), player: str(b.event.player), note: str(b.event.note),
    };
    m.events.push(ev);
    m.events.sort((a, b2) => a.minute - b2.minute);
    if (ev.type === 'goal') {
      if (ev.team === 'hope') m.hopeScore += 1; else m.oppScore += 1;
      const p = s.players.find((x) => x.id === ev.playerId);
      if (p && ev.team === 'hope') p.goals += 1;
    }
  }
  if (b.removeEvent) {
    const i = m.events.findIndex((e) => e.id === b.removeEvent);
    if (i > -1) {
      const [ev] = m.events.splice(i, 1);
      if (ev.type === 'goal') {
        if (ev.team === 'hope') m.hopeScore = Math.max(0, m.hopeScore - 1); else m.oppScore = Math.max(0, m.oppScore - 1);
        const p = s.players.find((x) => x.id === ev.playerId);
        if (p && ev.team === 'hope') p.goals = Math.max(0, p.goals - 1);
      }
    }
  }

  db.save();
  res.json(m);
});

/* ------------------------------------------------------------------ */
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});
