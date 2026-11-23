// Starting data for a fresh install. Everything here can be edited from the admin dashboard.
// Player names and positions are placeholders — update them in Admin → Players.

const positions = [
  'Defender', 'Midfielder', 'Midfielder', 'Forward', 'Defender', 'Forward',
  'Defender', 'Midfielder', 'Goalkeeper', 'Defender', 'Forward',
];
const numbers = [4, 8, 6, 9, 3, 11, 5, 10, 1, 2, 7];

export const seedPlayers = positions.map((position, i) => ({
  id: `p${String(i + 1).padStart(2, '0')}`,
  firstName: 'Player',
  lastName: `No. ${numbers[i]}`,
  number: numbers[i],
  position,
  photo: `/images/players/p${String(i + 1).padStart(2, '0')}.jpg`,
  captain: i === 0,
  nationality: 'Namibia',
  appearances: 0,
  goals: 0,
  assists: 0,
  cleanSheets: 0,
  bio: '',
}));

// ---------------------------------------------------------------------------
// FNB Women's Super League 2026/27 — teams, Hope FFC matches and the log
// (source: NFA league administrator, log & results of 22 Nov 2026 (rounds 4 & 5),
//  venue/time change notice of 18 Nov 2026)
// ---------------------------------------------------------------------------
const T = (id, name, logo = '') => ({ id, name, logo });
export const seedTeams = [
  T('t-gunners', 'Mighty Gunners Ladies FC', '/images/teams/mighty-gunners.png'),
  T('t-unam', 'UNAM Bokkies FC', '/images/teams/unam.png'),
  T('t-ongos', 'FC Ongos Ladies', '/images/teams/fc-ongos.png'),
  T('t-arrows', 'Arrows Ladies FC', '/images/teams/arrows.png'),
  T('t-nampol', 'Khomas Nampol Ladies FC'),
  T('t-julinho', 'Millennium Julinho Ladies FC', '/images/teams/julinho.png'),
  T('t-pamwe', 'Pamwe SC'),
  T('t-angels', 'Mighty Angels FC', '/images/teams/mighty-angels.png'),
  T('t-stars', 'African Stars Queens FC', '/images/teams/african-stars.png'),
  T('t-vpower', 'V-Power Angels FC', '/images/teams/vpower-angels.png'),
  T('t-hope', 'Hope From FC', '/images/crest-sm.png'),
  T('t-desert', 'Desert Queens FC', '/images/teams/desert-queens.png'),
];

const R = (teamId, p, w, d, l, f, a) => ({ teamId, p, w, d, l, f, a });
export const seedTable = {
  title: "FNB Women's Super League 2026/27",
  updated: '22 November 2026',
  rows: [
    R('t-gunners', 5, 4, 1, 0, 20, 6),
    R('t-arrows', 5, 4, 1, 0, 10, 6),
    R('t-nampol', 5, 4, 0, 1, 15, 5),
    R('t-unam', 5, 4, 0, 1, 11, 7),
    R('t-ongos', 5, 3, 1, 1, 17, 7),
    R('t-angels', 5, 2, 0, 3, 9, 11),
    R('t-desert', 5, 2, 0, 3, 6, 15),
    R('t-julinho', 5, 1, 1, 3, 7, 10),
    R('t-pamwe', 5, 1, 1, 3, 6, 9),
    R('t-stars', 5, 1, 1, 3, 5, 14),
    R('t-vpower', 5, 0, 1, 4, 3, 10),
    R('t-hope', 5, 0, 1, 4, 4, 13),
  ],
};

const M = (id, round, opponent, opponentLogo, date, venue, home, status, hopeScore = 0, oppScore = 0, extra = {}) => ({
  id, opponent, opponentLogo, competition: `FNB Women's Super League · Round ${round}`, venue, date, home, status,
  hopeScore, oppScore, period: status === 'finished' ? 'FT' : 'pre', clock: { running: false, base: 0, startedAt: null }, events: [], ...extra,
});
export const seedMatches = [
  // Round 1 score worked out from the official log (Hope P3 F2 A9; Mighty Angels W1 F4 A8)
  M('m01', 1, 'Mighty Angels FC', '/images/teams/mighty-angels.png', '2026-11-07T17:00:00+02:00', 'SKGA Sport Stadium, Oshakati', true, 'finished', 0, 3),
  M('m02', 2, 'FC Ongos Ladies', '/images/teams/fc-ongos.png', '2026-11-14T12:00:00+02:00', '', false, 'finished', 1, 4, { timeTbc: true }),
  M('m03', 3, 'Arrows Ladies FC', '/images/teams/arrows.png', '2026-11-15T12:00:00+02:00', '', false, 'finished', 1, 2, { timeTbc: true }),
  M('m04', 4, 'Desert Queens FC', '', '2026-11-21T11:00:00+02:00', 'Tamariskia Stadium, Swakopmund', false, 'finished', 0, 2),
  M('m05', 5, 'African Stars Queens FC', '/images/teams/african-stars.png', '2026-11-22T12:00:00+02:00', '', false, 'finished', 2, 2, { timeTbc: true }),
];

// League results archive (all games per round) — source: NFA results of 22 Nov 2026
const teamNames = Object.fromEntries(seedTeams.map((t) => [t.id, t.name]));
const G = (homeId, hs, as, awayId) => ({ homeId, awayId, homeName: teamNames[homeId], awayName: teamNames[awayId], hs, as });
export const seedRounds = [
  { id: 'r04', round: 4, date: '2026-11-21', title: '', games: [
    G('t-desert', 2, 0, 't-hope'),
    G('t-stars', 1, 4, 't-angels'),
    G('t-nampol', 2, 0, 't-vpower'),
    G('t-pamwe', 1, 3, 't-ongos'),
    G('t-gunners', 5, 2, 't-julinho'),
    G('t-unam', 0, 1, 't-arrows'),
  ] },
  { id: 'r05', round: 5, date: '2026-11-22', title: '', games: [
    G('t-desert', 2, 1, 't-angels'),
    G('t-stars', 2, 2, 't-hope'),
    G('t-pamwe', 1, 2, 't-arrows'),
    G('t-gunners', 1, 1, 't-vpower'),
    G('t-nampol', 1, 0, 't-julinho'),
    G('t-unam', 2, 1, 't-ongos'),
  ] },
];

export const SEED_VERSION = 4;

export const seed = {
  version: SEED_VERSION,
  content: {
    clubName: 'Hope From Football Club',
    shortName: 'Hope FFC',
    founded: 2022,
    league: "FNB Women's Super League",
    season: '2026/27',
    city: 'Oshakati',
    country: 'Namibia',
    homeGround: 'SKGA Sport Stadium',
    about:
      'Founded in 2022, Hope From Football Club is a women’s football club from Oshakati competing in the Women’s Super League. We exist to give young women in the north a stage — a place to train hard, compete with pride and grow on and off the pitch.',
    motto: 'Play with heart. Win with Hope.',
    email: 'info@hopefc.com.na',
    phone: '+264 00 000 0000',
    address: 'Oshakati, Namibia',
    facebook: '',
    instagram: '',
    tiktok: '',
    slides: [
      {
        kicker: '01.',
        title: 'Our Captain',
        text: 'Leading from the front every single matchday.',
        image: '/images/hero-player.png',
        bigWord: 'HOPE',
      },
      {
        kicker: '02.',
        title: 'Matchday Ready',
        text: 'Black, red and gold. Built in the north, playing for the nation.',
        image: '/images/hero-player-2.png',
        bigWord: 'FROM',
      },
      {
        kicker: '03.',
        title: 'Since 2022',
        text: "A young club with big dreams in the FNB Women's Super League.",
        image: '/images/hero-player.png',
        bigWord: '2022',
      },
    ],
    gallery: [
      '/images/gallery/team.jpg',
      '/images/gallery/captain-run.jpg',
      '/images/gallery/huddle.jpg',
      '/images/gallery/strike.jpg',
      '/images/gallery/match-action.jpg',
      '/images/gallery/on-the-ball.jpg',
      '/images/gallery/number17.jpg',
      '/images/gallery/team-talk.jpg',
      '/images/gallery/lineup.jpg',
      '/images/gallery/away-kit.jpg',
      '/images/gallery/squad-casual.jpg',
      '/images/gallery/friends.jpg',
    ],
  },
  players: seedPlayers,
  staff: [
    { id: 's01', name: 'Tomas Kleopas', role: 'Public Relations', photo: '/images/staff-pr.jpg' },
  ],
  matches: seedMatches,
  teams: seedTeams,
  table: seedTable,
  rounds: seedRounds,
  live: { matchId: null },
  invoices: [],
  invoiceSettings: {
    prefix: 'HFC',
    nextNumber: 1,
    currency: 'N$',
    taxRate: 15,
    bank: 'Bank name · Account holder: Hope From Football Club · Account no. · Branch code',
    footer: 'Thank you for supporting Hope From Football Club.',
  },
  users: [],
};
