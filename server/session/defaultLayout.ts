import type { Layout } from './types.js';

/** Welcome layout shown for a fresh session. */
export const DEFAULT_LAYOUT: Layout = {
  inspectorProxy: 'https://chris.totl.net/lqs-inspector-v1/',
  nodes: [
    {
      id: 'a',
      pos: { x: 400, y: 100 },
      size: { width: 200, height: 200 },
      title: '',
      type: 'text',
      text: 'Try pasting URLs from media sites. Try double clicking on the background. Use the spanner to save state (to a text string for now). Drag nodes to touch to make a link.',
    },
    {
      id: 'welcome',
      pos: { x: 0, y: 0 },
      size: { width: 200, height: 200 },
      title: 'Welcome',
      type: 'html',
      html: '<p>Welcome to Liquid Space.</p><p>To get started, for now all we have is an <a href="https://jrnl.global/2018/10/30/webleau-progress/">Introduction blog post</a></p>',
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
