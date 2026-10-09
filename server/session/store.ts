import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { applyEvent } from './applyEvent.js';
import { DEFAULT_LAYOUT } from './defaultLayout.js';
import type {
  EventResult,
  Layout,
  LoggedEvent,
  SessionEvent,
  SessionSnapshot,
} from './types.js';

export type SessionListener = (payload: {
  sessionId: string;
  event: SessionEvent;
  result: EventResult;
  layout: Layout;
  seq: number;
}) => void;

/**
 * File-backed session store. One process should own live listeners;
 * persistence lets a separate MCP process talk via HTTP to this owner.
 */
export class SessionStore {
  private readonly sessions = new Map<string, SessionSnapshot>();
  private readonly listeners = new Set<SessionListener>();

  /**
   * @param dataDir - Directory for session JSON files
   */
  constructor(private readonly dataDir: string) {}

  /**
   * Subscribe to accepted (and rejected) event applications.
   *
   * @param listener - Callback
   * @returns Unsubscribe function
   */
  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * List known session ids (in memory + on disk names are loaded on demand).
   */
  async listIds(): Promise<string[]> {
    await this.ensureDataDir();
    const { readdir } = await import('node:fs/promises');
    const files = await readdir(this.dataDir);
    const fromDisk = files
      .filter((name) => name.endsWith('.json'))
      .map((name) => name.replace(/\.json$/, ''));
    return [...new Set([...this.sessions.keys(), ...fromDisk])].sort();
  }

  /**
   * Load a session from memory or disk, creating a default if missing.
   *
   * @param id - Session id
   */
  async get(id: string): Promise<SessionSnapshot> {
    const existing = this.sessions.get(id);
    if (existing) {
      return existing;
    }
    const fromDisk = await this.readDisk(id);
    if (fromDisk) {
      this.normalizeLayout(fromDisk.layout);
      this.sessions.set(id, fromDisk);
      return fromDisk;
    }
    const created: SessionSnapshot = {
      id,
      layout: structuredClone(DEFAULT_LAYOUT),
      events: [],
      updatedAt: new Date().toISOString(),
    };
    this.sessions.set(id, created);
    await this.writeDisk(created);
    return created;
  }

  /**
   * Replace the entire layout (does not clear the event log; appends a synthetic note via events only when purge+rebuild is used by callers).
   *
   * @param id - Session id
   * @param layout - New layout document
   */
  async setLayout(id: string, layout: Layout): Promise<SessionSnapshot> {
    const session = await this.get(id);
    session.layout = structuredClone(layout);
    session.updatedAt = new Date().toISOString();
    await this.writeDisk(session);
    return session;
  }

  /**
   * Apply an event, persist, and notify listeners.
   *
   * @param id - Session id
   * @param event - Mutation event
   */
  async apply(id: string, event: SessionEvent): Promise<{
    result: EventResult;
    session: SessionSnapshot;
    seq: number;
  }> {
    const session = await this.get(id);
    const result = applyEvent(session.layout, event);
    const seq = session.events.length + 1;
    const logged: LoggedEvent = {
      seq,
      at: new Date().toISOString(),
      event,
      result,
    };
    session.events.push(logged);
    session.updatedAt = logged.at;
    await this.writeDisk(session);

    for (const listener of this.listeners) {
      listener({
        sessionId: id,
        event,
        result,
        layout: session.layout,
        seq,
      });
    }

    return { result, session, seq };
  }

  /**
   * Events after a sequence number (exclusive).
   *
   * @param id - Session id
   * @param since - Last seen seq (0 = all)
   */
  async eventsSince(id: string, since: number): Promise<LoggedEvent[]> {
    const session = await this.get(id);
    return session.events.filter((entry) => entry.seq > since);
  }

  /**
   * Migrate known-stale layout fields toward the current local baseline.
   *
   * @param layout - Layout to normalize in place
   */
  private normalizeLayout(layout: Layout): void {
    const proxy = layout.inspectorProxy;
    if (
      !proxy ||
      /chris\.totl\.net|southampton\.ac\.uk|soton\.ac\.uk/i.test(proxy)
    ) {
      layout.inspectorProxy = '/api/inspector';
    }
  }

  /**
   * Ensure the data directory exists.
   */
  private async ensureDataDir(): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });
  }

  /**
   * @param id - Session id
   */
  private sessionPath(id: string): string {
    const safe = id.replace(/[^a-zA-Z0-9._-]/g, '_');
    return path.join(this.dataDir, `${safe}.json`);
  }

  /**
   * @param id - Session id
   */
  private async readDisk(id: string): Promise<SessionSnapshot | null> {
    try {
      const raw = await readFile(this.sessionPath(id), 'utf8');
      return JSON.parse(raw) as SessionSnapshot;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        return null;
      }
      throw err;
    }
  }

  /**
   * @param session - Snapshot to persist
   */
  private async writeDisk(session: SessionSnapshot): Promise<void> {
    await this.ensureDataDir();
    await writeFile(this.sessionPath(session.id), JSON.stringify(session, null, 2), 'utf8');
  }
}
