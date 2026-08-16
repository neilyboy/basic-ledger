import { NextResponse } from 'next/server';
import { createTransaction, getAllTransactions, getCategoryById, getDb, getSettings, UPLOADS_DIR } from '@/lib/db';

export const dynamic = 'force-dynamic';
import { generateReceiptPdf } from '@/lib/pdf';
import path from 'path';

export async function GET() {
  return NextResponse.json(getAllTransactions());
}

export async function POST(request: Request) {
  const body = await request.json();
  const settings = getSettings();
  const category = getCategoryById(body.category_id);
  if (!category) return NextResponse.json({ error: 'Invalid category' }, { status: 400 });

  const id = createTransaction({
    amount: parseFloat(body.amount) || 0,
    date: body.date,
    vendor: body.vendor || '',
    category_id: category.id,
    notes: body.notes || '',
    odometer: category.requires_mileage ? parseInt(body.odometer, 10) || null : null,
    receipt_image: body.receipt_image || null,
    pdf_file: null,
  });

  const tx = getAllTransactions().find(t => t.id === id);
  if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 500 });

  const pdfName = `tx-${tx.id}.pdf`;
  const pdfPath = path.join(UPLOADS_DIR, pdfName);

  await generateReceiptPdf({
    company_name: settings.company_name as string,
    app_name: settings.app_name as string,
    category_name: category.name,
    amount: tx.amount,
    date: tx.date,
    vendor: tx.vendor,
    notes: tx.notes,
    odometer: tx.odometer,
    receipt_image: tx.receipt_image || '',
  }, pdfPath);

  getDb().prepare('UPDATE transactions SET pdf_file = ? WHERE id = ?').run(pdfName, tx.id);

  return NextResponse.json({ id: tx.id });
}
