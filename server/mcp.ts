#!/usr/bin/env node
/**
 * MCP stdio adapter. Talks to the running Webleau HTTP server so the
 * browser WebSocket fan-out stays the single live authority.
 *
 * Requires: npm start (HTTP on WEBLEAU_URL, default http://127.0.0.1:8787)
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';

const baseUrl = (process.env.WEBLEAU_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, '');
const sessionId = process.env.WEBLEAU_SESSION ?? 'default';

/**
 * @param pathname - API path beginning with /
 * @param init - fetch init
 */
async function api<T>(pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json()) as T;
  if (!response.ok) {
    const error = (body as { error?: string }).error ?? response.statusText;
    throw new Error(`${response.status} ${pathname}: ${error}`);
  }
  return body;
}

/**
 * @param value - Value to show in tool output
 */
function textResult(value: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
  };
}

const server = new McpServer({
  name: 'webleau',
  version: '0.1.0',
});

server.registerResource(
  'session',
  `webleau://session/${sessionId}`,
  {
    title: 'Current Webleau session',
    description: 'Layout and metadata for the default (or WEBLEAU_SESSION) canvas',
    mimeType: 'application/json',
  },
  async (uri) => {
    const data = await api<unknown>(`/api/sessions/${encodeURIComponent(sessionId)}`);
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  'session_get',
  {
    title: 'Get session',
    description: 'Return the current Webleau layout and session metadata',
    inputSchema: {
      session: z.string().optional().describe('Session id (default from WEBLEAU_SESSION)'),
    },
  },
  async ({ session }) => {
    const id = session ?? sessionId;
    return textResult(await api(`/api/sessions/${encodeURIComponent(id)}`));
  },
);

server.registerTool(
  'session_list',
  {
    title: 'List sessions',
    description: 'List known Webleau session ids',
  },
  async () => textResult(await api('/api/sessions')),
);

server.registerTool(
  'node_add',
  {
    title: 'Add node',
    description: 'Add a card to the canvas via the session event API',
    inputSchema: {
      session: z.string().optional(),
      id: z.string().describe('Node id'),
      type: z.string().default('text').describe('Node type (text, html, …)'),
      title: z.string().optional(),
      text: z.string().optional().describe('Body for type=text'),
      html: z.string().optional().describe('Body for type=html'),
      x: z.number().optional(),
      y: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    },
  },
  async (args) => {
    const id = args.session ?? sessionId;
    const node: Record<string, unknown> = {
      id: args.id,
      type: args.type,
      title: args.title ?? '',
      pos: { x: args.x ?? 0, y: args.y ?? 0 },
      size: { width: args.width ?? 200, height: args.height ?? 200 },
    };
    if (args.text !== undefined) {
      node.text = args.text;
    }
    if (args.html !== undefined) {
      node.html = args.html;
    }
    return textResult(
      await api(`/api/sessions/${encodeURIComponent(id)}/events`, {
        method: 'POST',
        body: JSON.stringify({ action: 'node-add', node, clientId: 'mcp' }),
      }),
    );
  },
);

server.registerTool(
  'node_update',
  {
    title: 'Update node field',
    description: 'Alter a nested field on a node (same as node-alter events)',
    inputSchema: {
      session: z.string().optional(),
      node: z.string().describe('Node id'),
      field: z.array(z.string()).describe('Path segments, e.g. ["pos"] or ["text"]'),
      data: z.unknown().describe('Value to set'),
    },
  },
  async ({ session, node, field, data }) => {
    const id = session ?? sessionId;
    return textResult(
      await api(`/api/sessions/${encodeURIComponent(id)}/events`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'node-alter',
          node,
          field,
          data,
          clientId: 'mcp',
        }),
      }),
    );
  },
);

server.registerTool(
  'node_remove',
  {
    title: 'Remove node',
    description: 'Remove a card and its incident links',
    inputSchema: {
      session: z.string().optional(),
      node: z.string(),
    },
  },
  async ({ session, node }) => {
    const id = session ?? sessionId;
    return textResult(
      await api(`/api/sessions/${encodeURIComponent(id)}/events`, {
        method: 'POST',
        body: JSON.stringify({ action: 'node-remove', node, clientId: 'mcp' }),
      }),
    );
  },
);

server.registerTool(
  'link_add',
  {
    title: 'Add link',
    description: 'Link two nodes',
    inputSchema: {
      session: z.string().optional(),
      id: z.string(),
      subject: z.string().describe('Subject node id'),
      object: z.string().describe('Object node id'),
      label: z.string().optional(),
    },
  },
  async ({ session, id: linkId, subject, object, label }) => {
    const id = session ?? sessionId;
    return textResult(
      await api(`/api/sessions/${encodeURIComponent(id)}/events`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'link-add',
          link: {
            id: linkId,
            label: label ?? '',
            subject: { node: subject },
            object: { node: object },
          },
          clientId: 'mcp',
        }),
      }),
    );
  },
);

server.registerTool(
  'link_remove',
  {
    title: 'Remove link',
    description: 'Remove a link by id',
    inputSchema: {
      session: z.string().optional(),
      link: z.string(),
    },
  },
  async ({ session, link }) => {
    const id = session ?? sessionId;
    return textResult(
      await api(`/api/sessions/${encodeURIComponent(id)}/events`, {
        method: 'POST',
        body: JSON.stringify({ action: 'link-remove', link, clientId: 'mcp' }),
      }),
    );
  },
);

server.registerTool(
  'node_focus',
  {
    title: 'Focus node',
    description: 'Ask the canvas to pan/focus a node',
    inputSchema: {
      session: z.string().optional(),
      node: z.string(),
    },
  },
  async ({ session, node }) => {
    const id = session ?? sessionId;
    return textResult(
      await api(`/api/sessions/${encodeURIComponent(id)}/events`, {
        method: 'POST',
        body: JSON.stringify({ action: 'node-focus', node, clientId: 'mcp' }),
      }),
    );
  },
);

server.registerTool(
  'purge',
  {
    title: 'Purge session',
    description: 'Remove all nodes and links from the session',
    inputSchema: {
      session: z.string().optional(),
    },
  },
  async ({ session }) => {
    const id = session ?? sessionId;
    return textResult(
      await api(`/api/sessions/${encodeURIComponent(id)}/events`, {
        method: 'POST',
        body: JSON.stringify({ action: 'purge', clientId: 'mcp' }),
      }),
    );
  },
);

server.registerTool(
  'starter_load',
  {
    title: 'Load starter layout',
    description: 'Replace the session with a named starter (welcome, memex-trail, blank)',
    inputSchema: {
      session: z.string().optional(),
      starter: z.enum(['welcome', 'memex-trail', 'blank']),
    },
  },
  async ({ session, starter }) => {
    const id = session ?? sessionId;
    return textResult(
      await api(`/api/sessions/${encodeURIComponent(id)}/starter/${encodeURIComponent(starter)}`, {
        method: 'POST',
        body: '{}',
      }),
    );
  },
);

server.registerTool(
  'wikipedia_open',
  {
    title: 'Open Wikipedia page',
    description:
      'Add a Wikipedia graph-node card for a page title (uses local /api/graph/wikipedia)',
    inputSchema: {
      session: z.string().optional(),
      page: z.string().describe('Wikipedia page title, e.g. Douglas Engelbart or Memex'),
      x: z.number().optional(),
      y: z.number().optional(),
    },
  },
  async ({ session, page, x, y }) => {
    const id = session ?? sessionId;
    const nodeID = page.trim().replace(/ /g, '_');
    const endpoint = '/api/graph/wikipedia';
    const ident = await api<Record<string, unknown>>(
      `/api/graph/wikipedia`,
    );
    const node = {
      id: `graph|${endpoint}|node|${nodeID}`,
      type: 'graph-node',
      title: page,
      pos: { x: x ?? Math.round(Math.random() * 400 - 200), y: y ?? Math.round(Math.random() * 400 - 200) },
      size: { width: 280, height: 320 },
      graph: {
        nodeID,
        endpoint,
        ident,
      },
    };
    return textResult(
      await api(`/api/sessions/${encodeURIComponent(id)}/events`, {
        method: 'POST',
        body: JSON.stringify({ action: 'node-add', node, clientId: 'mcp' }),
      }),
    );
  },
);

async function main(): Promise<void> {
  try {
    await api('/api/health');
  } catch (err) {
    console.error(
      `Webleau HTTP not reachable at ${baseUrl}. Start it with: npm start\n`,
      err,
    );
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Webleau MCP connected (session=${sessionId}, api=${baseUrl})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
