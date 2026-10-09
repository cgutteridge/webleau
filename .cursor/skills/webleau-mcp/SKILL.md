---
name: webleau-mcp
description: >-
  Drive the Webleau/Liquid Space canvas via MCP. Use when laying out cards,
  talking to graph-node APIs (LGA), opening/following linked objects, or
  mutating the live session.
---

# Webleau MCP

Requires `npm start` (HTTP on `WEBLEAU_URL`, default `http://127.0.0.1:8787`).
MCP is a thin client of that API; the open browser follows over WebSocket.

## Graph cards are API objects

`graph-connection` and `graph-node` cards carry `graph.endpoint` (and for nodes,
`graph.nodeID`). Treat them as Liquid Graph API (LGA) handles — not as
Wikipedia-specific tools.

| Tool | Role |
| --- | --- |
| `node_get` | Inspect one canvas card; graph cards include an `api` handle |
| `graph_api` | Call LGA (`ident` / `nodes` / `follow`) on a card or endpoint |
| `graph_open` | Place a real `graph-node` from `endpoint` + remote `id` |
| `graph_follow` | Open outbound follow links from a canvas `graph-node` |

Local Wikipedia is just one endpoint: `/api/graph/wikipedia`. Any other LGA
URL works the same way.

### Open a remote object

```
graph_open({ endpoint: "/api/graph/wikipedia", id: "Southampton" })
```

Or, if a `graph-connection` is already on the canvas, pass `from` that node id
and omit `endpoint`.

Do **not** hand-build empty cards that only have a title.

### Query the API (no canvas mutation)

```
graph_api({ node: "<canvas-graph-node-id>", follow: "*", followLimit: 500 })
graph_api({ endpoint: "/api/graph/wikipedia", action: "ident" })
graph_api({ node: "<id>", data: true })  # html/icon when supported
```

### Follow links onto the canvas

```
graph_follow({ node: "<canvas-graph-node-id>" })
```

Correct sequence (what the tool does):

1. Count outbound links via that card’s endpoint (`follow=*`)
2. **If more than 30 links and no explicit `limit`:** refuse with `too_many_links` — **ask the user** how many to open (hard max 120). Do not silently take a fraction.
3. For each chosen link: add a full `graph-node` at a ring position — **without** `view: icon`
4. `link-add` parent → child
5. Optional `node-alter` `view` → `squish` / `icon`

### Wrong (failed once — do not repeat)

- Creating satellites already in `view: "icon"` so `update()` never runs → no content (`graph.node.data` missing)
- Title-only stubs that are not `type: "graph-node"` with endpoint + ident
- Silently capping follow sets without telling the user the real link count
- Reaching for deleted Wikipedia-only tools (`wikipedia_open` / `wikipedia_expand`)

### Collapse after open

- `squish` — collapsed title chip (good default for many links)
- `icon` — icon chip (better when the object has an image)
- Always collapse in a **separate** event after add

## Layout / arrows

After `node-alter` on `pos` or `size`, the client redraws links. If arrows look stuck, hard-refresh once (needs current `core.js`).

## Other useful tools

- `session_get` / `session_search` / `session_export_markdown`
- `purge`, `starter_load`, `node_focus`
- `node_add` for ordinary `text` / `html` cards (not for LGA objects — use `graph_open`)
