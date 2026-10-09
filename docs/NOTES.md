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

## Agent pitfalls

- **Wikipedia expand:** never add collapsed (`view: icon`) graph-nodes from scratch — browser skips content fetch. Open as main (like `wikipedia_open`), then collapse. Use MCP `wikipedia_expand` or see `.cursor/skills/webleau-mcp/SKILL.md`.

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

## Known broken / caveats

- Remote `chris.totl.net/wiki-graph-demo` still empty (UI uses local proxy instead)
- Blog/Webscience seeds still remote on chris.totl.net
- Legacy `index.php` still present; prefer `npm start`
- Existing `sessions/*.json` may still have old cards until you load a Starter or purge
- MCP requires HTTP (`npm start`) to be running
