const SESSION_ID = Math.random().toString(36).slice(2, 10);
const FLUSH_INTERVAL = 4000;
const MAX_BATCH = 30;
const MAX_STR = 400;

interface LogEntry {
  ts: string;
  type: 'log' | 'warn' | 'error' | 'info' | 'click' | 'global_error' | 'unhandled_rejection' | 'route' | 'network';
  msg: string;
  url: string;
  sid: string;
  stack?: string;
  extra?: Record<string, unknown>;
}

const buffer: LogEntry[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function ts() { return new Date().toISOString(); }

function safe(v: unknown, depth = 0): string {
  if (depth > 2) return '[…]';
  try {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (typeof v === 'string') return v.slice(0, MAX_STR);
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (v instanceof Error) return `${v.name}: ${v.message}`;
    if (typeof v === 'object') return JSON.stringify(v).slice(0, MAX_STR);
    return String(v).slice(0, MAX_STR);
  } catch { return '[unstringifiable]'; }
}

function push(entry: LogEntry) {
  buffer.push(entry);
  if (buffer.length >= MAX_BATCH) flush();
  else if (!timer) timer = setTimeout(flush, FLUSH_INTERVAL);
}

function flush() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (!buffer.length) return;
  const entries = buffer.splice(0, buffer.length);
  fetch('/api/debug/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ entries }),
    keepalive: true,
  }).catch(() => {});
}

export function initDebugLogger() {
  const _log   = console.log.bind(console);
  const _warn  = console.warn.bind(console);
  const _error = console.error.bind(console);
  const _info  = console.info.bind(console);

  console.log   = (...a) => { _log(...a);   push({ ts: ts(), type: 'log',   msg: a.map(x => safe(x)).join(' '), url: location.href, sid: SESSION_ID }); };
  console.warn  = (...a) => { _warn(...a);  push({ ts: ts(), type: 'warn',  msg: a.map(x => safe(x)).join(' '), url: location.href, sid: SESSION_ID }); };
  console.error = (...a) => { _error(...a); push({ ts: ts(), type: 'error', msg: a.map(x => safe(x)).join(' '), url: location.href, sid: SESSION_ID }); };
  console.info  = (...a) => { _info(...a);  push({ ts: ts(), type: 'info',  msg: a.map(x => safe(x)).join(' '), url: location.href, sid: SESSION_ID }); };

  window.onerror = (msg, src, line, col, err) => {
    push({ ts: ts(), type: 'global_error', msg: String(msg), url: location.href, sid: SESSION_ID,
      stack: err?.stack?.slice(0, 600), extra: { src, line, col } });
    return false;
  };

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    push({ ts: ts(), type: 'unhandled_rejection',
      msg: reason?.message || String(reason) || 'Unhandled promise rejection',
      url: location.href, sid: SESSION_ID, stack: reason?.stack?.slice(0, 600) });
  });

  document.addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    if (!el) return;
    const tag  = el.tagName?.toLowerCase() ?? '?';
    const id   = el.id ? `#${el.id}` : '';
    const cls  = typeof el.className === 'string' && el.className
      ? `.${el.className.trim().split(/\s+/)[0]}` : '';
    const text = (el.textContent ?? '').trim().slice(0, 50);
    push({ ts: ts(), type: 'click', msg: `<${tag}${id}${cls}> "${text}"`, url: location.href, sid: SESSION_ID });
  }, true);

  const _push = history.pushState.bind(history);
  history.pushState = (...args: Parameters<typeof history.pushState>) => {
    _push(...args);
    push({ ts: ts(), type: 'route', msg: `→ ${String(args[2] ?? location.href)}`, url: location.href, sid: SESSION_ID });
  };

  const _replace = history.replaceState.bind(history);
  history.replaceState = (...args: Parameters<typeof history.replaceState>) => {
    _replace(...args);
    push({ ts: ts(), type: 'route', msg: `replace → ${String(args[2] ?? location.href)}`, url: location.href, sid: SESSION_ID });
  };

  const _fetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
    if (url.includes('/api/debug/logs')) return _fetch(...args);
    try {
      const res = await _fetch(...args);
      if (!res.ok) {
        push({ ts: ts(), type: 'network', msg: `${(args[1] as RequestInit)?.method ?? 'GET'} ${url} → ${res.status} ${res.statusText}`,
          url: location.href, sid: SESSION_ID });
      }
      return res;
    } catch (err: any) {
      push({ ts: ts(), type: 'network', msg: `${(args[1] as RequestInit)?.method ?? 'GET'} ${url} → FAILED: ${err?.message}`,
        url: location.href, sid: SESSION_ID });
      throw err;
    }
  };

  window.addEventListener('beforeunload', flush);

  push({ ts: ts(), type: 'log', msg: `[debug-logger] session ${SESSION_ID} started`, url: location.href, sid: SESSION_ID });
}
