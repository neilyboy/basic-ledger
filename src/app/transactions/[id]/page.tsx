'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Download, Mail, Share, Trash2, FileText, Loader2, Users } from 'lucide-react';
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

type Recipient = {
  id: number;
  name: string;
  email: string;
  group: string;
};

type WebShareNav = Navigator & {
  canShare?: (data?: { files?: File[] }) => boolean;
  share?: (data: { title?: string; text?: string; files?: File[] }) => Promise<void>;
};

export default function TransactionDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([]);
  const [smtpEnabled, setSmtpEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Web Share API is only available in secure contexts (HTTPS or localhost)
  const webShareAvailable = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const nav = navigator as WebShareNav;
    return typeof nav.share === 'function';
  }, []);

  // Recipients grouped by their `group` field
  const grouped = useMemo(() => {
    const map = new Map<string, Recipient[]>();
    for (const r of recipients) {
      const g = r.group || 'Ungrouped';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [recipients]);

  useEffect(() => {
    fetch(`/api/transactions/${id}`)
      .then(r => r.json())
      .then(setTx);
    fetch('/api/recipients')
      .then(r => r.json())
      .then(setRecipients);
    fetch('/api/settings')
      .then(r => r.json())
      .then(s => setSmtpEnabled(!!s.smtp_enabled));
  }, [id]);

  function toggleRecipient(rid: number) {
    setSelectedRecipients(prev =>
      prev.includes(rid) ? prev.filter(x => x !== rid) : [...prev, rid]
    );
  }

  function toggleGroup(groupName: string, memberIds: number[]) {
    setSelectedRecipients(prev => {
      const allSelected = memberIds.every(mid => prev.includes(mid));
      if (allSelected) {
        return prev.filter(id => !memberIds.includes(id));
      }
      return Array.from(new Set([...prev, ...memberIds]));
    });
  }

  async function fetchFiles(): Promise<{ imgFile: File; pdfFile: File }> {
    if (!tx) throw new Error('no tx');
    const [imgRes, pdfRes] = await Promise.all([
      fetch(`/api/uploads/${encodeURIComponent(tx.receipt_image)}`),
      fetch(`/api/transactions/${tx.id}/pdf`),
    ]);
    if (!imgRes.ok || !pdfRes.ok) throw new Error('Failed to download files');
    const [imgBlob, pdfBlob] = await Promise.all([imgRes.blob(), pdfRes.blob()]);
    const imgFile = new File([imgBlob], `receipt-${tx.id}.jpg`, { type: imgBlob.type || 'image/jpeg' });
    const pdfFile = new File(
      [pdfBlob],
      `expense-receipt-${tx.category_name}-${tx.date}.pdf`,
      { type: 'application/pdf' }
    );
    return { imgFile, pdfFile };
  }

  function triggerBrowserDownload(file: File) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async function shareViaWebShare() {
    if (!tx) return;
    setBusy(true);
    setStatus(null);
    try {
      const { imgFile, pdfFile } = await fetchFiles();
      const nav = navigator as WebShareNav;
      const subject = `Expense Receipt - ${tx.category_name} - ${tx.date}`;
      const text = `${subject}\nVendor: ${tx.vendor}\nAmount: $${tx.amount.toFixed(2)}`;
      if (nav.canShare?.({ files: [pdfFile, imgFile] })) {
        await nav.share({ title: subject, text, files: [pdfFile, imgFile] });
      } else {
        await nav.share!({ title: subject, text });
      }
    } catch (e) {
      console.error(e);
      setStatus('Share was cancelled or failed.');
    } finally {
      setBusy(false);
    }
  }

  async function sendToSelected() {
    if (!tx) return;
    if (selectedRecipients.length === 0) {
      setStatus('Select at least one recipient.');
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      if (smtpEnabled) {
        const res = await fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId: tx.id, recipientIds: selectedRecipients }),
        });
        const data = await res.json();
        if (data.ok) {
          setStatus(`Email sent to ${selectedRecipients.length} recipient(s).`);
          setSelectedRecipients([]);
        } else {
          setStatus(data.error || 'Failed to send email.');
        }
      } else {
        // No SMTP: open mailto with BCC, and download the files for manual attachment
        const chosen = recipients.filter(r => selectedRecipients.includes(r.id));
        const bcc = chosen.map(r => r.email).join(',');
        const subject = `Expense Receipt - ${tx.category_name} - ${tx.date}`;
        const body = `Vendor: ${tx.vendor}\nAmount: $${tx.amount.toFixed(2)}\nDate: ${tx.date}\nNotes: ${tx.notes || '-'}\n\n(Attach the downloaded PDF and receipt image.)`;
        const mailto = `mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        const { imgFile, pdfFile } = await fetchFiles();
        triggerBrowserDownload(pdfFile);
        setTimeout(() => triggerBrowserDownload(imgFile), 800);
        window.location.href = mailto;
        setStatus('Opened your email app. Attach the two downloaded files.');
      }
    } catch (e) {
      console.error(e);
      setStatus('Unable to send. Try downloading the PDF instead.');
    } finally {
      setBusy(false);
    }
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

      <div className="grid grid-cols-2 gap-3 mb-4">
        <a href={`/api/transactions/${tx.id}/pdf`} target="_blank" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-muted text-foreground font-semibold">
          <FileText size={18} /> View PDF
        </a>
        <a href={`/api/transactions/${tx.id}/pdf`} download className="flex items-center justify-center gap-2 py-3 rounded-xl bg-muted text-foreground font-semibold">
          <Download size={18} /> Download
        </a>
      </div>

      {/* Recipient picker — always visible, grouped with select-all-in-group */}
      <div className="bg-card p-4 rounded-2xl border border-muted mb-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Users size={18} /> Send to recipients
        </h3>

        {recipients.length === 0 ? (
          <p className="text-sm text-gray-400 mb-3">
            No recipients configured. Add them in the Admin panel.
          </p>
        ) : (
          <div className="flex flex-col gap-3 mb-3 max-h-56 overflow-y-auto">
            {grouped.map(([groupName, members]) => {
              const memberIds = members.map(m => m.id);
              const allSelected = memberIds.every(mid => selectedRecipients.includes(mid));
              return (
                <div key={groupName} className="border border-muted rounded-lg p-2">
                  <label className="flex items-center gap-2 text-sm font-semibold mb-1">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => toggleGroup(groupName, memberIds)}
                      className="w-4 h-4"
                    />
                    {groupName} ({members.length})
                  </label>
                  <div className="pl-6 flex flex-col gap-1">
                    {members.map(r => (
                      <label key={r.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedRecipients.includes(r.id)}
                          onChange={() => toggleRecipient(r.id)}
                          className="w-4 h-4"
                        />
                        {r.name} <span className="text-gray-400">&lt;{r.email}&gt;</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={sendToSelected}
          disabled={busy || selectedRecipients.length === 0}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="animate-spin" /> : <Mail size={18} />}
          {smtpEnabled
            ? `Send Email${selectedRecipients.length ? ` (${selectedRecipients.length})` : ''}`
            : `Open Email App${selectedRecipients.length ? ` (${selectedRecipients.length})` : ''}`}
        </button>
        {!smtpEnabled && (
          <p className="text-xs text-gray-400 mt-2">
            SMTP not configured. This opens your email app with recipients pre-filled and downloads the PDF + receipt for you to attach. Configure SMTP in the Admin panel for direct sending.
          </p>
        )}
      </div>

      {/* Native Web Share — only shown when available (secure context) */}
      {webShareAvailable && (
        <button
          onClick={shareViaWebShare}
          disabled={busy}
          className="w-full py-4 rounded-xl bg-card text-foreground border border-muted font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 mb-3"
        >
          {busy ? <Loader2 className="animate-spin" /> : <Share size={18} />}
          Share via device
        </button>
      )}

      {status && (
        <p className="text-sm text-center mb-3 text-gray-400">{status}</p>
      )}

      <button
        onClick={deleteTx}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500 text-red-400 font-semibold active:scale-95 transition-transform"
      >
        <Trash2 size={18} /> Delete
      </button>
    </main>
  );
}
