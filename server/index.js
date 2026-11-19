// Runs the club website as a normal Node server (your own computer, Render, Railway, a VPS…).
// On Vercel the same app runs from api/index.js instead.
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import app from './app.js';

const PORT = Number(process.env.PORT || 4000);
const DIST = path.join(process.cwd(), 'dist');

if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { maxAge: '1h', index: false }));
  app.get('*', (req, res) => res.sendFile(path.join(DIST, 'index.html')));
} else {
  app.get('/', (req, res) => res.send('API running. Start the website with "npm run dev" or build it with "npm run build".'));
}

app.listen(PORT, () => {
  console.log(`  ⚽  Hope FFC server running on http://localhost:${PORT}`);
});
