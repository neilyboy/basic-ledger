import { UPLOADS_DIR } from '@/lib/db';
import fs from 'fs';

export const dynamic = 'force-dynamic';
import path from 'path';

export async function GET(request: Request, { params }: { params: { path: string[] } }) {
  const segments = (await params).path;
  const relative = path.join(...segments);
  const filePath = path.resolve(UPLOADS_DIR, relative);
  if (!filePath.startsWith(UPLOADS_DIR)) {
    return new Response('Forbidden', { status: 403 });
  }
  if (!fs.existsSync(filePath)) {
    return new Response('Not found', { status: 404 });
  }
  const ext = path.extname(filePath).toLowerCase();
  const contentType = ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : 'image/jpeg';
  const data = fs.readFileSync(filePath);
  return new Response(data, { headers: { 'Content-Type': contentType } });
}
