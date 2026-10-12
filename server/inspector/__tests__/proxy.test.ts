import { afterEach, describe, expect, it, vi } from 'vitest';
import { inspectUrl, oembedEndpointFor } from '../proxy.js';

describe('oembedEndpointFor', () => {
  it('requests a sized player from YouTube', () => {
    const endpoint = oembedEndpointFor(new URL('https://www.youtube.com/watch?v=abc'));
    expect(endpoint).toContain('https://www.youtube.com/oembed?');
    expect(endpoint).toContain('maxwidth=480');
    expect(endpoint).toContain('maxheight=270');
  });

  it('returns null for providers without oEmbed support', () => {
    expect(oembedEndpointFor(new URL('https://example.com/page'))).toBeNull();
  });
});

describe('inspectUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exposes oEmbed player markup as `embed`', async () => {
    // Arrange
    const iframe = '<iframe src="https://www.youtube.com/embed/abc"></iframe>';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          title: 'A video',
          html: iframe,
          type: 'video',
          width: 480,
          height: 270,
          thumbnail_url: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
        }),
      ),
    );

    // Act
    const result = await inspectUrl('https://www.youtube.com/watch?v=abc');

    // Assert
    expect(result.embed).toBe(iframe);
    expect(result.size).toEqual({ width: 480, height: 270 });
    expect(result.note).toBe('oEmbed');
  });

  it('returns Open Graph metadata without player markup', async () => {
    // Arrange
    const page =
      '<html><head><meta property="og:title" content="Page"><meta property="og:description" content="About it"></head></html>';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(page, { headers: { 'content-type': 'text/html' } })),
    );

    // Act
    const result = await inspectUrl('https://example.com/page');

    // Assert
    expect(result.title).toBe('Page');
    expect(result.description).toBe('About it');
    expect(result.embed).toBeUndefined();
  });
});
