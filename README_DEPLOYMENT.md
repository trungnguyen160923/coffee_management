# 🚀 Hướng dẫn Deploy Production - Tóm tắt

Hướng dẫn nhanh để deploy hệ thống lên production với CI/CD.

---

## 📖 Tài liệu đầy đủ

👉 **Xem hướng dẫn chi tiết**: [`docs/DEPLOYMENT_COMPLETE_GUIDE.md`](./docs/DEPLOYMENT_COMPLETE_GUIDE.md)

👉 **Checklist**: [`docs/DEPLOYMENT_CHECKLIST.md`](./docs/DEPLOYMENT_CHECKLIST.md)

---

## ⚡ Quick Start (5 phút)

### 1. Setup Server

```bash
ssh user@your-vps-ip
git clone https://github.com/your-username/coffee_management.git /opt/coffee-management
cd /opt/coffee-management
chmod +x scripts/setup-server.sh
./scripts/setup-server.sh
```

### 2. Cấu hình

```bash
# Tạo .env.prod
cp env.prod.example .env.prod
nano .env.prod  # Điền các giá trị

# Khởi tạo databases
docker compose -f docker-compose.prod.yml up -d mysql
sleep 30
export MYSQL_ROOT_PASSWORD=$(grep MYSQL_ROOT_PASSWORD .env.prod | cut -d '=' -f2)
chmod +x scripts/init-databases.sh
./scripts/init-databases.sh
```

### 3. Cấu hình GitHub Secrets

Vào: **GitHub Repo → Settings → Secrets → Actions**

Thêm 8 secrets:
- `DOCKER_USERNAME`, `DOCKER_PASSWORD`
- `SSH_PRIVATE_KEY`, `SERVER_HOST`, `SERVER_USER`
- `VITE_API_BASE_URL`, `VITE_AI_SERVICE_URL`, `REACT_APP_API_GATEWAY`

### 4. Deploy

```bash
# Sửa docker-compose.prod.registry.yml
# Thay YOUR_DOCKER_USERNAME → yourusername

# Commit và push
git add .
git commit -m "Setup production"
git push origin main
```

GitHub Actions sẽ tự động deploy!

---

## 📚 Tài liệu khác

- [CI/CD Quick Start](./docs/CI_CD_QUICK_START.md)
- [GitHub Actions Setup](./docs/GITHUB_ACTIONS_SETUP.md)
- [Database Setup](./sql/README.md)
- [Nginx Config](./docs/nginx-config-examples/README.md)

---

**Cần giúp đỡ?** Xem [DEPLOYMENT_COMPLETE_GUIDE.md](./docs/DEPLOYMENT_COMPLETE_GUIDE.md)

