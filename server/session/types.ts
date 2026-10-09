/**
 * Shared layout and event types for the Webleau session core.
 * Browser, HTTP API, and MCP all speak this shape.
 */

/** A card on the canvas. Type-specific fields hang off the same object. */
export interface LayoutNode {
  id: string;
  type?: string;
  title?: string;
  pos?: { x: number; y: number };
  size?: { width: number; height: number };
  [key: string]: unknown;
}

/** An edge between two nodes. */
export interface LayoutLink {
  id: string;
  label?: string;
  subject: { node: string };
  object: { node: string };
  [key: string]: unknown;
}

/** Serializable canvas document (getLayout / setLayout). */
export interface Layout {
  nodes: LayoutNode[];
  links: LayoutLink[];
  inspectorProxy?: string;
  linkStyle?: string;
  [key: string]: unknown;
}

/** Mutation actions mirroring LQS.change in the browser. */
export type SessionEvent =
  | { action: 'purge'; clientId?: string }
  | { action: 'node-add'; node: LayoutNode; clientId?: string }
  | { action: 'node-remove'; node: string; clientId?: string }
  | { action: 'node-alter'; node: string; field: string[]; data: unknown; clientId?: string }
  | { action: 'node-focus'; node: string; clientId?: string }
  | { action: 'link-add'; link: LayoutLink; clientId?: string }
  | { action: 'link-remove'; link: string; clientId?: string };

export interface EventResult {
  ok: boolean;
  error?: string;
}

export interface LoggedEvent {
  seq: number;
  at: string;
  event: SessionEvent;
  result: EventResult;
}

export interface SessionSnapshot {
  id: string;
  layout: Layout;
  events: LoggedEvent[];
  updatedAt: string;
}
