import { z } from 'zod';
import { auditStore } from '../database/db.js';
import { auditWebsite, createMeta, createRobots, createSchema, createSitemap } from '../services/seoService.js';
import { parsePublicHttpUrl } from '../utils/urlSecurity.js';

const publicHttpUrl = z.string().trim().min(1).max(2048).superRefine((value, ctx) => {
  try { parsePublicHttpUrl(value); } catch (error) { ctx.addIssue({ code: 'custom', message: error.message }); }
});
const httpUrl = z.string().trim().min(1).max(2048).superRefine((value, ctx) => {
  try { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error(); }
  catch { ctx.addIssue({ code: 'custom', message: 'Enter an absolute HTTP or HTTPS URL.' }); }
});
const metaSchema = z.object({
  title: z.string().max(300).optional().default(''), description: z.string().max(1000).optional().default(''),
  canonical: z.string().max(2048).optional().default(''), author: z.string().max(200).optional().default(''),
  robots: z.string().max(300).optional().default(''), keywords: z.union([z.string(), z.array(z.string())]).optional(),
  openGraph: z.object({ title: z.string().max(300).optional(), description: z.string().max(1000).optional(), url: z.string().max(2048).optional(), image: z.union([z.string(), z.object({ url: z.string(), alt: z.string().optional(), width: z.number().optional(), height: z.number().optional() })]).optional(), type: z.string().optional(), siteName: z.string().optional() }).optional(),
  twitter: z.object({ card: z.enum(['summary', 'summary_large_image', 'app', 'player']).optional(), title: z.string().max(300).optional(), description: z.string().max(1000).optional(), image: z.string().optional(), creator: z.string().optional(), site: z.string().optional() }).optional()
});

function parsed(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) { const e = new Error(result.error.issues.map((x) => x.message).join(' ')); e.status = 400; throw e; }
  return result.data;
}

export async function postAudit(req, res) {
  const { url } = parsed(z.object({ url: publicHttpUrl }), req.body);
  const report = await auditWebsite(url);
  const id = auditStore.create({ ...report, auditedAt: new Date().toISOString() });
  res.status(201).json({ id, ...auditStore.get(id).report });
}

export function getAudit(req, res) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid audit id.' });
  const item = auditStore.get(id);
  return item ? res.json({ id: item.id, ...item.report }) : res.status(404).json({ error: 'Audit report not found.' });
}

export function getHistory(req, res) {
  const query = parsed(z.object({ q: z.string().max(200).optional(), from: z.string().date().optional(), to: z.string().date().optional(), sort: z.enum(['date', 'score']).optional(), order: z.enum(['asc', 'desc']).optional() }), req.query);
  res.json({ reports: auditStore.list(query) });
}

export function deleteHistory(req, res) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid audit id.' });
  return auditStore.delete(id) ? res.status(204).end() : res.status(404).json({ error: 'Audit report not found.' });
}

export function getSummary(_req, res) {
  const summary = auditStore.summary();
  res.json({ ...summary, averageScore: Math.round(summary.averageScore), recent: auditStore.list({ sort: 'date', order: 'desc' }).slice(0, 8) });
}

export function postMeta(req, res) {
  const input = parsed(metaSchema, req.body);
  try { res.json(createMeta(input)); }
  catch (error) { error.status = 400; throw error; }
}

export function validateMeta(req, res) {
  const input = parsed(metaSchema, req.body);
  const { validation } = createMeta(input);
  res.json(validation);
}

const routeSchema = z.object({ loc: z.string().min(1).max(2048), lastmod: z.string().optional(), changefreq: z.enum(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']).optional(), priority: z.number().min(0).max(1).optional() });
export function postSitemap(req, res) {
  const inputSchema = z.object({ hostname: httpUrl.optional(), routes: z.array(routeSchema).max(50000).optional().default([]), indexEntries: z.array(z.object({ loc: httpUrl, lastmod: z.string().optional() })).max(1000).optional() });
  const input = parsed(inputSchema, req.body);
  if (!input.indexEntries?.length && (!input.hostname || !input.routes.length)) { const error = new Error('Add a website hostname and at least one route.'); error.status = 400; throw error; }
  try { res.json(createSitemap(input)); } catch (error) { error.status = 400; throw error; }
}

const robotsSchema = z.object({ rules: z.array(z.object({ userAgent: z.union([z.string(), z.array(z.string())]), allow: z.array(z.string()).optional(), disallow: z.array(z.string()).optional(), crawlDelay: z.number().min(0).max(120).optional() })).min(1).max(50), sitemap: z.union([httpUrl, z.array(httpUrl)]).optional(), host: z.string().max(255).optional() });
export function postRobots(req, res) {
  const input = parsed(robotsSchema, req.body);
  try { res.json({ content: createRobots(input) }); } catch (error) { error.status = 400; throw error; }
}

const schemaTypes = ['Organization', 'Person', 'Article', 'Product', 'BreadcrumbList'];
export function postSchema(req, res) {
  const { type, data } = parsed(z.object({ type: z.enum(schemaTypes), data: z.record(z.string(), z.unknown()) }), req.body);
  try { res.json(createSchema(type, data)); } catch (error) { error.status = 400; throw error; }
}
