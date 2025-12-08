#!/bin/bash

# Script để khởi tạo databases từ SQL files
# Chạy script này lần đầu khi setup production hoặc khi cần tạo lại databases
# Usage: ./scripts/init-databases.sh

set -e

CONTAINER_NAME=${MYSQL_CONTAINER:-coffee-mysql}
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
SQL_DIR="sql"
PROJECT_DIR="/opt/coffee-management"

# Nếu chạy từ thư mục project, dùng đường dẫn tương đối
if [ -d "$SQL_DIR" ]; then
    SQL_PATH="$SQL_DIR"
else
    # Nếu chạy từ thư mục khác, dùng đường dẫn tuyệt đối
    SQL_PATH="$PROJECT_DIR/$SQL_DIR"
fi

if [ -z "$MYSQL_ROOT_PASSWORD" ]; then
    echo "Error: MYSQL_ROOT_PASSWORD environment variable is not set"
    echo "Please set it: export MYSQL_ROOT_PASSWORD=your_password"
    exit 1
fi

echo "=========================================="
echo "Initializing Databases from SQL Files"
echo "=========================================="
echo "Container: $CONTAINER_NAME"
echo "SQL Directory: $SQL_PATH"
echo "=========================================="

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "Error: MySQL container '$CONTAINER_NAME' is not running"
    echo "Please start MySQL container first:"
    echo "  docker compose -f docker-compose.prod.yml up -d mysql"
    exit 1
fi

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
for i in {1..30}; do
    if docker exec "$CONTAINER_NAME" mysqladmin ping -h localhost -u root -p"$MYSQL_ROOT_PASSWORD" --silent 2>/dev/null; then
        echo "✓ MySQL is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "✗ MySQL is not ready after 30 attempts"
        exit 1
    fi
    echo "  Attempt $i/30..."
    sleep 2
done

# Function to initialize database
init_database() {
    local sql_file=$1
    local db_name=$2
    
    if [ ! -f "$sql_file" ]; then
        echo "⚠ Warning: SQL file not found: $sql_file"
        return 1
    fi
    
    echo ""
    echo "Initializing database: $db_name"
    echo "  SQL file: $sql_file"
    
    # Check if database already exists
    DB_EXISTS=$(docker exec "$CONTAINER_NAME" mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "SHOW DATABASES LIKE '$db_name';" | grep -c "$db_name" || true)
    
    if [ "$DB_EXISTS" -gt 0 ]; then
        echo "  ⚠ Database '$db_name' already exists"
        read -p "  Do you want to DROP and recreate it? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            echo "  ⏭ Skipping $db_name"
            return 0
        fi
        echo "  🗑 Dropping existing database..."
        docker exec "$CONTAINER_NAME" mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS $db_name;"
    fi
    
    # Create database and import SQL
    echo "  📥 Importing SQL file..."
    docker exec -i "$CONTAINER_NAME" mysql -u root -p"$MYSQL_ROOT_PASSWORD" < "$sql_file"
    
    if [ $? -eq 0 ]; then
        echo "  ✓ Database '$db_name' initialized successfully"
        return 0
    else
        echo "  ✗ Failed to initialize database '$db_name'"
        return 1
    fi
}

# Initialize all databases
echo ""
echo "Starting database initialization..."
echo ""

# List of databases to initialize
declare -A databases=(
    ["$SQL_PATH/auth_db.sql"]="auth_db"
    ["$SQL_PATH/profile_db.sql"]="profile_db"
    ["$SQL_PATH/order_db.sql"]="order_db"
    ["$SQL_PATH/catalog_db.sql"]="catalog_db"
    ["$SQL_PATH/notification_db.sql"]="notification_db"
)

# Optional: analytics_db (có thể không có trong tất cả deployments)
if [ -f "$SQL_PATH/analytics_db.sql" ]; then
    databases["$SQL_PATH/analytics_db.sql"]="analytics_db"
fi

FAILED=0
for sql_file in "${!databases[@]}"; do
    db_name="${databases[$sql_file]}"
    if ! init_database "$sql_file" "$db_name"; then
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "=========================================="
if [ $FAILED -eq 0 ]; then
    echo "✓ All databases initialized successfully!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Start all services: docker compose -f docker-compose.prod.yml up -d"
    echo "2. Check services health: docker compose -f docker-compose.prod.yml ps"
    echo ""
else
    echo "✗ Some databases failed to initialize ($FAILED failed)"
    echo "=========================================="
    exit 1
fi

