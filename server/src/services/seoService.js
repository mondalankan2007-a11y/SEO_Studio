import {
  analyzePage, analyzeHtml, calculateScore, generateMeta, validateMeta,
  generateOpenGraph, generateTwitterCard, generateSitemap, generateSitemapIndex,
  generateRobots, generateJsonLd, generateArticle, generateProduct,
  generateOrganization, generatePerson, generateBreadcrumbList
} from '@ankan_/seo-toolkit';
import { Agent, fetch as undiciFetch } from 'undici';
import { parsePublicHttpUrl, resolvePublicHost } from '../utils/urlSecurity.js';

let auditQueue = Promise.resolve();

function createPinnedFetch(transport) {
  return async function pinnedFetch(input, init = {}) {
    let current = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    const original = current.href;
    for (let hop = 0; hop <= 5; hop += 1) {
      current = parsePublicHttpUrl(current.href);
      const addresses = await resolvePublicHost(current);
      const agent = new Agent({ connect: { lookup(host, options, callback) {
        const allowed = addresses.filter((record) => !options?.family || record.family === options.family);
        const selected = allowed[0] || addresses[0];
        if (options?.all) callback(null, addresses.map((record) => ({ address: record.address, family: record.family })));
        else callback(null, selected.address, selected.family);
      } } });
      let response;
      try { response = await transport(current.href, { ...init, redirect: 'manual', dispatcher: agent }); }
      catch (error) { await agent.close(); throw error; }
      if (![301, 302, 303, 307, 308].includes(response.status)) {
        try {
          const size = Number(response.headers.get('content-length') || 0);
          if (size > 5_000_000) { await response.body?.cancel(); throw new Error('The website response is too large to analyze.'); }
          const body = await response.arrayBuffer();
          if (body.byteLength > 5_000_000) throw new Error('The website response is too large to analyze.');
          const buffered = new Response(body.byteLength && ![204, 304].includes(response.status) ? body : null, { status: response.status, statusText: response.statusText, headers: response.headers });
          Object.defineProperty(buffered, 'url', { value: current.href });
          Object.defineProperty(buffered, 'redirected', { value: current.href !== original });
          return buffered;
        } finally { await agent.close(); }
      }
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) { await agent.close(); return response; }
      if (hop === 5) { await agent.close(); throw new Error('The website redirected too many times.'); }
      current = new URL(location, current);
      await agent.close();
      parsePublicHttpUrl(current.href);
    }
    throw new Error('The website redirect chain could not be followed.');
  };
}

export async function auditWebsite(input, { transport = undiciFetch } = {}) {
  const initial = parsePublicHttpUrl(input);
  // The package calls global fetch internally. Serialize this short override so every
  // initial request and redirect is DNS checked and pinned to a public resolved IP.
  const run = auditQueue.then(async () => {
    const nativeFetch = globalThis.fetch;
    globalThis.fetch = createPinnedFetch(transport);
    try { return await analyzePage(initial.href, { timeout: 12000, redirect: 'manual', userAgent: 'SEOStudio/1.0 (+https://github.com/mondalankan2007-a11y/SEO_Studio)' }); }
    finally { globalThis.fetch = nativeFetch; }
  });
  auditQueue = run.catch(() => {});
  return run;
}

export function auditHtml(html) { return analyzeHtml(html); }
export function scoreAnalysis(analysis) { return calculateScore(analysis); }

export function createMeta(input) {
  const normalized = Object.fromEntries(Object.entries(input).filter(([, value]) => typeof value !== 'string' || value.trim() !== ''));
  const validation = validateMeta(normalized);
  const { openGraph, twitter, ...baseMeta } = normalized;
  const generated = generateMeta(baseMeta);
  const og = openGraph && Object.values(openGraph).some(Boolean) ? generateOpenGraph(openGraph) : null;
  const card = twitter && Object.values(twitter).some(Boolean) ? generateTwitterCard(twitter) : null;
  return { html: [generated.toHtml(), og?.toHtml(), card?.toHtml()].filter(Boolean).join('\n'), validation };
}

export function createSitemap(input) {
  if (input.indexEntries?.length) return { xml: generateSitemapIndex(input.indexEntries, { pretty: true, strict: true }), type: 'index' };
  return { xml: generateSitemap(input.routes, { hostname: input.hostname, pretty: true, strict: true }), type: 'sitemap' };
}

export function createRobots(input) { return generateRobots(input); }

const schemaBuilders = {
  Organization: generateOrganization,
  Person: generatePerson,
  Article: generateArticle,
  Product: generateProduct,
  BreadcrumbList: (data) => generateBreadcrumbList(data.items)
};

export function createSchema(type, data) {
  const builder = schemaBuilders[type];
  if (!builder) throw new Error('Choose a supported schema type.');
  const required = type === 'Article' ? data.headline : type === 'BreadcrumbList' ? data.items?.length : data.name;
  if (!required || (type === 'BreadcrumbList' && data.items.some((item) => !item.name?.trim()))) {
    throw new Error(type === 'BreadcrumbList' ? 'Add at least one breadcrumb with a name.' : `Enter a ${type === 'Article' ? 'headline' : 'name'} to generate this schema.`);
  }
  const schema = builder(data);
  return { json: schema.toJSON(), script: schema.toScript({ pretty: true }) };
}

