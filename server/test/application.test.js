import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import dns from 'node:dns/promises';
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { analyzeHtml, analyzePage, calculateScore, generateMeta, generateOpenGraph, generateTwitterCard, generateSitemap, generateSitemapIndex, generateRobots, generateOrganization, generatePerson, generateArticle, generateProduct, generateBreadcrumbList, validateMeta, VERSION } from '@ankan_/seo-toolkit';
import { createApp } from '../src/app.js';
import { auditStore } from '../src/database/db.js';
import { parsePublicHttpUrl } from '../src/utils/urlSecurity.js';
import { auditWebsite } from '../src/services/seoService.js';

let server; let baseUrl;
test('published package exports expected version and API', () => {
  assert.equal(VERSION, '1.1.1');
  for (const fn of [analyzeHtml, analyzePage, calculateScore, generateMeta, generateOpenGraph, generateTwitterCard, generateSitemap, generateSitemapIndex, generateRobots, generateOrganization, generatePerson, generateArticle, generateProduct, generateBreadcrumbList, validateMeta]) assert.equal(typeof fn, 'function');
});

test('metadata generation and validation use package results', () => {
  const input = { title: 'A useful guide to technical SEO', description: 'Learn practical technical SEO checks for a fast, accessible, search friendly website.', canonical: 'https://example.com/guide', author: 'SEO Studio', robots: 'index, follow', openGraph: { title: 'Technical SEO guide', type: 'article', image: 'https://example.com/og.png' }, twitter: { card: 'summary_large_image', creator: '@seostudio' } };
  const result = generateMeta(input);
  assert.match(result.toHtml(), /<title>/);
  assert.equal(typeof generateOpenGraph(input.openGraph).toHtml(), 'string');
  assert.equal(typeof generateTwitterCard(input.twitter).toHtml(), 'string');
  const validation = validateMeta(input);
  assert.equal(typeof validation.valid, 'boolean');
  assert.ok(Array.isArray(validation.errors));
});

test('sitemap, sitemap index, robots and structured data return toolkit output', () => {
  assert.match(generateSitemap([{ loc: '/', priority: 1 }], { hostname: 'https://example.com' }), /<urlset/);
  assert.match(generateSitemapIndex([{ loc: 'https://example.com/sitemap.xml' }]), /<sitemapindex/);
  assert.match(generateRobots({ rules: [{ userAgent: '*', disallow: ['/private'] }], sitemap: 'https://example.com/sitemap.xml' }), /Disallow: \/private/);
  for (const schema of [generateOrganization({ name: 'Example' }), generatePerson({ name: 'A Person' }), generateArticle({ headline: 'A headline' }), generateProduct({ name: 'A product' }), generateBreadcrumbList([{ name: 'Home', url: 'https://example.com' }])]) {
    assert.equal(typeof schema.toJSON(), 'object');
    assert.match(schema.toScript({ pretty: true }), /application\/ld\+json/);
  }
});

test('HTML analysis and score reflect supplied HTML', () => {
  const html = '<!doctype html><html><head><title>Technical SEO for teams and developers</title><meta name="description" content="A practical guide for technical search engine optimization improvements."><link rel="canonical" href="https://example.com/guide"><meta name="viewport" content="width=device-width"></head><body><h1>Technical SEO</h1><img src="/hero.png"></body></html>';
  const result = analyzeHtml(html);
  assert.equal(result.title.text, 'Technical SEO for teams and developers');
  assert.equal(result.headings.h1Count, 1);
  assert.equal(result.images.missingAlt, 1);
  assert.equal(calculateScore(result).score, result.score.score);
  assert.ok(result.issues.all.some((x) => x.code === 'IMAGES_MISSING_ALT'));
});

test('analyzePage crawls a mocked HTTP response through the actual package', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    const response = new Response('<html><head><title>Mock page title for testing</title><meta name="description" content="This mock page includes a useful description for package audit tests."></head><body><h1>Mock page</h1></body></html>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
    Object.defineProperty(response, 'url', { value: 'https://example.com/' });
    return response;
  };
  try {
    const report = await analyzePage('https://example.com');
    assert.equal(report.statusCode, 200);
    assert.equal(report.title.text, 'Mock page title for testing');
    assert.ok(report.score.score > 0);
  } finally { globalThis.fetch = original; }
});

test('server SEO service calls analyzePage through its guarded public-IP fetch', async () => {
  const oldLookup = dns.lookup;
  dns.lookup = async (_host, options) => options?.all ? [{ address: '93.184.216.34', family: 4 }] : { address: '93.184.216.34', family: 4 };
  const transport = async (url) => {
    const response = new Response('<html><head><title>A safe mocked public website</title><meta name="description" content="A useful page description for deterministic audit verification."></head><body><h1>Safe page</h1></body></html>', { status: 200, headers: { 'content-type': 'text/html' } });
    Object.defineProperty(response, 'url', { value: String(url) });
    return response;
  };
  try {
    const report = await auditWebsite('https://example.test/', { transport });
    assert.equal(report.statusCode, 200);
    assert.equal(report.title.text, 'A safe mocked public website');
  } finally { dns.lookup = oldLookup; }
});

test('server SEO service refuses a redirect that resolves to a private address', async () => {
  const oldLookup = dns.lookup; let requests = 0;
  dns.lookup = async (host, options) => {
    const address = host === 'public.example.test' ? '93.184.216.34' : '10.0.0.8';
    return options?.all ? [{ address, family: 4 }] : { address, family: 4 };
  };
  const transport = async () => { requests += 1; return new Response(null, { status: 302, headers: { location: 'http://private.example.test/admin' } }); };
  try { await assert.rejects(auditWebsite('https://public.example.test/', { transport }), /private|reserved/i); assert.equal(requests, 1); }
  finally { dns.lookup = oldLookup; }
});

test('URL security rejects local, private, and non-HTTP targets', () => {
  for (const url of ['http://localhost', 'http://127.0.0.1', 'http://10.0.0.2', 'http://169.254.169.254/latest/meta-data', 'ftp://example.com', 'http://[::1]']) assert.throws(() => parsePublicHttpUrl(url));
  assert.equal(parsePublicHttpUrl('https://example.com/path#frag').hash, '');
});

test('REST API exposes health and rejects SSRF targets', async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);
  const audit = await fetch(`${baseUrl}/audit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: 'http://127.0.0.1/private' }) });
  assert.equal(audit.status, 400);
  assert.match((await audit.json()).error, /private|public/i);
});

test('production server serves the built client shell for frontend routes', { skip: !fs.existsSync(path.resolve(process.cwd(), '../client/dist/index.html')) }, async () => {
  const response = await fetch(`${baseUrl.replace('/api', '')}/history`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.match(await response.text(), /SEO Studio/);
});

test('REST generator endpoints return package generated outputs', async () => {
  const send = async (path, data) => { const response = await fetch(`${baseUrl}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) }); return { response, body: await response.json() }; };
  const meta = await send('/meta/generate', { title: 'A technical SEO guide for teams', description: 'Explore technical search engine optimization with practical details.', canonical: 'https://example.com/seo' });
  assert.equal(meta.response.status, 200); assert.match(meta.body.html, /<title>/); assert.equal(typeof meta.body.validation.valid, 'boolean');
  const sitemap = await send('/sitemap/generate', { hostname: 'https://example.com', routes: [{ loc: '/', priority: 1, changefreq: 'daily' }] });
  assert.match(sitemap.body.xml, /<urlset/);
  const robots = await send('/robots/generate', { rules: [{ userAgent: '*', allow: ['/'], disallow: ['/admin'] }] });
  assert.match(robots.body.content, /Disallow: \/admin/);
  const schema = await send('/schema/generate', { type: 'Organization', data: { name: 'Example Company' } });
  assert.equal(schema.body.json['@type'], 'Organization');
});

test('SQLite audit report persistence stores and reloads complete report JSON', () => {
  const report = { url: 'https://example.com', finalUrl: 'https://example.com/', auditedAt: new Date().toISOString(), score: { score: 84, rating: 'Good' }, issues: { all: [], errors: [], warnings: [] }, title: { text: 'A page title' } };
  const id = auditStore.create(report);
  const stored = auditStore.get(id);
  assert.equal(stored.report.title.text, 'A page title');
  assert.equal(stored.score, 84);
  const reopened = new Database(path.resolve(process.env.DATABASE_PATH || './data/seo-studio.sqlite'), { readonly: true });
  const fromDisk = JSON.parse(reopened.prepare('SELECT report_json FROM audit_reports WHERE id = ?').get(id).report_json);
  reopened.close();
  assert.equal(fromDisk.title.text, 'A page title');
  assert.ok(auditStore.summary().websites >= 1);
  assert.equal(auditStore.delete(id), true);
});

after(() => { if (server) server.close(); });
