# Redon3 — Panel Hosting Platform

Redon3 is a full-stack platform that lets developers deploy and run Node.js or Python scripts ("panels") in isolated Docker containers. Users sign up, get a free 7-day Basic plan, configure their panel, and deploy code — all through a browser.

---

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend    │────▶│  PostgreSQL  │
│  React/Vite  │     │  Express.js  │     │  Drizzle ORM │
│  Port 3000   │     │  Port 3001   │     │  Port 5432   │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                     ┌──────▼───────┐
                     │    Docker    │
                     │  Containers  │
                     └──────────────┘
```

### Frontend (`frontend/`)
- **React 19 + TypeScript + Vite 7**
- Tailwind CSS 4, Radix UI, shadcn-style components
- TanStack React Query for data fetching
- Socket.IO client for real-time logs and terminal
- CodeMirror 6 editor with JS + Python syntax highlighting (one-dark theme)
- Five tabs per panel: **Console**, **Logs**, **Files**, **Startup**, **Config**
- Console respects user scroll position — scroll up to freeze, down-arrow to jump to latest
- Error translation: detects common Docker/script errors and explains them in plain English
- Bottom nav hidden on panel detail page for more screen space

### Backend (`backend/`)
- **Node.js + Express 5 + TypeScript**
- esbuild bundles to a single `dist/index.mjs`
- JWT auth (access + refresh tokens), optional 2FA
- Paystack integration for billing
- Resend for transactional emails
- Pino logger

### Database (`lib/db/`)
- **PostgreSQL** with Drizzle ORM
- Tables: `users`, `bots`, `subscriptions`, `plans`, `payments`, `coupons`, `env_variables`, `container_stats`, `site_settings`, `audit_logs`, `notifications`

### Docker
- Each user panel gets a dedicated container: `bot_{userId}_{botId}`
- Container is **pre-created at panel creation** with correct plan resource limits
- Base images: `node:20-alpine` and `python:3.11-alpine`
- Resource limits enforced per plan (RAM, CPU)
- Live log streaming and interactive terminal via Socket.IO
- Dependency auto-installer runs before user code on every start

---

## Plans

| Plan    | Price      | Panels | RAM/panel | CPU/panel | Storage |
|---------|-----------|--------|-----------|-----------|---------|
| **Basic**  | ₦1,400/mo | 1      | 450MB     | 0.3 vCPU  | 1GB     |
| **Pro**    | ₦2,999/mo | 1      | 1GB       | 0.6 vCPU  | 3GB     |

Plans are seeded automatically from `backend/src/routes/billing.ts` when the first billing endpoint is hit.

---

## User Flow

### Signup
1. User registers at `/signup` → POST `/api/auth/register`
2. Global free trial check (`site_settings.free_trial_enabled`) — enabled by default
3. User gets a **7-day Basic subscription** (configurable via admin settings)
4. A default panel + Docker container are created automatically
5. User is logged in and redirected to the dashboard

### Dashboard
- **Plan Usage Card** — shows plan name, panels used vs limit, resource specs (RAM, Storage, vCPU)
- **Panel Health** — segmented bar showing running/stopped/errored proportions
- **Latest Panel** — if unconfigured, shows **"Tap to Configure"** with orange left border
- Clicking "Tap to Configure" opens a modal to pick name + runtime (Node.js or Python)
- Usage bar color: green (<50%), blue (50-80%), orange (80-100%), red (>100%)

### Panel Detail Page (`/bots/:id`) — 5 Tabs

**Console** — real-time log stream with stdin input
- Timestamps on every line (`HH:MM` format)
- Color-coded: red for errors, yellow for warnings/install logs, green for success
- "Panel is offline" when stopped, "Waiting for output…" when running but silent
- Logs auto-clear when panel restarts
- Scroll up to freeze view, down-arrow button to jump to latest
- Clear button fully resets log stream

**Logs** — error-only log viewer
- Filters to only show error/stderr lines
- Click any error to open detail modal with full stack trace
- Copy button to copy error text

**Files** — built-in CodeMirror editor
- File tree browser with create, upload, rename, clone, delete
- Autosave with debounced writes
- Save button turns grey after save, orange when content changes

**Startup** — set which file runs on panel start
- File suggestions filtered by runtime (only `.js/.mjs/.cjs` for Node.js, only `.py` for Python)
- Preset suggestions match runtime
- Saves to backend with validation

**Config** — panel details and danger zone
- Panel name, language, ID, plan, creation date
- Danger Zone at top (not bottom) with delete confirmation modal

### Start/Stop Behavior
- Clicking **Start** → status shows yellow "Deploying" with spinner → turns green "Running" when ready
- Clicking **Stop** → immediate response (3s Docker timeout)
- Spinner shows on all action buttons while pending
- If container is already running, start is skipped gracefully

### Docker Lifecycle
1. **Panel created** → Docker container pre-built with plan limits (image pulled, entrypoint mounted)
2. User clicks **Start** → status: `setting_up` → container recreated if needed → starts
3. **Entrypoint script** runs first:
   - Node.js: checks `package.json`, installs missing deps from cache or npm
   - Python: checks `requirements.txt`, installs missing from cache or pip
4. User's start file executes
5. Logs stream live to Console tab
6. User clicks **Stop** → container stops in ~3s
7. Files persist at `/home/bots/{userId}/{botId}/`

### Package Cache
- Local cache at `/opt/redon3/cache/node/` and `/opt/redon3/cache/pip/`
- Mounted read-only into containers for fast installs
- Falls back to npm/pip if package not in cache
- Cache can be pre-populated with popular packages (telethon, discord.js, etc.)

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register (auto-grants free trial) |
| POST | `/api/auth/login` | Login (returns JWT in cookies) |
| POST | `/api/auth/logout` | Logout (clears cookies) |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/2fa/verify` | Verify 2FA code |

### Bots (Panels)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/bots` | List user's panels |
| POST | `/api/bots` | Create panel + pre-create Docker container |
| GET | `/api/bots/:id` | Get panel details + stats |
| PATCH | `/api/bots/:id` | Update panel (+ validates startup file extension) |
| DELETE | `/api/bots/:id` | Delete panel + container + files |
| POST | `/api/bots/:id/start` | Start container (setting_up → running) |
| POST | `/api/bots/:id/stop` | Stop container |
| POST | `/api/bots/:id/restart` | Restart container |
| GET | `/api/bots/:id/env` | List env variables |
| POST | `/api/bots/:id/env` | Add env variable |
| PATCH | `/api/bots/:id/env/:vid` | Update env variable |
| DELETE | `/api/bots/:id/env/:vid` | Delete env variable |

### Files
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/bots/:id/files?path=` | List directory contents |
| GET | `/api/bots/:id/files/content?path=` | Read file content |
| PUT | `/api/bots/:id/files/content` | Save file content |
| POST | `/api/bots/:id/files/create` | Create file or directory |
| POST | `/api/bots/:id/files/rename` | Rename file/directory |
| POST | `/api/bots/:id/files/clone` | Duplicate file |
| POST | `/api/bots/:id/files/upload` | Upload files (multipart) |
| DELETE | `/api/bots/:id/files` | Delete file/directory |
| POST | `/api/bots/:id/upload` | Upload zip for deployment |

### Billing
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/billing/plans` | List available plans |
| GET | `/api/billing/subscription` | Get current subscription |
| POST | `/api/billing/checkout` | Initiate Paystack checkout |
| POST | `/api/billing/webhook/paystack` | Paystack payment webhook |
| POST | `/api/billing/coupon/validate` | Validate coupon code |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/summary` | Dashboard stats + plan info |

---

## Running the Platform

### Prerequisites
- Node.js 22, pnpm, PostgreSQL, Docker

### Setup
```bash
cd redon3-workspace
pnpm install

# Push DB schema
cd lib/db
DATABASE_URL="postgresql://redon3:redon3secure2026@localhost:5432/redon3" npx drizzle-kit push

# Build backend
cd ../../backend
node build.mjs

# Build frontend
cd ../frontend
PORT=3000 BASE_PATH=/ pnpm vite build

# Copy frontend to Nginx serve path
cp -r dist/public/* /opt/redon3/frontend/

# Copy entrypoint scripts
cp ../scripts/vps/node-entrypoint.sh /opt/redon3/scripts/
cp ../scripts/vps/python-entrypoint.sh /opt/redon3/scripts/
chmod +x /opt/redon3/scripts/*.sh
```

### Development
```bash
# Start backend (port 3001)
cd backend
DATABASE_URL="postgresql://..." JWT_SECRET=... JWT_REFRESH_SECRET=... \
DOCKER_ENABLED=true PORT=3001 node dist/index.mjs

# Start frontend (port 3000)
cd frontend
PORT=3000 BASE_PATH=/ pnpm vite --host 0.0.0.0
```

### Production (PM2)
```bash
# Start with ecosystem config (recommended)
cd redon3-workspace
pm2 start ecosystem.config.cjs
pm2 save
```

### Production (Nginx)
Nginx serves the built frontend from `/opt/redon3/frontend/` and proxies `/api/*` to port 3001. Config template at `scripts/vps/nginx.conf`.

---

## Key Configuration

| Env Variable | Purpose | Default |
|-------------|---------|---------|
| `PORT` | Backend listen port | 3001 |
| `DATABASE_URL` | PostgreSQL connection | (required) |
| `JWT_SECRET` | Access token signing | (required) |
| `JWT_REFRESH_SECRET` | Refresh token signing | (required) |
| `DOCKER_ENABLED` | Enable container management | false |
| `PAYSTACK_SECRET_KEY` | Paystack API key | (required for billing) |
| `RESEND_API_KEY` | Email API key | (optional) |
| `APP_URL` | Frontend URL for cookies/emails | `http://localhost:3000` |

Admin settings in `site_settings` table: `free_trial_enabled` (boolean), `free_trial_days` (number, default 7).

---

## Project Structure

```
redon3-workspace/
├── backend/              # Express API server
│   ├── src/
│   │   ├── index.ts      # Entry point, HTTP + Socket.IO
│   │   ├── app.ts        # Express app config
│   │   ├── routes/       # Route handlers
│   │   ├── middlewares/   # Auth, admin middleware
│   │   └── lib/          # Docker, auth, email, logger, package installer
│   ├── build.mjs         # esbuild bundler
│   └── package.json
├── frontend/             # React SPA
│   ├── src/
│   │   ├── pages/        # Landing, auth, dashboard, bot detail, bots list, admin
│   │   ├── components/   # UI, layout, shared, billing, bots, dashboard
│   │   ├── contexts/     # AuthContext
│   │   ├── hooks/        # Custom hooks
│   │   └── lib/          # API client, socket, utils, debug logger
│   ├── vite.config.ts
│   └── package.json
├── lib/
│   ├── db/               # Drizzle ORM schemas + config
│   ├── api-zod/          # Generated Zod types
│   ├── api-client-react/ # Generated React Query hooks
│   └── api-spec/         # OpenAPI spec
├── scripts/
│   └── vps/              # Bootstrap, deploy, nginx, entrypoint scripts
├── ecosystem.config.cjs  # PM2 process config
├── pnpm-workspace.yaml
└── package.json
```
