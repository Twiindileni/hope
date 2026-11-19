import { useEffect, useState } from 'react';
import { Route, Routes, useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useSite } from '../../lib/SiteContext.jsx';
import { fmtDate, money } from '../../lib/format.js';
import { PageHead, Field, Confirm, useAction, Empty } from './ui.jsx';
import { downloadInvoicePdf, invoiceTotals } from './pdf.js';

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const STATUSES = ['draft', 'sent', 'paid', 'overdue'];

function useSettings() {
  const [s, setS] = useState(null);
  useEffect(() => { api('/invoice-settings').then(setS).catch(() => {}); }, []);
  return s;
}

/* ----------------------------- list ----------------------------- */
function List() {
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState('all');
  const [del, setDel] = useState(null);
  const { data } = useSite();
  const settings = useSettings();
  const act = useAction();
  const load = () => api('/invoices').then(setList).catch(() => setList([]));
  useEffect(() => { load(); }, []);

  if (!list) return null;
  const rows = [...list].filter((i) => filter === 'all' || i.status === filter).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const sum = (st) => list.filter((i) => i.status === st).reduce((s, i) => s + invoiceTotals(i).total, 0);

  return (
    <>
      <PageHead title="Invoices" sub="Create professional invoices and export them as PDF.">
        <Link className="btn btn--primary" to="/admin/invoices/new">+ New invoice</Link>
      </PageHead>

      <div className="stat-grid">
        <div className="stat"><small>Total invoices</small><b>{list.length}</b></div>
        <div className="stat"><small>Paid</small><b>{money(sum('paid'))}</b></div>
        <div className="stat"><small>Awaiting payment</small><b>{money(sum('sent'))}</b></div>
        <div className="stat"><small>Overdue</small><b>{money(sum('overdue'))}</b></div>
      </div>

      <div className="seg-a" style={{ marginBottom: 16 }}>
        {['all', ...STATUSES].map((s) => (
          <button key={s} className={filter === s ? 'is-on' : ''} onClick={() => setFilter(s)}>{s[0].toUpperCase() + s.slice(1)}</button>
        ))}
      </div>

      {rows.length === 0 ? <Empty>No invoices here yet. <Link to="/admin/invoices/new">Create your first invoice →</Link></Empty> : (
        <div className="table">
          <div className="table__head"><span>Invoice</span><span>Client</span><span>Date</span><span>Amount</span><span>Status</span><span /></div>
          {rows.map((inv) => (
            <div key={inv.id} className="table__row table__row--inv">
              <span className="mono"><Link to={`/admin/invoices/${inv.id}`}>{inv.number}</Link></span>
              <span>{inv.billTo?.name || '—'}</span>
              <span>{fmtDate(inv.date)}<small>Due {fmtDate(inv.dueDate)}</small></span>
              <span className="mono">{money(invoiceTotals(inv).total, inv.currency)}</span>
              <span><span className={`badge badge--${inv.status}`}>{inv.status}</span></span>
              <span className="table__actions">
                <button className="btn btn--sm btn--ghost" onClick={() => settings && downloadInvoicePdf(inv, data.content, settings)}>PDF</button>
                <Link className="btn btn--sm btn--ghost" to={`/admin/invoices/${inv.id}`}>Edit</Link>
                <button className="btn btn--sm btn--ghost" onClick={() => setDel(inv)}>Delete</button>
              </span>
            </div>
          ))}
        </div>
      )}
      {del && (
        <Confirm
          text={`Delete invoice ${del.number}?`}
          onNo={() => setDel(null)}
          onYes={async () => { await act(() => api(`/invoices/${del.id}`, { method: 'DELETE' }), 'Invoice deleted'); setDel(null); load(); }}
        />
      )}
    </>
  );
}

/* ----------------------------- editor ----------------------------- */
function Editor() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data } = useSite();
  const settings = useSettings();
  const act = useAction();
  const [inv, setInv] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!settings) return;
    if (id === 'new') {
      api('/invoices/next-number').then(({ number }) =>
        setInv({
          number, date: today(), dueDate: plusDays(14), status: 'draft',
          billTo: { name: '', address: '', email: '', phone: '' },
          items: [{ description: '', qty: 1, price: 0 }],
          taxRate: settings.taxRate, discount: 0, notes: '', currency: settings.currency,
        })
      );
    } else {
      api('/invoices').then((l) => setInv(l.find((x) => x.id === id) || null));
    }
  }, [id, settings]);

  if (!inv || !settings) return null;

  const set = (patch) => setInv({ ...inv, ...patch });
  const setBill = (k, v) => set({ billTo: { ...inv.billTo, [k]: v } });
  const setItem = (i, k, v) => set({ items: inv.items.map((it, j) => (j === i ? { ...it, [k]: v } : it)) });
  const t = invoiceTotals(inv);
  const cur = inv.currency;

  const save = async () => {
    setBusy(true);
    try {
      const saved = await act(
        () => (inv.id ? api(`/invoices/${inv.id}`, { method: 'PUT', body: inv }) : api('/invoices', { method: 'POST', body: inv })),
        'Invoice saved'
      );
      setInv(saved);
      if (!inv.id) nav(`/admin/invoices/${saved.id}`, { replace: true });
      return saved;
    } finally { setBusy(false); }
  };
  const pdf = async () => { const s = await save(); await downloadInvoicePdf(s, data.content, settings); };
  const duplicate = async () => {
    const { number } = await api('/invoices/next-number');
    const copy = await act(() => api('/invoices', { method: 'POST', body: { ...inv, id: undefined, number, status: 'draft', date: today(), dueDate: plusDays(14) } }), 'Invoice duplicated');
    nav(`/admin/invoices/${copy.id}`);
  };

  return (
    <>
      <PageHead title={inv.id ? `Invoice ${inv.number}` : 'New invoice'} sub={<Link to="/admin/invoices">← All invoices</Link>}>
        {inv.id && <button className="btn btn--ghost" onClick={duplicate}>Duplicate</button>}
        <button className="btn btn--ghost" onClick={save} disabled={busy}>Save</button>
        <button className="btn btn--primary" onClick={pdf} disabled={busy}>⤓ Save &amp; download PDF</button>
      </PageHead>

      <div className="inv-grid">
        <div>
          <section className="panel">
            <h3>Details</h3>
            <div className="form-grid form-grid--3">
              <Field label="Invoice number"><input className="input" value={inv.number} onChange={(e) => set({ number: e.target.value })} /></Field>
              <Field label="Invoice date"><input className="input" type="date" value={inv.date} onChange={(e) => set({ date: e.target.value })} /></Field>
              <Field label="Due date"><input className="input" type="date" value={inv.dueDate} onChange={(e) => set({ dueDate: e.target.value })} /></Field>
              <Field label="Status">
                <select className="input" value={inv.status} onChange={(e) => set({ status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                </select>
              </Field>
              <Field label="Currency"><input className="input" value={inv.currency} onChange={(e) => set({ currency: e.target.value })} /></Field>
              <Field label="VAT %"><input className="input" type="number" min="0" step="0.5" value={inv.taxRate} onChange={(e) => set({ taxRate: e.target.value })} /></Field>
            </div>
          </section>

          <section className="panel">
            <h3>Bill to</h3>
            <div className="form-grid">
              <Field label="Client / company name"><input className="input" value={inv.billTo.name} onChange={(e) => setBill('name', e.target.value)} /></Field>
              <Field label="Email"><input className="input" type="email" value={inv.billTo.email} onChange={(e) => setBill('email', e.target.value)} /></Field>
              <Field label="Phone"><input className="input" value={inv.billTo.phone} onChange={(e) => setBill('phone', e.target.value)} /></Field>
              <Field label="Address"><input className="input" value={inv.billTo.address} onChange={(e) => setBill('address', e.target.value)} /></Field>
            </div>
          </section>

          <section className="panel">
            <h3>Items</h3>
            <div className="items">
              <div className="items__head"><span>Description</span><span>Qty</span><span>Unit price</span><span>Amount</span><span /></div>
              {inv.items.map((it, i) => (
                <div key={i} className="items__row">
                  <input className="input" placeholder="e.g. Match ball sponsorship" value={it.description} onChange={(e) => setItem(i, 'description', e.target.value)} />
                  <input className="input" type="number" min="0" value={it.qty} onChange={(e) => setItem(i, 'qty', e.target.value)} />
                  <input className="input" type="number" min="0" step="0.01" value={it.price} onChange={(e) => setItem(i, 'price', e.target.value)} />
                  <span className="mono">{money(Number(it.qty) * Number(it.price), cur)}</span>
                  <button className="icon-btn" onClick={() => set({ items: inv.items.filter((_, j) => j !== i) })} disabled={inv.items.length < 2} aria-label="Remove line">×</button>
                </div>
              ))}
              <button className="btn btn--sm btn--ghost" onClick={() => set({ items: [...inv.items, { description: '', qty: 1, price: 0 }] })}>+ Add line</button>
            </div>
            <div className="form-grid" style={{ marginTop: 18 }}>
              <Field label={`Discount (${cur})`}><input className="input" type="number" min="0" step="0.01" value={inv.discount} onChange={(e) => set({ discount: e.target.value })} /></Field>
              <Field label="Notes" span={2}><textarea className="input" rows="3" value={inv.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Payment terms, thank-you note…" /></Field>
            </div>
          </section>
        </div>

        {/* live preview */}
        <aside className="inv-prev">
          <div className="inv-paper">
            <div className="inv-paper__band">
              <img src="/images/crest.png" alt="" />
              <div>
                <b>{data.content.clubName}</b>
                <small>{data.content.address} · {data.content.email}</small>
              </div>
              <div className="inv-paper__title">INVOICE<small>{inv.number}</small></div>
            </div>
            <div className="inv-paper__meta">
              <div><em>Bill to</em><b>{inv.billTo.name || 'Client name'}</b><small>{inv.billTo.address}</small></div>
              <div className="r"><em>Due</em><b>{fmtDate(inv.dueDate)}</b><small>Issued {fmtDate(inv.date)}</small></div>
            </div>
            <div className="inv-paper__items">
              {inv.items.map((it, i) => (
                <div key={i}><span>{it.description || '—'} <small>× {it.qty}</small></span><b>{money(Number(it.qty) * Number(it.price), cur)}</b></div>
              ))}
            </div>
            <div className="inv-paper__tot">
              <div><span>Subtotal</span><span>{money(t.subtotal, cur)}</span></div>
              {t.discount > 0 && <div><span>Discount</span><span>- {money(t.discount, cur)}</span></div>}
              <div><span>VAT ({inv.taxRate}%)</span><span>{money(t.tax, cur)}</span></div>
              <div className="big"><span>Total due</span><span>{money(t.total, cur)}</span></div>
            </div>
          </div>
          <p className="muted small center">Preview — the PDF uses the same layout on A4.</p>
        </aside>
      </div>
    </>
  );
}

export default function Invoices() {
  return (
    <Routes>
      <Route index element={<List />} />
      <Route path=":id" element={<Editor />} />
    </Routes>
  );
}
