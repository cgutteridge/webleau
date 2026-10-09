import { describe, expect, it } from 'vitest';
import { applyEvent } from '../applyEvent.js';
import type { Layout } from '../types.js';

/**
 * @returns Empty layout for tests
 */
function emptyLayout(): Layout {
  return { nodes: [], links: [] };
}

describe('applyEvent', () => {
  it('adds and removes nodes', () => {
    const layout = emptyLayout();
    expect(applyEvent(layout, { action: 'node-add', node: { id: 'a', type: 'text' } })).toEqual({
      ok: true,
    });
    expect(layout.nodes).toHaveLength(1);
    expect(applyEvent(layout, { action: 'node-add', node: { id: 'a', type: 'text' } }).ok).toBe(
      false,
    );
    expect(applyEvent(layout, { action: 'node-remove', node: 'a' })).toEqual({ ok: true });
    expect(layout.nodes).toHaveLength(0);
  });

  it('alters nested fields', () => {
    const layout: Layout = {
      nodes: [{ id: 'a', type: 'text', pos: { x: 0, y: 0 } }],
      links: [],
    };
    expect(
      applyEvent(layout, {
        action: 'node-alter',
        node: 'a',
        field: ['pos'],
        data: { x: 10, y: 20 },
      }),
    ).toEqual({ ok: true });
    expect(layout.nodes[0].pos).toEqual({ x: 10, y: 20 });
    expect(
      applyEvent(layout, {
        action: 'node-alter',
        node: 'a',
        field: ['text'],
        data: 'hello',
      }),
    ).toEqual({ ok: true });
    expect(layout.nodes[0].text).toBe('hello');
  });

  it('adds links only when both ends exist', () => {
    const layout: Layout = {
      nodes: [
        { id: 'a', type: 'text' },
        { id: 'b', type: 'text' },
      ],
      links: [],
    };
    expect(
      applyEvent(layout, {
        action: 'link-add',
        link: { id: 'l1', subject: { node: 'a' }, object: { node: 'missing' } },
      }).error,
    ).toBe('unknown object');
    expect(
      applyEvent(layout, {
        action: 'link-add',
        link: { id: 'l1', subject: { node: 'a' }, object: { node: 'b' }, label: 'rel' },
      }),
    ).toEqual({ ok: true });
    expect(layout.links).toHaveLength(1);
  });

  it('purge clears everything', () => {
    const layout: Layout = {
      nodes: [{ id: 'a', type: 'text' }],
      links: [{ id: 'l1', subject: { node: 'a' }, object: { node: 'a' } }],
    };
    expect(applyEvent(layout, { action: 'purge' })).toEqual({ ok: true });
    expect(layout.nodes).toEqual([]);
    expect(layout.links).toEqual([]);
  });

  it('removes incident links when removing a node', () => {
    const layout: Layout = {
      nodes: [
        { id: 'a', type: 'text' },
        { id: 'b', type: 'text' },
      ],
      links: [{ id: 'l1', subject: { node: 'a' }, object: { node: 'b' } }],
    };
    applyEvent(layout, { action: 'node-remove', node: 'a' });
    expect(layout.nodes.map((n) => n.id)).toEqual(['b']);
    expect(layout.links).toEqual([]);
  });
});
