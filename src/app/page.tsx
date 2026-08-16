import Image from 'next/image';
import Link from 'next/link';
import { Plus, History, Lock } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 gap-8 bg-background">
      <div className="flex flex-col items-center gap-4">
        <Image src="/logo.svg" alt="Basic Ledger" width={240} height={66} className="mb-4" priority />
        <h1 className="text-3xl font-bold text-foreground">Basic Ledger</h1>
        <p className="text-sm text-gray-400">Track company card receipts on the go.</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4 mt-6">
        <Link href="/new" className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-primary text-primary-foreground text-lg font-semibold shadow-lg active:scale-95 transition-transform">
          <Plus size={24} />
          New Expense
        </Link>
        <Link href="/history" className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-card text-foreground border border-muted text-lg font-semibold shadow active:scale-95 transition-transform">
          <History size={24} />
          History & Reports
        </Link>
        <Link href="/admin" className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-card text-foreground border border-muted text-lg font-semibold shadow active:scale-95 transition-transform">
          <Lock size={24} />
          Admin
        </Link>
      </div>
    </main>
  );
}
