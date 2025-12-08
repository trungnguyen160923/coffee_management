# Hướng dẫn Setup CI/CD với GitHub Actions

## 📋 Tổng quan

Hệ thống CI/CD tự động sẽ:
1. **Build** Docker images cho tất cả services trên GitHub Actions
2. **Push** images lên Docker Hub (hoặc GitHub Container Registry)
3. **Deploy** trên production server bằng cách pull images và restart containers

---

## 🚀 Bước 1: Chuẩn bị Server (VPS)

### Chạy script setup (chỉ cần 1 lần)

```bash
# SSH vào VPS
ssh user@your-vps-ip

# Clone repository (nếu chưa có)
git clone https://github.com/your-username/coffee_management.git /opt/coffee-management

# Chạy script setup
cd /opt/coffee-management
chmod +x scripts/setup-server.sh
./scripts/setup-server.sh
```

Script này sẽ tự động:
- Cài Docker và Docker Compose
- Cài Nginx
- Tạo project directory
- Setup swap file
- Cấu hình firewall
- Cài Certbot (cho SSL)

### Tạo file .env.prod

```bash
cd /opt/coffee-management
cp env.prod.example .env.prod
nano .env.prod  # Điền các giá trị thật
```

**Quan trọng**: File `.env.prod` chứa secrets, không commit vào Git!

### Khởi tạo Databases (Lần đầu tiên)

```bash
# Start MySQL container trước
docker compose -f docker-compose.prod.yml up -d mysql

# Chờ MySQL sẵn sàng (khoảng 30 giây)
sleep 30

# Set password từ .env.prod
export MYSQL_ROOT_PASSWORD=$(grep MYSQL_ROOT_PASSWORD .env.prod | cut -d '=' -f2)

# Chạy script khởi tạo databases
chmod +x scripts/init-databases.sh
./scripts/init-databases.sh
```

Script này sẽ:
- Tạo tất cả databases từ SQL files trong thư mục `sql/`
- Import schema và initial data
- Hỏi xác nhận nếu database đã tồn tại

**Lưu ý**: Chỉ cần chạy lần đầu. Các lần deploy sau không cần chạy lại.

---

## 🔐 Bước 2: Cấu hình GitHub Secrets

Vào GitHub repository → Settings → Secrets and variables → Actions

### 2.1 Docker Registry Secrets

**⚠️ Project này sử dụng GitHub Container Registry (GHCR)**

### Setup cơ bản (Repo Public - Khuyến nghị):
- **Không cần setup secrets** - Workflow tự động dùng `GITHUB_TOKEN`
- Images sẽ được push vào: `ghcr.io/YOUR_GITHUB_USERNAME/image-name`
- Server có thể pull images public mà không cần authentication

### Setup cho Repo Private:
Nếu repo là **private**, cần thêm secret `GHCR_TOKEN`:
1. Tạo GitHub Personal Access Token (PAT):
   - Vào GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Chọn scope: `read:packages` (để pull images)
   - Copy token
2. Thêm vào GitHub Secrets:
   - Vào repo → Settings → Secrets and variables → Actions
   - Tạo secret mới: `GHCR_TOKEN` = token vừa tạo
3. Đảm bảo workflow có quyền `write:packages`:
   - Vào repo → Settings → Actions → General
   - Scroll xuống "Workflow permissions"
   - Chọn "Read and write permissions"

**Nếu muốn dùng Docker Hub (không khuyến nghị):**
- `DOCKER_USERNAME`: Tên user Docker Hub
- `DOCKER_PASSWORD`: Access token hoặc password Docker Hub
- Cần sửa workflow để dùng `docker.io` thay vì `ghcr.io`

### 2.2 Server SSH Secrets

- `SSH_PRIVATE_KEY`: Private SSH key để kết nối vào VPS
- `SERVER_HOST`: IP hoặc domain của VPS (ví dụ: `123.456.789.0` hoặc `coffeemanager.click`)
- `SERVER_USER`: User SSH (thường là `root` hoặc `ubuntu`)

**Cách tạo SSH key pair:**

```bash
# Trên máy local
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_deploy

# Copy public key lên VPS
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub user@your-vps-ip

# Copy private key vào GitHub Secret
cat ~/.ssh/github_actions_deploy
# Copy toàn bộ nội dung (bao gồm -----BEGIN và -----END) vào secret SSH_PRIVATE_KEY
```

### 2.3 Frontend Build Secrets

- `VITE_API_BASE_URL`: URL API cho frontend admin (ví dụ: `https://api.coffeemanager.click`)
- `VITE_AI_SERVICE_URL`: URL AI service (ví dụ: `https://api.coffeemanager.click/api/ai`)
- `REACT_APP_API_GATEWAY`: URL API cho frontend customer (ví dụ: `https://api.coffeemanager.click/api`)

**Lưu ý**: 
- Dùng `https://` nếu đã có SSL
- Dùng `http://` nếu chưa có SSL (sẽ cần rebuild sau khi có SSL)

---

## 📝 Bước 3: Cấu hình Workflow

File `.github/workflows/deploy-production.yml` đã được cấu hình sẵn để dùng **GHCR**.

**Workflow tự động:**
- Sử dụng `ghcr.io` registry
- Dùng `github.repository_owner` làm image owner (username hoặc org name)
- Authenticate với `GITHUB_TOKEN` tự động
- Format images: `ghcr.io/OWNER/coffee-service-name:tag`

**Không cần sửa gì** nếu repo là public hoặc đã setup workflow permissions đúng.

---

## 🔄 Bước 4: Cấu hình docker-compose.prod.registry.yml

File `docker-compose.prod.registry.yml` đã được cấu hình sẵn.

**REGISTRY_PREFIX được set tự động** bởi GitHub Actions workflow khi deploy.

**Nếu deploy thủ công trên server:**

**Repo Public:**
```bash
export REGISTRY_PREFIX=ghcr.io/YOUR_GITHUB_USERNAME
docker compose -f docker-compose.prod.registry.yml pull
```

**Repo Private:**
```bash
# Login vào GHCR trước
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

export REGISTRY_PREFIX=ghcr.io/YOUR_GITHUB_USERNAME
docker compose -f docker-compose.prod.registry.yml pull
```

---

## 🚀 Bước 5: Deploy lần đầu

### 5.1 Push images lên registry

```bash
# Commit và push code
git add .
git commit -m "Setup CI/CD"
git push origin main
```

GitHub Actions sẽ tự động:
1. Build tất cả images
2. Push lên Docker Hub/GHCR
3. Deploy lên server

### 5.2 Kiểm tra deployment

```bash
# SSH vào VPS
ssh user@your-vps-ip

# Kiểm tra containers
cd /opt/coffee-management
docker compose -f docker-compose.prod.yml ps

# Kiểm tra logs
docker compose -f docker-compose.prod.yml logs -f
```

---

## 🔄 Quy trình CI/CD

### Tự động deploy khi push vào main

1. **Push code** → GitHub Actions trigger
2. **Build images** → Build tất cả services
3. **Push images** → Upload lên registry
4. **SSH vào server** → Kết nối qua SSH
5. **Pull images** → Download images mới
6. **Restart containers** → Deploy code mới
7. **Health check** → Kiểm tra services

### Deploy thủ công

Vào GitHub → Actions → "Deploy to Production" → "Run workflow"

---

## 📋 Checklist Setup

### Server Setup
- [ ] Chạy `scripts/setup-server.sh` trên VPS
- [ ] Tạo file `.env.prod` với đầy đủ secrets
- [ ] Test SSH connection từ local
- [ ] Test Docker và Docker Compose

### GitHub Secrets
- [ ] `SSH_PRIVATE_KEY` - SSH private key (bắt buộc)
- [ ] `SERVER_HOST` - VPS IP/domain (bắt buộc)
- [ ] `SERVER_USER` - SSH user (bắt buộc)
- [ ] `VITE_API_BASE_URL` - Frontend admin API URL (bắt buộc)
- [ ] `VITE_AI_SERVICE_URL` - AI service URL (bắt buộc)
- [ ] `REACT_APP_API_GATEWAY` - Frontend customer API URL (bắt buộc)
- [ ] `GHCR_TOKEN` - GitHub PAT với quyền `read:packages` (chỉ cần nếu repo private)

### Code Configuration
- [ ] Cập nhật `docker-compose.prod.yml` để dùng images từ registry
- [ ] Kiểm tra workflow file `.github/workflows/deploy-production.yml`
- [ ] Đảm bảo tất cả Dockerfiles đúng

### First Deployment
- [ ] Push code lên main branch
- [ ] Kiểm tra GitHub Actions logs
- [ ] Kiểm tra containers trên server
- [ ] Test các endpoints

---

## 🐛 Troubleshooting

### Vấn đề: Build failed trên GitHub Actions

**Nguyên nhân**: Dockerfile có lỗi hoặc thiếu dependencies

**Giải pháp**:
1. Kiểm tra logs trong GitHub Actions
2. Test build local trước: `docker build -t test ./api-gateway`
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

### Vấn đề: Images không pull được trên server

**Nguyên nhân**: 
- Repo private nhưng chưa login vào GHCR
- Image chưa được build/push

**Giải pháp**:
1. **Nếu repo private**: Thêm secret `GHCR_TOKEN` vào GitHub Secrets
2. **Kiểm tra images đã được push**: Vào GitHub → Packages → Xem images
3. **Test pull thủ công trên server**:
   ```bash
   # Login (nếu repo private)
   echo "YOUR_PAT" | docker login ghcr.io -u YOUR_USERNAME --password-stdin
   
   # Test pull một image
   docker pull ghcr.io/YOUR_USERNAME/coffee-api-gateway:latest
   ```

### Vấn đề: Containers không start

**Nguyên nhân**: `.env.prod` thiếu hoặc sai, hoặc port conflict

**Giải pháp**:
```bash
# Kiểm tra .env.prod
cat /opt/coffee-management/.env.prod

# Kiểm tra logs
docker compose -f docker-compose.prod.yml logs

# Kiểm tra ports
netstat -tulpn | grep :8000
```

---

## 🔒 Security Best Practices

1. **Không commit secrets**: `.env.prod` phải trong `.gitignore`
2. **Rotate secrets**: Đổi passwords/tokens định kỳ
3. **Limit SSH access**: Chỉ cho phép GitHub Actions IP (nếu có thể)
4. **Use strong passwords**: JWT keys, database passwords
5. **Monitor logs**: Kiểm tra logs thường xuyên

---

## 📚 Tài liệu tham khảo

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Hub Documentation](https://docs.docker.com/docker-hub/)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

---

**Ngày tạo**: 2024-01-15
**Phiên bản**: 1.0

