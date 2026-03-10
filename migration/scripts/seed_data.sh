#!/bin/bash
# ============================================================
# SM Elite Hajj - Seed Data Script
# Creates initial admin user and default settings
# ============================================================

set -e

if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

DB_NAME="${DB_NAME:-smelite_hajj}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo "============================================"
echo "  SM Elite Hajj - Seeding Data"
echo "============================================"

# Create default admin user (password: Admin@123456)
# BCrypt hash for Admin@123456
ADMIN_HASH='$2a$12$LJ3qJzGVKoFN7Kj8cOBJFOjBqRbGq9vHpC.M9VxTtQeqDj7sN5vHe'

PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF

-- Create admin user
INSERT INTO users (id, email, encrypted_password, full_name, email_confirmed_at)
VALUES (
  uuid_generate_v4(),
  'admin@smelitehajj.com',
  '$ADMIN_HASH',
  'System Admin',
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Update admin profile
UPDATE profiles SET role = 'admin'
WHERE email = 'admin@smelitehajj.com';

-- Create default tenant
INSERT INTO tenants (name, domain)
VALUES ('SM Elite Hajj', 'smelitehajjtravelagencylimited.lovable.app')
ON CONFLICT DO NOTHING;

-- Default site settings
INSERT INTO site_settings (setting_key, setting_value, category) VALUES
('site_name', '"SM Elite Hajj Travel Agency Limited"', 'general'),
('site_tagline', '"Your Trusted Hajj & Umrah Partner"', 'general'),
('primary_phone', '"+8801867666888"', 'contact'),
('primary_email', '"info@smelitehajj.com"', 'contact')
ON CONFLICT DO NOTHING;

-- Default chart of accounts
INSERT INTO chart_of_accounts (account_code, account_name, account_type) VALUES
('1000', 'Cash', 'asset'),
('1010', 'Bank', 'asset'),
('1020', 'Accounts Receivable', 'asset'),
('1030', 'Mobile Banking', 'asset'),
('2000', 'Accounts Payable', 'liability'),
('3000', 'Revenue', 'income'),
('4000', 'Operating Expenses', 'expense')
ON CONFLICT DO NOTHING;

EOF

echo "============================================"
echo "  Seed data imported!"
echo "  Admin: admin@smelitehajj.com"
echo "  Password: Admin@123456"
echo "  (CHANGE THIS IMMEDIATELY!)"
echo "============================================"
