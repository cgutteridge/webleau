import { describe, expect, it } from 'vitest';
import { searchLayout } from '../search.js';
import type { Layout } from '../types.js';

describe('searchLayout', () => {
  const layout: Layout = {
    nodes: [
      { id: 'a', type: 'text', title: 'Memex', text: 'trails do not fade' },
      { id: 'b', type: 'html', title: 'Other', html: '<p>unrelated</p>' },
    ],
    links: [],
  };

  it('finds by title and body', () => {
    expect(searchLayout(layout, 'memex').map((h) => h.nodeId)).toEqual(['a']);
    expect(searchLayout(layout, 'trails')[0]?.snippet).toMatch(/trails/i);
  });

  it('returns empty for blank query', () => {
    expect(searchLayout(layout, '  ')).toEqual([]);
  });
});
