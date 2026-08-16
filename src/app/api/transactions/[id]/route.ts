import { NextResponse } from 'next/server';
import { deleteTransaction, getTransactionById } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = parseInt((await params).id, 10);
  const tx = getTransactionById(id);
  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(tx);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const id = parseInt((await params).id, 10);
  deleteTransaction(id);
  return NextResponse.json({ ok: true });
}
