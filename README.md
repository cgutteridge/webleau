# Webleau / Liquid Space

Spatial research canvas: cards on an infinite plane, trails that persist, shareable sessions, and MCP so agents can drive the board.

## Quick start

```bash
npm install
npm start
```

Open [http://127.0.0.1:8787](http://127.0.0.1:8787).

- Drag **Wikipedia** from the control panel (local MediaWiki proxy)
- **Starters** → try *Memex trail*
- Paste a URL onto the background (local inspector)
- **Export Markdown** for notes

## MCP

With `npm start` running, Cursor can use `.cursor/mcp.json` (`npm run mcp`). Tools include `node_add`, `graph_api` / `graph_open` / `graph_follow`, `starter_load`, `session_export_markdown`, etc.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | HTTP + WebSocket + static site |
| `npm run mcp` | MCP stdio adapter (needs HTTP up) |
| `npm test` | Vitest unit tests |
| `npm run typecheck` | `tsc --noEmit` |

## Docs for agents

See [`AGENTS.md`](AGENTS.md) and [`docs/NOTES.md`](docs/NOTES.md).
