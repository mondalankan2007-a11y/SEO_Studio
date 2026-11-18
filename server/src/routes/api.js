import { Router } from 'express';
import { deleteHistory, getAudit, getHistory, getSummary, postAudit, postMeta, postRobots, postSchema, postSitemap, validateMeta } from '../controllers/apiController.js';

const router = Router();
router.get('/health', (_req, res) => res.json({ ok: true, service: 'SEO Studio API' }));
router.get('/summary', getSummary);
router.post('/audit', postAudit);
router.get('/audit/:id', getAudit);
router.get('/history', getHistory);
router.delete('/history/:id', deleteHistory);
router.post('/meta/generate', postMeta);
router.post('/meta/validate', validateMeta);
router.post('/sitemap/generate', postSitemap);
router.post('/robots/generate', postRobots);
router.post('/schema/generate', postSchema);
export default router;
