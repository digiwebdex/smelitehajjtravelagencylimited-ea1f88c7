# SM Elite Hajj - VPS Deployment Guide

## Prerequisites

- Hostinger KVM VPS with Ubuntu 22.04+
- Root/sudo access
- Domain pointing to VPS IP
- Minimum 2GB RAM, 20GB storage

## Quick Start (Docker)

```bash
# 1. Clone/upload project to VPS
scp -r migration/ user@your-vps-ip:/opt/smelite/

# 2. SSH into VPS
ssh user@your-vps-ip
cd /opt/smelite/migration

# 3. Install Docker (if not installed)
curl -fsSL https://get.docker.com | sh
sudo apt install docker-compose -y

# 4. Configure environment
cp backend/.env.example .env
nano .env  # Set DB_PASSWORD, JWT_SECRET

# 5. Launch
docker-compose up -d

# 6. Seed initial data
docker exec -i smelite_postgres psql -U postgres -d smelite_hajj < scripts/seed_data_docker.sql
```

## Manual Installation (No Docker)

### Step 1: Install PostgreSQL

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql && sudo systemctl enable postgresql
```

### Step 2: Setup Database

```bash
cd /opt/smelite/migration
chmod +x scripts/*.sh
./scripts/setup_database.sh
./scripts/run_migration.sh
./scripts/seed_data.sh
```

### Step 3: Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Step 4: Setup Backend

```bash
cd /opt/smelite/migration/backend
cp .env.example .env
nano .env  # Configure database credentials and JWT secret

npm install --production
```

### Step 5: Run with PM2

```bash
sudo npm install -g pm2
pm2 start server.js --name smelite-backend
pm2 save
pm2 startup
```

### Step 6: Build Frontend

```bash
cd /opt/smelite  # Main project root

# Update the API base URL in the frontend code
# Replace all Supabase URLs with your backend URL

npm install
npm run build

# Serve with Nginx
sudo apt install -y nginx
```

### Step 7: Nginx Configuration

Create `/etc/nginx/sites-available/smelite`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /opt/smelite/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # File uploads
    location /uploads/ {
        alias /opt/smelite/migration/backend/uploads/;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/smelite /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Step 8: SSL (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Port Allocation

Since another website runs on this VPS:

| Service | Port |
|---------|------|
| PostgreSQL (existing) | 5432 |
| PostgreSQL (SM Elite) | 5433 (if using Docker) or shared 5432 |
| Backend API | 3001 |
| Frontend (via Nginx) | 80/443 |

## Data Migration from Supabase

To export your existing data from the current database:

1. Open Lovable Cloud backend view
2. Use the "Run SQL" feature to export each table:
   ```sql
   SELECT * FROM packages;
   SELECT * FROM bookings;
   -- etc.
   ```
3. Export as CSV/JSON
4. Import into your VPS PostgreSQL:
   ```bash
   psql -U postgres -d smelite_hajj -c "\copy packages FROM 'packages.csv' CSV HEADER"
   ```

## API Endpoint Mapping

| Supabase Edge Function | Self-Hosted Endpoint |
|------------------------|---------------------|
| create-admin-user | POST /api/admin-users/create-admin |
| create-staff-user | POST /api/admin-users/create-staff |
| create-demo-user | POST /api/admin-users/create-demo |
| update-user-password | POST /api/admin-users/update-password |
| payment-sslcommerz | POST /api/payment-sslcommerz/* |
| payment-bkash | POST /api/payment-bkash/* |
| payment-nagad | POST /api/payment-nagad/* |
| send-booking-notification | POST /api/notifications/send-booking |
| send-air-ticket-notification | POST /api/notifications/send-air-ticket |
| send-visa-notification | POST /api/notifications/send-visa |
| send-tracking-notification | POST /api/notifications/send-tracking |
| send-whatsapp-test | POST /api/notifications/send-whatsapp-test |
| backup-restore | POST /api/backup-restore/* |
| fb-event | POST /api/notifications/fb-event |

## Frontend Code Changes Required

After deploying the backend, you need to update the frontend to use your self-hosted API instead of Supabase. The key file to modify:

Replace `src/integrations/supabase/client.ts` with a REST API client that points to your backend URL (e.g., `https://yourdomain.com/api`).

## Monitoring

```bash
# Check backend logs
pm2 logs smelite-backend

# Check database
psql -U postgres -d smelite_hajj -c "SELECT COUNT(*) FROM bookings;"

# Check Nginx
sudo tail -f /var/log/nginx/error.log
```

## Backup Schedule

Set up automated backups with cron:

```bash
crontab -e
# Add: Daily backup at 2 AM
0 2 * * * pg_dump -U postgres smelite_hajj > /opt/smelite/backups/daily_$(date +\%Y\%m\%d).sql
# Weekly cleanup (keep 30 days)
0 3 * * 0 find /opt/smelite/backups/ -mtime +30 -delete
```
