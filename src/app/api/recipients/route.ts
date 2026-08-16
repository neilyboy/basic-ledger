import { NextResponse } from 'next/server';
import { getDb, getRecipients, verifyPin } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getRecipients());
}

function checkPin(body: { pin?: string }) {
  return body.pin && verifyPin(body.pin);
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!checkPin(body)) return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 });
  const { name, email, group } = body;
  const stmt = getDb().prepare('INSERT INTO recipients (name, email, "group") VALUES (?, ?, ?)');
  const result = stmt.run(name, email, group || '');
  return NextResponse.json({ id: result.lastInsertRowid });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  if (!checkPin(body)) return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 });
  const { id } = body;
  getDb().prepare('DELETE FROM recipients WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
