/**
 * Local Liquid Graph API (LGA) shim over the MediaWiki Action API.
 * Drop-in replacement for the broken chris.totl.net wiki-graph-demo.
 */

const MW_API = 'https://en.wikipedia.org/w/api.php';
const USER_AGENT =
  process.env.WEBLEAU_WIKI_UA ??
  'Webleau/0.1 (https://github.com/cgutteridge/webleau; research-canvas; local-dev)';

const START = ['Douglas_Engelbart', 'Memex', 'Hypertext', 'Vannevar_Bush'];

const cache = new Map<string, { at: number; value: unknown }>();
const CACHE_TTL_MS = Number(process.env.WEBLEAU_WIKI_CACHE_MS ?? 5 * 60 * 1000);

export interface WikiIdentResponse {
  ok: true;
  action: 'ident';
  lgaVersion: number;
  features: string[];
  title: string;
  description: string;
  start: string[];
}

export interface WikiNode {
  id: string;
  title: string;
  data?: {
    html?: string;
    icon?: string;
  };
}

export interface WikiLink {
  subject: string;
  object: string;
  type: string;
}

export interface WikiNodesResponse {
  ok: boolean;
  action: 'nodes' | 'error';
  nodes?: Record<string, WikiNode>;
  links?: WikiLink[];
  error?: string;
}

/**
 * Handle an LGA-style request for the Wikipedia connector.
 *
 * @param query - Express-style query bag (action, ids, data, follow)
 */
export async function handleWikipediaGraph(
  query: Record<string, unknown>,
): Promise<WikiIdentResponse | WikiNodesResponse> {
  const action = String(query.action ?? 'ident');
  if (action === 'ident' || action === '') {
    return ident();
  }
  if (action === 'nodes') {
    return nodes(query);
  }
  return { ok: false, action: 'error', error: `unknown action: ${action}` };
}

/**
 * @returns Ident document for the Wikipedia connector
 */
function ident(): WikiIdentResponse {
  return {
    ok: true,
    action: 'ident',
    lgaVersion: 1,
    features: ['ident', 'follow', 'nodes', 'nodes.data'],
    title: 'Wikipedia (local)',
    description:
      'Browse English Wikipedia pages and sections. Node IDs are page titles after /wiki/ (underscores OK), with optional #Section fragment.',
    start: START,
  };
}

/**
 * @param query - LGA nodes query
 */
async function nodes(query: Record<string, unknown>): Promise<WikiNodesResponse> {
  const idsRaw = query.ids;
  const idList = Array.isArray(idsRaw)
    ? idsRaw.map(String)
    : String(idsRaw ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

  if (!idList.length) {
    return { ok: true, action: 'nodes', nodes: {}, links: [] };
  }

  const wantData = truthy(query.data);
  const follow = query.follow !== undefined && query.follow !== null && String(query.follow) !== '';

  const nodesOut: Record<string, WikiNode> = {};
  const linksOut: WikiLink[] = [];

  for (const id of idList) {
    try {
      const { title, pageId, fragment } = parseNodeId(id);
      if (wantData) {
        const page = await fetchPage(title, fragment);
        nodesOut[id] = {
          id,
          title: fragment ? `${page.title} § ${fragment.replace(/_/g, ' ')}` : page.title,
          data: {
            html: page.html,
            icon: page.icon,
          },
        };
      } else {
        const meta = await fetchTitleMeta(title);
        nodesOut[id] = { id, title: meta.title || title.replace(/_/g, ' ') };
      }

      if (follow) {
        const linked = await fetchOutgoingLinks(title, 40);
        for (const target of linked) {
          const objectId = encodeNodeId(target);
          linksOut.push({ subject: id, object: objectId, type: 'links to' });
          if (!nodesOut[objectId]) {
            nodesOut[objectId] = { id: objectId, title: target };
          }
        }
        // If we only have a fragment node, still link from the page root
        if (fragment && pageId) {
          void pageId;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      nodesOut[id] = {
        id,
        title: id.replace(/_/g, ' '),
        data: wantData
          ? { html: `<p class="lqs_wiki_error">Failed to load: ${escapeHtml(message)}</p>` }
          : undefined,
      };
    }
  }

  const response: WikiNodesResponse = { ok: true, action: 'nodes', nodes: nodesOut };
  if (follow) {
    response.links = linksOut;
  }
  return response;
}

/**
 * @param id - Node id possibly with #fragment
 */
function parseNodeId(id: string): { title: string; fragment?: string; pageId?: number } {
  const hash = id.indexOf('#');
  if (hash === -1) {
    return { title: decodeURIComponent(id.replace(/ /g, '_')) };
  }
  return {
    title: decodeURIComponent(id.slice(0, hash).replace(/ /g, '_')),
    fragment: decodeURIComponent(id.slice(hash + 1).replace(/ /g, '_')),
  };
}

/**
 * @param title - Human or underscored page title
 */
function encodeNodeId(title: string): string {
  return title.trim().replace(/ /g, '_');
}

/**
 * @param title - Page title
 * @param fragment - Optional section anchor
 */
async function fetchPage(
  title: string,
  fragment?: string,
): Promise<{ title: string; html: string; icon?: string }> {
  const sections = await mwJson<{
    parse?: { title: string; sections?: Array<{ index: string; line: string; anchor: string }> };
  }>({
    action: 'parse',
    page: title,
    prop: 'sections',
    redirects: '1',
  });

  const parsedTitle = sections.parse?.title ?? title.replace(/_/g, ' ');
  let sectionIndex: string | undefined;
  if (fragment && sections.parse?.sections) {
    const want = fragment.replace(/_/g, ' ').toLowerCase();
    const match = sections.parse.sections.find(
      (s) =>
        s.anchor.replace(/_/g, ' ').toLowerCase() === want ||
        s.line.replace(/_/g, ' ').toLowerCase() === want,
    );
    if (match) {
      sectionIndex = match.index;
    }
  }

  const params: Record<string, string> = {
    action: 'parse',
    page: title,
    prop: 'text',
    redirects: '1',
    disableeditsection: '1',
  };
  if (sectionIndex !== undefined) {
    params.section = sectionIndex;
  }

  const body = await mwJson<{ parse?: { title: string; text?: { '*': string } } }>(params);
  let html = body.parse?.text?.['*'] ?? '<p>No content.</p>';
  html = rewriteWikiHtml(html, parsedTitle);

  if (!fragment && !sectionIndex) {
    html = leadPlusSectionSeeds(html, sections.parse?.sections ?? [], parsedTitle);
  }

  const icon = await fetchPageImage(title);
  return { title: body.parse?.title ?? parsedTitle, html, icon };
}

/**
 * Shrink a full article to lead HTML plus section seeds.
 *
 * @param html - Full parse HTML
 * @param sections - Section list from MediaWiki
 * @param pageTitle - Display title
 */
function leadPlusSectionSeeds(
  html: string,
  sections: Array<{ line: string; anchor: string }>,
  pageTitle: string,
): string {
  const cut = html.search(/<h2\b/i);
  const lead = cut === -1 ? html : html.slice(0, cut);
  const pageId = encodeNodeId(pageTitle);
  const seeds = sections
    .filter((s) => s.line && s.anchor)
    .slice(0, 24)
    .map((s) => {
      const seedId = `${pageId}#${s.anchor}`;
      return `<div data-seed-id="${escapeAttr(seedId)}" class="lqs_wiki_section">${escapeHtml(s.line)}</div>`;
    })
    .join('');
  const sectionBlock = seeds
    ? `<div class="lqs_wiki_sections"><p><strong>Sections</strong></p>${seeds}</div>`
    : '';
  return `${lead}${sectionBlock}`;
}

/**
 * @param title - Page title
 */
async function fetchTitleMeta(title: string): Promise<{ title: string }> {
  const data = await mwJson<{
    query?: { pages?: Array<{ title?: string }> | Record<string, { title?: string }> };
  }>({
    action: 'query',
    titles: title,
    redirects: '1',
    formatversion: '2',
  });
  const pages = data.query?.pages;
  if (Array.isArray(pages)) {
    return { title: pages[0]?.title ?? title.replace(/_/g, ' ') };
  }
  if (pages) {
    const first = Object.values(pages)[0];
    return { title: first?.title ?? title.replace(/_/g, ' ') };
  }
  return { title: title.replace(/_/g, ' ') };
}

/**
 * @param title - Page title
 * @param limit - Max links
 */
async function fetchOutgoingLinks(title: string, limit: number): Promise<string[]> {
  const data = await mwJson<{
    query?: { pages?: Record<string, { links?: Array<{ title: string }> }> };
  }>({
    action: 'query',
    titles: title,
    prop: 'links',
    plnamespace: '0',
    pllimit: String(limit),
    redirects: '1',
  });
  const pages = data.query?.pages;
  if (!pages) {
    return [];
  }
  const page = Object.values(pages)[0];
  return (page?.links ?? []).map((l) => l.title).filter(Boolean);
}

/**
 * @param title - Page title
 */
async function fetchPageImage(title: string): Promise<string | undefined> {
  const data = await mwJson<{
    query?: { pages?: Record<string, { original?: { source?: string }; thumbnail?: { source?: string } }> };
  }>({
    action: 'query',
    titles: title,
    prop: 'pageimages',
    piprop: 'thumbnail|original',
    pithumbsize: '240',
    redirects: '1',
  });
  const pages = data.query?.pages;
  if (!pages) {
    return undefined;
  }
  const page = Object.values(pages)[0];
  return page?.thumbnail?.source ?? page?.original?.source;
}

/**
 * Rewrite wiki HTML so internal links become LQS seeds; strip scripts/styles.
 *
 * @param html - Raw parse HTML
 * @param pageTitle - Current page title (for relative context)
 */
export function rewriteWikiHtml(html: string, pageTitle: string): string {
  void pageTitle;
  let out = html;
  out = out.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  out = out.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  out = out.replace(
    /<a\b[^>]*\bhref="\/wiki\/([^"#]+)(?:#[^"]*)?"[^>]*>([\s\S]*?)<\/a>/gi,
    (_whole, target: string, text: string) => {
      const id = decodeURIComponent(target);
      if (id.includes(':') && !id.startsWith('Category:')) {
        // skip most namespaces except leave Category as seed if wanted — skip talk/file etc.
        if (/^(File|Image|Help|Wikipedia|Template|Special|Talk|User):/i.test(id)) {
          return text;
        }
      }
      return `<span data-seed-id="${escapeAttr(id)}">${text}</span>`;
    },
  );
  // demote remaining anchors that point off-site or to anchors only
  out = out.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1');
  return out;
}

/**
 * @param params - MediaWiki API params
 */
async function mwJson<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(MW_API);
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const cacheKey = url.toString();
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.value as T;
  }
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`MediaWiki HTTP ${response.status}`);
  }
  const value = (await response.json()) as T;
  cache.set(cacheKey, { at: Date.now(), value });
  return value;
}

/**
 * @param value - Query flag
 */
function truthy(value: unknown): boolean {
  if (value === undefined || value === null || value === false || value === '') {
    return false;
  }
  if (value === true || value === 1 || value === '1') {
    return true;
  }
  return String(value).toLowerCase() !== 'false' && String(value).toLowerCase() !== '0';
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
 * @param text - Attribute value
 */
function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/'/g, '&#39;');
}
