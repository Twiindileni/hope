export const POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
export const POSITION_PLURAL = { Goalkeeper: 'Goalkeepers', Defender: 'Defenders', Midfielder: 'Midfielders', Forward: 'Forwards' };

export const PERIOD_LABEL = {
  pre: 'Kick-off soon', '1H': '1st Half', HT: 'Half-time', '2H': '2nd Half',
  ET1: 'Extra time', ET2: 'Extra time', PEN: 'Penalties', FT: 'Full-time',
};

export function fmtDate(iso, opts = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', opts);
}
export function fmtTime(iso, tbc = false) {
  if (!iso) return '';
  if (tbc) return 'TBC';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }).replace(':', 'H');
}
export function money(n, cur = 'N$') {
  return `${cur} ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Seconds elapsed on the match clock, corrected for server/client time difference. */
export function clockSeconds(clock, offset = 0) {
  if (!clock) return 0;
  if (!clock.running) return clock.base || 0;
  return (clock.base || 0) + (Date.now() + offset - clock.startedAt) / 1000;
}
export function minuteLabel(match, offset = 0) {
  if (!match) return '';
  if (['HT', 'FT', 'pre', 'PEN'].includes(match.period)) return { HT: 'HT', FT: 'FT', pre: '0\'', PEN: 'PEN' }[match.period];
  const secs = clockSeconds(match.clock, offset);
  const m = Math.floor(secs / 60) + 1;
  const cap = { '1H': 45, '2H': 90, ET1: 105, ET2: 120 }[match.period];
  if (cap && m > cap) return `${cap}+${m - cap}'`;
  return `${m}'`;
}

export function matchResult(m) {
  if (m.status !== 'finished') return null;
  if (m.hopeScore > m.oppScore) return 'W';
  if (m.hopeScore < m.oppScore) return 'L';
  return 'D';
}

export const fullName = (p) => `${p.firstName} ${p.lastName}`.trim();

/** Logo for an opponent: the match's own logo, else the league team's logo. */
export function opponentLogo(data, match) {
  if (match.opponentLogo) return match.opponentLogo;
  const t = (data.teams || []).find((x) => x.name.toLowerCase() === String(match.opponent).toLowerCase());
  return t?.logo || '';
}

/** League table rows with points / goal difference, sorted like the official log. */
export function standings(table, teams = []) {
  const byId = Object.fromEntries(teams.map((t) => [t.id, t]));
  return (table?.rows || [])
    .filter((r) => byId[r.teamId])
    .map((r) => ({ ...r, team: byId[r.teamId], gd: r.f - r.a, pts: r.w * 3 + r.d }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.f - a.f || a.team.name.localeCompare(b.team.name))
    .map((r, i) => ({ ...r, pos: i + 1 }));
}

export const initials = (name = '') =>
  name.replace(/\b(FC|SC|Ladies)\b/gi, '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
