export async function copyText(value, toast) { try { await navigator.clipboard.writeText(value); toast.success('Copied to clipboard'); } catch { toast.error('Clipboard access is unavailable in this browser.'); } }
export function downloadText(name, value, type = 'text/plain;charset=utf-8') { const blob = new Blob([value], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }
export function parseJson(value) { try { return JSON.parse(value); } catch { return null; } }
