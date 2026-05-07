#!/bin/bash
# Redon3 VPS Bootstrap — Ubuntu 22.04
# Run once as root on a fresh server
set -euo pipefail

APP_DIR="/opt/redon3"
DB_NAME="redon3"
DB_USER="redon3"
DB_PASS="${DB_PASS:-$(openssl rand -hex 24)}"
DOMAIN="${DOMAIN:-redon3.com}"

echo "======================================================"
echo " Redon3 Bootstrap — Ubuntu 22.04"
echo "======================================================"

# 1. System packages
echo "[1/11] Updating system packages..."
apt-get update -y && apt-get upgrade -y
apt-get install -y curl wget git unzip build-essential ufw fail2ban \
  ca-certificates gnupg lsb-release software-properties-common rsync jq

# 2. Node.js 22
echo "[2/11] Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# 3. pnpm + PM2
echo "[3/11] Installing pnpm + PM2..."
npm install -g pnpm pm2
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

# 4. PostgreSQL 16
echo "[4/11] Installing PostgreSQL 16..."
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
apt-get update -y && apt-get install -y postgresql-16 postgresql-client-16
systemctl enable postgresql && systemctl start postgresql
sudo -u postgres psql <<PGSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
  END IF;
END\$\$;
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}' WHERE NOT EXISTS
  (SELECT FROM pg_database WHERE datname='${DB_NAME}')\gexec
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
PGSQL

# 5. Docker
echo "[5/11] Installing Docker..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y && apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable docker && systemctl start docker
docker pull node:20-alpine &
docker pull python:3.11-alpine &

# 6. Nginx
echo "[6/11] Installing Nginx..."
apt-get install -y nginx certbot python3-certbot-nginx
systemctl enable nginx

# 7. App directories
echo "[7/11] Creating app directories..."
mkdir -p $APP_DIR/{source,frontend,logs,backups,bots}
mkdir -p /home/bots

# 8. Nginx config (HTTP first, certbot will upgrade to HTTPS)
echo "[8/11] Writing Nginx config..."
cat > /etc/nginx/sites-available/redon3 <<NGINX
server {
    listen 80;
    server_name _;

    client_max_body_size 100M;

    # API + WebSocket
    location /api/ {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400s;
    }

    # React SPA
    location / {
        root  /opt/redon3/frontend;
        index index.html;
        try_files \$uri \$uri/ /index.html;

        location ~* \.(js|css|woff2?|ttf|svg|ico|png|jpg|webp)\$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
    }

    access_log /var/log/nginx/redon3.access.log;
    error_log  /var/log/nginx/redon3.error.log;
}
NGINX
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/redon3 /etc/nginx/sites-enabled/redon3
nginx -t && systemctl reload nginx

# 9. Firewall
echo "[9/11] Configuring UFW firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 10. Fail2ban
echo "[10/11] Configuring fail2ban..."
cat > /etc/fail2ban/jail.local <<'FAIL2BAN'
[DEFAULT]
bantime  = 3600
maxretry = 5
[sshd]
enabled = true
[nginx-http-auth]
enabled = true
FAIL2BAN
systemctl restart fail2ban

# 11. Write .env template
echo "[11/11] Writing environment file template..."
cat > $APP_DIR/.env <<ENV
NODE_ENV=production
PORT=3001
APP_URL=http://${DOMAIN}

# Fill in after bootstrap:
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}
JWT_SECRET=CHANGE_ME_run_openssl_rand_hex_64
SESSION_SECRET=CHANGE_ME_run_openssl_rand_hex_64
PAYSTACK_SECRET_KEY=sk_live_XXXX
PAYSTACK_PUBLIC_KEY=pk_live_XXXX
RESEND_API_KEY=re_XXXX
DOCKER_ENABLED=true
ENV

# Wait for background docker pulls
wait

echo ""
echo "======================================================"
echo " Bootstrap complete!"
echo ""
echo " DB creds (save these):"
echo "   DB_USER: $DB_USER"
echo "   DB_PASS: $DB_PASS"
echo "   DB_NAME: $DB_NAME"
echo ""
echo " Next: edit $APP_DIR/.env then run deploy.sh"
echo "======================================================"
