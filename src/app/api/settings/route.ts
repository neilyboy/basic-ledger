import { NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = getSettings();
  delete settings.admin_pin;
  const smtpEnabled = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  return NextResponse.json({ ...settings, smtp_enabled: smtpEnabled ? 1 : 0 });
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
