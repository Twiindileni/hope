// Storage for the whole club database (one JSON document).
//
//  • Upstash Redis — used automatically when its environment variables exist
//    (connect "Upstash for Redis" to the project in Vercel → Storage).
//  • JSON file    — server/data/db.json, used when running on your own computer
//    or any normal Node host.
//  • Memory       — last resort on Vercel when no database is connected yet:
//    the site works, but admin changes are not kept.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Redis } from '@upstash/redis';
import { seed, seedMatches, seedTeams, seedTable, SEED_VERSION } from './seed.js';

// Vercel names these variables differently depending on how the database was
// connected (and may add a custom prefix such as "STORAGE_"), so look for any of them.
const env = process.env;
const findEnv = (...suffixes) => {
  for (const sfx of suffixes) if (env[sfx]) return env[sfx];
  for (const sfx of suffixes) {
    const k = Object.keys(env).find((n) => n.endsWith('_' + sfx) && env[n]);
    if (k) return env[k];
  }
  return null;
};
const REST_URL = findEnv('KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL');
const REST_TOKEN = findEnv('KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN');
// "Redis" from the Vercel Marketplace (Redis Cloud) only gives a redis:// connection string.
const TCP_URL = REST_URL && REST_TOKEN ? null : findEnv('REDIS_URL', 'KV_URL');

let redis = null;
if (REST_URL && REST_TOKEN) {
  redis = new Redis({ url: REST_URL, token: REST_TOKEN });
} else if (TCP_URL) {
  const { createClient } = await import('redis');
  const client = createClient({ url: TCP_URL, socket: { connectTimeout: 8000 } });
  client.on('error', (e) => console.error('Redis error', e.message));
  let ready = null;
  const conn = () => (ready ||= client.connect().catch((e) => { ready = null; throw e; }));
  redis = {
    async get(k) { await conn(); const v = await client.get(k); return v == null ? null : JSON.parse(v); },
    async set(k, v) { await conn(); return client.set(k, JSON.stringify(v)); },
  };
}
const KEY = 'hopefc:db';
const LIVE_KEY = 'hopefc:live';

const MODE = redis ? 'redis' : process.env.VERCEL ? 'memory' : 'file';
if (MODE === 'memory') console.warn('No Redis database found — admin changes will NOT be saved on Vercel.');

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'server', 'data'));
const DB_FILE = path.join(DATA_DIR, 'db.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (MODE === 'file') fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/** A match as the public may see it: lineups stay hidden until the admin releases them. */
export function publicMatch(m) {
  if (!m || !m.lineup || m.lineup.published) return m;
  const { lineup, ...rest } = m;
  return rest;
}

let state = null;
let pending = Promise.resolve();

/* ---------------- raw read / write ---------------- */
async function readRaw() {
  if (MODE === 'redis') return (await redis.get(KEY)) || null;
  if (MODE === 'file' && fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  return null;
}

async function writeRaw(json) {
  if (MODE === 'redis') {
    const s = JSON.parse(json);
    const live = s.live.matchId ? s.matches.find((m) => m.id === s.live.matchId) || null : null;
    await Promise.all([redis.set(KEY, s), redis.set(LIVE_KEY, { rev: s.rev, match: publicMatch(live) })]);
  } else if (MODE === 'file') {
    const tmp = DB_FILE + '.tmp';
    await fs.promises.writeFile(tmp, json);
    await fs.promises.rename(tmp, DB_FILE);
  }
}

/* ---------------- shaping & migrations ---------------- */
function prepare(raw) {
  let s;
  let changed = false;
  if (raw) {
    s = raw;
    s.version = s.version || 1;
    for (const [k, v] of Object.entries(seed)) if (s[k] === undefined) { s[k] = structuredClone(v); changed = true; }
  } else {
    s = structuredClone(seed);
    changed = true;
  }
  if ((s.version || 1) < SEED_VERSION) { migrate(s); changed = true; }
  if (!s.users.length) {
    const username = process.env.ADMIN_USER || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'HopeFC2022!';
    s.users.push({ id: 'u01', username, name: 'Club Administrator', hash: bcrypt.hashSync(password, 10) });
    console.log(`\n  ⚽  Admin account created → username: ${username}  password: ${password}`);
    console.log('     Change this password in Admin → Settings after your first login.\n');
    changed = true;
  }
  if (!s.jwtSecret) { s.jwtSecret = crypto.randomBytes(48).toString('hex'); changed = true; }
  if (typeof s.rev !== 'number') { s.rev = 1; changed = true; }
  return { s, changed };
}

// Bring older installs up to date without overwriting anything the admin changed.
function migrate(s) {
  const v = s.version || 1;
  if (v < 2) {
    if (!s.teams?.length) s.teams = structuredClone(seedTeams);
    if (!s.table?.rows?.length) s.table = structuredClone(seedTable);
    for (const sm of seedMatches) {
      const m = s.matches.find((x) => x.id === sm.id);
      if (!m) s.matches.push(structuredClone(sm));
      else if (m.id === 'm01' && m.status === 'scheduled' && !m.hopeScore && !m.oppScore) Object.assign(m, structuredClone(sm));
    }
    if (s.content.league === "Women's Super League") s.content.league = seed.content.league;
  }
  if (v < 3) {
    // New crests for Mighty Gunners and Desert Queens — only fill logos that are still empty.
    const logos = [['t-gunners', /gunners/i, '/images/teams/mighty-gunners.png'], ['t-desert', /desert queens/i, '/images/teams/desert-queens.png']];
    for (const [id, re, logo] of logos) {
      const t = (s.teams || []).find((x) => x.id === id || re.test(x.name));
      if (t && !t.logo) t.logo = logo;
      for (const m of s.matches || []) if (re.test(m.opponent || '') && !m.opponentLogo) m.opponentLogo = logo;
    }
  }
  s.version = SEED_VERSION;
}

/* ---------------- public API ---------------- */
export const db = {
  mode: MODE,
  get: () => state,
  id: (p) => `${p}${crypto.randomBytes(5).toString('hex')}`,

  /** Load the latest data. On Redis every request reads fresh data (many server instances). */
  async refresh() {
    if (state && MODE !== 'redis') return state;
    const { s, changed } = prepare(await readRaw());
    state = s;
    if (changed) { state.rev += 1; pending = writeRaw(JSON.stringify(state)); await pending; }
    return state;
  },

  /** Queue a write of the current data. `flush()` waits for it and fails if the write failed. */
  saves: 0,
  save() {
    db.saves += 1;
    state.rev = (state.rev || 0) + 1;
    const json = JSON.stringify(state);
    const write = pending.catch(() => {}).then(() => writeRaw(json));
    pending = write;
    write.catch((e) => console.error('DB write failed', e));
    return write;
  },
  flush: () => pending,
  /** Wait for queued writes, ignoring failures from earlier requests. */
  settle: () => pending.catch(() => {}),

  /** Small, fast read used by visitors' browsers to check for live updates. */
  async liveSnapshot() {
    if (MODE === 'redis') {
      const snap = await redis.get(LIVE_KEY);
      if (snap) return snap;
    }
    const s = await db.refresh();
    const live = s.live.matchId ? s.matches.find((m) => m.id === s.live.matchId) || null : null;
    return { rev: s.rev, match: publicMatch(live) };
  },
};

export const jwtSecret = () => process.env.JWT_SECRET || state.jwtSecret;
