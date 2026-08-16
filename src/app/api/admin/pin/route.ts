import { NextResponse } from 'next/server';
import { updatePin, verifyPin } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
  const { current, next } = await request.json();
  if (!current || !verifyPin(current)) {
    return NextResponse.json({ error: 'Invalid current PIN' }, { status: 403 });
  }
  if (!/^[0-9]{4}$/.test(next)) {
    return NextResponse.json({ error: 'PIN must be 4 digits' }, { status: 400 });
  }
  updatePin(next);
  return NextResponse.json({ ok: true });
}
