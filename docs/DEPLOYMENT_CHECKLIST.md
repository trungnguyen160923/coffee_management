# Deployment Checklist - Production

Checklist đầy đủ để deploy lên production từ A đến Z.

---

## ✅ Phase 1: Chuẩn bị

### 1.1 VPS & Domain
- [ ] VPS đã được thuê (tối thiểu 4 vCPU, 8GB RAM, 80GB SSD)
- [ ] Domain đã được mua
- [ ] DNS records đã được cấu hình:
  - [ ] A record: `@` → VPS_IP
  - [ ] A record: `www` → VPS_IP
  - [ ] A record: `admin` → VPS_IP
  - [ ] A record: `api` → VPS_IP
- [ ] Đã test DNS: `dig yourdomain.com`

### 1.2 Accounts & Credentials
- [ ] GitHub repository access (đã có sẵn - dùng GHCR)
- [ ] Workflow permissions đã được bật (Settings → Actions → Workflow permissions → Read and write)
- [ ] MySQL root password (tạo mạnh)
- [ ] JWT secret key (tạo: `openssl rand -base64 64`)
- [ ] Email SMTP credentials (nếu dùng)

**Lưu ý**: Project dùng GitHub Container Registry (GHCR), không cần Docker Hub account.

---

## ✅ Phase 2: Setup Server

### 2.1 SSH & Repository
- [ ] SSH vào VPS thành công
- [ ] Repository đã được clone về `/opt/coffee-management`
- [ ] Đã có quyền truy cập vào thư mục

### 2.2 Server Setup Script
- [ ] Đã chạy `scripts/setup-server.sh`
- [ ] Docker đã được cài đặt
- [ ] Docker Compose đã được cài đặt
- [ ] Nginx đã được cài đặt
- [ ] Certbot đã được cài đặt
- [ ] Firewall đã được cấu hình (ports 22, 80, 443)
- [ ] Swap file đã được tạo (4GB)

### 2.3 Environment Variables
- [ ] File `.env.prod` đã được tạo từ `env.prod.example`
- [ ] `MYSQL_ROOT_PASSWORD` đã được điền
- [ ] `JWT_SIGNER_KEY` đã được điền
- [ ] Frontend URLs đã được điền (có thể dùng http:// trước, cập nhật sau)
- [ ] Email credentials đã được điền (nếu dùng)

---

## ✅ Phase 3: GitHub Secrets

### 3.1 Docker Registry
- [ ] **Không cần setup secrets** - Workflow tự động dùng `GITHUB_TOKEN` cho GHCR
- [ ] Đã kiểm tra Workflow permissions (Settings → Actions → Read and write permissions)
- [ ] Đã test: Images sẽ được push vào `ghcr.io/YOUR_USERNAME/coffee-*`

### 3.2 Server SSH
- [ ] SSH key pair đã được tạo
- [ ] Public key đã được copy lên VPS
- [ ] `SSH_PRIVATE_KEY` - Private key (toàn bộ nội dung)
- [ ] `SERVER_HOST` - VPS IP hoặc domain
- [ ] `SERVER_USER` - SSH user (root/ubuntu)

### 3.3 Frontend Build
- [ ] `VITE_API_BASE_URL` - API URL cho admin frontend
- [ ] `VITE_AI_SERVICE_URL` - AI service URL
- [ ] `REACT_APP_API_GATEWAY` - API URL cho customer frontend

---

## ✅ Phase 4: Databases

### 4.1 MySQL Container
- [ ] MySQL container đã được start
- [ ] MySQL đã sẵn sàng (health check pass)
- [ ] Đã chờ đủ 30 giây sau khi start

### 4.2 Initialize Databases
- [ ] Đã chạy `scripts/init-databases.sh`
- [ ] `auth_db` đã được tạo
- [ ] `profile_db` đã được tạo
- [ ] `order_db` đã được tạo
- [ ] `catalog_db` đã được tạo
- [ ] `notification_db` đã được tạo
- [ ] Đã kiểm tra: `SHOW DATABASES;`

### 4.3 Seed Data (Optional)
- [ ] Đã import `seed_data.sql` (nếu cần cho development)
- [ ] Đã test đăng nhập với account mẫu

---

## ✅ Phase 5: Nginx Configuration

### 5.1 DNS
- [ ] DNS đã trỏ đúng về VPS IP
- [ ] Đã test: `dig yourdomain.com`
- [ ] Đã test: `dig admin.yourdomain.com`
- [ ] Đã test: `dig api.yourdomain.com`

### 5.2 Nginx Config
- [ ] Đã copy `04-production-full.conf` vào `/etc/nginx/sites-available/coffee`
- [ ] Đã sửa domain trong file config
- [ ] Đã sửa SSL certificate paths (nếu cần)
- [ ] Đã enable site: `ln -s /etc/nginx/sites-available/coffee /etc/nginx/sites-enabled/`
- [ ] Đã test config: `sudo nginx -t`
- [ ] Đã reload Nginx: `sudo systemctl reload nginx`

### 5.3 Test HTTP (trước SSL)
- [ ] Truy cập `http://yourdomain.com` → OK
- [ ] Truy cập `http://admin.yourdomain.com` → OK
- [ ] Truy cập `http://api.yourdomain.com` → OK

---

## ✅ Phase 6: SSL/HTTPS

### 6.1 Certbot
- [ ] Certbot đã được cài đặt
- [ ] Đã tạo SSL certificate cho tất cả subdomains
- [ ] Certificate đã được tạo thành công
- [ ] Auto-renewal đã được setup
- [ ] Đã test renewal: `sudo certbot renew --dry-run`

### 6.2 HTTPS
- [ ] HTTP → HTTPS redirect hoạt động
- [ ] Truy cập `https://yourdomain.com` → OK
- [ ] Truy cập `https://admin.yourdomain.com` → OK
- [ ] Truy cập `https://api.yourdomain.com` → OK
- [ ] SSL certificate hợp lệ (không có warning)

### 6.3 Update Frontend URLs
- [ ] Đã cập nhật `.env.prod` với HTTPS URLs
- [ ] Đã cập nhật GitHub Secrets với HTTPS URLs
- [ ] Đã rebuild frontend images (nếu cần)

---

## ✅ Phase 7: CI/CD Configuration

### 7.1 Code Configuration
- [ ] `docker-compose.prod.registry.yml` đã sửa `REGISTRY_PREFIX`
- [ ] GitHub Actions workflow file đã có (`.github/workflows/deploy-production.yml`)
- [ ] Đã test build local (nếu có thể)

### 7.2 First Deployment
- [ ] Đã commit và push code lên main branch
- [ ] GitHub Actions đã trigger
- [ ] Build images thành công
- [ ] Push images lên registry thành công
- [ ] SSH vào VPS thành công
- [ ] Pull images thành công
- [ ] Containers đã được start

---

## ✅ Phase 8: Verification

### 8.1 Containers
- [ ] Tất cả containers đang chạy: `docker compose ps`
- [ ] Không có container failed
- [ ] Health checks pass

### 8.2 Services
- [ ] API Gateway: `curl https://api.yourdomain.com/actuator/health`
- [ ] Auth Service: `curl https://api.yourdomain.com/auth-service/actuator/health`
- [ ] Profile Service: `curl https://api.yourdomain.com/profiles/actuator/health`
- [ ] Order Service: `curl https://api.yourdomain.com/order-service/actuator/health`
- [ ] Catalog Service: `curl https://api.yourdomain.com/catalogs/actuator/health`
- [ ] Notification Service: `curl https://api.yourdomain.com/notification-service/actuator/health`

### 8.3 Frontend
- [ ] Customer frontend: `https://yourdomain.com` → Load được
- [ ] Admin frontend: `https://admin.yourdomain.com` → Load được
- [ ] Đăng nhập thành công
- [ ] Các chức năng chính hoạt động

### 8.4 Database
- [ ] Databases đang hoạt động
- [ ] Có thể query được dữ liệu
- [ ] Timezone đúng (UTC+7)

---

## ✅ Phase 9: Post-Deployment

### 9.1 Monitoring
- [ ] Đã setup log monitoring (nếu có)
- [ ] Đã kiểm tra resource usage
- [ ] Đã kiểm tra disk space
- [ ] Đã kiểm tra memory usage

### 9.2 Backup
- [ ] Đã setup backup databases tự động (nếu có)
- [ ] Đã test restore từ backup

### 9.3 Documentation
- [ ] Đã ghi lại thông tin deployment
- [ ] Đã ghi lại credentials (lưu an toàn)
- [ ] Đã document rollback procedure

---

## 🔄 Quy trình Deploy Lại (Update)

Khi có code mới:

- [ ] Code đã được test local
- [ ] Đã commit và push lên main
- [ ] GitHub Actions đã chạy
- [ ] Build thành công
- [ ] Deploy thành công
- [ ] Đã kiểm tra services sau deploy
- [ ] Không có lỗi trong logs

---

## 🆘 Rollback Procedure

Nếu có vấn đề:

1. **Rollback Code:**
   ```bash
   git checkout <previous-commit>
   git push origin main --force
   ```

2. **Rollback Containers:**
   ```bash
   docker compose -f docker-compose.prod.registry.yml pull
   docker compose -f docker-compose.prod.registry.yml up -d
   ```

3. **Restore Database:**
   ```bash
   docker exec -i coffee-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" < backup_file.sql
   ```

---

**Ngày tạo**: 2024-01-15
**Sử dụng**: Checklist này trước mỗi lần deploy production

