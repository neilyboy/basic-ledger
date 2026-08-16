import { UPLOADS_DIR } from '@/lib/db';
import fs from 'fs';

export const dynamic = 'force-dynamic';
import path from 'path';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = parseInt((await params).id, 10);
  const tx = (await import('@/lib/db')).getTransactionById(id);
  if (!tx || !tx.pdf_file) return new Response('PDF not found', { status: 404 });

  const filePath = path.join(UPLOADS_DIR, tx.pdf_file);
  if (!fs.existsSync(filePath)) return new Response('PDF missing', { status: 404 });

  const data = fs.readFileSync(filePath);
  const headers = new Headers();
  headers.set('Content-Type', 'application/pdf');
  headers.set('Content-Disposition', `inline; filename="expense-receipt-${tx.id}.pdf"`);
  return new Response(data, { headers });
}
