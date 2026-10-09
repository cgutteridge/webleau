# Working notes

Last updated: 2026-10-09 (inspector + markdown export)

## Done

- Node/TS session core (`server/session/`) with event apply + file persistence
- HTTP adapter: static site, REST, WebSocket (`npm start` → `:8787`)
- MCP adapter over HTTP (`.cursor/mcp.json`, `npm run mcp`)
- `index.html` + `session-sync.js` so the canvas persists and receives remote events
- **Local Wikipedia LGA** at `GET /api/graph/wikipedia` (MediaWiki)
- Vitest for `applyEvent`, wiki rewrite, markdown export (`npm test`)
- Starters + MCP `starter_load` / `wikipedia_open` / `session_export_markdown`
- **Local inspector** at `GET /api/inspector?url=` (oEmbed + Open Graph)
- Markdown export: `GET /api/sessions/:id/export.md` + control-panel button

## In progress / next

1. Harden session-sync (offline queue, focus viewport sync)
2. Demo polish: better default layout, touch targets
3. Drop or replace remaining chris.totl.net graph seeds if flaky
4. Session search / sources panel
5. Multiplayer presence (later)

## Decisions

- All Node; server TypeScript; browser canvas stays plain JS for now
- MCP does not own state — it calls the HTTP API so WS clients stay live
- No BC required; riff freely toward demo + research + agents

## Runbook

```bash
npm install && npm start
# browser: http://127.0.0.1:8787
# MCP needs HTTP up first
```

## Known broken

- Remote Wikipedia graph demo returns empty `nodes: []`
- JRNL graph API 500 (seed removed)
- Legacy `index.php` still present; prefer `npm start`
