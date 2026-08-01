import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['state.md', 'roadmap.md', 'curriculum.md']);

export async function GET(request, { params }) {
  const { file } = await params;

  if (!ALLOWED.has(file)) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const content = fs.readFileSync(path.join(process.cwd(), 'co-founder', file), 'utf8');
    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
