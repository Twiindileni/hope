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

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = REDIS_URL && REDIS_TOKEN ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;
const KEY = 'hopefc:db';
const LIVE_KEY = 'hopefc:live';

const MODE = redis ? 'redis' : process.env.VERCEL ? 'memory' : 'file';

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'server', 'data'));
const DB_FILE = path.join(DATA_DIR, 'db.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (MODE === 'file') fs.mkdirSync(UPLOADS_DIR, { recursive: true });

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
    await Promise.all([redis.set(KEY, s), redis.set(LIVE_KEY, { rev: s.rev, match: live })]);
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

  /** Queue a write of the current data. `flush()` waits for it. */
  save() {
    state.rev = (state.rev || 0) + 1;
    const json = JSON.stringify(state);
    pending = pending.then(() => writeRaw(json)).catch((e) => console.error('DB write failed', e));
    return pending;
  },
  flush: () => pending,

  /** Small, fast read used by visitors' browsers to check for live updates. */
  async liveSnapshot() {
    if (MODE === 'redis') {
      const snap = await redis.get(LIVE_KEY);
      if (snap) return snap;
    }
    const s = await db.refresh();
    const live = s.live.matchId ? s.matches.find((m) => m.id === s.live.matchId) || null : null;
    return { rev: s.rev, match: live };
  },
};

export const jwtSecret = () => process.env.JWT_SECRET || state.jwtSecret;
