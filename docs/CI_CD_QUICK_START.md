# CI/CD Quick Start Guide

Hướng dẫn nhanh để setup CI/CD tự động deploy lên production.

## 🚀 3 Bước Setup

### Bước 1: Setup Server (1 lần duy nhất)

```bash
# SSH vào VPS
ssh user@your-vps-ip

# Clone repo
git clone https://github.com/your-username/coffee_management.git /opt/coffee-management

# Chạy setup script
cd /opt/coffee-management
chmod +x scripts/setup-server.sh
./scripts/setup-server.sh

# Tạo .env.prod
cp env.prod.example .env.prod
nano .env.prod  # Điền các giá trị thật

# Khởi tạo Databases (chỉ lần đầu)
docker compose -f docker-compose.prod.yml up -d mysql
sleep 30  # Chờ MySQL sẵn sàng
export MYSQL_ROOT_PASSWORD=$(grep MYSQL_ROOT_PASSWORD .env.prod | cut -d '=' -f2)
chmod +x scripts/init-databases.sh
./scripts/init-databases.sh
```

### Bước 2: Cấu hình GitHub Secrets

Vào: **GitHub Repo → Settings → Secrets and variables → Actions**

Thêm các secrets sau:

| Secret Name | Giá trị | Ví dụ |
|------------|---------|-------|
| `DOCKER_USERNAME` | Docker Hub username | `yourusername` |
| `DOCKER_PASSWORD` | Docker Hub access token | `dckr_pat_...` |
| `SSH_PRIVATE_KEY` | SSH private key | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SERVER_HOST` | VPS IP hoặc domain | `123.456.789.0` |
| `SERVER_USER` | SSH user | `root` hoặc `ubuntu` |
| `VITE_API_BASE_URL` | API URL cho frontend admin | `https://api.coffeemanager.click` |
| `VITE_AI_SERVICE_URL` | AI service URL | `https://api.coffeemanager.click/api/ai` |
| `REACT_APP_API_GATEWAY` | API URL cho frontend customer | `https://api.coffeemanager.click/api` |

**Cách tạo SSH key:**
```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_deploy
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub user@your-vps-ip
cat ~/.ssh/github_actions_deploy  # Copy vào GitHub Secret
```

**Cách tạo Docker Hub token:**
1. Vào https://hub.docker.com/settings/security
2. Click "New Access Token"
3. Copy token vào secret `DOCKER_PASSWORD`

### Bước 3: Sửa docker-compose.prod.registry.yml

Mở file `docker-compose.prod.registry.yml` và thay `YOUR_DOCKER_USERNAME`:

```yaml
REGISTRY_PREFIX ?= docker.io/YOUR_DOCKER_USERNAME
# Thành:
REGISTRY_PREFIX ?= docker.io/yourusername
```

## ✅ Deploy

### Tự động
```bash
git add .
git commit -m "Setup CI/CD"
git push origin main
```

GitHub Actions sẽ tự động:
1. Build images
2. Push lên Docker Hub
3. Deploy lên server

### Thủ công
Vào: **GitHub → Actions → "Deploy to Production" → "Run workflow"**

## 🔍 Kiểm tra

```bash
# SSH vào VPS
ssh user@your-vps-ip

# Kiểm tra containers
cd /opt/coffee-management
docker compose -f docker-compose.prod.registry.yml ps

# Kiểm tra logs
docker compose -f docker-compose.prod.registry.yml logs -f
```

## 📝 Checklist

- [ ] Server đã setup (chạy `setup-server.sh`)
- [ ] File `.env.prod` đã tạo và điền đầy đủ
- [ ] GitHub Secrets đã cấu hình (8 secrets)
- [ ] `docker-compose.prod.registry.yml` đã sửa username
- [ ] SSH key đã copy lên server
- [ ] Push code lên main branch
- [ ] Kiểm tra GitHub Actions logs
- [ ] Kiểm tra containers trên server

## 🐛 Troubleshooting

**Build failed?**
- Kiểm tra GitHub Actions logs
- Test build local: `docker build -t test ./api-gateway`

**SSH failed?**
- Test: `ssh -i ~/.ssh/github_actions_deploy user@vps-ip`
- Kiểm tra SSH key format trong GitHub Secret

**Images không pull được?**
- Kiểm tra `DOCKER_USERNAME` và `DOCKER_PASSWORD`
- Test login: `docker login -u USERNAME -p PASSWORD`

**Containers không start?**
- Kiểm tra `.env.prod`
- Xem logs: `docker compose logs`

---

Xem chi tiết: [GITHUB_ACTIONS_SETUP.md](./GITHUB_ACTIONS_SETUP.md)

