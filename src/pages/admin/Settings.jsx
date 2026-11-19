import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { PageHead, Field, useAction } from './ui.jsx';

export default function Settings() {
  const act = useAction();
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [inv, setInv] = useState(null);
  useEffect(() => { api('/invoice-settings').then(setInv).catch(() => {}); }, []);

  const changePw = async (e) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) return act(() => Promise.reject(new Error('New passwords do not match.')));
    await act(() => api('/auth/password', { method: 'PUT', body: { current: pw.current, next: pw.next } }), 'Password changed');
    setPw({ current: '', next: '', confirm: '' });
  };
  const saveInv = (e) => { e.preventDefault(); act(() => api('/invoice-settings', { method: 'PUT', body: inv }), 'Invoice settings saved'); };

  return (
    <>
      <PageHead title="Settings" />
      <div className="two-col">
        <section className="panel">
          <h3>Change password</h3>
          <form className="form-grid form-grid--1" onSubmit={changePw}>
            <Field label="Current password"><input className="input" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required autoComplete="current-password" /></Field>
            <Field label="New password" hint="At least 8 characters."><input className="input" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={8} autoComplete="new-password" /></Field>
            <Field label="Confirm new password"><input className="input" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required autoComplete="new-password" /></Field>
            <div><button className="btn btn--primary">Update password</button></div>
          </form>
        </section>

        {inv && (
          <section className="panel">
            <h3>Invoice settings</h3>
            <form className="form-grid" onSubmit={saveInv}>
              <Field label="Number prefix"><input className="input" value={inv.prefix} onChange={(e) => setInv({ ...inv, prefix: e.target.value })} /></Field>
              <Field label="Next number"><input className="input" type="number" min="1" value={inv.nextNumber} onChange={(e) => setInv({ ...inv, nextNumber: e.target.value })} /></Field>
              <Field label="Default currency"><input className="input" value={inv.currency} onChange={(e) => setInv({ ...inv, currency: e.target.value })} /></Field>
              <Field label="Default VAT %"><input className="input" type="number" min="0" value={inv.taxRate} onChange={(e) => setInv({ ...inv, taxRate: e.target.value })} /></Field>
              <Field label="Bank / payment details" span={2}><textarea className="input" rows="3" value={inv.bank} onChange={(e) => setInv({ ...inv, bank: e.target.value })} /></Field>
              <Field label="Footer message" span={2}><input className="input" value={inv.footer} onChange={(e) => setInv({ ...inv, footer: e.target.value })} /></Field>
              <div><button className="btn btn--primary">Save settings</button></div>
            </form>
          </section>
        )}
      </div>
    </>
  );
}
