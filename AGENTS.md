# Webleau / Liquid Space — Agent Guide

Spatial canvas web app: cards (nodes) on an infinite plane, linked by edges, zoom/pan, paste-to-create, and a JSON layout for save/load. Also known as **Liquid Space** (`LQS` in code).

Blog intro (historical): https://jrnl.global/2018/10/30/webleau-progress/

## Stance for AI work

- **Nothing is sacred.** Features, APIs, file layout, dependency choices, and naming may all change.
- **No backwards compatibility** is required for layouts, events, URLs, quines, or node type shapes unless the human explicitly asks to preserve something.
- Prefer a clean design over preserving quirks. When removing or replacing code, delete the old path rather than leaving shims.
- Ask before large ambiguous refactors; otherwise implement the requested change fully.
- Keep this file and `.cursor/rules/` accurate when architecture or conventions change materially.

## What this is today

Legacy front-end app with almost no build step:

| Piece | Role |
| --- | --- |
| `index.php` | Shell page: concatenates (or separately loads when `?debug=1`) CSS/JS, bootstraps `new LQS()` + `setLayout(...)` |
| `control.html` | Dev/test page for iframe `MessageChannel` remote control |
| `js/lqs/*.js` | Application code (ES6 classes, global registration) |
| `js/jquery*`, `js/hammer*` | Vendored libraries (jQuery, jQuery UI, touch-punch, Hammer) |
| `css/liquid-space.css` | App styles |
| `css/jquery-ui.css` | Vendored jQuery UI styles |

There is no package manager, bundler, test suite, or CI in-repo yet. PHP is only used to inline assets and inject the initial layout.

## Mental model

1. **`LQS`** (`js/lqs/core.js`) owns the canvas: layers, pan/zoom, control panel, paste, seeds, layout I/O, and the **change/event bus**.
2. **`LQS_Node`** (`js/lqs/node.js`) is the card base class: DOM, drag, resize, actions, views.
3. **Node types** register on the global map `LQS_NodeTypes[typeName]` (files `js/lqs/node-*.js`).
4. **`LQS_Link`** draws subject→object edges in the SVG overlay.
5. **`LQS_ViewSpec`** describes alternate card presentations (main/edit/meta/etc.).
6. **`LQS_Point` / `LQS_Line`** are geometry helpers (virtual layout ↔ screen/real coords via `toVirtual` / `toReal` and a large offset).

### Coordinates

- Layout positions are **virtual** points around origin `(0,0)`.
- The DOM uses a huge scrollable plane with `offset` (~50000,50000). Convert with `lqs.toReal` / `lqs.toVirtual`.
- Zoom is `layoutScale` (UI slider is log2).

### Layout document

Serializable object from `getLayout()` / into `setLayout()`:

```json
{
  "nodes": [ { "id", "type", "pos", "size", "title", ...typeFields } ],
  "links": [ { "id", "label", "subject": { "node" }, "object": { "node" } } ],
  "inspectorProxy": "https://...",
  "linkStyle": "default|arrow|string"
}
```

Node type-specific fields live on the same object (`text`, `html`, `source`, `graph`, …).

### Mutations

Prefer going through `lqs.change(event)` (also used by remote control). Actions include: `node-add`, `node-remove`, `node-alter`, `node-focus`, `link-add`, `link-remove`, `purge`. `addNode` / `addLink` / `purgeLayout` wrap these.

### Seeds

Provisional “growable” node stubs attached to other cards (drag or click). Grown via `growSeed`. Types often expose `static makeSeed(opts)`.

### Inspector proxy

Embed/cited/open-graph style enrichment hits `inspectorProxy` (default `https://chris.totl.net/lqs-inspector-v1/`). Treat as optional external dependency when redesigning fetch/embed behaviour.

### Graph demos

Control-panel seeds call Liquid Graph API endpoints on `chris.totl.net`. Do not use the old `soton.ac.uk` / `southampton.ac.uk/~totl/` URLs — they redirect and browsers fail the CORS redirect chain even though the final host sends `Access-Control-Allow-Origin: *`.

### Quine

Control panel can download a self-contained HTML snapshot of the current page + layout. Nice demo; not a persistence architecture to protect.

## Repository map

```
index.php              entry + asset concat / debug loader
control.html           MessageChannel remote-control harness
css/liquid-space.css   app UI
css/jquery-ui.css      vendor
js/lqs/core.js         LQS controller (~1k lines) — start here
js/lqs/node.js         LQS_Node base (~900 lines)
js/lqs/link.js         edges
js/lqs/viewspec.js     view protocol
js/lqs/point.js        points
js/lqs/line.js         segment intersection
js/lqs/node-text.js    type: text
js/lqs/node-html.js    type: html
js/lqs/node-embed.js   type: embed (URL → inspector)
js/lqs/node-cited.js   type: cited
js/lqs/node-graph.js   types: graph-connect, graph-connection, …
js/lqs/node-error.js   type: error
js/*                   vendor (do not hand-edit; replace via proper upgrade)
```

## Current node types

| `type` key | File | Notes |
| --- | --- | --- |
| `text` | `node-text.js` | Plain text + edit view |
| `html` | `node-html.js` | HTML content + edit view |
| `embed` | `node-embed.js` | URL embeds via inspector |
| `cited` | `node-cited.js` | Cited HTML + source metadata |
| `error` | `node-error.js` | Stub error card |
| `graph-connect` / `graph-connection` / related | `node-graph.js` | Graph query API connector UI |

Extend by subclassing `LQS_Node` and assigning `LQS_NodeTypes['name'] = class …`. Registration is load-order dependent (listed in `index.php`).

## Coding conventions (as-found)

- Browser ES6 classes; **no modules** — everything is global.
- Heavy **jQuery** / jQuery UI (draggable, droppable, resizable).
- Mixed `var` / `const` / `let`; sparse comments; occasional TODOs and `alert()` error UI.
- CSS class prefix `lqs_`; use `.normal-paste` on inputs that must receive normal clipboard paste.
- Debug: `index.php?debug=1` loads scripts/styles as separate tags instead of inlining.

When modernising, introduce a real toolchain (modules, package.json, lint, tests) rather than extending the concat-in-PHP pattern indefinitely — unless a change is intentionally tiny and local.

## Working agreements

1. Read `js/lqs/core.js` and `js/lqs/node.js` before inventing parallel canvas/card systems.
2. New card behaviour → a node type (or a deliberate replacement of the type system), not one-off DOM in `index.php`.
3. Shared geometry → `LQS_Point` / `LQS_Line` (or their successors), not copy-pasted maths.
4. Layout mutation → `change` (or the successor event API), so remote control and undo/history stay possible.
5. Do not edit minified vendor blobs; swap versions or remove the dependency.
6. Honour lint/prettier once those exist; until then match local style in the file you touch, or upgrade the file’s style as part of a deliberate cleanup.
7. JSDoc public methods on new or substantially rewritten APIs.
8. Update this guide when folders, boot process, or core concepts change.

## Suggested first modernisations (not requirements)

Agents may propose or implement these when relevant to the task — none are prerequisites:

- Replace PHP concat with a static HTML + bundler (or ESM imports).
- Drop or replace jQuery UI / Hammer with modern pointer/gesture handling.
- Add TypeScript or JSDoc types for layout + `change` events.
- Split `core.js` / `node.js` into focused modules.
- Add Vitest (or similar) for geometry, layout round-trip, and `change` reducers.
- Persist layouts somewhere other than textarea/quine.

## Out of scope unless asked

- Preserving old saved layout JSON or quine HTML.
- Keeping the Southampton inspector proxy.
- Matching historical blog/demo behaviour.
