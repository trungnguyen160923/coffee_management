#!/bin/bash

# Deployment script for production
# This script is called by GitHub Actions to deploy on the server

set -e

PROJECT_DIR="/opt/coffee-management"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"

cd "$PROJECT_DIR"

echo "=========================================="
echo "Starting Deployment"
echo "=========================================="
echo "Project directory: $PROJECT_DIR"
echo "Compose file: $COMPOSE_FILE"
echo "Environment file: $ENV_FILE"
echo "=========================================="

# Check if .env.prod exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found!"
    echo "Please create $ENV_FILE from env.prod.example"
    exit 1
fi

# Pull latest images
echo "Pulling latest images..."
docker compose -f "$COMPOSE_FILE" pull

# Backup database (if MySQL container is running)
if docker ps | grep -q coffee-mysql; then
    echo "Creating database backup..."
    BACKUP_DIR="$PROJECT_DIR/backups"
    mkdir -p "$BACKUP_DIR"
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    # Backup all databases
    docker exec coffee-mysql mysqldump -u root -p"${MYSQL_ROOT_PASSWORD}" auth_db > "$BACKUP_DIR/auth_db_$TIMESTAMP.sql" || true
    docker exec coffee-mysql mysqldump -u root -p"${MYSQL_ROOT_PASSWORD}" profile_db > "$BACKUP_DIR/profile_db_$TIMESTAMP.sql" || true
    docker exec coffee-mysql mysqldump -u root -p"${MYSQL_ROOT_PASSWORD}" order_db > "$BACKUP_DIR/order_db_$TIMESTAMP.sql" || true
    docker exec coffee-mysql mysqldump -u root -p"${MYSQL_ROOT_PASSWORD}" catalog_db > "$BACKUP_DIR/catalog_db_$TIMESTAMP.sql" || true
    docker exec coffee-mysql mysqldump -u root -p"${MYSQL_ROOT_PASSWORD}" notification_db > "$BACKUP_DIR/notification_db_$TIMESTAMP.sql" || true
    
    echo "Backup completed: $BACKUP_DIR"
fi

# Run database migrations if needed
if [ -f "scripts/run-migration.sh" ]; then
    echo "Checking for migrations..."
    # Uncomment và chạy migration nếu cần
    # chmod +x scripts/run-migration.sh
    # ./scripts/run-migration.sh profile-service/migrations/remove_role_id_from_shift_assignments.sql profile_db
fi

# Stop old containers gracefully
echo "Stopping old containers..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down --timeout 30

# Start new containers
echo "Starting new containers..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

# Wait for services to be healthy
echo "Waiting for services to start..."
sleep 30

# Health check
echo "Performing health checks..."
MAX_RETRIES=5
RETRY_COUNT=0

check_health() {
    local service=$1
    local url=$2
    
    if curl -f "$url" > /dev/null 2>&1; then
        echo "✓ $service is healthy"
        return 0
    else
        echo "✗ $service health check failed"
        return 1
    fi
}

# Check API Gateway
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if check_health "API Gateway" "http://localhost:8000/actuator/health"; then
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Retrying... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 10
done

# Check containers status
echo "Container status:"
docker compose -f "$COMPOSE_FILE" ps

# Clean up old images
echo "Cleaning up old images..."
docker image prune -f

# Show logs of any failed containers
echo "Checking for failed containers..."
FAILED_CONTAINERS=$(docker compose -f "$COMPOSE_FILE" ps --filter "status=exited" --format "{{.Name}}")

if [ -n "$FAILED_CONTAINERS" ]; then
    echo "Warning: Some containers failed to start:"
    echo "$FAILED_CONTAINERS"
    echo "Showing logs:"
    docker compose -f "$COMPOSE_FILE" logs --tail=50
    exit 1
fi

echo "=========================================="
echo "Deployment completed successfully!"
echo "=========================================="

