import { NextResponse } from 'next/server';
import { getActiveCategories, getCategories, getDb, verifyPin } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const active = searchParams.get('active');
  const categories = active === '1' ? getActiveCategories() : getCategories();
  return NextResponse.json(categories);
}

function checkPin(body: { pin?: string }) {
  if (!body.pin || !verifyPin(body.pin)) return false;
  return true;
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!checkPin(body)) return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 });
  const stmt = getDb().prepare('INSERT INTO categories (name, requires_mileage, sort_order, active) VALUES (?, ?, ?, ?)');
  const result = stmt.run(body.name, body.requires_mileage ? 1 : 0, body.sort_order || 0, body.active ? 1 : 0);
  return NextResponse.json({ id: result.lastInsertRowid });
}

export async function PUT(request: Request) {
  const body = await request.json();
  if (!checkPin(body)) return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 });
  getDb().prepare('UPDATE categories SET name = ?, requires_mileage = ?, sort_order = ?, active = ? WHERE id = ?')
    .run(body.name, body.requires_mileage ? 1 : 0, body.sort_order || 0, body.active ? 1 : 0, body.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  if (!checkPin(body)) return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 });
  getDb().prepare('DELETE FROM categories WHERE id = ?').run(body.id);
  return NextResponse.json({ ok: true });
}
