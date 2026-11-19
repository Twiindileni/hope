# Hope From Football Club — Website

Official website for Hope From Football Club (Hope FFC). It has the public site, live match scores, a secure admin dashboard and PDF invoices.

## What you need

- **Node.js 20 or newer.** You can get it from <https://nodejs.org> (choose the LTS version).

## Run it on your computer

Open a terminal in this folder (`hope`) and run:

```bash
npm install      # first time only
npm run dev
```

Then open:

- **Website:** <http://localhost:5173>
- **Admin dashboard:** <http://localhost:5173/admin>

### First admin login

| Username | Password      |
|----------|---------------|
| `admin`  | `HopeFC2022!` |

**Change this password straight away** in Admin → Settings.

You can also choose your own username and password before the first run with environment variables: `ADMIN_USER` and `ADMIN_PASSWORD`.

## Running a live match

1. Go to **Admin → Matches** and create the fixture: opponent, date and venue. When you pick a league team as the opponent, its logo is filled in automatically.
2. When the game starts, open **Admin → Live Match**, pick the match and press **● Go live**.
   - A live scoreboard appears straight away on the homepage for everyone viewing it. Nobody needs to refresh.
3. Press **Kick-off 1st half** to start the match clock.
4. During the game, use these controls:
   - **+ Goal** adds a goal.
   - **Add event** records goals with the scorer, as well as cards and substitutions.
   - **Half-time**, **Start 2nd half** and the other buttons change the match period.
5. Press **Full-time**. The final score is saved under *Results*.
6. Press **End live coverage** to remove the scoreboard from the homepage.

## Admin features

- **League Table:** after each round, type in the numbers from the official NFA log (P, W, D, L, F, A). Points and goal difference are calculated for you. You can also upload team logos and add or remove teams when clubs are promoted or relegated.
- **Players & Staff:** add, edit and remove players. You can upload a photo and set the number, position, captain and season stats. Management staff are added here too.
- **Website Content:** club details, contact info, social links, the hero slides on the homepage and the photo gallery.
- **Invoices:** create invoices, preview them live, then use *Save & download PDF*. Invoice numbering, VAT, currency and bank details are set in Settings.

## Putting it online

```bash
npm run build    # creates the optimised site in /dist
npm start        # one server runs the website + API on port 4000
```

This works with any Node host, for example Render, Railway or a VPS. Set these environment variables:

| Variable         | Purpose                                         |
|------------------|-------------------------------------------------|
| `PORT`           | Port to listen on (default 4000)                |
| `JWT_SECRET`     | Long random string used to sign admin sessions  |
| `ADMIN_USER`     | Username for the first admin account            |
| `ADMIN_PASSWORD` | Password for the first admin account            |
| `DATA_DIR`       | Where the database and uploads are stored (default `server/data`) |

All data is saved in `server/data/db.json`. Uploaded images are saved in `server/data/uploads`. **Back up that folder.**

## Project structure

```
hope/
├── index.html              Page shell (fonts, favicon)
├── public/images/          Crest, player photos, cut-outs, gallery
├── server/
│   ├── index.js            Express API, login, live updates (SSE), uploads
│   ├── db.js               JSON file database
│   └── seed.js             Starting data for a fresh install
└── src/
    ├── components/         Hero, live match card, squad carousel, fixtures, gallery…
    ├── pages/Home.jsx      Public homepage
    ├── pages/admin/        Admin dashboard (live control, players, matches, content, invoices)
    ├── lib/                API helper, live data context, formatting
    └── styles/             site.css + admin.css
```

The original full-size photos (DSC_*.JPG and others) are left untouched in this folder. The site uses resized copies from `public/images`.
