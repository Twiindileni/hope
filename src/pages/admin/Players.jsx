import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useSite } from '../../lib/SiteContext.jsx';
import { POSITIONS, fullName } from '../../lib/format.js';
import { PageHead, Modal, Field, ImageInput, Confirm, useAction, Empty } from './ui.jsx';

const blankPlayer = () => ({
  firstName: '', lastName: '', number: '', position: 'Midfielder', photo: '', captain: false, nationality: 'Namibia',
  appearances: 0, goals: 0, assists: 0, cleanSheets: 0, bio: '',
});

function PlayerForm({ initial, onClose }) {
  const [p, setP] = useState(initial);
  const act = useAction();
  const set = (k) => (e) => setP({ ...p, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e });
  const save = async (e) => {
    e.preventDefault();
    await act(() => (p.id ? api(`/players/${p.id}`, { method: 'PUT', body: p }) : api('/players', { method: 'POST', body: p })), p.id ? 'Player updated' : 'Player added');
    onClose();
  };
  return (
    <Modal title={p.id ? `Edit ${fullName(p)}` : 'Add player'} onClose={onClose} wide>
      <form onSubmit={save} className="player-form">
        <div className="player-form__photo">
          <ImageInput value={p.photo} onChange={set('photo')} />
          <small className="muted">Portrait photos work best (3:4).</small>
        </div>
        <div className="form-grid">
          <Field label="First name"><input className="input" value={p.firstName} onChange={set('firstName')} required /></Field>
          <Field label="Last name"><input className="input" value={p.lastName} onChange={set('lastName')} required /></Field>
          <Field label="Jersey number"><input className="input" type="number" min="0" max="99" value={p.number} onChange={set('number')} required /></Field>
          <Field label="Position">
            <select className="input" value={p.position} onChange={set('position')}>
              {POSITIONS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Nationality"><input className="input" value={p.nationality} onChange={set('nationality')} /></Field>
          <Field label="Captain">
            <label className="check"><input type="checkbox" checked={p.captain} onChange={set('captain')} /> Club captain</label>
          </Field>
          <Field label="Appearances"><input className="input" type="number" min="0" value={p.appearances} onChange={set('appearances')} /></Field>
          <Field label="Goals"><input className="input" type="number" min="0" value={p.goals} onChange={set('goals')} /></Field>
          <Field label="Assists"><input className="input" type="number" min="0" value={p.assists} onChange={set('assists')} /></Field>
          <Field label="Clean sheets"><input className="input" type="number" min="0" value={p.cleanSheets} onChange={set('cleanSheets')} /></Field>
          <Field label="Short bio" span={2}><textarea className="input" rows="3" value={p.bio} onChange={set('bio')} /></Field>
          <div className="row-end field--span2">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn--primary">Save player</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function StaffForm({ initial, onClose }) {
  const [s, setS] = useState(initial);
  const act = useAction();
  const save = async (e) => {
    e.preventDefault();
    await act(() => (s.id ? api(`/staff/${s.id}`, { method: 'PUT', body: s }) : api('/staff', { method: 'POST', body: s })), 'Saved');
    onClose();
  };
  return (
    <Modal title={s.id ? 'Edit staff member' : 'Add staff member'} onClose={onClose}>
      <form onSubmit={save} className="form-grid">
        <Field label="Full name"><input className="input" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} required /></Field>
        <Field label="Role"><input className="input" value={s.role} onChange={(e) => setS({ ...s, role: e.target.value })} placeholder="Head Coach" required /></Field>
        <Field label="Photo" span={2}><ImageInput value={s.photo} onChange={(v) => setS({ ...s, photo: v })} /></Field>
        <div className="row-end field--span2">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary">Save</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Players() {
  const { data } = useSite();
  const [tab, setTab] = useState('players');
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const [q, setQ] = useState('');
  const act = useAction();

  const players = data.players.filter((p) => `${fullName(p)} ${p.number} ${p.position}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHead title="Players & Staff" sub="Changes appear on the website immediately.">
        <div className="seg-a">
          <button className={tab === 'players' ? 'is-on' : ''} onClick={() => setTab('players')}>Players ({data.players.length})</button>
          <button className={tab === 'staff' ? 'is-on' : ''} onClick={() => setTab('staff')}>Staff ({data.staff.length})</button>
        </div>
        <button className="btn btn--primary" onClick={() => setEdit(tab === 'players' ? blankPlayer() : { name: '', role: '', photo: '' })}>
          + Add {tab === 'players' ? 'player' : 'staff'}
        </button>
      </PageHead>

      {tab === 'players' && (
        <>
          <input className="input search" placeholder="Search players…" value={q} onChange={(e) => setQ(e.target.value)} />
          {players.length === 0 ? <Empty>No players found.</Empty> : (
            <div className="pgrid">
              {players.map((p) => (
                <article key={p.id} className="pitem">
                  <div className="pitem__img">
                    <img src={p.photo || '/images/crest.png'} alt="" loading="lazy" />
                    <span className="pitem__num">{p.number}</span>
                    {p.captain && <span className="pitem__c">C</span>}
                  </div>
                  <div className="pitem__body">
                    <b>{fullName(p)}</b>
                    <small>{p.position} · {p.goals} goals · {p.appearances} apps</small>
                    <div className="pitem__actions">
                      <button className="btn btn--sm btn--ghost" onClick={() => setEdit(p)}>Edit</button>
                      <button className="btn btn--sm btn--ghost" onClick={() => setDel({ kind: 'players', item: p, label: fullName(p) })}>Remove</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'staff' && (
        data.staff.length === 0 ? <Empty>No staff added yet.</Empty> : (
          <div className="pgrid">
            {data.staff.map((s) => (
              <article key={s.id} className="pitem">
                <div className="pitem__img"><img src={s.photo || '/images/crest.png'} alt="" loading="lazy" /></div>
                <div className="pitem__body">
                  <b>{s.name}</b>
                  <small>{s.role}</small>
                  <div className="pitem__actions">
                    <button className="btn btn--sm btn--ghost" onClick={() => setEdit(s)}>Edit</button>
                    <button className="btn btn--sm btn--ghost" onClick={() => setDel({ kind: 'staff', item: s, label: s.name })}>Remove</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )
      )}

      {edit && tab === 'players' && <PlayerForm initial={edit} onClose={() => setEdit(null)} />}
      {edit && tab === 'staff' && <StaffForm initial={edit} onClose={() => setEdit(null)} />}
      {del && (
        <Confirm
          text={`Remove ${del.label}?`}
          onNo={() => setDel(null)}
          onYes={async () => { await act(() => api(`/${del.kind}/${del.item.id}`, { method: 'DELETE' }), 'Removed'); setDel(null); }}
        />
      )}
    </>
  );
}
