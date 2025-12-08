#!/bin/bash

# Script để chạy database migration trên production
# Usage: ./scripts/run-migration.sh <migration-file> <database-name>

set -e

MIGRATION_FILE=$1
DATABASE_NAME=$2
CONTAINER_NAME=${MYSQL_CONTAINER:-coffee-mysql}
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}

if [ -z "$MIGRATION_FILE" ] || [ -z "$DATABASE_NAME" ]; then
    echo "Usage: $0 <migration-file> <database-name>"
    echo "Example: $0 profile-service/migrations/remove_role_id_from_shift_assignments.sql profile_db"
    exit 1
fi

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

if [ -z "$MYSQL_ROOT_PASSWORD" ]; then
    echo "Error: MYSQL_ROOT_PASSWORD environment variable is not set"
    exit 1
fi

echo "=========================================="
echo "Running Migration"
echo "=========================================="
echo "File: $MIGRATION_FILE"
echo "Database: $DATABASE_NAME"
echo "Container: $CONTAINER_NAME"
echo "=========================================="

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "Error: MySQL container '$CONTAINER_NAME' is not running"
    exit 1
fi

# Create backup before migration
BACKUP_FILE="backup_${DATABASE_NAME}_$(date +%Y%m%d_%H%M%S).sql"
echo "Creating backup: $BACKUP_FILE"
docker exec "$CONTAINER_NAME" mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" "$DATABASE_NAME" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✓ Backup created successfully: $BACKUP_FILE"
else
    echo "✗ Backup failed!"
    exit 1
fi

# Run migration
echo "Running migration..."
docker exec -i "$CONTAINER_NAME" mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$DATABASE_NAME" < "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo "✓ Migration completed successfully!"
else
    echo "✗ Migration failed!"
    echo "You can restore from backup: $BACKUP_FILE"
    exit 1
fi

echo "=========================================="
echo "Migration completed successfully!"
echo "Backup saved at: $BACKUP_FILE"
echo "=========================================="

