// Mock axios-like API client. Drop-in for the previous `api` axios instance.
// Returns { data } responses, throws { response: { status, data } } on errors.
import { getDB, saveDB, uid, type MockBot, type MockUser } from './mockData';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((res) => setTimeout(() => res(value), ms));
}

function fail(status: number, message: string): never {
  const err: { response: { status: number; data: { message: string } }; message: string } = {
    response: { status, data: { message } },
    message,
  };
  throw err;
}

function currentUser(): MockUser | null {
  const d = getDB();
  if (!d.currentUserId) return null;
  return d.users.find((u) => u.id === d.currentUserId) ?? null;
}

function publicUser(u: MockUser) {
  const { password, ...rest } = u;
  void password;
  return rest;
}

interface Req { url: string; method: Method; data?: unknown; params?: Record<string, string | number> }

async function route(req: Req): Promise<unknown> {
  const d = getDB();
  const u = (() => {
    const url = req.url.split('?')[0];
    return url.startsWith('/') ? url : '/' + url;
  })();
  const m = req.method;
  const body = (req.data ?? {}) as Record<string, unknown>;

  // ── AUTH ─────────────────────────────────────────────────────
  if (u === '/auth/me' && m === 'GET') {
    const me = currentUser();
    if (!me) fail(401, 'Not authenticated');
    return publicUser(me!);
  }
  if (u === '/auth/login' && m === 'POST') {
    const user = d.users.find((x) => x.email.toLowerCase() === String(body.email ?? '').toLowerCase());
    if (!user || user.password !== body.password) fail(401, 'Invalid email or password');
    d.currentUserId = user!.id;
    user!.lastLoginAt = new Date().toISOString();
    saveDB();
    return { user: publicUser(user!), requiresTwoFa: false };
  }
  if (u === '/auth/logout' && m === 'POST') {
    d.currentUserId = null; saveDB(); return { ok: true };
  }
  if (u === '/auth/register' && m === 'POST') {
    const email = String(body.email ?? '').toLowerCase();
    if (d.users.some((x) => x.email.toLowerCase() === email)) fail(400, 'Email already registered');
    const user: MockUser = {
      id: uid('usr'), email,
      password: String(body.password ?? ''),
      fullName: String(body.fullName ?? body.name ?? 'New User'),
      role: 'user', status: 'active', emailVerified: false, totpEnabled: false,
      hasCompletedOnboarding: false, plan: null, createdAt: new Date().toISOString(),
    };
    d.users.push(user); d.currentUserId = user.id; saveDB();
    return { user: publicUser(user) };
  }
  if (u === '/auth/2fa/verify' && m === 'POST') return { ok: true };
  if (u === '/auth/forgot-password' && m === 'POST') return { ok: true };
  if (u === '/auth/reset-password' && m === 'POST') return { ok: true };
  if (u === '/auth/resend-verification' && m === 'POST') return { ok: true };
  if (u === '/auth/change-password' && m === 'POST') {
    const me = currentUser(); if (!me) fail(401, 'Not authenticated');
    if (me!.password !== body.currentPassword) fail(400, 'Current password incorrect');
    me!.password = String(body.newPassword ?? ''); saveDB();
    return { ok: true };
  }

  // ── SETTINGS / PUBLIC ────────────────────────────────────────
  if (u === '/settings/free-trial' && m === 'GET') return d.freeTrial;
  if (u === '/settings/free-trial' && m === 'PUT') { d.freeTrial = { ...d.freeTrial, ...body }; saveDB(); return d.freeTrial; }
  if (u === '/billing/plans' && m === 'GET') return d.plans;

  // require auth past here
  const me = currentUser();
  if (!me) fail(401, 'Not authenticated');

  // ── ACCOUNT ──────────────────────────────────────────────────
  if (u === '/account/profile' && m === 'PATCH') {
    Object.assign(me!, { fullName: body.fullName ?? me!.fullName }); saveDB();
    return publicUser(me!);
  }

  // ── DASHBOARD ────────────────────────────────────────────────
  if (u === '/dashboard/summary' && m === 'GET') {
    const myBots = d.bots.filter((b) => b.userId === me!.id);
    return {
      totalBots: myBots.length,
      runningBots: myBots.filter((b) => b.status === 'running').length,
      crashedBots: myBots.filter((b) => b.status === 'crashed').length,
      totalRamMb: myBots.reduce((s, b) => s + b.ramMb, 0),
      uptimePercent: 99.94,
      plan: d.plans.find((p) => p.id === me!.plan) ?? null,
      recentActivity: d.notifications.filter((n) => n.userId === me!.id).slice(0, 5),
    };
  }

  // ── BOTS ─────────────────────────────────────────────────────
  if (u === '/bots' && m === 'GET') return d.bots.filter((b) => b.userId === me!.id);
  if (u === '/bots' && m === 'POST') {
    const b: MockBot = {
      id: uid('bot'), userId: me!.id,
      name: String(body.name ?? 'new-bot'),
      language: (body.language as 'nodejs' | 'python') ?? 'nodejs',
      status: 'stopped',
      startupFile: body.language === 'python' ? 'main.py' : 'index.js',
      ramMb: 0, cpu: 0, uptime: 0, restarts: 0,
      createdAt: new Date().toISOString(),
      envVars: [],
      files: [
        { path: body.language === 'python' ? 'main.py' : 'index.js', type: 'file', content: '// your code here\n' },
      ],
    };
    d.bots.push(b); saveDB(); return b;
  }
  const botMatch = u.match(/^\/bots\/([^/]+)(\/(.+))?$/);
  if (botMatch) {
    const bot = d.bots.find((b) => b.id === botMatch[1] && b.userId === me!.id);
    if (!bot) fail(404, 'Bot not found');
    const sub = botMatch[3];
    if (!sub && m === 'GET') return bot;
    if (!sub && m === 'PATCH') { Object.assign(bot!, body); saveDB(); return bot; }
    if (!sub && m === 'DELETE') { d.bots = d.bots.filter((b) => b.id !== bot!.id); saveDB(); return { ok: true }; }
    if (sub === 'start' && m === 'POST') { bot!.status = 'running'; bot!.uptime = 1; saveDB(); return bot; }
    if (sub === 'stop' && m === 'POST') { bot!.status = 'stopped'; bot!.uptime = 0; saveDB(); return bot; }
    if (sub === 'restart' && m === 'POST') { bot!.status = 'running'; bot!.restarts++; bot!.uptime = 1; saveDB(); return bot; }
    if (sub === 'files' && m === 'GET') return bot!.files;
    if (sub === 'files/content' && m === 'GET') {
      const path = String((req.params?.path) ?? body.path ?? '');
      const f = bot!.files.find((x) => x.path === path);
      return { path, content: f?.content ?? '' };
    }
    if (sub === 'files/content' && m === 'PUT') {
      const path = String(body.path ?? '');
      const f = bot!.files.find((x) => x.path === path);
      if (f) f.content = String(body.content ?? '');
      else bot!.files.push({ path, type: 'file', content: String(body.content ?? '') });
      saveDB(); return { ok: true };
    }
    if (sub === 'files/create' && m === 'POST') {
      bot!.files.push({ path: String(body.path), type: (body.type as 'file' | 'folder') ?? 'file', content: '' });
      saveDB(); return { ok: true };
    }
    if (sub === 'files/rename' && m === 'POST') {
      const f = bot!.files.find((x) => x.path === body.from);
      if (f) f.path = String(body.to); saveDB(); return { ok: true };
    }
    if (sub === 'files/clone' && m === 'POST') {
      const f = bot!.files.find((x) => x.path === body.path);
      if (f) bot!.files.push({ ...f, path: f.path + '.copy' }); saveDB(); return { ok: true };
    }
    if (sub === 'files' && m === 'DELETE') {
      bot!.files = bot!.files.filter((x) => x.path !== body.path); saveDB(); return { ok: true };
    }
    if (sub === 'files/upload' && m === 'POST') { saveDB(); return { ok: true }; }
  }

  // ── BILLING ──────────────────────────────────────────────────
  if (u === '/billing/payments' && m === 'GET') return d.payments.filter((p) => p.userId === me!.id);
  if (u === '/billing/subscription' && m === 'GET') {
    const plan = d.plans.find((p) => p.id === me!.plan);
    return plan ? { plan, status: 'active', renewsAt: new Date(Date.now() + 25 * 86400000).toISOString() } : null;
  }
  if (u === '/billing/checkout' && m === 'POST') {
    const plan = d.plans.find((p) => p.id === body.planId);
    if (!plan) fail(404, 'Plan not found');
    me!.plan = plan!.id;
    d.payments.unshift({ id: uid('pay'), userId: me!.id, amount: plan!.priceKobo, status: 'success', type: 'subscription', plan: plan!.id, createdAt: new Date().toISOString(), reference: 'ps_' + uid() });
    saveDB();
    return { free: true, checkoutUrl: null, message: 'Plan activated (demo mode)' };
  }
  if (u === '/billing/coupon/validate' && m === 'POST') {
    const c = d.coupons.find((x) => x.code === body.code && x.active);
    if (!c) fail(404, 'Invalid coupon');
    return { valid: true, discount: c!.discount };
  }

  // ── NOTIFICATIONS ────────────────────────────────────────────
  if (u === '/notifications' && m === 'GET') return d.notifications.filter((n) => n.userId === me!.id);
  if (u === '/notifications/mark-all-read' && m === 'POST') {
    d.notifications.forEach((n) => { if (n.userId === me!.id) n.read = true; }); saveDB(); return { ok: true };
  }
  const notifMatch = u.match(/^\/notifications\/([^/]+)\/read$/);
  if (notifMatch && m === 'PATCH') {
    const n = d.notifications.find((x) => x.id === notifMatch[1]); if (n) n.read = true; saveDB(); return { ok: true };
  }

  // ── ADMIN ────────────────────────────────────────────────────
  if (me!.role === 'admin') {
    if (u === '/admin/users' && m === 'GET') return { users: d.users.map(publicUser), total: d.users.length };
    if (u === '/admin/containers' && m === 'GET') return d.bots;
    if (u === '/admin/coupons' && m === 'GET') return d.coupons;
    if (u === '/admin/coupons' && m === 'POST') { const c = { id: uid('cpn'), code: String(body.code), discount: Number(body.discount), active: true, usedCount: 0, maxUses: Number(body.maxUses ?? 100) }; d.coupons.push(c); saveDB(); return c; }
    if (u === '/admin/trial-codes' && m === 'GET') return d.trialCodes;
    if (u === '/admin/trial-codes' && m === 'POST') { const c = { id: uid('tc'), code: String(body.code ?? 'TRIAL' + Math.floor(Math.random() * 9999)), days: Number(body.days ?? 7), used: false, createdAt: new Date().toISOString() }; d.trialCodes.push(c); saveDB(); return c; }
    if (u === '/admin/audit-log' && m === 'GET') return { entries: d.auditLog, total: d.auditLog.length };
    if (u === '/admin/payments' && m === 'GET') return { payments: d.payments, total: d.payments.length };
    if (u === '/admin/broadcast/email' && m === 'POST') return { ok: true, sent: d.users.length };
    if (u === '/admin/broadcast/notification' && m === 'POST') {
      d.users.forEach((u2) => d.notifications.push({ id: uid('n'), userId: u2.id, type: String(body.type ?? 'info'), title: String(body.title ?? ''), message: String(body.message ?? ''), read: false, createdAt: new Date().toISOString() }));
      saveDB(); return { ok: true };
    }
    const couponDel = u.match(/^\/admin\/coupons\/(.+)$/);
    if (couponDel && m === 'DELETE') { d.coupons = d.coupons.filter((c) => c.id !== couponDel[1]); saveDB(); return { ok: true }; }
    if (u.match(/^\/admin\/containers\/[^/]+\/force-(restart|stop)$/) && m === 'POST') return { ok: true };
    const userAction = u.match(/^\/admin\/users\/([^/]+)\/(.+)$/);
    if (userAction && m === 'POST') {
      const target = d.users.find((x) => x.id === userAction[1]); if (!target) fail(404, 'User not found');
      const action = userAction[2];
      if (action === 'ban') target!.status = 'banned';
      if (action === 'unban') target!.status = 'active';
      if (action === 'extend-plan') target!.plan = String(body.planId ?? target!.plan);
      saveDB(); return publicUser(target!);
    }
    const planPatch = u.match(/^\/admin\/plans\/(.+)$/);
    if (planPatch && m === 'PATCH') {
      const p = d.plans.find((x) => x.id === planPatch[1]); if (!p) fail(404, 'Plan not found');
      Object.assign(p!, body); saveDB(); return p;
    }
  }

  // ── DEBUG ────────────────────────────────────────────────────
  if (u === '/debug/logs' && m === 'GET') return { logs: [], total: 0 };
  if (u === '/debug/logs' && m === 'DELETE') return { ok: true };

  // unknown
  return delay({ ok: true });
}

function makeMethod(method: Method) {
  return async (url: string, dataOrConfig?: unknown, _config?: unknown) => {
    void _config;
    const config = (method === 'GET' || method === 'DELETE') ? (dataOrConfig as { params?: Record<string, string | number> } | undefined) : undefined;
    const data = (method === 'GET' || method === 'DELETE') ? undefined : dataOrConfig;
    const result = await route({ url, method, data, params: config?.params });
    return delay({ data: result }, 80);
  };
}

const mockApi = {
  get: makeMethod('GET'),
  post: makeMethod('POST'),
  put: makeMethod('PUT'),
  patch: makeMethod('PATCH'),
  delete: makeMethod('DELETE'),
};

export default mockApi;
