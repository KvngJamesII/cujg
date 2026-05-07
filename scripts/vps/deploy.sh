#!/bin/bash
# Redon3 Source Deploy Script
# Rsyncs full source to VPS, installs deps, builds, and restarts services
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VPS_IP="${VPS_IP:-185.127.16.90}"
VPS_USER="${VPS_USER:-root}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/redon3_deploy}"
APP_DIR="/opt/redon3"
SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=no"
RSYNC="rsync -az --delete -e \"ssh -i $SSH_KEY -o StrictHostKeyChecking=no\""

echo "======================================================"
echo " Redon3 Source Deploy → $VPS_USER@$VPS_IP"
echo "======================================================"

# 1. Sync full source (exclude heavy/generated artifacts)
echo "[1/4] Syncing source code..."
rsync -az --delete \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' \
  --exclude='.replit' \
  --exclude='.local' \
  --exclude='*.log' \
  --exclude='.env' \
  "$REPO_DIR/" \
  "$VPS_USER@$VPS_IP:$APP_DIR/source/"

# 2. Install dependencies on VPS
echo "[2/4] Installing dependencies..."
$SSH "$VPS_USER@$VPS_IP" bash <<'REMOTE'
  set -e
  cd /opt/redon3/source
  export PNPM_HOME="/root/.local/share/pnpm"
  export PATH="$PNPM_HOME:$PATH"
  pnpm install --frozen-lockfile
REMOTE

# 3. Build on VPS
echo "[3/4] Building on VPS..."
$SSH "$VPS_USER@$VPS_IP" bash <<'REMOTE'
  set -e
  cd /opt/redon3/source
  export PNPM_HOME="/root/.local/share/pnpm"
  export PATH="$PNPM_HOME:$PATH"
  # Build api-server
  pnpm --filter @workspace/api-server run build
  # Build frontend
  pnpm --filter @workspace/redon3 run build
  # Copy frontend dist to nginx root
  cp -r artifacts/redon3/dist/public/. /opt/redon3/frontend/
  echo "Build complete."
REMOTE

# 4. Restart API via PM2
echo "[4/4] Restarting API server..."
$SSH "$VPS_USER@$VPS_IP" bash <<'REMOTE'
  set -e
  export PNPM_HOME="/root/.local/share/pnpm"
  export PATH="$PNPM_HOME:$PATH"
  cd /opt/redon3/source/artifacts/api-server
  if pm2 describe redon3-api > /dev/null 2>&1; then
    pm2 restart redon3-api
  else
    pm2 start dist/index.mjs \
      --name redon3-api \
      --env production \
      --output /opt/redon3/logs/api-out.log \
      --error  /opt/redon3/logs/api-err.log
  fi
  pm2 save
REMOTE

echo ""
echo "======================================================"
echo " Deploy complete → https://$VPS_IP"
echo "======================================================"
