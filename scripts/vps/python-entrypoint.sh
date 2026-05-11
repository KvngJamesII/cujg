#!/bin/sh
set -e

echo "[redon3] Checking dependencies..."

if [ -f /app/requirements.txt ]; then
  NEED_INSTALL=0
  if [ ! -f /app/.redon3-deps-installed ]; then
    NEED_INSTALL=1
  else
    # Quick check: try importing each requirement
    MISSING=$(python3 -c "
import pkg_resources, sys
try:
    with open('/app/requirements.txt') as f:
        reqs = [l.strip().split('==')[0].split('>=')[0].split('<=')[0].split('>')[0].split('<')[0].strip()
                for l in f if l.strip() and not l.startswith('#')]
    missing = []
    for r in reqs:
        try: pkg_resources.get_distribution(r)
        except: missing.append(r)
    print(' '.join(missing))
except: print('PARSE_ERROR')
" 2>/dev/null)
    if [ "$MISSING" = "PARSE_ERROR" ] || [ -n "$MISSING" ]; then
      NEED_INSTALL=1
    fi
  fi

  if [ "$NEED_INSTALL" = "1" ]; then
    echo "[redon3] Installing Python dependencies..."
    if [ -d /opt/redon3/cache/pip ] && [ "$(ls -A /opt/redon3/cache/pip 2>/dev/null)" ]; then
      pip install --no-cache-dir --find-links /opt/redon3/cache/pip -r /app/requirements.txt 2>/dev/null || pip install --no-cache-dir -r /app/requirements.txt
    else
      pip install --no-cache-dir -r /app/requirements.txt
    fi
    touch /app/.redon3-deps-installed
    echo "[redon3] Dependencies installed"
  else
    echo "[redon3] All dependencies present"
  fi
fi

echo "[redon3] Starting: python $@"
exec python "$@"
