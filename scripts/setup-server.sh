#!/bin/bash

# Script to setup production server for first-time deployment
# Run this script ONCE on a fresh VPS

set -e

echo "=========================================="
echo "Setting up Production Server"
echo "=========================================="

# Update system
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "Docker installed successfully"
else
    echo "Docker is already installed"
fi

# Install Docker Compose
echo "Installing Docker Compose..."
if ! command -v docker compose &> /dev/null; then
    sudo apt install -y docker-compose-plugin
    echo "Docker Compose installed successfully"
else
    echo "Docker Compose is already installed"
fi

# Install Nginx
echo "Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    sudo systemctl enable nginx
    echo "Nginx installed successfully"
else
    echo "Nginx is already installed"
fi

# Create project directory
PROJECT_DIR="/opt/coffee-management"
echo "Creating project directory: $PROJECT_DIR"
sudo mkdir -p "$PROJECT_DIR"
sudo mkdir -p "$PROJECT_DIR/backups"
sudo mkdir -p "$PROJECT_DIR/scripts"
sudo chown -R $USER:$USER "$PROJECT_DIR"

# Create swap file (4GB)
echo "Creating swap file..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "Swap file created successfully"
else
    echo "Swap file already exists"
fi

# Setup firewall
echo "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
echo "Firewall configured"

# Install Certbot (for SSL)
echo "Installing Certbot..."
if ! command -v certbot &> /dev/null; then
    sudo apt install -y certbot python3-certbot-nginx
    echo "Certbot installed successfully"
else
    echo "Certbot is already installed"
fi

# Setup log rotation
echo "Setting up log rotation..."
sudo tee /etc/logrotate.d/coffee-management > /dev/null <<EOF
$PROJECT_DIR/backups/*.sql {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
EOF

echo "=========================================="
echo "Server setup completed!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Clone your repository to $PROJECT_DIR"
echo "2. Create .env.prod file from env.prod.example"
echo "3. Configure GitHub Secrets for CI/CD"
echo "4. Run deployment via GitHub Actions"
echo ""
echo "Note: You may need to logout and login again for Docker group to take effect"

