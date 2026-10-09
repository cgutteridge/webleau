import { describe, expect, it } from 'vitest';
import { rewriteWikiHtml } from '../wikipedia.js';

describe('rewriteWikiHtml', () => {
  it('turns internal wiki anchors into data-seed-id spans', () => {
    const html =
      '<p>See <a href="/wiki/Memex" title="Memex">Memex</a> and <a href="/wiki/Hypertext#History">history</a>.</p>';
    const out = rewriteWikiHtml(html, 'Test');
    expect(out).toContain('data-seed-id="Memex"');
    expect(out).toContain('>Memex</span>');
    expect(out).toContain('data-seed-id="Hypertext"');
    expect(out).not.toMatch(/<a\b/i);
  });

  it('strips scripts', () => {
    const out = rewriteWikiHtml('<p>x</p><script>alert(1)</script>', 'Test');
    expect(out).not.toContain('script');
    expect(out).toContain('<p>x</p>');
  });
});
