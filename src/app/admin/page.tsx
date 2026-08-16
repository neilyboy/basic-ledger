'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';

type Category = { id: number; name: string; requires_mileage: number; sort_order: number; active: number };
type Recipient = { id: number; name: string; email: string; group: string };

export default function Admin() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [authed, setAuthed] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [settings, setSettings] = useState({ company_name: '', reply_to: '', ocr_enabled: 0 });
  const [newCat, setNewCat] = useState({ name: '', requires_mileage: false, sort_order: '' });
  const [newRec, setNewRec] = useState({ name: '', email: '', group: '' });
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    if (!authed) return;
    fetch('/api/categories').then(r => r.json()).then(setCategories);
    fetch('/api/recipients').then(r => r.json()).then(setRecipients);
    fetch('/api/settings').then(r => r.json()).then(setSettings);
  }, [authed]);

  async function verifyPin() {
    setPinError('');
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    if (data.ok) {
      setAuthed(true);
    } else {
      setPinError('Incorrect PIN');
    }
  }

  async function saveSettings() {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
  }

  async function addCategory() {
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newCat, pin, sort_order: Number(newCat.sort_order) }),
    });
    setNewCat({ name: '', requires_mileage: false, sort_order: '' });
    fetch('/api/categories').then(r => r.json()).then(setCategories);
  }

  async function delCategory(id: number) {
    if (!confirm('Delete this category?')) return;
    await fetch('/api/categories', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pin }),
    });
    fetch('/api/categories').then(r => r.json()).then(setCategories);
  }

  async function addRecipient() {
    await fetch('/api/recipients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newRec, pin }),
    });
    setNewRec({ name: '', email: '', group: '' });
    fetch('/api/recipients').then(r => r.json()).then(setRecipients);
  }

  async function delRecipient(id: number) {
    if (!confirm('Delete this recipient?')) return;
    await fetch('/api/recipients', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pin }),
    });
    fetch('/api/recipients').then(r => r.json()).then(setRecipients);
  }

  async function changePin() {
    if (!/^[0-9]{4}$/.test(newPin)) return;
    const res = await fetch('/api/admin/pin', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current: pin, next: newPin }),
    });
    if (res.ok) {
      setPin(newPin);
      setNewPin('');
      alert('PIN updated.');
    } else {
      alert('Failed to update PIN.');
    }
  }

  if (!authed) {
    return (
      <main className="min-h-screen p-6 bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Admin Access</h1>
        <p className="text-gray-400">Enter 4-digit PIN</p>
        <input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && verifyPin()} className="w-32 p-3 text-center text-2xl rounded-xl bg-muted text-foreground tracking-widest" />
        {pinError && <p className="text-red-400 text-sm">{pinError}</p>}
        <button onClick={verifyPin} className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold">Unlock</button>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 bg-background">
      <button onClick={() => router.push('/')} className="flex items-center gap-2 text-foreground mb-4">
        <ArrowLeft size={20} /> Home
      </button>
      <h1 className="text-2xl font-bold mb-6">Admin</h1>

      <section className="bg-card p-5 rounded-2xl border border-muted mb-6">
        <h2 className="font-bold mb-4">Settings</h2>
        <div className="space-y-3">
          <input value={settings.company_name} onChange={e => setSettings({ ...settings, company_name: e.target.value })} className="w-full p-3 rounded-xl bg-muted text-foreground" placeholder="Company Name" />
          <input value={settings.reply_to} onChange={e => setSettings({ ...settings, reply_to: e.target.value })} className="w-full p-3 rounded-xl bg-muted text-foreground" placeholder="Reply-to email" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!settings.ocr_enabled} onChange={e => setSettings({ ...settings, ocr_enabled: e.target.checked ? 1 : 0 })} /> Enable OCR preview
          </label>
          <button onClick={saveSettings} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold">
            <Save size={18} /> Save
          </button>
        </div>
      </section>

      <section className="bg-card p-5 rounded-2xl border border-muted mb-6">
        <h2 className="font-bold mb-4">Categories</h2>
        <div className="space-y-2 mb-4">
          {categories.map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-muted">
              <span>{c.name} {c.requires_mileage ? '(mileage)' : ''}</span>
              <button onClick={() => delCategory(c.id)} className="text-red-400"><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <input value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} className="w-full p-3 rounded-xl bg-muted text-foreground" placeholder="New category" />
          <div className="flex gap-2">
            <input type="number" value={newCat.sort_order} onChange={e => setNewCat({ ...newCat, sort_order: e.target.value })} className="w-24 p-3 rounded-xl bg-muted text-foreground" placeholder="Order" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newCat.requires_mileage} onChange={e => setNewCat({ ...newCat, requires_mileage: e.target.checked })} /> Mileage
            </label>
          </div>
          <button onClick={addCategory} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold">
            <Plus size={18} /> Add
          </button>
        </div>
      </section>

      <section className="bg-card p-5 rounded-2xl border border-muted mb-6">
        <h2 className="font-bold mb-4">Recipients</h2>
        <div className="space-y-2 mb-4">
          {recipients.map(r => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-muted">
              <span>{r.name} &lt;{r.email}&gt; {r.group ? `(${r.group})` : ''}</span>
              <button onClick={() => delRecipient(r.id)} className="text-red-400"><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <input value={newRec.name} onChange={e => setNewRec({ ...newRec, name: e.target.value })} className="w-full p-3 rounded-xl bg-muted text-foreground" placeholder="Name" />
          <input type="email" value={newRec.email} onChange={e => setNewRec({ ...newRec, email: e.target.value })} className="w-full p-3 rounded-xl bg-muted text-foreground" placeholder="Email" />
          <input value={newRec.group} onChange={e => setNewRec({ ...newRec, group: e.target.value })} className="w-full p-3 rounded-xl bg-muted text-foreground" placeholder="Group (optional)" />
          <button onClick={addRecipient} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold">
            <Plus size={18} /> Add Recipient
          </button>
        </div>
      </section>

      <section className="bg-card p-5 rounded-2xl border border-muted">
        <h2 className="font-bold mb-4">Change PIN</h2>
        <div className="flex gap-2">
          <input type="password" inputMode="numeric" maxLength={4} value={newPin} onChange={e => setNewPin(e.target.value)} className="w-32 p-3 rounded-xl bg-muted text-foreground" placeholder="New PIN" />
          <button onClick={changePin} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold">Update</button>
        </div>
      </section>
    </main>
  );
}
