'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

type Transaction = {
  id: number;
  amount: number;
  date: string;
  vendor: string;
  category_name: string;
  receipt_image: string | null;
};

export default function History() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [month, setMonth] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/transactions')
      .then(r => r.json())
      .then(setTransactions);
  }, []);

  const filtered = useMemo(() => {
    if (!month) return transactions;
    return transactions.filter(t => t.date.startsWith(month));
  }, [transactions, month]);

  const total = useMemo(() => filtered.reduce((s, t) => s + t.amount, 0), [filtered]);
  const allTime = useMemo(() => transactions.reduce((s, t) => s + t.amount, 0), [transactions]);

  const months = useMemo(() => {
    const set = new Set(transactions.map(t => t.date.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [transactions]);

  return (
    <main className="min-h-screen p-6 bg-background">
      <button onClick={() => router.push('/')} className="flex items-center gap-2 text-foreground mb-4">
        <ArrowLeft size={20} /> Home
      </button>

      <h1 className="text-2xl font-bold mb-4">History & Reports</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-card p-4 rounded-2xl border border-muted">
          <p className="text-xs text-gray-400">All-time total</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(allTime)}</p>
        </div>
        <div className="bg-card p-4 rounded-2xl border border-muted">
          <p className="text-xs text-gray-400">Selected total</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(total)}</p>
        </div>
      </div>

      <div className="mb-4">
        <select value={month} onChange={e => setMonth(e.target.value)} className="w-full p-3 rounded-xl bg-muted text-foreground">
          <option value="">All months</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 && <p className="text-gray-400 text-center py-10">No expenses yet.</p>}
        {filtered.map(tx => (
          <Link key={tx.id} href={`/transactions/${tx.id}`} className="flex items-center justify-between bg-card p-4 rounded-2xl border border-muted active:scale-95 transition-transform">
            <div>
              <p className="font-semibold text-foreground">{tx.category_name}</p>
              <p className="text-sm text-gray-400">{tx.vendor || 'No vendor'} • {formatDate(tx.date)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">{formatCurrency(tx.amount)}</span>
              <ArrowRight size={18} className="text-gray-500" />
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
