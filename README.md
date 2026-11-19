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

## Putting it online with Vercel

The site is ready for Vercel. The `api/` folder and `vercel.json` handle the server part.

1. **Import the GitHub repo** in Vercel. It detects Vite on its own, so you don't need to change any build settings.
2. **Connect a database.** In your Vercel project, open **Storage** → **Create / Connect** → choose **Upstash for Redis** (the free plan is fine) and connect it to the project. This is where players, matches, scores, the league table and invoices are saved.
3. **Connect photo storage.** In **Storage**, also create a **Blob** store and connect it. This lets you upload player photos and logos from the admin.
4. **Optional, but recommended:** under **Settings → Environment Variables**, add these:
   - `ADMIN_PASSWORD`: the first admin password. Otherwise it is `HopeFC2022!`.
   - `JWT_SECRET`: any long random text.
5. **Redeploy** (Deployments → ⋯ → Redeploy) so the new settings take effect.

If the database isn't connected yet, the website still shows. The admin displays a yellow warning because changes can't be saved until it is.

How live scores reach visitors on Vercel: each visitor's page checks for updates every 3 seconds. Vercel shares one answer between all visitors, so the database is barely used even when many people are watching a match.

### Other hosts (Render, Railway, a VPS…)

```bash
npm run build    # creates the optimised site in /dist
npm start        # one server runs the website + API on port 4000
```

Without Redis, data is saved in `server/data/db.json` and uploads in `server/data/uploads`. **Back up that folder.**

| Variable | Purpose |
|---|---|
| `PORT` | Port to listen on (default 4000) |
| `JWT_SECRET` | Long random string used to sign admin sessions |
| `ADMIN_USER` / `ADMIN_PASSWORD` | First admin account |
| `DATA_DIR` | Where `db.json` and uploads are stored (file mode) |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Upstash Redis. Vercel adds these when you connect it |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob for uploads. Vercel adds this when you connect it |

## Project structure

```
hope/
├── index.html              Page shell (fonts, favicon)
├── public/images/          Crest, player photos, cut-outs, gallery
├── api/index.js            Vercel serverless entry (runs server/app.js)
├── vercel.json             Vercel routing
├── server/
│   ├── app.js              Express API: login, live match, uploads, data
│   ├── index.js            Runs the app as a normal Node server (local / VPS)
│   ├── db.js               Storage: Upstash Redis on Vercel, JSON file locally
│   └── seed.js             Starting data for a fresh install
└── src/
    ├── components/         Hero, live match card, squad carousel, fixtures, gallery…
    ├── pages/Home.jsx      Public homepage
    ├── pages/admin/        Admin dashboard (live control, players, matches, content, invoices)
    ├── lib/                API helper, live data context, formatting
    └── styles/             site.css + admin.css
```

The original full-size photos (DSC_*.JPG and others) are left untouched in this folder. The site uses resized copies from `public/images`.
