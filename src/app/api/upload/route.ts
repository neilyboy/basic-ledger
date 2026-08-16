import { NextResponse } from 'next/server';
import { UPLOADS_DIR } from '@/lib/db';

export const dynamic = 'force-dynamic';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `${randomUUID()}.${ext}`;
  const out = path.join(UPLOADS_DIR, filename);
  const bytes = await file.arrayBuffer();
  fs.writeFileSync(out, Buffer.from(bytes));

  return NextResponse.json({ path: filename });
}
