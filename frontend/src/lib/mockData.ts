// Mock backend with localStorage persistence
const STORAGE_KEY = 'redon3_mock_db_v1';

export interface MockUser {
  id: string;
  email: string;
  password: string;
  fullName: string;
  role: 'user' | 'admin';
  status: string;
  emailVerified: boolean;
  totpEnabled: boolean;
  hasCompletedOnboarding: boolean;
  plan: string | null;
  createdAt: string;
  lastLoginAt?: string;
}

export interface MockBot {
  id: string;
  userId: string;
  name: string;
  language: 'nodejs' | 'python';
  status: 'running' | 'stopped' | 'crashed' | 'starting';
  startupFile: string;
  ramMb: number;
  cpu: number;
  uptime: number;
  restarts: number;
  createdAt: string;
  envVars: { key: string; value: string }[];
  files: { path: string; content: string; type: 'file' | 'folder' }[];
}

export interface MockPayment {
  id: string;
  userId: string;
  amount: number;
  status: 'success' | 'pending' | 'failed';
  type: string;
  plan: string;
  createdAt: string;
  reference: string;
}

export interface MockNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface MockDB {
  users: MockUser[];
  bots: MockBot[];
  payments: MockPayment[];
  notifications: MockNotification[];
  currentUserId: string | null;
  coupons: { id: string; code: string; discount: number; active: boolean; usedCount: number; maxUses: number }[];
  trialCodes: { id: string; code: string; days: number; used: boolean; createdAt: string }[];
  auditLog: { id: string; userId: string; action: string; meta: Record<string, unknown>; createdAt: string }[];
  freeTrial: { enabled: boolean; days: number };
  plans: { id: string; name: string; priceKobo: number; botLimit: number; ramPerBotMb: number; cpuPerBot: number; storageGb: number; features: Record<string, boolean> }[];
}

const PLANS = [
  { id: 'starter', name: 'Starter', priceKobo: 199900, botLimit: 1, ramPerBotMb: 256, cpuPerBot: 0.2, storageGb: 1, features: { alerts: false, autoRestart: false, prioritySupport: false } },
  { id: 'developer', name: 'Developer', priceKobo: 499900, botLimit: 3, ramPerBotMb: 1024, cpuPerBot: 1.0, storageGb: 3, features: { alerts: true, autoRestart: true, prioritySupport: true } },
  { id: 'pro', name: 'Pro', priceKobo: 899900, botLimit: 8, ramPerBotMb: 4096, cpuPerBot: 2.0, storageGb: 10, features: { alerts: true, autoRestart: true, prioritySupport: true, analytics: true } },
];

function seed(): MockDB {
  const now = new Date().toISOString();
  const adminId = 'usr_admin';
  const demoId = 'usr_demo';
  return {
    currentUserId: null,
    plans: PLANS,
    freeTrial: { enabled: true, days: 7 },
    users: [
      { id: adminId, email: 'admin@redon3.com', password: 'admin123', fullName: 'Admin', role: 'admin', status: 'active', emailVerified: true, totpEnabled: false, hasCompletedOnboarding: true, plan: 'pro', createdAt: now },
      { id: demoId, email: 'demo@redon3.com', password: 'demo1234', fullName: 'Demo User', role: 'user', status: 'active', emailVerified: true, totpEnabled: false, hasCompletedOnboarding: true, plan: 'developer', createdAt: now },
    ],
    bots: [
      mkBot(demoId, 'discord-music-bot', 'nodejs', 'running', 142),
      mkBot(demoId, 'price-alert-bot', 'python', 'stopped', 0),
      mkBot(demoId, 'analytics-scraper', 'nodejs', 'crashed', 8),
    ],
    payments: [
      { id: 'pay_1', userId: demoId, amount: 499900, status: 'success', type: 'subscription', plan: 'developer', createdAt: now, reference: 'ps_ref_001' },
    ],
    notifications: [
      { id: 'n1', userId: demoId, type: 'info', title: 'Welcome to Redon3', message: 'Your panel is ready. Deploy your first bot now.', read: false, createdAt: now },
      { id: 'n2', userId: demoId, type: 'warning', title: 'Bot crashed', message: 'analytics-scraper exited unexpectedly.', read: false, createdAt: now },
    ],
    coupons: [{ id: 'c1', code: 'LAUNCH20', discount: 20, active: true, usedCount: 12, maxUses: 100 }],
    trialCodes: [{ id: 't1', code: 'WELCOME7', days: 7, used: false, createdAt: now }],
    auditLog: [{ id: 'al1', userId: adminId, action: 'login', meta: {}, createdAt: now }],
  };
}

function mkBot(userId: string, name: string, lang: 'nodejs' | 'python', status: MockBot['status'], uptime: number): MockBot {
  return {
    id: 'bot_' + Math.random().toString(36).slice(2, 10),
    userId, name, language: lang, status,
    startupFile: lang === 'nodejs' ? 'index.js' : 'main.py',
    ramMb: 128 + Math.floor(Math.random() * 256),
    cpu: Math.random() * 0.5,
    uptime,
    restarts: Math.floor(Math.random() * 5),
    createdAt: new Date().toISOString(),
    envVars: [{ key: 'API_KEY', value: 'sk-demo-1234' }, { key: 'NODE_ENV', value: 'production' }],
    files: [
      { path: lang === 'nodejs' ? 'index.js' : 'main.py', type: 'file', content: lang === 'nodejs' ? "console.log('Hello from Redon3');\n" : "print('Hello from Redon3')\n" },
      { path: 'package.json', type: 'file', content: '{"name":"' + name + '","version":"1.0.0"}' },
      { path: 'README.md', type: 'file', content: '# ' + name + '\n\nRunning on Redon3.' },
    ],
  };
}

let db: MockDB | null = null;

export function getDB(): MockDB {
  if (db) return db;
  if (typeof window === 'undefined') { db = seed(); return db; }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { db = JSON.parse(raw) as MockDB; return db; }
  } catch {}
  db = seed();
  saveDB();
  return db;
}

export function saveDB() {
  if (typeof window === 'undefined' || !db) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch {}
}

export function resetDB() {
  db = seed();
  saveDB();
}

export function uid(prefix = 'id'): string {
  return prefix + '_' + Math.random().toString(36).slice(2, 11);
}
