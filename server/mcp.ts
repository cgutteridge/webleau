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
  'session_export_markdown',
  {
    title: 'Export session Markdown',
    description: 'Return the session as Markdown research notes',
    inputSchema: {
      session: z.string().optional(),
    },
  },
  async ({ session }) => {
    const id = session ?? sessionId;
    const response = await fetch(
      `${baseUrl}/api/sessions/${encodeURIComponent(id)}/export.md`,
    );
    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || response.statusText);
    }
    return {
      content: [{ type: 'text' as const, text }],
    };
  },
);

server.registerTool(
  'session_search',
  {
    title: 'Search session',
    description: 'Search node titles and text in the current session',
    inputSchema: {
      session: z.string().optional(),
      q: z.string().describe('Search query'),
    },
  },
  async ({ session, q }) => {
    const id = session ?? sessionId;
    return textResult(
      await api(
        `/api/sessions/${encodeURIComponent(id)}/search?q=${encodeURIComponent(q)}`,
      ),
    );
  },
);

const WIKI_ENDPOINT = '/api/graph/wikipedia';

/**
 * Build a graph-node payload the browser can load like a grown wiki seed.
 * Do not set view:icon here — the card must enter main first so update() fetches HTML.
 *
 * @param page - Wikipedia title (spaces or underscores)
 * @param pos - Canvas position
 * @param ident - LGA ident document
 */
function wikipediaGraphNode(
  page: string,
  pos: { x: number; y: number },
  ident: Record<string, unknown>,
) {
  const nodeID = page.trim().replace(/ /g, '_');
  return {
    id: `graph|${WIKI_ENDPOINT}|node|${nodeID}`,
    type: 'graph-node' as const,
    title: page.trim().replace(/_/g, ' '),
    pos,
    size: { width: 280, height: 320 },
    graph: {
      nodeID,
      endpoint: WIKI_ENDPOINT,
      ident,
    },
  };
}

server.registerTool(
  'wikipedia_open',
  {
    title: 'Open Wikipedia page',
    description:
      'Open a real Wikipedia graph-node (same as growing a wiki seed). Uses /api/graph/wikipedia. Do not invent stub cards.',
    inputSchema: {
      session: z.string().optional(),
      page: z.string().describe('Wikipedia page title, e.g. Douglas Engelbart or Memex'),
      x: z.number().optional(),
      y: z.number().optional(),
    },
  },
  async ({ session, page, x, y }) => {
    const id = session ?? sessionId;
    const ident = await api<Record<string, unknown>>(WIKI_ENDPOINT);
    const node = wikipediaGraphNode(
      page,
      {
        x: x ?? Math.round(Math.random() * 400 - 200),
        y: y ?? Math.round(Math.random() * 400 - 200),
      },
      ident,
    );
    return textResult(
      await api(`/api/sessions/${encodeURIComponent(id)}/events`, {
        method: 'POST',
        body: JSON.stringify({ action: 'node-add', node, clientId: 'mcp' }),
      }),
    );
  },
);

server.registerTool(
  'wikipedia_expand',
  {
    title: 'Expand Wikipedia links radially',
    description:
      'Open outbound Wikipedia links from a page as real graph-nodes (content-loading), optionally arranged in a ring and then collapsed. Never create title-only stubs; always node-add graph-node like wikipedia_open, then collapse with a separate view alter.',
    inputSchema: {
      session: z.string().optional(),
      page: z
        .string()
        .describe('Parent Wikipedia page title already on the canvas (e.g. Southampton)'),
      limit: z.number().optional().describe('Max links to open (default 24)'),
      radius: z.number().optional().describe('Ring radius in layout units (default 620)'),
      collapse: z
        .enum(['icon', 'squish', 'main'])
        .optional()
        .describe('After opening, set view on satellites (default squish). Use main to leave expanded.'),
    },
  },
  async ({ session, page, limit, radius, collapse }) => {
    const id = session ?? sessionId;
    const parentPage = page.trim().replace(/ /g, '_');
    const parentNodeId = `graph|${WIKI_ENDPOINT}|node|${parentPage}`;
    const max = limit ?? 24;
    const ring = radius ?? 620;
    const collapseTo = collapse ?? 'squish';

    const sessionDoc = await api<{
      layout: { nodes: Array<{ id: string; pos?: { x: number; y: number } }> };
    }>(`/api/sessions/${encodeURIComponent(id)}`);
    const parent = sessionDoc.layout.nodes.find((n) => n.id === parentNodeId);
    if (!parent) {
      throw new Error(
        `Parent page node not on canvas: ${parentNodeId}. Call wikipedia_open first.`,
      );
    }
    const cx = parent.pos?.x ?? 0;
    const cy = parent.pos?.y ?? 0;

    const ident = await api<Record<string, unknown>>(WIKI_ENDPOINT);
    const follow = await api<{
      links?: Array<{ subject: string; object: string; type?: string }>;
      nodes?: Record<string, { title?: string }>;
    }>(
      `${WIKI_ENDPOINT}?action=nodes&ids=${encodeURIComponent(parentPage)}&follow=*`,
    );

    const targets: string[] = [];
    const seen = new Set<string>();
    for (const link of follow.links ?? []) {
      if (link.subject !== parentPage) {
        continue;
      }
      if (seen.has(link.object)) {
        continue;
      }
      seen.add(link.object);
      targets.push(link.object);
      if (targets.length >= max) {
        break;
      }
    }

    const opened: string[] = [];
    const skipped: string[] = [];
    for (let i = 0; i < targets.length; i++) {
      const objectId = targets[i];
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(targets.length, 1);
      const pos = {
        x: Math.round(cx + ring * Math.cos(angle)),
        y: Math.round(cy + ring * Math.sin(angle)),
      };
      const title = follow.nodes?.[objectId]?.title ?? objectId.replace(/_/g, ' ');
      const node = wikipediaGraphNode(title, pos, ident);
      // Force nodeID to API id (titles can differ from ids)
      node.graph.nodeID = objectId;
      node.id = `graph|${WIKI_ENDPOINT}|node|${objectId}`;
      node.title = title;

      const addResult = await api<{ ok: boolean; error?: string }>(
        `/api/sessions/${encodeURIComponent(id)}/events`,
        {
          method: 'POST',
          body: JSON.stringify({ action: 'node-add', node, clientId: 'mcp' }),
        },
      );
      if (!addResult.ok) {
        skipped.push(`${objectId}: ${addResult.error ?? 'add failed'}`);
        await api(`/api/sessions/${encodeURIComponent(id)}/events`, {
          method: 'POST',
          body: JSON.stringify({
            action: 'node-alter',
            node: node.id,
            field: ['pos'],
            data: pos,
            clientId: 'mcp',
          }),
        });
      } else {
        opened.push(objectId);
      }

      await api(`/api/sessions/${encodeURIComponent(id)}/events`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'link-add',
          link: {
            id: `graph|link|${parentNodeId}|${node.id}`,
            label: 'links to',
            subject: { node: parentNodeId },
            object: { node: node.id },
          },
          clientId: 'mcp',
        }),
      });

      if (collapseTo !== 'main') {
        await api(`/api/sessions/${encodeURIComponent(id)}/events`, {
          method: 'POST',
          body: JSON.stringify({
            action: 'node-alter',
            node: node.id,
            field: ['view'],
            data: collapseTo,
            clientId: 'mcp',
          }),
        });
      }
    }

    return textResult({
      ok: true,
      parent: parentPage,
      opened: opened.length,
      skipped,
      collapse: collapseTo,
      note: 'Cards are real graph-nodes; browser loads wiki HTML on main enter before collapse.',
    });
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
