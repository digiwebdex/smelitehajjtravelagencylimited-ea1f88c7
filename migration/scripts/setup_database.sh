#!/bin/bash
# ============================================================
# SM Elite Hajj - Database Setup Script
# Run this on your VPS to create and configure the database
# ============================================================

set -e

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

DB_NAME="${DB_NAME:-smelite_hajj}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo "============================================"
echo "  SM Elite Hajj - Database Setup"
echo "============================================"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
  echo "PostgreSQL is not installed. Installing..."
  sudo apt update
  sudo apt install -y postgresql postgresql-contrib
  sudo systemctl start postgresql
  sudo systemctl enable postgresql
fi

echo "1. Creating database: $DB_NAME"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database already exists"

echo "2. Creating user if needed..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

echo "3. Installing extensions..."
sudo -u postgres psql -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
sudo -u postgres psql -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";"

echo "============================================"
echo "  Database setup complete!"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "============================================"
