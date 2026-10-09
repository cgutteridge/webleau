# Working notes

Last updated: 2026-10-09 (baseline landed)

## Done

- Node/TS session core (`server/session/`) with event apply + file persistence
- HTTP adapter: static site, REST, WebSocket (`npm start` → `:8787`)
- MCP adapter over HTTP (`.cursor/mcp.json`, `npm run mcp`)
- `index.html` + `session-sync.js` so the canvas persists and receives remote events
- Graph/inspector URLs pointed at `chris.totl.net`; empty wiki responses no longer crash the client

## In progress / next

1. **In-repo Wikipedia LGA proxy** — replace broken remote `wiki-graph-demo` with MediaWiki-backed `/api/graph/wikipedia`
2. Point control-panel Wikipedia seed at the local proxy
3. Unit tests for `applyEvent` (Vitest)
4. Starter session layouts (demo trails)
5. Local inspector proxy (optional; still using chris.totl.net)
6. Harden session-sync (reconnect, offline queue, focus events)

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
