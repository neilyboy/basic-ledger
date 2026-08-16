import { NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = getSettings();
  delete settings.admin_pin;
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const body = await request.json();
  updateSettings({
    company_name: body.company_name || '',
    reply_to: body.reply_to || '',
    currency: body.currency || 'USD',
    ocr_enabled: body.ocr_enabled ? 1 : 0,
  });
  return NextResponse.json({ ok: true });
}
