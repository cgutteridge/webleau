# Webleau / Liquid Space — Agent Guide

Spatial canvas: cards (nodes) on an infinite plane, linked by edges, zoom/pan, paste-to-create. Also known as **Liquid Space** (`LQS`). Riffing project — trails that persist, shareable research sessions, MCP/agent control, maybe VR later.

## Stance for AI work

- **Nothing is sacred.** Refactor freely; no backwards compatibility unless asked.
- Prefer deleting old paths over shims.
- Ask before large ambiguous refactors; otherwise implement fully.
- Keep this file and `.cursor/rules/` accurate when architecture changes.

## Baseline architecture

One **session core**, two adapters:

| Piece | Role |
| --- | --- |
| `server/session/` | Layout + event log + file persistence (`sessions/*.json`) |
| `server/http.ts` | Website + REST + WebSocket (live authority) |
| `server/mcp.ts` | MCP stdio tools/resources → HTTP API |
| `index.html` + `js/lqs/` | Browser canvas; `session-sync.js` mirrors `change` ↔ server |

```
Browser LQS ──HTTP/WS──► server/http.ts ──► session store
Cursor MCP  ──stdio──► server/mcp.ts ──HTTP──┘
```

### Run

```bash
npm install
npm start                 # http://127.0.0.1:8787
# MCP (requires HTTP up): configured in .cursor/mcp.json → npm run mcp
```

Env: `PORT` (default `8787`), `WEBLEAU_SESSION` (default `default`), `WEBLEAU_URL` for MCP (default `http://127.0.0.1:8787`).

### HTTP API

- `GET /api/health`
- `GET /api/sessions`
- `GET /api/sessions/:id` — layout + metadata
- `PUT /api/sessions/:id` — replace layout
- `POST /api/sessions/:id/events` — apply a `change`-shaped event
- `GET /api/sessions/:id/events?since=N`
- `WS /ws?session=&clientId=` — `{ type: 'event' | 'layout' | 'hello', ... }`
- `GET /api/graph/wikipedia` — local Wikipedia LGA (ident / nodes / follow); MediaWiki-backed

### MCP tools

`session_get`, `session_list`, `node_add`, `node_update`, `node_remove`, `link_add`, `link_remove`, `node_focus`, `purge`. Resource: `webleau://session/{id}`.

### Mutations

Canonical actions (browser `LQS.change` and server `applyEvent`): `node-add`, `node-remove`, `node-alter`, `node-focus`, `link-add`, `link-remove`, `purge`. Optional `clientId` for WS echo suppression.

## Browser / LQS mental model

1. **`LQS`** (`js/lqs/core.js`) — canvas, pan/zoom, controls, paste, seeds, `change` bus.
2. **`LQS_Node`** / **`LQS_NodeTypes`** — cards; types in `node-*.js`.
3. **`LQS_Link`**, **`LQS_ViewSpec`**, **`LQS_Point`**, **`LQS_Line`** — edges, views, geometry.
4. **`LQS_SessionSync`** — loads session, posts local events, applies remote events.

Virtual coords around `(0,0)`; DOM uses a large offset. Zoom via `layoutScale`.

### Layout document

```json
{
  "nodes": [{ "id", "type", "pos", "size", "title", "...typeFields" }],
  "links": [{ "id", "label", "subject": { "node" }, "object": { "node" } }],
  "inspectorProxy": "https://...",
  "linkStyle": "default|arrow|string"
}
```

## Repository map

```
server/session/     session core (TypeScript)
server/http.ts      web + REST + WS
server/mcp.ts       MCP adapter
sessions/           persisted session JSON (gitignored)
index.html          primary entry (use npm start)
index.php           legacy PHP shell (optional)
js/lqs/*.js         canvas app (plain JS, globals)
css/                styles
control.html        MessageChannel remote-control harness
```

Server is TypeScript (`tsx`). Browser canvas stays plain JS for now.

## Node types

| `type` | File | Notes |
| --- | --- | --- |
| `text` / `html` / `embed` / `cited` / `error` | `node-*.js` | Core cards |
| `graph-connection` / `graph-node` / … | `node-graph.js` | External LGA endpoints |

Blog/Webscience graph seeds still use `chris.totl.net`. Wikipedia uses `/api/graph/wikipedia`.

## Working agreements

1. Mutate layout through session events, not a second write path.
2. New card behaviour → node type (or deliberate type-system replacement).
3. Don’t hand-edit minified vendor blobs.
4. JSDoc public methods on new/rewritten APIs; `server/` is strict TS.
5. Update this guide when boot process or core concepts change.

## Out of scope unless asked

- Preserving old quines / PHP-only workflow.
- Cloud accounts, VR, or full UI rewrite before the session baseline is solid.
