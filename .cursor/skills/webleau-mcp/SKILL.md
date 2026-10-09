---
name: webleau-mcp
description: >-
  Drive the Webleau/Liquid Space canvas via MCP. Use when opening Wikipedia
  pages, expanding wiki links, laying out cards, or mutating the live session.
---

# Webleau MCP

Requires `npm start` (HTTP on `WEBLEAU_URL`, default `http://127.0.0.1:8787`).
MCP is a thin client of that API; the open browser follows over WebSocket.

## Wikipedia — do this, not stubs

Wikipedia cards are **`graph-node`** objects with `graph.endpoint = /api/graph/wikipedia` and `graph.ident` from the LGA ident call. The browser loads HTML only when the card enters **`main`** and runs `update()`.

### Open one page

Use tool **`wikipedia_open`** with a page title (e.g. `Southampton`).

Do **not** hand-build empty cards that only have a title.

### Expand links from a page (radial / collapsed)

Use tool **`wikipedia_expand`** with the parent page title already on the canvas.

Correct sequence (what the tool does):

1. `GET /api/graph/wikipedia?action=nodes&ids=Page&follow=*`
2. For each outbound link: **`node-add`** a full `graph-node` (same shape as `wikipedia_open`) at a ring position — **without** `view: icon`
3. **`link-add`** parent → child (`links to`)
4. **Then** optional **`node-alter`** `field: ["view"]` → `squish` or `icon` to collapse

### Wrong (failed once — do not repeat)

- Creating satellites already in `view: "icon"` so `update()` never runs → no wiki HTML (`graph.node.data` missing)
- Title-only or inventing node payloads that are not `type: "graph-node"` with endpoint + ident
- Expecting follow JSON alone to paint cards without `node-add` through the session API

### Collapse after open

- `squish` — collapsed title chip (good default for many wiki links)
- `icon` — icon chip (better when page has an image)
- Always collapse in a **separate** event after add

## Layout / arrows

After `node-alter` on `pos` or `size`, the client redraws links. If arrows look stuck, hard-refresh once (needs current `core.js`).

## Other useful tools

- `session_get` / `session_search` / `session_export_markdown`
- `purge`, `starter_load`, `node_focus`
- `node_add` for ordinary `text` / `html` cards (not for Wikipedia pages)

## Connector card

The control-panel “Wikipedia” seed is a **`graph-connection`** (`graph|/api/graph/wikipedia|connection`). Prefer `wikipedia_open` / `wikipedia_expand` for pages; add the connection node only when you need the start-seed UI.
