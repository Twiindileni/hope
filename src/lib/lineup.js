// Formations and pitch positions shared by the website and the admin editor.
// Rows go from the goalkeeper up to the forwards.
export const FORMATIONS = {
  '4-4-2': [1, 4, 4, 2],
  '4-3-3': [1, 4, 3, 3],
  '4-2-3-1': [1, 4, 2, 3, 1],
  '4-1-4-1': [1, 4, 1, 4, 1],
  '4-5-1': [1, 4, 5, 1],
  '3-5-2': [1, 3, 5, 2],
  '3-4-3': [1, 3, 4, 3],
  '5-3-2': [1, 5, 3, 2],
  '5-4-1': [1, 5, 4, 1],
};
export const FORMATION_NAMES = Object.keys(FORMATIONS);
export const BENCH_MAX = 12;

const ROLE_FOR = { Goalkeeper: 'GK', Defender: 'DEF', Midfielder: 'MID', Forward: 'FWD' };
export const roleOf = (p) => ROLE_FOR[p?.position] || 'MID';

/** The 11 slots of a formation with x/y in % of the pitch (GK at the top, like the FPL app). */
export function formationSlots(name = '4-4-2') {
  const rows = FORMATIONS[name] || FORMATIONS['4-4-2'];
  const slots = [];
  const last = rows.length - 1;
  rows.forEach((count, r) => {
    const y = r === 0 ? 11.5 : 31 + ((r - 1) / Math.max(1, last - 1)) * 53;
    const role = r === 0 ? 'GK' : r === 1 ? 'DEF' : r === last ? 'FWD' : 'MID';
    // even spacing, kept away from the touchlines so name cards fit
    const gap = count > 1 ? Math.min(28, 76 / (count - 1)) : 0;
    for (let i = 0; i < count; i++) {
      slots.push({ x: 50 + (i - (count - 1) / 2) * gap, y, role, row: r });
    }
  });
  return slots;
}

export const emptyLineup = () => ({
  formation: '4-4-2', starters: Array(11).fill(''), bench: [], captain: '', vice: '', published: false, publishedAt: '',
});

/** Fill empty slots with sensible players by position (keeps anything already picked). */
export function autoFill(lineup, players) {
  const slots = formationSlots(lineup.formation);
  const starters = [...lineup.starters];
  const used = new Set(starters.filter(Boolean));
  const pool = [...players].sort((a, b) => (b.appearances || 0) - (a.appearances || 0) || a.number - b.number);
  slots.forEach((s, i) => {
    if (starters[i]) return;
    const pick = pool.find((p) => !used.has(p.id) && roleOf(p) === s.role) || (s.role !== 'GK' && pool.find((p) => !used.has(p.id) && roleOf(p) !== 'GK'));
    if (pick) { starters[i] = pick.id; used.add(pick.id); }
  });
  const bench = lineup.bench.filter((id) => !used.has(id));
  for (const p of pool) {
    if (bench.length >= 9) break;
    if (!used.has(p.id) && !bench.includes(p.id)) bench.push(p.id);
  }
  return { ...lineup, starters, bench };
}

/** Short shirt name, e.g. "N. Shikongo". */
export const shirtName = (p) => (p ? (p.lastName ? `${p.firstName ? p.firstName[0] + '. ' : ''}${p.lastName}` : p.firstName) : '');
