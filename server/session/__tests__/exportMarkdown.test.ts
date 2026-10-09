import { describe, expect, it } from 'vitest';
import { layoutToMarkdown } from '../exportMarkdown.js';
import type { Layout } from '../types.js';

describe('layoutToMarkdown', () => {
  it('includes titles, bodies, and outbound links', () => {
    const layout: Layout = {
      nodes: [
        { id: 'a', type: 'text', title: 'Alpha', text: 'Hello' },
        { id: 'b', type: 'html', title: 'Beta', html: '<p>World</p>' },
      ],
      links: [{ id: 'l1', label: 'see', subject: { node: 'a' }, object: { node: 'b' } }],
    };
    const md = layoutToMarkdown(layout, 'demo');
    expect(md).toContain('# Webleau session `demo`');
    expect(md).toContain('## Alpha');
    expect(md).toContain('Hello');
    expect(md).toContain('→ Beta (see)');
    expect(md).toContain('World');
  });
});
