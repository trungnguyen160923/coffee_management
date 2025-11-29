# Hướng dẫn Deploy 2 Frontend Applications

## Tổng quan

Dự án có **2 frontend applications**:

1. **`fe_coffee_manager`** - Giao diện Admin/Manager/Staff (React/Vite)
2. **`web-app`** - Giao diện Customer (React/CRA)

Cả 2 đều được container hóa riêng và có thể deploy độc lập.

---

## Cấu trúc

### 1. fe_coffee_manager (Admin/Manager/Staff)

- **Framework:** React + Vite
- **Build output:** `dist/`
- **Port:** 80 (trong container)
- **Environment variables:** `VITE_API_BASE_URL`, `VITE_AI_SERVICE_URL`

### 2. web-app (Customer)

- **Framework:** React + Create React App
- **Build output:** `build/`
- **Port:** 80 (trong container)
- **Environment variables:** `REACT_APP_API_GATEWAY`

---

## Build Images

### Build fe_coffee_manager:

```bash
cd fe_coffee_manager

# Build với default values
docker build -t fe-coffee-manager:test .

# Build với production API URL
docker build \
  --build-arg VITE_API_BASE_URL=https://api.coffee-shop.com \
  --build-arg VITE_AI_SERVICE_URL=https://api.coffee-shop.com/api/ai \
  -t fe-coffee-manager:latest .
```

### Build web-app:

```bash
cd web-app

# Build với default values
docker build -t web-app:test .

# Build với production API URL
docker build \
  --build-arg REACT_APP_API_GATEWAY=https://api.coffee-shop.com/api \
  -t web-app:latest .
```

---

## Trong Docker Compose Production

Cả 2 frontend sẽ chạy trong cùng một compose file:

```yaml
services:
  frontend-admin:
    build:
      context: ./fe_coffee_manager
      args:
        VITE_API_BASE_URL: ${API_GATEWAY_URL}
        VITE_AI_SERVICE_URL: ${AI_SERVICE_URL}
    ports:
      - "127.0.0.1:8081:80"
    restart: always

  frontend-customer:
    build:
      context: ./web-app
      args:
        REACT_APP_API_GATEWAY: ${API_GATEWAY_URL}/api
    ports:
      - "127.0.0.1:8082:80"
    restart: always
```

---

## Cấu hình Nginx Host (VPS)

Nginx trên VPS sẽ route traffic đến 2 containers:

```nginx
# Admin/Manager/Staff frontend
server {
    listen 80;
    server_name admin.coffee-shop.com;
    
    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Customer frontend
server {
    listen 80;
    server_name coffee-shop.com www.coffee-shop.com;
    
    location / {
        proxy_pass http://127.0.0.1:8082;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**Hoặc dùng path-based routing:**

```nginx
server {
    listen 80;
    server_name coffee-shop.com;
    
    # Admin/Manager/Staff
    location /admin {
        proxy_pass http://127.0.0.1:8081;
        rewrite ^/admin(.*)$ $1 break;
    }
    
    # Customer (default)
    location / {
        proxy_pass http://127.0.0.1:8082;
    }
}
```

---

## Lưu ý quan trọng

### 1. Environment Variables phải set lúc BUILD

- **Vite:** Biến môi trường được "baked" vào code khi build
- **CRA:** Tương tự, biến môi trường được embed vào bundle
- **Không thể thay đổi sau khi build!**

### 2. API URLs trong Production

Khi build cho production, **bắt buộc** phải set đúng API URLs:

```bash
# fe_coffee_manager
VITE_API_BASE_URL=https://api.coffee-shop.com
VITE_AI_SERVICE_URL=https://api.coffee-shop.com/api/ai

# web-app
REACT_APP_API_GATEWAY=https://api.coffee-shop.com/api
```

### 3. SPA Routing

Cả 2 frontend đều là SPA, nên Nginx config phải có:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

→ Đã được cấu hình sẵn trong `nginx.conf` của mỗi container.

---

## Test Build

### Test fe_coffee_manager:
```bash
cd fe_coffee_manager
docker build -t fe-coffee-manager:test .
docker images fe-coffee-manager:test
```

### Test web-app:
```bash
cd web-app
docker build -t web-app:test .
docker images web-app:test
```

---

## Tóm lại

- **2 Dockerfile riêng** → 2 images riêng
- **2 containers riêng** → Có thể scale độc lập
- **Nginx host** → Route traffic đến đúng container
- **Environment variables** → Phải set lúc build, không thể thay đổi sau

