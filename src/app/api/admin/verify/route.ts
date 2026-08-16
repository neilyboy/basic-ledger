import { NextResponse } from 'next/server';
import { verifyPin } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { pin } = await request.json();
  const ok = verifyPin(pin);
  return NextResponse.json({ ok });
}
