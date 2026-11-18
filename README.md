# SEO Studio

**Your Website's SEO Command Center.** SEO Studio is a full-stack application for running technical SEO audits, generating search assets, and keeping a persistent history of a website's SEO health.

**Powered by [`@ankan_/seo-toolkit`](https://www.npmjs.com/package/@ankan_/seo-toolkit)** — the published package is installed and imported directly by the backend as the application's SEO engine.

Repository: [github.com/mondalankan2007-a11y/SEO_Studio](https://github.com/mondalankan2007-a11y/SEO_Studio)

## Screenshots

Screenshots can be added to `docs/screenshots/` and linked here. The interface uses a dark, responsive layout with an overview dashboard, audit report tabs, generator workspaces, and history comparison.

## Features

- **Website audits:** calls the package's `analyzePage()` against a public HTTP/HTTPS page and displays the package's score breakdown, metadata, headings, image findings, Open Graph properties, structured data, response information, and issues.
- **Safe audit fetching:** validates schemes and hosts, blocks private/reserved IPs, resolves DNS before each request, pins requests to the validated address, checks redirect targets, limits redirects and response size, applies timeouts, and rate limits the API.
- **Persistent history:** stores complete report JSON in SQLite; search by URL, filter by date, sort by score or date, reopen and delete reports, and compare two audits.
- **Meta generator:** uses `generateMeta()`, `validateMeta()`, `generateOpenGraph()`, and `generateTwitterCard()`; provides HTML, validation feedback, copy/download actions, and a social preview.
- **Sitemap generator:** uses `generateSitemap()` and `generateSitemapIndex()` for route and sitemap-index XML.
- **Robots generator:** uses `generateRobots()` for multiple crawler groups and directives.
- **Schema generator:** uses the package's Organization, Person, Article, Product, and BreadcrumbList functions to create JSON-LD.
- **Data based dashboard:** dashboard statistics, the score trend, and recent reports come from persisted audit records. Empty history displays a first-run state rather than sample statistics.

The toolkit currently reports Open Graph fields, but does not expose a Twitter Card audit function in its installed API. SEO Studio therefore displays the social analysis the package actually provides and does not claim that Twitter tags were audited.

## Technology stack

- React, Vite, Tailwind CSS, React Router, Lucide React, Recharts, Axios, and React Hot Toast
- Node.js and Express
- `@ankan_/seo-toolkit` 1.1.1
- SQLite through `better-sqlite3`
- Zod input validation, Helmet security headers, and `express-rate-limit`

## Architecture

```text
client/                         React single page application
  src/pages/                    Dashboard, audit, generators, history, settings
  src/lib/api.js                HTTP client and API error handling
server/src/
  routes/api.js                 REST route definitions
  controllers/apiController.js  Request validation and response orchestration
  services/seoService.js        Direct integration with @ankan_/seo-toolkit
  middleware/                   Reserved for shared Express middleware
  database/db.js                SQLite setup and parameterized audit queries
  utils/urlSecurity.js          URL validation, DNS resolution, IP range checks
server/test/                    Package, security, API, and persistence tests
```

The client never imports the SEO package. All generation and analysis calls go through the Express API. The report JSON stored in SQLite is the package output plus the audit timestamp; dashboard summaries are calculated from those stored reports.

## Requirements

- Node.js 20.19 or newer (the Vite version in the lockfile requires a modern Node runtime)
- npm

## Installation

```bash
git clone https://github.com/mondalankan2007-a11y/SEO_Studio.git
cd SEO_Studio
npm install
cp .env.example .env
```

`npm install` installs the published package through the `server` workspace. No local copy or reimplementation of its SEO functions is used.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8787` | Express API port |
| `HOST` | `127.0.0.1` | API bind address |
| `DATABASE_PATH` | `./data/seo-studio.sqlite` | SQLite database location |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed browser origin; multiple comma separated origins are supported |

No API secrets are required. The `.env` file and SQLite database are excluded from Git.

## Development

```bash
npm run dev
```

This starts the API at `http://127.0.0.1:8787` and the Vite client at `http://localhost:5173`. Vite proxies `/api` requests to the API.

## Production build and run

```bash
npm run build
npm start
```

After the client build, `npm start` serves both the API and built client from Express. Configure `CLIENT_ORIGIN`, `HOST`, and `DATABASE_PATH` for the deployment environment. A reverse proxy or static CDN can also serve `client/dist` and route `/api` to Express. Authentication and multi-tenant accounts are not included in this single-workspace application.

## Testing

```bash
npm test
```

The backend test suite uses Node's test runner. It covers installed package exports and outputs, `analyzeHtml()`, `analyzePage()` with deterministic mocked responses, guarded redirect behavior, URL/SSRF rejection, generator API routes, and SQLite report persistence. It does not make real external website requests.

## API

All API routes are prefixed with `/api`. JSON request bodies are limited to 256 KB. Common errors use `{ "error": "..." }` responses.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Service health |
| `GET` | `/api/summary` | Persisted dashboard statistics and recent audits |
| `POST` | `/api/audit` | Analyze and persist a public page; body: `{ "url": "https://example.com" }` |
| `GET` | `/api/audit/:id` | Retrieve the complete saved report |
| `GET` | `/api/history?q=&from=&to=&sort=date&order=desc` | Search, filter, and sort report summaries |
| `DELETE` | `/api/history/:id` | Delete a saved report |
| `POST` | `/api/meta/generate` | Generate metadata HTML and return package validation |
| `POST` | `/api/meta/validate` | Validate metadata with `validateMeta()` |
| `POST` | `/api/sitemap/generate` | Generate a URL sitemap or sitemap index |
| `POST` | `/api/robots/generate` | Generate robots.txt content |
| `POST` | `/api/schema/generate` | Generate JSON-LD and script-tag preview |

Example generator requests:

```json
POST /api/sitemap/generate
{
  "hostname": "https://example.com",
  "routes": [{ "loc": "/", "changefreq": "daily", "priority": 1 }]
}
```

```json
POST /api/schema/generate
{
  "type": "Organization",
  "data": { "name": "Example Company", "url": "https://example.com" }
}
```

## NPM package integration

SEO Studio is powered by the published [`@ankan_/seo-toolkit`](https://www.npmjs.com/package/@ankan_/seo-toolkit) package. The installed version is **1.1.1**. Its exports and declaration file were inspected before integration. The app imports and calls the package from `server/src/services/seoService.js`, including:

```js
import { analyzePage, generateMeta, validateMeta, generateOpenGraph,
  generateTwitterCard, generateSitemap, generateSitemapIndex, generateRobots,
  generateOrganization, generatePerson, generateArticle, generateProduct,
  generateBreadcrumbList } from '@ankan_/seo-toolkit';

const report = await analyzePage('https://example.com', { timeout: 12000 });
const meta = generateMeta({ title: 'Example page', description: 'Page summary.' });
const sitemap = generateSitemap([{ loc: '/' }], { hostname: 'https://example.com' });
```

The live crawl service calls `analyzePage()` directly. It temporarily supplies a server-side guarded fetch implementation because the package's crawler follows redirects using Node's global `fetch`; redirects are validated and each DNS result is checked and pinned before opening a connection.

## Future improvements

- Authentication, teams, and per-tenant audit history
- Scheduled recurring audits and notifications
- Multi-page crawling and sitemap discovery
- Exportable audit reports
- Additional SEO checks as the published toolkit adds them
