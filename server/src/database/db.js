import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const configuredPath = process.env.DATABASE_PATH || './data/seo-studio.sqlite';
const dbPath = path.resolve(process.cwd(), configuredPath);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS audit_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    final_url TEXT NOT NULL,
    audited_at TEXT NOT NULL,
    score INTEGER NOT NULL,
    rating TEXT NOT NULL,
    issue_count INTEGER NOT NULL,
    error_count INTEGER NOT NULL,
    warning_count INTEGER NOT NULL,
    report_json TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_audit_reports_date ON audit_reports(audited_at DESC);
  CREATE INDEX IF NOT EXISTS idx_audit_reports_url ON audit_reports(url);
`);

export const auditStore = {
  create(report) {
    const result = db.prepare(`INSERT INTO audit_reports
      (url, final_url, audited_at, score, rating, issue_count, error_count, warning_count, report_json)
      VALUES (@url, @finalUrl, @auditedAt, @score, @rating, @issueCount, @errorCount, @warningCount, @reportJson)`)
      .run({
        url: report.url, finalUrl: report.finalUrl, auditedAt: report.auditedAt,
        score: report.score.score, rating: report.score.rating,
        issueCount: report.issues.all.length, errorCount: report.issues.errors.length,
        warningCount: report.issues.warnings.length, reportJson: JSON.stringify(report)
      });
    return Number(result.lastInsertRowid);
  },
  get(id) {
    const row = db.prepare('SELECT * FROM audit_reports WHERE id = ?').get(id);
    return row ? { ...row, report: JSON.parse(row.report_json) } : null;
  },
  list({ q = '', from, to, sort = 'date', order = 'desc' } = {}) {
    const clauses = [];
    const values = {};
    if (q) { clauses.push('(url LIKE @q OR final_url LIKE @q)'); values.q = `%${q}%`; }
    if (from) { clauses.push('audited_at >= @from'); values.from = `${from}T00:00:00.000Z`; }
    if (to) { clauses.push('audited_at <= @to'); values.to = `${to}T23:59:59.999Z`; }
    const sortColumn = sort === 'score' ? 'score' : 'audited_at';
    const direction = order === 'asc' ? 'ASC' : 'DESC';
    return db.prepare(`SELECT id, url, final_url, audited_at, score, rating, issue_count, error_count, warning_count
      FROM audit_reports ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
      ORDER BY ${sortColumn} ${direction}, id DESC LIMIT 250`).all(values);
  },
  delete(id) { return db.prepare('DELETE FROM audit_reports WHERE id = ?').run(id).changes > 0; },
  summary() {
    const summary = db.prepare(`SELECT COUNT(*) AS audits, COALESCE(AVG(score), 0) AS averageScore,
      COALESCE(SUM(issue_count), 0) AS issues, COALESCE(SUM(score = 100), 0) AS perfect
      FROM audit_reports`).get();
    const reports = db.prepare('SELECT url, report_json FROM audit_reports').all();
    summary.websites = new Set(reports.map((row) => { try { return new URL(row.url).hostname.toLowerCase(); } catch { return row.url; } })).size;
    summary.successfulChecks = reports.reduce((total, row) => {
      const report = JSON.parse(row.report_json);
      return total + Object.values(report.score?.breakdown || {}).filter((item) => item.passed).length;
    }, 0);
    return summary;
  }
};
