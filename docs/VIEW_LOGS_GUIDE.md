# Hướng dẫn xem Logs - Production

## 📋 Cách xem log real-time

### 1. Xem log với service name (Khuyến nghị)

```bash
# Load .env.prod và xem log
docker compose -f docker-compose.prod.registry.yml --env-file .env.prod logs -f catalog-service
```

### 2. Xem log với container name

```bash
# Dùng container name (không cần --env-file)
docker logs -f coffee-catalog
```

---

## 🔍 Service Names vs Container Names

### Service Names (dùng trong docker compose):
- `api-gateway`
- `auth`
- `catalog-service` ← Dùng cái này
- `order-service`
- `profile-service`
- `notification-service`
- `ai-service`
- `frontend-admin`
- `frontend-customer`
- `mysql`
- `kafka`

### Container Names (dùng trong docker logs):
- `coffee-api-gateway`
- `coffee-auth`
- `coffee-catalog` ← Hoặc dùng cái này
- `coffee-order`
- `coffee-profile`
- `coffee-notification`
- `coffee-ai-service`
- `coffee-frontend-admin`
- `coffee-frontend-customer`
- `coffee-mysql`
- `coffee-kafka`

---

## ✅ Câu lệnh đúng

### Cách 1: Dùng docker compose (cần --env-file)

```bash
cd /opt/coffee-management

# Xem log một service
docker compose -f docker-compose.prod.registry.yml --env-file .env.prod logs -f catalog-service

# Xem log nhiều services
docker compose -f docker-compose.prod.registry.yml --env-file .env.prod logs -f catalog-service order-service

# Xem log tất cả
docker compose -f docker-compose.prod.registry.yml --env-file .env.prod logs -f
```

### Cách 2: Dùng docker logs (không cần --env-file)

```bash
# Xem log bằng container name
docker logs -f coffee-catalog

# Với timestamp
docker logs -f -t coffee-catalog

# Giới hạn số dòng
docker logs -f --tail=100 coffee-catalog
```

---

## 🔧 Fix lỗi "variable is not set"

### Vấn đề:
Khi chạy `docker compose` mà không có `--env-file .env.prod`, các biến môi trường sẽ không được load.

### Giải pháp:

**Option 1: Dùng --env-file (Khuyến nghị)**
```bash
docker compose -f docker-compose.prod.registry.yml --env-file .env.prod logs -f catalog-service
```

**Option 2: Export biến môi trường**
```bash
# Load .env.prod
export $(grep -v '^#' .env.prod | xargs)

# Sau đó chạy docker compose
docker compose -f docker-compose.prod.registry.yml logs -f catalog-service
```

**Option 3: Dùng docker logs (không cần env vars)**
```bash
# Không cần env vars, dùng trực tiếp container name
docker logs -f coffee-catalog
```

---

## 📝 Ví dụ thực tế

### Xem log API Gateway:
```bash
# Cách 1: docker compose
docker compose -f docker-compose.prod.registry.yml --env-file .env.prod logs -f api-gateway

# Cách 2: docker logs
docker logs -f coffee-api-gateway
```

### Xem log Auth Service:
```bash
docker compose -f docker-compose.prod.registry.yml --env-file .env.prod logs -f auth
# Hoặc
docker logs -f coffee-auth
```

### Xem log Profile Service:
```bash
docker compose -f docker-compose.prod.registry.yml --env-file .env.prod logs -f profile-service
# Hoặc
docker logs -f coffee-profile
```

### Xem log với timestamp và giới hạn:
```bash
# 100 dòng cuối, có timestamp
docker compose -f docker-compose.prod.registry.yml --env-file .env.prod logs -f -t --tail=100 catalog-service
```

---

## 🎯 Quick Reference

| Mục đích | Câu lệnh |
|----------|----------|
| Xem log real-time | `docker compose -f docker-compose.prod.registry.yml --env-file .env.prod logs -f SERVICE_NAME` |
| Xem log container | `docker logs -f CONTAINER_NAME` |
| Xem log với timestamp | Thêm `-t` |
| Giới hạn số dòng | Thêm `--tail=100` |
| Xem log từ thời điểm | Thêm `--since 10m` |

---

## ⚠️ Lưu ý

1. **Service name vs Container name:**
   - `docker compose logs` → Dùng **service name** (`catalog-service`)
   - `docker logs` → Dùng **container name** (`coffee-catalog`)

2. **--env-file:**
   - Cần khi dùng `docker compose` với `docker-compose.prod.registry.yml`
   - Không cần khi dùng `docker logs`

3. **REGISTRY_PREFIX:**
   - Được set tự động trong GitHub Actions
   - Nếu deploy thủ công: `export REGISTRY_PREFIX=ghcr.io/YOUR_USERNAME`

---

**Ngày tạo**: 2024-01-15

