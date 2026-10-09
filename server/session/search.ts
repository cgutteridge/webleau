import type { Layout, LayoutNode } from './types.js';

export interface SearchHit {
  nodeId: string;
  title: string;
  type?: string;
  snippet: string;
}

/**
 * Case-insensitive search across node titles and text-ish fields.
 *
 * @param layout - Session layout
 * @param query - Search string
 * @param limit - Max hits
 */
export function searchLayout(layout: Layout, query: string, limit = 50): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [];
  }
  const hits: SearchHit[] = [];
  for (const node of layout.nodes) {
    const haystack = nodeSearchText(node).toLowerCase();
    const idx = haystack.indexOf(q);
    if (idx === -1) {
      continue;
    }
    hits.push({
      nodeId: node.id,
      title: (typeof node.title === 'string' && node.title) || node.id,
      type: typeof node.type === 'string' ? node.type : undefined,
      snippet: snippetAround(haystack, idx, q.length),
    });
    if (hits.length >= limit) {
      break;
    }
  }
  return hits;
}

/**
 * @param node - Layout node
 */
function nodeSearchText(node: LayoutNode): string {
  const parts = [
    node.id,
    typeof node.title === 'string' ? node.title : '',
    typeof node.text === 'string' ? node.text : '',
    typeof node.html === 'string' ? node.html.replace(/<[^>]+>/g, ' ') : '',
  ];
  const graph = node.graph as { nodeID?: string } | undefined;
  if (graph?.nodeID) {
    parts.push(graph.nodeID);
  }
  const source = node.source as { url?: string; title?: string } | undefined;
  if (source?.url) {
    parts.push(source.url);
  }
  if (source?.title) {
    parts.push(source.title);
  }
  return parts.join(' ');
}

/**
 * @param text - Lowercased haystack
 * @param index - Match index
 * @param len - Query length
 */
function snippetAround(text: string, index: number, len: number): string {
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + len + 40);
  let snip = text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) {
    snip = '…' + snip;
  }
  if (end < text.length) {
    snip = snip + '…';
  }
  return snip;
}
