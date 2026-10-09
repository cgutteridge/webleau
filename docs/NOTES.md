# Working notes

Last updated: 2026-10-09 (search + README)

## Done

- Node/TS session core (`server/session/`) with event apply + file persistence
- HTTP adapter: static site, REST, WebSocket (`npm start` → `:8787`)
- MCP adapter over HTTP (`.cursor/mcp.json`, `npm run mcp`)
- `index.html` + `session-sync.js` so the canvas persists and receives remote events
- **Local Wikipedia LGA** at `GET /api/graph/wikipedia` (MediaWiki)
- Vitest for `applyEvent`, wiki rewrite, markdown export, search (`npm test`)
- Starters + MCP tools including `wikipedia_open`, `starter_load`, `session_export_markdown`, `session_search`
- **Local inspector** at `GET /api/inspector?url=` (oEmbed + Open Graph)
- Markdown export + control-panel **Export Markdown**
- Session search API + control-panel Find + MCP `session_search`
- README for humans; notes migrate old inspectorProxy hosts to `/api/inspector`

## In progress / next

1. Harden session-sync (offline queue)
2. Demo polish: touch targets, clearer first-run
3. Drop or replace remaining chris.totl.net graph seeds if flaky
4. Sources panel / better embed cards
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
