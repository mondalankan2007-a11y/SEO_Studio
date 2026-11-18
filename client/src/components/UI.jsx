import { AlertCircle, Check, Clipboard, Download, LoaderCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function Card({ children, className = '' }) { return <section className={`panel ${className}`}>{children}</section>; }
export function SectionTitle({ title, detail, action }) { return <div className="section-title"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action}</div>; }
export function Button({ children, onClick, variant = 'primary', disabled = false, className = '', type = 'button' }) { return <button type={type} disabled={disabled} onClick={onClick} className={`button button-${variant} ${className}`}>{children}</button>; }
export function Field({ label, hint, children, className = '' }) { return <label className={`field ${className}`}><span className="field-label">{label}</span>{children}{hint && <span className="field-hint">{hint}</span>}</label>; }
export function Input(props) { return <input className="input" {...props} />; }
export function Textarea(props) { return <textarea className="input textarea" {...props} />; }
export function Select(props) { return <select className="input select" {...props} />; }
export function EmptyState({ icon: Icon = AlertCircle, title, detail, action }) { return <div className="empty-state"><div className="empty-icon"><Icon size={21} /></div><h3>{title}</h3><p>{detail}</p>{action}</div>; }
export function Spinner({ label = 'Working…' }) { return <span className="spinner-wrap"><LoaderCircle size={16} className="spin" />{label}</span>; }
export async function copyText(text, name = 'Copied') { try { await navigator.clipboard.writeText(text); toast.success(`${name} copied to clipboard`); } catch { toast.error('Clipboard access is unavailable'); } }
export function downloadText(text, filename, type = 'text/plain') { const blob = new Blob([text], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }
export function CopyButton({ text, label = 'Copy' }) { return <Button variant="secondary" onClick={() => copyText(text)}><Clipboard size={14} />{label}</Button>; }
export function DownloadButton({ text, filename, type }) { return <Button variant="secondary" onClick={() => downloadText(text, filename, type)}><Download size={14} />Download</Button>; }
export function ScoreRing({ score = 0, size = 96 }) { return <div className="score-ring" style={{ '--score': `${Math.max(0, Math.min(100, score))}%`, width: size, height: size }}><div className="score-ring-inner"><strong>{score}</strong><span>of 100</span></div></div>; }
export function StatusTag({ children, tone = 'neutral' }) { return <span className={`status-tag tag-${tone}`}><i />{children}</span>; }
export function IssueRow({ issue, index = 0 }) { const tone = issue.type === 'error' ? 'error' : issue.type === 'warning' ? 'warning' : 'info'; return <div className="issue-row"><div className={`issue-bullet issue-${tone}`}>{tone === 'error' ? '!' : tone === 'warning' ? '!' : 'i'}</div><div className="issue-copy"><div><strong>{issue.code?.replaceAll('_', ' ') || `Finding ${index + 1}`}</strong><span className={`severity severity-${tone}`}>{issue.type || 'info'}</span></div><p>{issue.message}</p></div></div>; }
