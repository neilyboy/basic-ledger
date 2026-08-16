'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Tesseract from 'tesseract.js';
import { Camera, Image as ImageIcon, ArrowLeft, Loader2, Save, Scan } from 'lucide-react';
import { toISODate } from '@/lib/utils';

type Category = {
  id: number;
  name: string;
  requires_mileage: number;
};

export default function NewExpense() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toISODate(new Date()));
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [odometer, setOdometer] = useState('');
  const [ocrEnabled, setOcrEnabled] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/categories?active=1')
      .then(r => r.json())
      .then(setCategories);
    fetch('/api/settings')
      .then(r => r.json())
      .then(s => setOcrEnabled(!!s.ocr_enabled));
  }, []);

  const selectedCat = categories.find(c => c.id === Number(selectedCategory));

  async function handleFile(file: File) {
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setOcrText('');
    setOcrError('');
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    setUploading(false);
    if (data.path) {
      setReceipt(data.path);
      if (ocrEnabled) {
        runOcr(file);
      }
    }
  }

  async function runOcr(file: File) {
    setOcrRunning(true);
    try {
      const result = await Tesseract.recognize(file, 'eng');
      setOcrText(result.data.text);
    } catch (e) {
      console.error(e);
      setOcrError('OCR failed. You can still type the details below.');
    }
    setOcrRunning(false);
  }

  async function submit() {
    if (!receipt || !selectedCategory || !amount || !date) return;
    setSaving(true);
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        date,
        vendor,
        category_id: Number(selectedCategory),
        notes,
        odometer,
        receipt_image: receipt,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.id) {
      router.push(`/transactions/${data.id}`);
    }
  }

  return (
    <main className="min-h-screen p-6 bg-background">
      <button onClick={() => router.push('/')} className="flex items-center gap-2 text-foreground mb-6">
        <ArrowLeft size={20} /> Home
      </button>

      <h1 className="text-2xl font-bold mb-6">New Expense</h1>

      {!preview ? (
        <div className="flex flex-col gap-4 mb-6">
          <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <button onClick={() => galleryRef.current?.click()} className="w-full py-6 rounded-2xl bg-card border border-muted text-foreground font-semibold flex items-center justify-center gap-3 active:scale-95 transition-transform">
            <ImageIcon size={24} /> Choose from Gallery
          </button>
          <button onClick={() => cameraRef.current?.click()} className="w-full py-6 rounded-2xl bg-card border border-muted text-foreground font-semibold flex items-center justify-center gap-3 active:scale-95 transition-transform">
            <Camera size={24} /> Take Photo
          </button>
        </div>
      ) : (
        <div className="mb-6">
          <div className="relative w-full h-64 rounded-xl overflow-hidden bg-card border border-muted">
            <Image src={preview} alt="Receipt preview" fill className="object-contain" />
          </div>
          <button onClick={() => { setPreview(null); setReceipt(null); setOcrText(''); }} className="text-sm text-primary mt-2 underline">Retake / reselect</button>
          {uploading && <p className="text-sm text-gray-400 mt-2">Uploading...</p>}
        </div>
      )}

      {ocrEnabled && preview && (
        <div className="bg-card p-4 rounded-2xl border border-muted mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Scan size={18} className="text-primary" />
            <h3 className="font-semibold">OCR Reference (do not auto-fill)</h3>
          </div>
          {ocrRunning ? (
            <p className="text-sm text-gray-400">Scanning receipt...</p>
          ) : ocrError ? (
            <p className="text-sm text-red-400">{ocrError}</p>
          ) : (
            <textarea readOnly value={ocrText} className="w-full p-3 rounded-xl bg-muted text-foreground text-sm" rows={4} />
          )}
        </div>
      )}

      <div className="flex flex-col gap-4 bg-card p-5 rounded-2xl border border-muted">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-400">Amount</span>
          <input type="number" step="0.01" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-3 rounded-xl bg-muted text-foreground outline-none focus:ring-2 focus:ring-primary" placeholder="0.00" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-400">Date</span>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 rounded-xl bg-muted text-foreground outline-none focus:ring-2 focus:ring-primary" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-400">Vendor / Merchant</span>
          <input type="text" value={vendor} onChange={e => setVendor(e.target.value)} className="w-full p-3 rounded-xl bg-muted text-foreground outline-none focus:ring-2 focus:ring-primary" placeholder="Gas station, store, etc." />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-400">Category</span>
          <select value={selectedCategory} onChange={e => setSelectedCategory(Number(e.target.value) || '')} className="w-full p-3 rounded-xl bg-muted text-foreground outline-none focus:ring-2 focus:ring-primary">
            <option value="">Select category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        {selectedCat?.requires_mileage ? (
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-400">Odometer</span>
            <input type="number" inputMode="numeric" value={odometer} onChange={e => setOdometer(e.target.value)} className="w-full p-3 rounded-xl bg-muted text-foreground outline-none focus:ring-2 focus:ring-primary" placeholder="Current odometer reading" />
          </label>
        ) : null}

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-400">Notes</span>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-3 rounded-xl bg-muted text-foreground outline-none focus:ring-2 focus:ring-primary" rows={3} placeholder="Any additional details..." />
        </label>

        <button
          onClick={submit}
          disabled={!receipt || !selectedCategory || !amount || saving}
          className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
        >
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          Save Expense
        </button>
      </div>
    </main>
  );
}
