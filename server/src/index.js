import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '127.0.0.1';
createApp().listen(port, host, () => console.log(`SEO Studio API listening on http://${host}:${port}`));
