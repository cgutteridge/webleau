import type { Layout, LayoutNode } from './types.js';

/**
 * Render a session layout as a research-notes Markdown document.
 *
 * @param layout - Canvas layout
 * @param sessionId - Session id for the heading
 */
export function layoutToMarkdown(layout: Layout, sessionId: string): string {
  const lines: string[] = [];
  lines.push(`# Webleau session \`${sessionId}\``);
  lines.push('');
  lines.push(`Nodes: ${layout.nodes.length} · Links: ${layout.links.length}`);
  lines.push('');

  const byId = new Map(layout.nodes.map((node) => [node.id, node]));

  for (const node of layout.nodes) {
    lines.push(`## ${nodeTitle(node)}`);
    lines.push('');
    lines.push(`- id: \`${node.id}\``);
    lines.push(`- type: \`${node.type ?? 'unknown'}\``);
    if (node.pos) {
      lines.push(`- pos: ${node.pos.x}, ${node.pos.y}`);
    }
    const body = nodeBody(node);
    if (body) {
      lines.push('');
      lines.push(body);
    }
    const outs = layout.links.filter((link) => link.subject.node === node.id);
    if (outs.length) {
      lines.push('');
      lines.push('### Links');
      for (const link of outs) {
        const target = byId.get(link.object.node);
        const label = link.label ? ` (${link.label})` : '';
        lines.push(`- → ${nodeTitle(target) || link.object.node}${label}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n').trim() + '\n';
}

/**
 * @param node - Layout node or undefined
 */
function nodeTitle(node: LayoutNode | undefined): string {
  if (!node) {
    return '(missing)';
  }
  if (typeof node.title === 'string' && node.title.trim()) {
    return node.title.trim();
  }
  return node.id;
}

/**
 * @param node - Layout node
 */
function nodeBody(node: LayoutNode): string {
  if (typeof node.text === 'string' && node.text.trim()) {
    return node.text.trim();
  }
  if (typeof node.html === 'string' && node.html.trim()) {
    return stripTags(node.html).trim();
  }
  const graph = node.graph as { nodeID?: string; endpoint?: string } | undefined;
  if (graph?.nodeID) {
    return `Graph node \`${graph.nodeID}\` via \`${graph.endpoint ?? ''}\``;
  }
  const source = node.source as { url?: string } | undefined;
  if (source?.url) {
    return source.url;
  }
  return '';
}

/**
 * @param html - HTML fragment
 */
function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}
