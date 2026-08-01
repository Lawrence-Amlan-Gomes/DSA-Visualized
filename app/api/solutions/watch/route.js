import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Watches public/solutions/ so the browser can auto-rerun the open file on
// save, the way Live Server's whole-page reload used to.
export async function GET(request) {
  const solutionsDir = path.join(process.cwd(), 'public', 'solutions');
  const encoder = new TextEncoder();

  let watcher;
  let debounceTimer = null;

  const stream = new ReadableStream({
    start(controller) {
      watcher = fs.watch(solutionsDir, (eventType, filename) => {
        if (!filename || !filename.endsWith('.js')) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          controller.enqueue(encoder.encode(`data: ${filename}\n\n`));
        }, 200);
      });

      request.signal.addEventListener('abort', () => {
        clearTimeout(debounceTimer);
        watcher.close();
        controller.close();
      });
    },
    cancel() {
      clearTimeout(debounceTimer);
      if (watcher) watcher.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
