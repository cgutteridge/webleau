import type { EventResult, Layout, LayoutNode, SessionEvent } from './types.js';

/**
 * Apply a session event to a layout document (pure; no I/O).
 * Mirrors the logical outcomes of LQS.change without touching the DOM.
 *
 * @param layout - Current layout (mutated in place)
 * @param event - Incoming mutation
 * @returns Whether the event was accepted
 */
export function applyEvent(layout: Layout, event: SessionEvent): EventResult {
  switch (event.action) {
    case 'purge':
      layout.nodes = [];
      layout.links = [];
      return { ok: true };

    case 'node-focus':
      if (!findNode(layout, event.node)) {
        return { ok: false, error: 'unknown node' };
      }
      return { ok: true };

    case 'node-alter': {
      const node = findNode(layout, event.node);
      if (!node) {
        return { ok: false, error: 'unknown node' };
      }
      setPath(node, event.field, event.data);
      return { ok: true };
    }

    case 'node-add': {
      if (findNode(layout, event.node.id)) {
        return { ok: false, error: 'node already exists' };
      }
      if (!event.node.id) {
        return { ok: false, error: 'node id required' };
      }
      layout.nodes.push({ ...event.node });
      return { ok: true };
    }

    case 'node-remove': {
      if (!findNode(layout, event.node)) {
        return { ok: false, error: 'unknown node' };
      }
      layout.links = layout.links.filter(
        (link) =>
          link.subject.node !== event.node && link.object.node !== event.node,
      );
      layout.nodes = layout.nodes.filter((node) => node.id !== event.node);
      return { ok: true };
    }

    case 'link-add': {
      if (!event.link.id) {
        return { ok: false, error: 'link id required' };
      }
      if (findLink(layout, event.link.id)) {
        return { ok: false, error: 'link already exists' };
      }
      if (!findNode(layout, event.link.subject.node)) {
        return { ok: false, error: 'unknown subject' };
      }
      if (!findNode(layout, event.link.object.node)) {
        return { ok: false, error: 'unknown object' };
      }
      layout.links.push({ ...event.link });
      return { ok: true };
    }

    case 'link-remove': {
      if (!findLink(layout, event.link)) {
        return { ok: false, error: 'unknown link' };
      }
      layout.links = layout.links.filter((link) => link.id !== event.link);
      return { ok: true };
    }

    default:
      return { ok: false, error: 'unknown action' };
  }
}

/**
 * @param layout - Layout to search
 * @param id - Node id
 */
function findNode(layout: Layout, id: string): LayoutNode | undefined {
  return layout.nodes.find((node) => node.id === id);
}

/**
 * @param layout - Layout to search
 * @param id - Link id
 */
function findLink(layout: Layout, id: string) {
  return layout.links.find((link) => link.id === id);
}

/**
 * Set a nested field on an object, creating intermediate objects as needed.
 *
 * @param target - Object to mutate
 * @param field - Path segments
 * @param data - Value to assign
 */
function setPath(target: Record<string, unknown>, field: string[], data: unknown): void {
  if (!field.length) {
    return;
  }
  let cursor: Record<string, unknown> = target;
  for (let i = 0; i < field.length - 1; i++) {
    const key = field[i];
    const next = cursor[key];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[field[field.length - 1]] = data;
}
