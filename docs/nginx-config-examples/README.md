# Nginx Configuration cho Production

File cấu hình Nginx production đầy đủ với tất cả tính năng bảo mật và tối ưu.

## 📁 File cấu hình

### `04-production-full.conf`

**Mô tả**: Cấu hình production đầy đủ với tất cả tính năng

**Tính năng**:
- ✅ HTTPS/SSL với Let's Encrypt
- ✅ Rate limiting (chống DDoS)
- ✅ Gzip compression (tối ưu bandwidth)
- ✅ Static file caching
- ✅ Security headers
- ✅ CORS support
- ✅ WebSocket support

**Cấu trúc routing**:
- `admin.coffeemanager.click` → Frontend Admin/Manager/Staff (port 8081)
- `coffeemanager.click` → Frontend Customer (port 8082)
- `api.coffeemanager.click` → API Gateway (port 8000)

---

## 🚀 Cách sử dụng

### Bước 1: Copy file vào VPS

```bash
# SSH vào VPS
ssh user@your-vps-ip

# Copy file vào thư mục sites-available
sudo cp docs/nginx-config-examples/04-production-full.conf /etc/nginx/sites-available/coffee
```

### Bước 2: Sửa đổi cấu hình

**Thay đổi domain**:
```bash
sudo nano /etc/nginx/sites-available/coffee
```

Tìm và thay thế tất cả `coffeemanager.click` thành domain của bạn:
```nginx
# Tìm:
server_name admin.coffeemanager.click;
# Thay thành:
server_name admin.yourdomain.com;
```

**Thay đổi SSL certificate path** (nếu cần):
```nginx
# Tìm:
ssl_certificate /etc/letsencrypt/live/coffeemanager.click/fullchain.pem;
# Thay thành domain của bạn:
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
```

**Thay đổi ports** (nếu khác với mặc định):
```nginx
# Frontend Admin
proxy_pass http://127.0.0.1:8081;  # Đổi nếu cần

# Frontend Customer
proxy_pass http://127.0.0.1:8082;  # Đổi nếu cần

# API Gateway
proxy_pass http://127.0.0.1:8000;  # Đổi nếu cần
```

### Bước 3: Enable site

```bash
# Tạo symlink
sudo ln -s /etc/nginx/sites-available/coffee /etc/nginx/sites-enabled/

# Xóa default site (nếu có)
sudo rm /etc/nginx/sites-enabled/default
```

### Bước 4: Test và reload

```bash
# Test cấu hình
sudo nginx -t

# Nếu OK, reload nginx
sudo systemctl reload nginx
```

---

## 🔧 Cấu hình SSL với Let's Encrypt

### Bước 1: Cài đặt Certbot

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

### Bước 2: Tạo SSL certificate

```bash
# Cho tất cả subdomains
sudo certbot --nginx \
  -d yourdomain.com \
  -d www.yourdomain.com \
  -d admin.yourdomain.com \
  -d api.yourdomain.com
```

### Bước 3: Certbot sẽ tự động:
- Tạo SSL certificate
- Cập nhật file cấu hình Nginx (hoặc bạn có thể dùng file `04-production-full.conf` đã có sẵn)
- Setup auto-renewal

### Bước 4: Kiểm tra auto-renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Kiểm tra timer
sudo systemctl status certbot.timer
```

---

## 📝 Lưu ý quan trọng

### 1. Ports trong Docker Compose
Đảm bảo ports trong `docker-compose.prod.yml` khớp với cấu hình Nginx:
- Frontend Admin: `127.0.0.1:8081:80`
- Frontend Customer: `127.0.0.1:8082:80`
- API Gateway: `127.0.0.1:8000:8000`

### 2. Firewall
Mở các ports cần thiết:
```bash
# HTTP (cho Let's Encrypt challenge)
sudo ufw allow 80/tcp

# HTTPS
sudo ufw allow 443/tcp
```

### 3. Domain DNS
Đảm bảo DNS records đã được cấu hình:
```
A     @              → VPS_IP
A     www            → VPS_IP
A     admin          → VPS_IP
A     api            → VPS_IP
```

### 4. Logs
Logs được lưu tại:
- `/var/log/nginx/admin-frontend-access.log`
- `/var/log/nginx/customer-frontend-access.log`
- `/var/log/nginx/api-gateway-access.log`

### 5. Rate Limiting
File có rate limiting:
- **API**: 10 requests/second (có thể burst 10 requests)
- **General**: 30 requests/second (có thể burst 20 requests)

Có thể điều chỉnh trong file nếu cần:
```nginx
# Tăng rate limit cho API
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;
limit_req zone=api_limit burst=20 nodelay;
```

### 6. Gzip Compression
Đã bật gzip cho các file types:
- Text files (HTML, CSS, JS, JSON, XML)
- Fonts (TTF, EOT, WOFF, WOFF2)
- SVG images

Có thể thêm file types khác nếu cần.

---

## 🐛 Troubleshooting

### Vấn đề: 502 Bad Gateway

**Nguyên nhân**: Container chưa chạy hoặc port sai

**Giải pháp**:
```bash
# Kiểm tra containers
docker ps

# Kiểm tra ports
docker compose -f docker-compose.prod.yml ps

# Kiểm tra logs
docker compose -f docker-compose.prod.yml logs frontend-admin
docker compose -f docker-compose.prod.yml logs api-gateway
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

### Vấn đề: WebSocket không hoạt động

**Nguyên nhân**: Thiếu headers hoặc cấu hình sai

**Giải pháp**: File đã có sẵn headers:
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

Nếu vẫn không hoạt động, kiểm tra:
- Container có hỗ trợ WebSocket không
- Port có đúng không
- Firewall có chặn không

### Vấn đề: Rate limiting quá strict

**Giải pháp**: Tăng rate limit trong file:
```nginx
# Tăng từ 10r/s lên 20r/s
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;
```

Sau đó reload:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 🔒 Security Features

File này đã bao gồm các tính năng bảo mật:

1. **HTTPS/SSL**: Bắt buộc tất cả traffic qua HTTPS
2. **Security Headers**:
   - `Strict-Transport-Security`: Force HTTPS
   - `X-Frame-Options`: Chống clickjacking
   - `X-Content-Type-Options`: Chống MIME sniffing
   - `X-XSS-Protection`: Chống XSS
   - `Referrer-Policy`: Kiểm soát referrer
3. **Rate Limiting**: Chống DDoS và brute force
4. **CORS**: Kiểm soát cross-origin requests

---

## 📚 Tài liệu tham khảo

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://certbot.eff.org/docs/)

---

**Ngày cập nhật**: 2024-01-15
**Phiên bản**: 2.0
