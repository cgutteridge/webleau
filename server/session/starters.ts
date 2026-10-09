import type { Layout } from './types.js';
import { DEFAULT_LAYOUT } from './defaultLayout.js';

/**
 * Named starter layouts for demos and fresh research desks.
 */
export const STARTERS: Record<string, { title: string; description: string; layout: Layout }> = {
  welcome: {
    title: 'Welcome',
    description: 'Default intro cards',
    layout: DEFAULT_LAYOUT,
  },
  'memex-trail': {
    title: 'Memex trail',
    description: 'A short trail from Bush to Engelbart to the web',
    layout: {
      inspectorProxy: 'https://chris.totl.net/lqs-inspector-v1/',
      nodes: [
        {
          id: 'note-trail',
          type: 'text',
          title: 'His trails do not fade',
          text: 'Drag the Wikipedia seed from the control panel, or ask MCP wikipedia_open for Memex / Vannevar_Bush / Douglas_Engelbart.',
          pos: { x: -280, y: -40 },
          size: { width: 260, height: 180 },
        },
        {
          id: 'graph|/api/graph/wikipedia|connection',
          type: 'graph-connection',
          title: 'Wikipedia (local)',
          pos: { x: 80, y: -40 },
          size: { width: 280, height: 220 },
          graph: { endpoint: '/api/graph/wikipedia' },
        },
      ],
      links: [
        {
          id: 'trail-to-wiki',
          label: 'explore',
          subject: { node: 'note-trail' },
          object: { node: 'graph|/api/graph/wikipedia|connection' },
        },
      ],
    },
  },
  blank: {
    title: 'Blank desk',
    description: 'Empty canvas',
    layout: {
      inspectorProxy: 'https://chris.totl.net/lqs-inspector-v1/',
      nodes: [],
      links: [],
    },
  },
};

/**
 * @returns Starter catalogue without full layouts (for listing)
 */
export function listStarters(): Array<{ id: string; title: string; description: string }> {
  return Object.entries(STARTERS).map(([id, value]) => ({
    id,
    title: value.title,
    description: value.description,
  }));
}
