// Tiny JSON-file database. Writes are atomic (temp file + rename) and serialised.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { seed, seedMatches, seedTeams, seedTable, SEED_VERSION } from './seed.js';

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'server', 'data'));
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SECRET_FILE = path.join(DATA_DIR, '.jwt-secret');

fs.mkdirSync(DATA_DIR, { recursive: true });

let state;

function load() {
  if (fs.existsSync(DB_FILE)) {
    state = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    state.version = state.version || 1;
    // fill in any keys added in newer versions
    for (const [k, v] of Object.entries(seed)) if (state[k] === undefined) state[k] = structuredClone(v);
  } else {
    state = structuredClone(seed);
  }
  migrate();
  if (!state.users.length) {
    const username = process.env.ADMIN_USER || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'HopeFC2022!';
    state.users.push({ id: 'u01', username, name: 'Club Administrator', hash: bcrypt.hashSync(password, 10) });
    console.log(`\n  ⚽  Admin account created → username: ${username}  password: ${password}`);
    console.log('     Change this password in Admin → Settings after your first login.\n');
  }
  persist();
}

// Bring older installs up to date without overwriting anything the admin changed.
function migrate() {
  const v = state.version || 1;
  if (v < 2) {
    if (!state.teams?.length) state.teams = structuredClone(seedTeams);
    if (!state.table?.rows?.length) state.table = structuredClone(seedTable);
    for (const sm of seedMatches) {
      const m = state.matches.find((x) => x.id === sm.id);
      if (!m) state.matches.push(structuredClone(sm));
      else if (m.id === 'm01' && m.status === 'scheduled' && !m.hopeScore && !m.oppScore) Object.assign(m, structuredClone(sm));
    }
    if (state.content.league === "Women's Super League") state.content.league = seed.content.league;
  }
  state.version = SEED_VERSION;
}

let writing = Promise.resolve();
function persist() {
  const json = JSON.stringify(state, null, 2);
  writing = writing.then(
    () =>
      new Promise((resolve) => {
        const tmp = DB_FILE + '.tmp';
        fs.writeFile(tmp, json, (err) => {
          if (err) { console.error('DB write failed', err); return resolve(); }
          fs.rename(tmp, DB_FILE, (e) => { if (e) console.error('DB rename failed', e); resolve(); });
        });
      })
  );
  return writing;
}

export const db = {
  get: () => state,
  save: persist,
  id: (p) => `${p}${crypto.randomBytes(5).toString('hex')}`,
};

export function jwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (!fs.existsSync(SECRET_FILE)) fs.writeFileSync(SECRET_FILE, crypto.randomBytes(48).toString('hex'));
  return fs.readFileSync(SECRET_FILE, 'utf8').trim();
}

export const paths = { DATA_DIR };

load();
