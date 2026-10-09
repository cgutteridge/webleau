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

/** Soft cap: refuse follow-open unless the caller passes an explicit limit. */
const GRAPH_FOLLOW_ASK_ABOVE = 30;
/** Hard cap even when limit is explicit. */
const GRAPH_FOLLOW_HARD_MAX = 120;

type LayoutNode = {
  id: string;
  type?: string;
  title?: string;
  pos?: { x: number; y: number };
  size?: { width: number; height: number };
  graph?: {
    endpoint?: string;
    nodeID?: string;
    ident?: Record<string, unknown>;
    node?: { title?: string; data?: unknown };
  };
  [key: string]: unknown;
};

/**
 * Resolve an LGA endpoint URL for fetch (relative paths hit the Webleau HTTP server).
 *
 * @param endpoint - Absolute URL or path beginning with /
 */
function resolveEndpointUrl(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${path}`;
}

/**
 * GET a Liquid Graph API endpoint with query params.
 *
 * @param endpoint - LGA endpoint (path or absolute URL)
 * @param params - Query bag (action, ids, follow, data, …)
 */
async function lgaGet(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<unknown> {
  const url = new URL(resolveEndpointUrl(endpoint));
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    url.searchParams.set(key, String(value));
  }
  const response = await fetch(url);
  const body = (await response.json()) as unknown;
  if (!response.ok) {
    const error =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error?: string }).error)
        : response.statusText;
    throw new Error(`${response.status} LGA ${endpoint}: ${error}`);
  }
  return body;
}

/**
 * Load one layout node by id from a session.
 *
 * @param session - Session id
 * @param nodeId - Canvas node id
 */
async function loadLayoutNode(session: string, nodeId: string): Promise<LayoutNode> {
  const doc = await api<{ layout: { nodes: LayoutNode[] } }>(
    `/api/sessions/${encodeURIComponent(session)}`,
  );
  const node = doc.layout.nodes.find((n) => n.id === nodeId);
  if (!node) {
    throw new Error(`Node not on canvas: ${nodeId}`);
  }
  return node;
}

/**
 * Graph card context for LGA calls (connection or node).
 */
type GraphContext = {
  endpoint: string;
  nodeID?: string;
  ident?: Record<string, unknown>;
  card?: LayoutNode;
};

/**
 * Resolve LGA context from a canvas graph card and/or an explicit endpoint.
 *
 * @param session - Session id
 * @param opts - node id and/or endpoint
 */
async function resolveGraphContext(
  session: string,
  opts: { node?: string; endpoint?: string },
): Promise<GraphContext> {
  if (opts.node) {
    const card = await loadLayoutNode(session, opts.node);
    const endpoint = opts.endpoint ?? card.graph?.endpoint;
    if (!endpoint) {
      throw new Error(
        `Node ${opts.node} has no graph.endpoint (type=${card.type ?? '?'}). Pass endpoint explicitly.`,
      );
    }
    return {
      endpoint,
      nodeID: card.graph?.nodeID,
      ident: card.graph?.ident,
      card,
    };
  }
  if (!opts.endpoint) {
    throw new Error('Pass node (canvas graph card id) and/or endpoint');
  }
  return { endpoint: opts.endpoint };
}

/**
 * Build a graph-node payload the browser can load (main first — no view:icon).
 *
 * @param endpoint - LGA endpoint on the card
 * @param nodeID - Remote graph object id
 * @param ident - LGA ident document
 * @param pos - Canvas position
 * @param title - Optional display title
 */
function makeGraphNode(
  endpoint: string,
  nodeID: string,
  ident: Record<string, unknown>,
  pos: { x: number; y: number },
  title?: string,
) {
  const id = nodeID.trim();
  return {
    id: `graph|${endpoint}|node|${id}`,
    type: 'graph-node' as const,
    title: title ?? id.replace(/_/g, ' '),
    pos,
    size: { width: 280, height: 320 },
    graph: {
      nodeID: id,
      endpoint,
      ident,
    },
  };
}

/**
 * Summarise a layout node for agents (graph cards expose their API handle).
 *
 * @param node - Layout node
 */
function describeNode(node: LayoutNode) {
  const base: Record<string, unknown> = {
    id: node.id,
    type: node.type,
    title: node.title,
    pos: node.pos,
    size: node.size,
  };
  if (node.graph?.endpoint) {
    base.api = {
      endpoint: node.graph.endpoint,
      nodeID: node.graph.nodeID ?? null,
      hasIdent: Boolean(node.graph.ident),
      hasCachedData: Boolean(node.graph.node?.data),
      hint:
        'Treat this card as an LGA object: graph_api to query, graph_open to place related ids, graph_follow to open outbound links.',
    };
  }
  return base;
}

server.registerTool(
  'node_get',
  {
    title: 'Get node',
    description:
      'Return one canvas card by id. Graph cards include an `api` handle (endpoint + remote id) so you can treat them as LGA objects.',
    inputSchema: {
      session: z.string().optional(),
      node: z.string().describe('Canvas node id'),
    },
  },
  async ({ session, node }) => {
    const id = session ?? sessionId;
    const card = await loadLayoutNode(id, node);
    return textResult(describeNode(card));
  },
);

server.registerTool(
  'graph_api',
  {
    title: 'Call graph API on a node',
    description:
      'Talk to a Liquid Graph API (LGA) endpoint. Pass a canvas graph-node / graph-connection `node` id (uses its endpoint and, for graph-nodes, its remote id), and/or an explicit `endpoint`. Returns raw LGA JSON (ident, nodes, follow links).',
    inputSchema: {
      session: z.string().optional(),
      node: z
        .string()
        .optional()
        .describe('Canvas graph-node or graph-connection id'),
      endpoint: z
        .string()
        .optional()
        .describe('LGA endpoint override, e.g. /api/graph/wikipedia'),
      action: z
        .enum(['ident', 'nodes'])
        .optional()
        .describe('Default: ident when no ids, else nodes'),
      ids: z
        .string()
        .optional()
        .describe('Comma-separated remote ids; defaults to the graph-node’s nodeID'),
      follow: z
        .string()
        .optional()
        .describe('Follow filter, e.g. * for all outbound link types'),
      data: z
        .boolean()
        .optional()
        .describe('Include node data payloads (html/icon) when supported'),
      followLimit: z
        .number()
        .optional()
        .describe('Max follow links to return when the endpoint supports it'),
    },
  },
  async ({ session, node, endpoint, action, ids, follow, data, followLimit }) => {
    const id = session ?? sessionId;
    const ctx = await resolveGraphContext(id, { node, endpoint });
    const resolvedIds = ids?.trim() || ctx.nodeID;
    const resolvedAction =
      action ?? (resolvedIds || follow !== undefined ? 'nodes' : 'ident');

    if (resolvedAction === 'ident') {
      const ident = await lgaGet(ctx.endpoint, { action: 'ident' });
      return textResult({
        ok: true,
        endpoint: ctx.endpoint,
        fromNode: ctx.card?.id,
        action: 'ident',
        result: ident,
      });
    }

    if (!resolvedIds) {
      throw new Error(
        'graph_api action=nodes needs ids (or a graph-node with graph.nodeID)',
      );
    }

    const result = await lgaGet(ctx.endpoint, {
      action: 'nodes',
      ids: resolvedIds,
      follow,
      data: data === true ? 1 : data === false ? 0 : undefined,
      followLimit,
    });
    return textResult({
      ok: true,
      endpoint: ctx.endpoint,
      fromNode: ctx.card?.id,
      action: 'nodes',
      ids: resolvedIds,
      result,
    });
  },
);

server.registerTool(
  'graph_open',
  {
    title: 'Open graph node',
    description:
      'Place a real graph-node card from an LGA endpoint + remote id (same shape the browser grows from a seed). Do not invent stubs. Optionally link from an existing canvas node.',
    inputSchema: {
      session: z.string().optional(),
      endpoint: z
        .string()
        .optional()
        .describe('LGA endpoint; defaults to from-node’s endpoint if `from` is a graph card'),
      id: z.string().describe('Remote graph object id (e.g. Wikipedia title Southampton)'),
      from: z
        .string()
        .optional()
        .describe('Optional canvas node id to take endpoint from and/or link from'),
      label: z.string().optional().describe('Link label when `from` is set (default: links to)'),
      x: z.number().optional(),
      y: z.number().optional(),
    },
  },
  async ({ session, endpoint, id: remoteId, from, label, x, y }) => {
    const sid = session ?? sessionId;
    const ctx = await resolveGraphContext(sid, { node: from, endpoint });
    const ident =
      ctx.ident ??
      ((await lgaGet(ctx.endpoint, { action: 'ident' })) as Record<string, unknown>);
    const nodeID = remoteId.trim().replace(/ /g, '_');
    const pos = {
      x: x ?? Math.round(Math.random() * 400 - 200),
      y: y ?? Math.round(Math.random() * 400 - 200),
    };
    const node = makeGraphNode(ctx.endpoint, nodeID, ident, pos);

    const addResult = await api(`/api/sessions/${encodeURIComponent(sid)}/events`, {
      method: 'POST',
      body: JSON.stringify({ action: 'node-add', node, clientId: 'mcp' }),
    });

    let linkResult: unknown = null;
    if (from) {
      linkResult = await api(`/api/sessions/${encodeURIComponent(sid)}/events`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'link-add',
          link: {
            id: `graph|link|${from}|${node.id}`,
            label: label ?? 'links to',
            subject: { node: from },
            object: { node: node.id },
          },
          clientId: 'mcp',
        }),
      });
    }

    return textResult({
      ok: true,
      node: describeNode(node as LayoutNode),
      add: addResult,
      link: linkResult,
    });
  },
);

server.registerTool(
  'graph_follow',
  {
    title: 'Follow graph links onto the canvas',
    description:
      'From a canvas graph-node, query its LGA follow links and open targets as real graph-nodes (main first, then optional collapse). If more than 30 links and no explicit limit, refuses — ask the user how many (hard max 120).',
    inputSchema: {
      session: z.string().optional(),
      node: z.string().describe('Canvas graph-node id to expand from'),
      limit: z
        .number()
        .optional()
        .describe(
          `Required when there are more than ${GRAPH_FOLLOW_ASK_ABOVE} outbound links. Max ${GRAPH_FOLLOW_HARD_MAX}.`,
        ),
      radius: z.number().optional().describe('Ring radius in layout units (default 620)'),
      collapse: z
        .enum(['icon', 'squish', 'main'])
        .optional()
        .describe('After opening, set view on satellites (default squish). Use main to leave expanded.'),
      follow: z
        .string()
        .optional()
        .describe('Follow filter passed to LGA (default *)'),
    },
  },
  async ({ session, node: parentNodeId, limit, radius, collapse, follow }) => {
    const sid = session ?? sessionId;
    const ring = radius ?? 620;
    const collapseTo = collapse ?? 'squish';
    const limitExplicit = limit !== undefined && limit !== null;
    const followFilter = follow ?? '*';

    const parent = await loadLayoutNode(sid, parentNodeId);
    if (parent.type !== 'graph-node' || !parent.graph?.endpoint || !parent.graph.nodeID) {
      throw new Error(
        `graph_follow needs a graph-node with endpoint + nodeID (got type=${parent.type ?? '?'})`,
      );
    }
    const endpoint = parent.graph.endpoint;
    const parentRemoteId = parent.graph.nodeID;
    const cx = parent.pos?.x ?? 0;
    const cy = parent.pos?.y ?? 0;

    const ident =
      parent.graph.ident ??
      ((await lgaGet(endpoint, { action: 'ident' })) as Record<string, unknown>);

    const followDoc = (await lgaGet(endpoint, {
      action: 'nodes',
      ids: parentRemoteId,
      follow: followFilter,
      followLimit: 500,
    })) as {
      links?: Array<{ subject: string; object: string; type?: string }>;
      nodes?: Record<string, { title?: string }>;
    };

    const allTargets: string[] = [];
    const seen = new Set<string>();
    for (const link of followDoc.links ?? []) {
      if (link.subject !== parentRemoteId) {
        continue;
      }
      if (seen.has(link.object)) {
        continue;
      }
      seen.add(link.object);
      allTargets.push(link.object);
    }
    const totalAvailable = allTargets.length;

    if (!limitExplicit && totalAvailable > GRAPH_FOLLOW_ASK_ABOVE) {
      return textResult({
        ok: false,
        error: 'too_many_links',
        node: parentNodeId,
        endpoint,
        remoteId: parentRemoteId,
        totalAvailable,
        askAbove: GRAPH_FOLLOW_ASK_ABOVE,
        hardMax: GRAPH_FOLLOW_HARD_MAX,
        sample: allTargets.slice(0, 12),
        message:
          `Node “${parent.title ?? parentRemoteId}” has ${totalAvailable} outbound API links. ` +
          `Too many to dump without asking. Tell the user the count and ask how many to open ` +
          `(max ${GRAPH_FOLLOW_HARD_MAX}), then call graph_follow again with an explicit limit.`,
      });
    }

    const requested = limitExplicit ? Number(limit) : Math.min(24, totalAvailable);
    if (!Number.isFinite(requested) || requested < 1) {
      throw new Error('limit must be a positive number');
    }
    if (requested > GRAPH_FOLLOW_HARD_MAX) {
      return textResult({
        ok: false,
        error: 'limit_too_high',
        node: parentNodeId,
        totalAvailable,
        hardMax: GRAPH_FOLLOW_HARD_MAX,
        message: `Refusing limit=${requested}. Hard max is ${GRAPH_FOLLOW_HARD_MAX} cards per follow.`,
      });
    }

    const max = Math.min(requested, totalAvailable, GRAPH_FOLLOW_HARD_MAX);
    const targets = allTargets.slice(0, max);
    const opened: string[] = [];
    const skipped: string[] = [];

    for (let i = 0; i < targets.length; i++) {
      const objectId = targets[i];
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(targets.length, 1);
      const pos = {
        x: Math.round(cx + ring * Math.cos(angle)),
        y: Math.round(cy + ring * Math.sin(angle)),
      };
      const title = followDoc.nodes?.[objectId]?.title ?? objectId.replace(/_/g, ' ');
      const child = makeGraphNode(endpoint, objectId, ident, pos, title);

      const addResult = await api<{ ok: boolean; error?: string }>(
        `/api/sessions/${encodeURIComponent(sid)}/events`,
        {
          method: 'POST',
          body: JSON.stringify({ action: 'node-add', node: child, clientId: 'mcp' }),
        },
      );
      if (!addResult.ok) {
        skipped.push(`${objectId}: ${addResult.error ?? 'add failed'}`);
        await api(`/api/sessions/${encodeURIComponent(sid)}/events`, {
          method: 'POST',
          body: JSON.stringify({
            action: 'node-alter',
            node: child.id,
            field: ['pos'],
            data: pos,
            clientId: 'mcp',
          }),
        });
      } else {
        opened.push(objectId);
      }

      await api(`/api/sessions/${encodeURIComponent(sid)}/events`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'link-add',
          link: {
            id: `graph|link|${parentNodeId}|${child.id}`,
            label: 'links to',
            subject: { node: parentNodeId },
            object: { node: child.id },
          },
          clientId: 'mcp',
        }),
      });

      if (collapseTo !== 'main') {
        await api(`/api/sessions/${encodeURIComponent(sid)}/events`, {
          method: 'POST',
          body: JSON.stringify({
            action: 'node-alter',
            node: child.id,
            field: ['view'],
            data: collapseTo,
            clientId: 'mcp',
          }),
        });
      }
    }

    return textResult({
      ok: true,
      node: parentNodeId,
      endpoint,
      remoteId: parentRemoteId,
      totalAvailable,
      opened: opened.length,
      truncated: totalAvailable > opened.length,
      remaining: Math.max(0, totalAvailable - opened.length),
      skipped,
      collapse: collapseTo,
      note: 'Real graph-nodes (main first, then collapse). Ask before opening huge follow sets.',
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
