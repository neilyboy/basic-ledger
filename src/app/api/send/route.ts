import { NextResponse } from 'next/server';
import { getSettings, getTransactionById, getRecipients, UPLOADS_DIR } from '@/lib/db';
import nodemailer from 'nodemailer';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { transactionId, to, recipientIds } = await request.json() as { transactionId?: number; to?: string[]; recipientIds?: number[] };

  if (!process.env.SMTP_HOST) {
    return NextResponse.json({ error: 'SMTP not configured' }, { status: 400 });
  }

  const tx = transactionId ? getTransactionById(transactionId) : undefined;
  if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  if (!tx.pdf_file || !tx.receipt_image) {
    return NextResponse.json({ error: 'Missing attachments' }, { status: 400 });
  }

  let recipients: string[] = [];
  if (to && to.length) {
    recipients = to;
  } else if (recipientIds && recipientIds.length) {
    const all = getRecipients();
    recipients = all.filter(r => recipientIds.includes(r.id)).map(r => r.email);
  } else {
    return NextResponse.json({ error: 'No recipients' }, { status: 400 });
  }

  const settings = getSettings();
  const company = (settings.company_name as string) || 'Basic Ledger';
  const subject = `Expense Receipt - ${tx.category_name} - ${tx.date}`;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const pdfPath = path.join(UPLOADS_DIR, tx.pdf_file);
  const imgPath = path.join(UPLOADS_DIR, tx.receipt_image);

  const info = await transporter.sendMail({
    from: `${company} <${process.env.SMTP_USER}>`,
    replyTo: (settings.reply_to as string) || process.env.SMTP_USER,
    to: recipients,
    subject,
    text: `${subject}\n\nVendor: ${tx.vendor}\nAmount: $${tx.amount.toFixed(2)}\nNotes: ${tx.notes || '-'}`,
    html: `<p><strong>${subject}</strong></p><p>Vendor: ${tx.vendor}</p><p>Amount: $${tx.amount.toFixed(2)}</p><p>Notes: ${tx.notes || '-'}</p>`,
    attachments: [
      { filename: tx.pdf_file, path: pdfPath, contentType: 'application/pdf' },
      { filename: tx.receipt_image, path: imgPath },
    ],
  });

  return NextResponse.json({ ok: true, messageId: info.messageId });
}
