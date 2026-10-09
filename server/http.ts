import express from 'express';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import { SessionStore, type SessionEvent } from './session/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const port = Number(process.env.PORT ?? 8787);
const defaultSessionId = process.env.WEBLEAU_SESSION ?? 'default';
const store = new SessionStore(path.join(rootDir, 'sessions'));

const app = express();
app.use(express.json({ limit: '4mb' }));

/** Health check. */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'webleau-http', defaultSessionId });
});

/** List session ids. */
app.get('/api/sessions', async (_req, res, next) => {
  try {
    res.json({ sessions: await store.listIds() });
  } catch (err) {
    next(err);
  }
});

/** Get a session snapshot (layout + recent metadata). */
app.get('/api/sessions/:id', async (req, res, next) => {
  try {
    const session = await store.get(req.params.id);
    res.json({
      id: session.id,
      layout: session.layout,
      updatedAt: session.updatedAt,
      eventCount: session.events.length,
    });
  } catch (err) {
    next(err);
  }
});

/** Replace layout wholesale. */
app.put('/api/sessions/:id', async (req, res, next) => {
  try {
    const layout = req.body?.layout ?? req.body;
    if (!layout || !Array.isArray(layout.nodes) || !Array.isArray(layout.links)) {
      res.status(400).json({ ok: false, error: 'body must include layout.nodes and layout.links' });
      return;
    }
    const session = await store.setLayout(req.params.id, layout);
    broadcast(req.params.id, { type: 'layout', layout: session.layout });
    res.json({ ok: true, id: session.id, updatedAt: session.updatedAt });
  } catch (err) {
    next(err);
  }
});

/** Apply one mutation event. */
app.post('/api/sessions/:id/events', async (req, res, next) => {
  try {
    const event = req.body as SessionEvent;
    if (!event || typeof event.action !== 'string') {
      res.status(400).json({ ok: false, error: 'body must be a session event with action' });
      return;
    }
    const { result, session, seq } = await store.apply(req.params.id, event);
    res.status(result.ok ? 200 : 409).json({
      ...result,
      seq,
      updatedAt: session.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

/** Event log since a sequence number. */
app.get('/api/sessions/:id/events', async (req, res, next) => {
  try {
    const since = Number(req.query.since ?? 0);
    const events = await store.eventsSince(req.params.id, Number.isFinite(since) ? since : 0);
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

app.use(express.static(rootDir, {
  index: false,
  extensions: ['html'],
}));

app.get('/', (_req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'server error' });
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

type ClientInfo = { socket: WebSocket; sessionId: string; clientId: string };

const clients = new Set<ClientInfo>();

/**
 * Broadcast a message to WebSocket clients for a session.
 *
 * @param sessionId - Target session
 * @param message - JSON-serialisable payload
 * @param skipClientId - Optional client to skip (echo suppression)
 */
function broadcast(sessionId: string, message: unknown, skipClientId?: string): void {
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.sessionId !== sessionId) {
      continue;
    }
    if (skipClientId && client.clientId === skipClientId) {
      continue;
    }
    if (client.socket.readyState === client.socket.OPEN) {
      client.socket.send(data);
    }
  }
}

store.subscribe(({ sessionId, event, result, layout, seq }) => {
  broadcast(
    sessionId,
    { type: 'event', seq, event, result, layout },
    event.clientId,
  );
});

wss.on('connection', (socket, req) => {
  const url = new URL(req.url ?? '/ws', `http://${req.headers.host ?? 'localhost'}`);
  const sessionId = url.searchParams.get('session') ?? defaultSessionId;
  const clientId = url.searchParams.get('clientId') ?? `anon-${Math.random().toString(36).slice(2)}`;
  const info: ClientInfo = { socket, sessionId, clientId };
  clients.add(info);
  socket.send(JSON.stringify({ type: 'hello', sessionId, clientId }));

  socket.on('close', () => {
    clients.delete(info);
  });
});

server.listen(port, () => {
  console.log(`Webleau HTTP on http://127.0.0.1:${port}`);
  console.log(`Default session: ${defaultSessionId}`);
  console.log(`WebSocket: ws://127.0.0.1:${port}/ws?session=${defaultSessionId}`);
});
