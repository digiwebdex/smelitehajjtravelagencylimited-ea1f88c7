#!/bin/bash
# ============================================================
# SM Elite Hajj - Migration Script
# Imports schema, functions, and data into PostgreSQL
# ============================================================

set -e

if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

DB_NAME="${DB_NAME:-smelite_hajj}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_DIR="$SCRIPT_DIR/../database"

echo "============================================"
echo "  SM Elite Hajj - Running Migration"
echo "============================================"

echo "1. Importing schema..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$DB_DIR/schema.sql"
echo "   Schema imported successfully."

echo "2. Importing functions and triggers..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$DB_DIR/functions.sql"
echo "   Functions imported successfully."

echo "3. Importing seed data (if exists)..."
if [ -f "$DB_DIR/data.sql" ]; then
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$DB_DIR/data.sql"
  echo "   Data imported successfully."
else
  echo "   No data.sql found. Skipping."
fi

echo ""
echo "4. Verifying migration..."
TABLE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
echo "   Tables created: $TABLE_COUNT"

FUNCTION_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
  "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public';")
echo "   Functions created: $FUNCTION_COUNT"

echo ""
echo "============================================"
echo "  Migration completed successfully!"
echo "============================================"
