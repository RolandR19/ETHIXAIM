import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// ---------------------------------------------------------------------------
// Ephemeral In-Memory Mesh Signaling & Relay (Zero Storage, Volatile RAM Only)
// ---------------------------------------------------------------------------

interface PendingMessage {
  id: string;
  toKeyHex: string;
  fromKeyHex: string;
  payload: any;
  expiresAt: number;
}

// Active SSE client subscriptions keyed by public key hex (normalized lowercase)
const activeSubscribers = new Map<string, Set<Response>>();

// Short-lived volatile buffer (60s TTL) for packets sent while recipient is opening the tab/camera
const pendingQueue: PendingMessage[] = [];

// Clean expired packets periodically
setInterval(() => {
  const now = Date.now();
  while (pendingQueue.length > 0 && pendingQueue[0].expiresAt <= now) {
    pendingQueue.shift();
  }
}, 10000);

// 1. SSE Stream: Subscribes client by their ephemeral public key
app.get('/api/mesh/subscribe', (req: Request, res: Response) => {
  const publicKeyHex = typeof req.query.publicKeyHex === 'string'
    ? req.query.publicKeyHex.trim().toLowerCase()
    : null;

  if (!publicKeyHex || publicKeyHex.length !== 64) {
    res.status(400).json({ error: 'Valid 64-char publicKeyHex is required' });
    return;
  }

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(': connected\n\n');

  // Register subscriber
  if (!activeSubscribers.has(publicKeyHex)) {
    activeSubscribers.set(publicKeyHex, new Set());
  }
  activeSubscribers.get(publicKeyHex)!.add(res);

  // Deliver any pending messages addressed to this public key
  const now = Date.now();
  const undelivered: PendingMessage[] = [];
  for (const msg of pendingQueue) {
    if (msg.toKeyHex === publicKeyHex && msg.expiresAt > now) {
      try {
        res.write(`data: ${JSON.stringify(msg.payload)}\n\n`);
      } catch {
        undelivered.push(msg);
      }
    } else {
      undelivered.push(msg);
    }
  }
  // Replace queue without the delivered items
  pendingQueue.length = 0;
  pendingQueue.push(...undelivered);

  // Heartbeat ping every 15s to keep proxy connections alive
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeatTimer);
    }
  }, 15000);

  // Cleanup on connection termination
  req.on('close', () => {
    clearInterval(heartbeatTimer);
    const clientSet = activeSubscribers.get(publicKeyHex);
    if (clientSet) {
      clientSet.delete(res);
      if (clientSet.size === 0) {
        activeSubscribers.delete(publicKeyHex);
      }
    }
  });
});

// 2. Publish endpoint: Dispatches signaling or encrypted payload to a recipient key
app.post('/api/mesh/publish', (req: Request, res: Response) => {
  const { toKeyHex, fromKeyHex, payload } = req.body || {};

  if (!toKeyHex || typeof toKeyHex !== 'string') {
    res.status(400).json({ error: 'toKeyHex is required' });
    return;
  }

  const targetKey = toKeyHex.trim().toLowerCase();
  const subscribers = activeSubscribers.get(targetKey);

  let deliveredCount = 0;
  if (subscribers && subscribers.size > 0) {
    const dataString = `data: ${JSON.stringify(payload)}\n\n`;
    for (const clientRes of subscribers) {
      try {
        clientRes.write(dataString);
        deliveredCount++;
      } catch {
        subscribers.delete(clientRes);
      }
    }
  }

  // If not delivered to an active stream or to ensure delivery if subscriber is reconnecting,
  // hold in volatile RAM for up to 60 seconds
  if (deliveredCount === 0) {
    pendingQueue.push({
      id: Math.random().toString(36).substring(2),
      toKeyHex: targetKey,
      fromKeyHex: typeof fromKeyHex === 'string' ? fromKeyHex.trim().toLowerCase() : '',
      payload,
      expiresAt: Date.now() + 60000,
    });
    // Cap memory buffer to 500 items max
    if (pendingQueue.length > 500) {
      pendingQueue.shift();
    }
  }

  res.json({
    success: true,
    deliveredDirectly: deliveredCount > 0,
    activeSubscribersCount: deliveredCount,
  });
});

// 3. Health & Status check endpoint
app.get('/api/mesh/status', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    activePeersCount: activeSubscribers.size,
    pendingInTransit: pendingQueue.length,
    timestamp: Date.now(),
  });
});

// ---------------------------------------------------------------------------
// Vite Integration (Dev & Production)
// ---------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ephemeral P2P Mesh Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
