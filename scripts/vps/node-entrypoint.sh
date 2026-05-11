#!/bin/sh
set -e

echo "[redon3] Checking dependencies..."

if [ -f /app/package.json ]; then
  NEED_INSTALL=0
  if [ ! -d /app/node_modules ]; then
    NEED_INSTALL=1
  else
    DEPS=$(node -e "
      try {
        const pkg = require('/app/package.json');
        const all = {...pkg.dependencies, ...pkg.devDependencies};
        const missing = Object.keys(all).filter(d => {
          try { require.resolve(d, {paths:['/app']}); return false; }
          catch(e) { return true; }
        });
        console.log(missing.join(' '));
      } catch(e) { console.log('PARSE_ERROR'); }
    ")
    if [ "$DEPS" = "PARSE_ERROR" ] || [ -n "$DEPS" ]; then
      NEED_INSTALL=1
    fi
  fi

  if [ "$NEED_INSTALL" = "1" ]; then
    echo "[redon3] Installing Node.js dependencies..."
    if [ -d /opt/redon3/cache/node ] && [ "$(ls -A /opt/redon3/cache/node 2>/dev/null)" ]; then
      npm install --prefer-offline --cache /opt/redon3/cache/node 2>/dev/null || npm install
    else
      npm install
    fi
    echo "[redon3] Dependencies installed"
  else
    echo "[redon3] All dependencies present"
  fi
fi

echo "[redon3] Starting: node $@"
exec node "$@"
