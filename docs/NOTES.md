# Working notes

Last updated: 2026-10-09 (starters + tests)

## Done

- Node/TS session core (`server/session/`) with event apply + file persistence
- HTTP adapter: static site, REST, WebSocket (`npm start` → `:8787`)
- MCP adapter over HTTP (`.cursor/mcp.json`, `npm run mcp`)
- `index.html` + `session-sync.js` so the canvas persists and receives remote events
- Graph/inspector URLs pointed at `chris.totl.net`; empty wiki responses no longer crash the client
- **Local Wikipedia LGA** at `GET /api/graph/wikipedia` (MediaWiki); control-panel seed uses it
- Vitest for `applyEvent` + wiki HTML rewrite (`npm test`)
- Starters API + control-panel buttons + MCP `starter_load` / `wikipedia_open`
- Short TTL cache on MediaWiki fetches

## In progress / next

1. Local inspector proxy (optional; still using chris.totl.net)
2. Harden session-sync (offline queue, focus viewport sync)
3. Export Markdown dump of a session
4. Demo polish: better default layout, touch targets
5. More graph proxies or drop dead remote seeds

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
