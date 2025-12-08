# Hướng dẫn Deploy Production - Từ A đến Z

Hướng dẫn đầy đủ để deploy hệ thống lên production với CI/CD tự động qua GitHub Actions.

---

## 📋 Mục lục

1. [Chuẩn bị](#1-chuẩn-bị)
2. [Setup Server (VPS)](#2-setup-server-vps)
3. [Cấu hình GitHub Secrets](#3-cấu-hình-github-secrets)
4. [Khởi tạo Databases](#4-khởi-tạo-databases)
5. [Cấu hình Nginx](#5-cấu-hình-nginx)
6. [Setup SSL/HTTPS](#6-setup-sslhttps)
7. [Deploy qua CI/CD](#7-deploy-qua-cicd)
8. [Kiểm tra và Monitoring](#8-kiểm-tra-và-monitoring)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Chuẩn bị

### 1.1 Yêu cầu

- ✅ VPS Ubuntu 22.04/24.04 (tối thiểu 4 vCPU, 8GB RAM, 80GB SSD)
- ✅ Domain đã được mua và có thể cấu hình DNS
- ✅ GitHub repository đã có code
- ✅ Docker Hub account (hoặc GitHub Container Registry)

### 1.2 Thông tin cần chuẩn bị

- VPS IP address hoặc domain
- Domain names (ví dụ: `coffeemanager.click`, `admin.coffeemanager.click`, `api.coffeemanager.click`)
- Docker Hub username và access token
- MySQL root password (tạo mạnh)
- JWT secret key (tạo mạnh)
- Email SMTP credentials (nếu dùng email notifications)

---

## 2. Setup Server (VPS)

### Bước 2.1: SSH vào VPS

```bash
ssh user@your-vps-ip
# Hoặc
ssh root@your-vps-ip
```

### Bước 2.2: Clone repository

```bash
# Tạo thư mục và clone
sudo mkdir -p /opt/coffee-management
sudo chown $USER:$USER /opt/coffee-management
cd /opt
git clone https://github.com/your-username/coffee_management.git coffee-management
cd coffee-management
```

### Bước 2.3: Chạy script setup server

```bash
# Cấp quyền thực thi
chmod +x scripts/setup-server.sh

# Chạy script (chỉ cần 1 lần)
./scripts/setup-server.sh
```

Script này sẽ tự động:
- ✅ Cài Docker và Docker Compose
- ✅ Cài Nginx
- ✅ Tạo project directory
- ✅ Setup swap file (4GB)
- ✅ Cấu hình firewall
- ✅ Cài Certbot (cho SSL)

**Lưu ý**: Sau khi cài Docker, có thể cần logout và login lại để group `docker` có hiệu lực.

### Bước 2.4: Tạo file `.env.prod`

```bash
cd /opt/coffee-management

# Copy từ template
cp env.prod.example .env.prod

# Sửa file
nano .env.prod
```

**Điền các giá trị:**

```bash
# Database
MYSQL_ROOT_PASSWORD=YOUR_STRONG_PASSWORD_HERE
DB_USERNAME=root

# JWT (tạo bằng: openssl rand -base64 64)
JWT_SIGNER_KEY=YOUR_JWT_SECRET_KEY_HERE

# Frontend URLs (sẽ cập nhật sau khi có SSL)
VITE_API_BASE_URL=https://api.coffeemanager.click
VITE_AI_SERVICE_URL=https://api.coffeemanager.click/api/ai
REACT_APP_API_GATEWAY=https://api.coffeemanager.click/api

# Frontend URLs for emails
CUSTOMER_FRONTEND_URL=https://coffeemanager.click
ADMIN_FRONTEND_URL=https://admin.coffeemanager.click

# Email (optional)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
```

**Quan trọng**: File `.env.prod` chứa secrets, không commit vào Git!

---

## 3. Cấu hình GitHub Secrets

### Bước 3.1: Vào GitHub Repository

1. Vào: **GitHub Repo → Settings → Secrets and variables → Actions**
2. Click **"New repository secret"**

### Bước 3.2: Thêm Docker Registry Secrets

**Nếu dùng Docker Hub:**

| Secret Name | Value | Cách lấy |
|------------|-------|----------|
| `DOCKER_USERNAME` | Docker Hub username | Tên user Docker Hub |
| `DOCKER_PASSWORD` | Docker Hub access token | Vào https://hub.docker.com/settings/security → New Access Token |

**Nếu dùng GitHub Container Registry (GHCR):**

| Secret Name | Value | Cách lấy |
|------------|-------|----------|
| `DOCKER_USERNAME` | GitHub username | Tên GitHub user |
| `DOCKER_PASSWORD` | GitHub Personal Access Token | GitHub → Settings → Developer settings → Personal access tokens → Generate (quyền `write:packages`) |

### Bước 3.3: Thêm Server SSH Secrets

**Tạo SSH key pair:**

```bash
# Trên máy local (hoặc trên VPS)
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_deploy

# Copy public key lên VPS
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub user@your-vps-ip

# Copy private key vào GitHub Secret
cat ~/.ssh/github_actions_deploy
# Copy TOÀN BỘ nội dung (bao gồm -----BEGIN và -----END)
```

**Thêm vào GitHub Secrets:**

| Secret Name | Value |
|------------|-------|
| `SSH_PRIVATE_KEY` | Toàn bộ nội dung file `~/.ssh/github_actions_deploy` |
| `SERVER_HOST` | IP hoặc domain VPS (ví dụ: `123.456.789.0` hoặc `coffeemanager.click`) |
| `SERVER_USER` | SSH user (thường là `root` hoặc `ubuntu`) |

### Bước 3.4: Thêm Frontend Build Secrets

| Secret Name | Value | Ví dụ |
|------------|-------|-------|
| `VITE_API_BASE_URL` | API URL cho frontend admin | `https://api.coffeemanager.click` |
| `VITE_AI_SERVICE_URL` | AI service URL | `https://api.coffeemanager.click/api/ai` |
| `REACT_APP_API_GATEWAY` | API URL cho frontend customer | `https://api.coffeemanager.click/api` |

**Lưu ý**: 
- Dùng `https://` nếu đã có SSL
- Dùng `http://` nếu chưa có SSL (sẽ cần rebuild sau khi có SSL)

---

## 4. Khởi tạo Databases

### Bước 4.1: Start MySQL Container

```bash
cd /opt/coffee-management

# Start MySQL
docker compose -f docker-compose.prod.yml up -d mysql

# Chờ MySQL sẵn sàng (khoảng 30 giây)
sleep 30

# Kiểm tra MySQL đã sẵn sàng
docker compose -f docker-compose.prod.yml ps mysql
```

### Bước 4.2: Khởi tạo Databases

```bash
# Set password từ .env.prod
export MYSQL_ROOT_PASSWORD=$(grep MYSQL_ROOT_PASSWORD .env.prod | cut -d '=' -f2)

# Chạy script khởi tạo
chmod +x scripts/init-databases.sh
./scripts/init-databases.sh
```

Script sẽ:
- ✅ Import tất cả SQL files từ thư mục `sql/`
- ✅ Tạo databases: auth_db, profile_db, order_db, catalog_db, notification_db
- ✅ Hỏi xác nhận nếu database đã tồn tại

### Bước 4.3: Import Seed Data (Tùy chọn - cho development)

```bash
# Chỉ chạy nếu muốn có dữ liệu mẫu để test
docker exec -i coffee-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" < sql/seed_data.sql
```

**Lưu ý**: Seed data chỉ nên dùng cho development/testing, không dùng cho production thật.

### Bước 4.4: Kiểm tra Databases

```bash
# Kiểm tra databases đã được tạo
docker exec coffee-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "SHOW DATABASES;"

# Kiểm tra tables
docker exec coffee-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "USE auth_db; SHOW TABLES;"
```

---

## 5. Cấu hình Nginx

### Bước 5.1: Cấu hình DNS

Trỏ các DNS records về VPS IP:

```
Type    Name    Value
A       @       VPS_IP
A       www     VPS_IP
A       admin   VPS_IP
A       api     VPS_IP
```

**Kiểm tra DNS đã trỏ đúng:**

```bash
dig coffeemanager.click
dig admin.coffeemanager.click
dig api.coffeemanager.click
```

### Bước 5.2: Copy Nginx Config

```bash
# Copy file config
sudo cp docs/nginx-config-examples/04-production-full.conf /etc/nginx/sites-available/coffee

# Sửa domain trong file
sudo nano /etc/nginx/sites-available/coffee
```

**Tìm và thay thế:**
- `coffeemanager.click` → `yourdomain.com`
- `admin.coffeemanager.click` → `admin.yourdomain.com`
- `api.coffeemanager.click` → `api.yourdomain.com`

### Bước 5.3: Enable Nginx Site

```bash
# Tạo symlink
sudo ln -s /etc/nginx/sites-available/coffee /etc/nginx/sites-enabled/

# Xóa default site (nếu có)
sudo rm -f /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Nếu OK, reload
sudo systemctl reload nginx
```

**Lưu ý**: Lúc này chưa có SSL, nên sẽ dùng HTTP. Sau khi setup SSL sẽ tự động redirect sang HTTPS.

---

## 6. Setup SSL/HTTPS

### Bước 6.1: Cài Certbot (nếu chưa có)

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

### Bước 6.2: Tạo SSL Certificate

```bash
# Tạo certificate cho tất cả subdomains
sudo certbot --nginx \
  -d yourdomain.com \
  -d www.yourdomain.com \
  -d admin.yourdomain.com \
  -d api.yourdomain.com
```

Certbot sẽ:
- ✅ Tạo SSL certificate từ Let's Encrypt
- ✅ Tự động cập nhật Nginx config để dùng HTTPS
- ✅ Setup auto-renewal

### Bước 6.3: Kiểm tra Auto-renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Kiểm tra timer
sudo systemctl status certbot.timer
```

### Bước 6.4: Cập nhật Frontend URLs (nếu chưa có HTTPS)

Nếu trước đó dùng `http://`, cần cập nhật:

1. **Cập nhật `.env.prod`:**
   ```bash
   nano /opt/coffee-management/.env.prod
   # Đổi http:// → https://
   ```

2. **Cập nhật GitHub Secrets:**
   - Vào GitHub → Settings → Secrets
   - Cập nhật `VITE_API_BASE_URL`, `VITE_AI_SERVICE_URL`, `REACT_APP_API_GATEWAY` thành HTTPS

3. **Rebuild frontend images:**
   - Push code mới hoặc trigger GitHub Actions manual

---

## 7. Deploy qua CI/CD

### Bước 7.1: Cập nhật docker-compose.prod.registry.yml

Mở file `docker-compose.prod.registry.yml` và sửa:

```yaml
# Tìm dòng này:
REGISTRY_PREFIX ?= docker.io/YOUR_DOCKER_USERNAME

# Thay YOUR_DOCKER_USERNAME bằng username thật:
REGISTRY_PREFIX ?= docker.io/yourusername
```

### Bước 7.2: Commit và Push Code

```bash
# Trên máy local
git add .
git commit -m "Setup CI/CD and production config"
git push origin main
```

### Bước 7.3: GitHub Actions sẽ tự động:

1. ✅ Build tất cả Docker images
2. ✅ Push images lên Docker Hub/GHCR
3. ✅ SSH vào VPS
4. ✅ Pull images mới
5. ✅ Restart containers

**Theo dõi quá trình:**

- Vào: **GitHub → Actions → "Deploy to Production"**
- Xem logs real-time

### Bước 7.4: Kiểm tra Deployment

```bash
# SSH vào VPS
ssh user@your-vps-ip

# Kiểm tra containers
cd /opt/coffee-management
docker compose -f docker-compose.prod.registry.yml ps

# Kiểm tra logs
docker compose -f docker-compose.prod.registry.yml logs -f
```

---

## 8. Kiểm tra và Monitoring

### Bước 8.1: Health Checks

```bash
# Kiểm tra API Gateway
curl http://localhost:8000/actuator/health

# Kiểm tra từ bên ngoài (qua domain)
curl https://api.yourdomain.com/actuator/health
```

### Bước 8.2: Test Frontend

- ✅ Truy cập: `https://yourdomain.com` (Customer frontend)
- ✅ Truy cập: `https://admin.yourdomain.com` (Admin frontend)
- ✅ Test đăng nhập
- ✅ Test các chức năng chính

### Bước 8.3: Kiểm tra Logs

```bash
# Nginx logs
sudo tail -f /var/log/nginx/admin-frontend-access.log
sudo tail -f /var/log/nginx/api-gateway-access.log

# Docker logs
docker compose -f docker-compose.prod.registry.yml logs -f api-gateway
docker compose -f docker-compose.prod.registry.yml logs -f auth
```

### Bước 8.4: Monitoring

```bash
# Kiểm tra resource usage
docker stats

# Kiểm tra disk space
df -h

# Kiểm tra memory
free -h
```

---

## 9. Troubleshooting

### Vấn đề: GitHub Actions build failed

**Nguyên nhân**: Dockerfile có lỗi hoặc thiếu dependencies

**Giải pháp**:
1. Xem logs trong GitHub Actions
2. Test build local: `docker build -t test ./api-gateway`
3. Kiểm tra Dockerfile syntax

### Vấn đề: SSH connection failed

**Nguyên nhân**: SSH key sai hoặc server không cho phép

**Giải pháp**:
```bash
# Test SSH connection
ssh -i ~/.ssh/github_actions_deploy user@your-vps-ip

# Kiểm tra SSH key format trong GitHub Secret
# Phải có đầy đủ -----BEGIN và -----END
```

### Vấn đề: Containers không start

**Nguyên nhân**: `.env.prod` thiếu hoặc sai, port conflict

**Giải pháp**:
```bash
# Kiểm tra .env.prod
cat /opt/coffee-management/.env.prod

# Kiểm tra logs
docker compose -f docker-compose.prod.registry.yml logs

# Kiểm tra ports
netstat -tulpn | grep :8000
```

### Vấn đề: 502 Bad Gateway

**Nguyên nhân**: Container chưa chạy hoặc port sai

**Giải pháp**:
```bash
# Kiểm tra containers
docker ps

# Kiểm tra Nginx config
sudo nginx -t

# Kiểm tra ports trong docker-compose
docker compose -f docker-compose.prod.registry.yml ps
```

### Vấn đề: SSL certificate không hoạt động

**Nguyên nhân**: DNS chưa trỏ đúng hoặc firewall chặn port 80

**Giải pháp**:
```bash
# Kiểm tra DNS
dig yourdomain.com

# Kiểm tra firewall
sudo ufw status

# Test Let's Encrypt
sudo certbot certonly --dry-run -d yourdomain.com
```

---

## 📋 Checklist Tổng Hợp

### Trước khi Deploy

- [ ] VPS đã được setup (`setup-server.sh`)
- [ ] File `.env.prod` đã tạo và điền đầy đủ
- [ ] GitHub Secrets đã cấu hình (8 secrets)
- [ ] DNS đã trỏ về VPS IP
- [ ] MySQL container đã chạy
- [ ] Databases đã được khởi tạo (`init-databases.sh`)
- [ ] Nginx config đã được copy và sửa domain
- [ ] `docker-compose.prod.registry.yml` đã sửa username

### Deploy

- [ ] Push code lên main branch
- [ ] GitHub Actions build thành công
- [ ] Images đã được push lên registry
- [ ] SSH vào VPS thành công
- [ ] Containers đã được pull và start
- [ ] Health checks pass

### Sau Deploy

- [ ] SSL certificate đã được tạo
- [ ] HTTPS hoạt động
- [ ] Frontend truy cập được
- [ ] API endpoints hoạt động
- [ ] Đăng nhập thành công
- [ ] Logs không có lỗi

---

## 🔄 Quy trình Deploy Lại (Update)

Khi có code mới:

1. **Commit và push:**
   ```bash
   git add .
   git commit -m "Update feature X"
   git push origin main
   ```

2. **GitHub Actions tự động:**
   - Build images mới
   - Push lên registry
   - Deploy lên server

3. **Kiểm tra:**
   ```bash
   # SSH vào VPS
   ssh user@your-vps-ip
   
   # Kiểm tra containers
   docker compose -f docker-compose.prod.registry.yml ps
   
   # Kiểm tra logs
   docker compose -f docker-compose.prod.registry.yml logs -f
   ```

---

## 📚 Tài liệu Tham Khảo

- [GitHub Actions Setup](./GITHUB_ACTIONS_SETUP.md) - Chi tiết về CI/CD
- [CI/CD Quick Start](./CI_CD_QUICK_START.md) - Hướng dẫn nhanh
- [Database Setup](./sql/README.md) - Hướng dẫn setup databases
- [Nginx Config](./nginx-config-examples/README.md) - Hướng dẫn Nginx

---

## 🆘 Hỗ trợ

Nếu gặp vấn đề:

1. Kiểm tra logs: `docker compose logs`
2. Kiểm tra GitHub Actions logs
3. Xem troubleshooting section ở trên
4. Kiểm tra các tài liệu tham khảo

---

**Ngày tạo**: 2024-01-15
**Phiên bản**: 1.0
**Cập nhật lần cuối**: 2024-01-15

