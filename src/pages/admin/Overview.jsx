import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useSite } from '../../lib/SiteContext.jsx';
import { fmtDate, fmtTime, money, opponentLogo } from '../../lib/format.js';
import TeamLogo from '../../components/TeamLogo.jsx';
import { PageHead } from './ui.jsx';
import { invoiceTotals } from './pdf.js';

export default function Overview() {
  const { data, live } = useSite();
  const [invoices, setInvoices] = useState([]);
  useEffect(() => { api('/invoices').then(setInvoices).catch(() => {}); }, []);

  const now = Date.now();
  const next = data.matches.find((m) => m.status === 'scheduled' && new Date(m.date) > now);
  const outstanding = invoices.filter((i) => i.status !== 'paid' && i.status !== 'draft');
  const owed = outstanding.reduce((s, i) => s + invoiceTotals(i).total, 0);

  const cards = [
    ['Players', data.players.length, '/admin/players'],
    ['Matches', data.matches.length, '/admin/matches'],
    ['Invoices', invoices.length, '/admin/invoices'],
    ['Outstanding', money(owed), '/admin/invoices'],
  ];

  return (
    <>
      <PageHead title={`Welcome back`} sub={`Here's what's happening at ${data.content.clubName}.`}>
        <a className="btn btn--ghost" href="/" target="_blank" rel="noreferrer">View website ↗</a>
      </PageHead>

      <div className="stat-grid">
        {cards.map(([l, v, to]) => (
          <Link key={l} to={to} className="stat">
            <small>{l}</small>
            <b>{v}</b>
          </Link>
        ))}
      </div>

      <div className="two-col">
        <section className="panel">
          <h3>Live coverage</h3>
          {live ? (
            <div className="ov-live">
              <span className="badge badge--live">● LIVE</span>
              <p><b>{data.content.shortName} {live.hopeScore} – {live.oppScore} {live.opponent}</b></p>
              <Link to="/admin/live" className="btn btn--primary">Open live controls</Link>
            </div>
          ) : (
            <div className="ov-live">
              <p className="muted">No match is live. When your team kicks off, go to Live Match and press <b>Go live</b> — the scoreboard appears on the homepage straight away.</p>
              <Link to="/admin/live" className="btn btn--primary">Go to Live Match</Link>
            </div>
          )}
        </section>
        <section className="panel">
          <h3>Next match</h3>
          {next ? (
            <div className="ov-next">
              <TeamLogo src={opponentLogo(data, next)} name={next.opponent} />
              <div>
                <b>vs {next.opponent}</b>
                <p className="muted">{fmtDate(next.date)} · {fmtTime(next.date, next.timeTbc)}<br />{next.venue}</p>
              </div>
            </div>
          ) : (
            <p className="muted">No upcoming fixtures. <Link to="/admin/matches">Add one →</Link></p>
          )}
        </section>
      </div>
    </>
  );
}
