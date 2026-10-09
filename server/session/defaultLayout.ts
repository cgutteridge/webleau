import type { Layout } from './types.js';

/** Welcome layout shown for a fresh session. */
export const DEFAULT_LAYOUT: Layout = {
  inspectorProxy: '/api/inspector',
  nodes: [
    {
      id: 'a',
      pos: { x: 400, y: 100 },
      size: { width: 200, height: 200 },
      title: '',
      type: 'text',
      text: 'Paste a URL onto the background. Double-click empty space for a note. Drag cards until they touch to link. Session state is saved by the local server.',
    },
    {
      id: 'welcome',
      pos: { x: 0, y: 0 },
      size: { width: 240, height: 220 },
      title: 'Welcome',
      type: 'html',
      html: '<p>Welcome to <strong>Liquid Space</strong>.</p><p>Open the spanner: try <em>Memex trail</em>, drag <em>Wikipedia</em>, or <em>Export Markdown</em>.</p><p><a href="https://jrnl.global/2018/10/30/webleau-progress/">Original blog post</a></p>',
    },
  ],
  links: [
    {
      label: '',
      id: 'welcomelink',
      subject: { node: 'a' },
      object: { node: 'welcome' },
    },
  ],
};
