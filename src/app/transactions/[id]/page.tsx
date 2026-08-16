'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Download, Share, Trash2, FileText, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

type Transaction = {
  id: number;
  amount: number;
  date: string;
  vendor: string;
  category_name: string;
  notes: string;
  odometer: number | null;
  receipt_image: string;
  pdf_file: string;
};

export default function TransactionDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    fetch(`/api/transactions/${id}`)
      .then(r => r.json())
      .then(setTx);
  }, [id]);

  async function shareFiles() {
    if (!tx) return;
    setSharing(true);
    try {
      const [imgRes, pdfRes] = await Promise.all([
        fetch(`/api/uploads/${encodeURIComponent(tx.receipt_image)}`),
        fetch(`/api/transactions/${tx.id}/pdf`),
      ]);
      const [imgBlob, pdfBlob] = await Promise.all([imgRes.blob(), pdfRes.blob()]);

      const imgFile = new File([imgBlob], `receipt-${tx.id}.jpg`, { type: imgBlob.type });
      const pdfFile = new File([pdfBlob], `expense-receipt-${tx.category_name}-${tx.date}.pdf`, { type: 'application/pdf' });

      const subject = `Expense Receipt - ${tx.category_name} - ${tx.date}`;
      const nav = navigator as Navigator & {
        canShare?: (data?: { files?: File[] }) => boolean;
        share?: (data: { title?: string; text?: string; files?: File[] }) => Promise<void>;
      };

      if (nav.canShare?.({ files: [pdfFile, imgFile] })) {
        await nav.share({
          title: subject,
          text: `${subject}\nVendor: ${tx.vendor}\nAmount: $${tx.amount.toFixed(2)}`,
          files: [pdfFile, imgFile],
        });
      } else if (nav.share) {
        await nav.share({ title: subject, text: `${subject}\nVendor: ${tx.vendor}\nAmount: $${tx.amount.toFixed(2)}` });
      } else {
        alert('Sharing not supported on this device.');
      }
    } catch (e) {
      console.error(e);
      alert('Unable to share. Try downloading the PDF instead.');
    }
    setSharing(false);
  }

  async function deleteTx() {
    if (!confirm('Delete this expense?')) return;
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    router.push('/history');
  }

  if (!tx) {
    return (
      <main className="min-h-screen p-6 bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 bg-background">
      <button onClick={() => router.push('/history')} className="flex items-center gap-2 text-foreground mb-4">
        <ArrowLeft size={20} /> Back
      </button>

      <h1 className="text-2xl font-bold mb-4">{tx.category_name}</h1>

      {tx.receipt_image && (
        <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-card border border-muted mb-4">
          <Image src={`/api/uploads/${encodeURIComponent(tx.receipt_image)}`} alt="Receipt" fill className="object-contain" />
        </div>
      )}

      <div className="bg-card p-5 rounded-2xl border border-muted mb-4">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-sm text-gray-400">Amount</p>
            <p className="text-3xl font-bold text-primary">{formatCurrency(tx.amount)}</p>
          </div>
          <p className="text-sm text-gray-400">{formatDate(tx.date)}</p>
        </div>
        <div className="space-y-2 text-sm">
          <p><span className="text-gray-400">Vendor:</span> {tx.vendor || '-'}</p>
          {tx.odometer != null && <p><span className="text-gray-400">Odometer:</span> {tx.odometer.toLocaleString()}</p>}
          <p><span className="text-gray-400">Notes:</span> {tx.notes || '-'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <a href={`/api/transactions/${tx.id}/pdf`} target="_blank" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-muted text-foreground font-semibold">
          <FileText size={18} /> View PDF
        </a>
        <a href={`/api/transactions/${tx.id}/pdf`} download className="flex items-center justify-center gap-2 py-3 rounded-xl bg-muted text-foreground font-semibold">
          <Download size={18} /> Download
        </a>
        <button onClick={shareFiles} disabled={sharing} className="col-span-2 flex items-center justify-center gap-2 py-4 rounded-xl bg-primary text-primary-foreground font-bold active:scale-95 transition-transform disabled:opacity-50">
          {sharing ? <Loader2 className="animate-spin" /> : <Share size={18} />}
          Share Receipt
        </button>
        <button onClick={deleteTx} className="col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500 text-red-400 font-semibold active:scale-95 transition-transform">
          <Trash2 size={18} /> Delete
        </button>
      </div>
    </main>
  );
}
