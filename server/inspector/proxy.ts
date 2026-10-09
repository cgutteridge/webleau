/**
 * Lightweight URL inspector (oEmbed / Open Graph) for embed cards.
 * Replaces dependence on chris.totl.net for local demos.
 */

export interface InspectorResult {
  url: string;
  title?: string;
  description?: string;
  html?: string;
  type?: string;
  provider_name?: string;
  image?: { url?: string };
  size?: { width?: number; height?: number };
  error?: string;
  note?: string;
}

const USER_AGENT =
  process.env.WEBLEAU_INSPECTOR_UA ??
  'WebleauInspector/0.1 (https://github.com/cgutteridge/webleau; local-dev)';

/**
 * Inspect a URL for embed metadata.
 *
 * @param targetUrl - Absolute http(s) URL
 */
export async function inspectUrl(targetUrl: string): Promise<InspectorResult> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { url: targetUrl, error: 'invalid url' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { url: targetUrl, error: 'only http(s) supported' };
  }

  const oembed = await tryOEmbed(parsed);
  if (oembed) {
    return oembed;
  }

  return scrapeOpenGraph(parsed);
}

/**
 * @param url - Target page URL
 */
async function tryOEmbed(url: URL): Promise<InspectorResult | null> {
  const endpoint = oembedEndpointFor(url);
  if (!endpoint) {
    return null;
  }
  try {
    const data = await fetchJson(endpoint);
    if (!data || typeof data !== 'object') {
      return null;
    }
    const record = data as Record<string, unknown>;
    return {
      url: url.href,
      title: str(record.title),
      html: str(record.html),
      type: str(record.type) ?? 'rich',
      provider_name: str(record.provider_name),
      image: str(record.thumbnail_url) ? { url: str(record.thumbnail_url) } : undefined,
      size: {
        width: num(record.width) ?? 480,
        height: num(record.height) ?? 270,
      },
      note: 'oEmbed',
    };
  } catch {
    return null;
  }
}

/**
 * @param url - Page URL
 * @returns oEmbed endpoint or null when unsupported
 */
function oembedEndpointFor(url: URL): string | null {
  const href = encodeURIComponent(url.href);
  if (/(^|\.)youtube\.com$/i.test(url.host) || /(^|\.)youtu\.be$/i.test(url.host)) {
    return `https://www.youtube.com/oembed?format=json&url=${href}`;
  }
  if (/(^|\.)vimeo\.com$/i.test(url.host)) {
    return `https://vimeo.com/api/oembed.json?url=${href}`;
  }
  if (/(^|\.)twitter\.com$/i.test(url.host) || /(^|\.)x\.com$/i.test(url.host)) {
    return `https://publish.twitter.com/oembed?url=${href}`;
  }
  return null;
}

/**
 * @param url - Page URL
 */
async function scrapeOpenGraph(url: URL): Promise<InspectorResult> {
  try {
    const response = await fetch(url.href, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    if (!response.ok) {
      return { url: url.href, title: url.href, error: `HTTP ${response.status}` };
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return {
        url: url.href,
        title: url.pathname.split('/').pop() || url.href,
        type: 'link',
        note: contentType,
      };
    }
    const html = (await response.text()).slice(0, 500_000);
    const title =
      meta(html, 'og:title') ||
      meta(html, 'twitter:title') ||
      tagText(html, 'title') ||
      url.href;
    const description = meta(html, 'og:description') || meta(html, 'description');
    const image = meta(html, 'og:image') || meta(html, 'twitter:image');
    return {
      url: url.href,
      title,
      description: description || undefined,
      type: 'link',
      image: image ? { url: absolutize(url, image) } : undefined,
      html: description
        ? `<p>${escapeHtml(description)}</p><p><a href="${escapeHtml(url.href)}">${escapeHtml(url.href)}</a></p>`
        : `<p><a href="${escapeHtml(url.href)}">${escapeHtml(url.href)}</a></p>`,
      note: 'opengraph',
    };
  } catch (err) {
    return {
      url: url.href,
      title: url.href,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * @param endpoint - Absolute URL
 */
async function fetchJson(endpoint: string): Promise<unknown> {
  const response = await fetch(endpoint, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * @param html - Document HTML
 * @param property - meta property or name
 */
function meta(html: string, property: string): string | undefined {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escapeReg(property)}["'][^>]+content=["']([^"']+)["']`,
      'i',
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escapeReg(property)}["']`,
      'i',
    ),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) {
      return decodeHtml(match[1].trim());
    }
  }
  return undefined;
}

/**
 * @param html - Document HTML
 * @param tag - Tag name
 */
function tagText(html: string, tag: string): string | undefined {
  const match = html.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'));
  return match?.[1]?.trim() ? decodeHtml(match[1].trim()) : undefined;
}

/**
 * @param base - Page URL
 * @param value - Possibly relative URL
 */
function absolutize(base: URL, value: string): string {
  try {
    return new URL(value, base).href;
  } catch {
    return value;
  }
}

/**
 * @param value - Unknown
 */
function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

/**
 * @param value - Unknown
 */
function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * @param text - Raw text
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param text - Entity-encoded text
 */
function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * @param text - Literal for RegExp
 */
function escapeReg(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
