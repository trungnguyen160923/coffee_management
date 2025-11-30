# Hướng dẫn nâng cấp HTTP lên HTTPS

## GIAI ĐOẠN 1: Chuẩn bị Server & DNS (Hạ tầng)

### Bước 1: Kiểm tra trỏ tên miền (DNS)
Đảm bảo bạn đã vào trang quản trị tên miền (Tenten, Godaddy,...) và tạo 4 bản ghi A record trỏ về IP VPS:

- `@` (coffeemanager.click) → IP VPS
- `www` → IP VPS  
- `admin` → IP VPS
- `api` → IP VPS

**Kiểm tra DNS:**
```bash
dig coffeemanager.click
dig www.coffeemanager.click
dig admin.coffeemanager.click
dig api.coffeemanager.click
```

### Bước 2: Mở tường lửa (Firewall)
Trên Ubuntu VPS, chạy lệnh này để đảm bảo cổng 443 (HTTPS) được mở:

```bash
sudo ufw allow 'Nginx Full'
# Hoặc cụ thể hơn:
sudo ufw allow 80
sudo ufw allow 443
sudo ufw reload
```

---

## GIAI ĐOẠN 2: Cài đặt SSL & Cấu hình Nginx

### Bước 3: Chuẩn bị file Nginx sạch (HTTP)
Hãy chắc chắn file `/etc/nginx/sites-available/coffee` của bạn đang hoạt động tốt ở chế độ HTTP.

**⚠️ LƯU Ý:** Bạn có thể dùng **1 file duy nhất** (như hiện tại) hoặc **tách thành nhiều file**. Cả 2 cách đều đúng:

**So sánh 2 cách:**

| Tiêu chí | 1 file duy nhất | Nhiều file riêng |
|----------|----------------|------------------|
| **Ưu điểm** | - Đơn giản, ít file<br>- Dễ quản lý tổng thể<br>- Phù hợp dự án nhỏ | - Dễ maintain từng domain<br>- Dễ enable/disable từng domain<br>- Dễ backup/restore từng phần |
| **Nhược điểm** | - Khó quản lý khi có nhiều domain<br>- Phải sửa cả file khi chỉ cần sửa 1 domain | - Nhiều file hơn<br>- Phải enable nhiều symlink |

**Khuyến nghị:** Với 3-4 domains như dự án này, **1 file duy nhất là đủ và đơn giản hơn**. Bạn không cần tách file!

**Nếu bạn đã có file `/etc/nginx/sites-available/coffee` với cấu trúc như sau (đã đúng):**

```nginx
# ============================================
# ADMIN/MANAGER/STAFF FRONTEND
# ============================================
server {
    listen 80;
    server_name admin.coffeemanager.click;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# ============================================
# CUSTOMER FRONTEND + API GATEWAY
# ============================================
server {
    listen 80;
    server_name coffeemanager.click www.coffeemanager.click;

    # API Gateway - route /api đến localhost:8000
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Forward Authorization header (QUAN TRỌNG!)
        proxy_set_header Authorization $http_authorization;
        proxy_pass_request_headers on;

        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Customer frontend (default)
    location / {
        proxy_pass http://127.0.0.1:8082;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# ============================================
# API GATEWAY (dedicated domain)
# ============================================
server {
    listen 80;
    server_name api.coffeemanager.click;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Authorization $http_authorization;
        proxy_pass_request_headers on;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

**Kiểm tra file đã được enable:**
```bash
# Kiểm tra symlink
ls -la /etc/nginx/sites-enabled/ | grep coffee

# Nếu chưa có, tạo symlink:
sudo ln -s /etc/nginx/sites-available/coffee /etc/nginx/sites-enabled/
```

**Kiểm tra cú pháp:**
```bash
sudo nginx -t
```

**Reload:**
```bash
sudo systemctl reload nginx
```

**✅ Nếu file của bạn đã có cấu trúc trên và đang hoạt động tốt, bạn có thể bỏ qua bước này và chuyển sang Bước 4.**

### Bước 4: Cài đặt Certbot

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

### Bước 5: Kích hoạt SSL (Tự động)
Chạy lệnh sau để Certbot tự động xin chứng chỉ và sửa file Nginx của bạn:

```bash
# Cho domain chính (customer frontend)
sudo certbot --nginx -d coffeemanager.click -d www.coffeemanager.click

# Cho admin frontend
sudo certbot --nginx -d admin.coffeemanager.click

# Cho API Gateway
sudo certbot --nginx -d api.coffeemanager.click
```

**Quy trình:**
1. Nhập email của bạn
2. Chọn Y (Agree terms)
3. **QUAN TRỌNG:** Khi được hỏi về Redirect, chọn số **2** (Redirect - Make all requests redirect to secure HTTPS access)

Sau bước này, Nginx đã có SSL và Certbot đã tự động:
- Thêm block `listen 443 ssl`
- Cấu hình SSL certificates
- Redirect HTTP → HTTPS

---

## GIAI ĐOẠN 3: Cập nhật Code (Backend & Frontend)

### Bước 6: Cấu hình CORS ở Backend (Spring Cloud Gateway)

**⚠️ LƯU Ý QUAN TRỌNG:** Dự án này dùng **Spring Cloud Gateway** (reactive), không phải Spring MVC. Cấu hình CORS đã có sẵn trong file `WebClientConfiguration.java`.

**File:** `api-gateway/src/main/java/com/caffee_management/api_gateway/configuration/WebClientConfiguration.java`

**Cập nhật method `corsConfigurationSource()`:**

```java
@Bean
CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration corsConfiguration = new CorsConfiguration();
    corsConfiguration.setAllowedOrigins(List.of(
            // Development
            "http://localhost:5173",
            "http://localhost:8000",
            "http://localhost:3000",
            // Production domains - HTTP (tạm thời, sẽ redirect sang HTTPS)
            "http://coffeemanager.click",
            "http://www.coffeemanager.click",
            "http://admin.coffeemanager.click",
            "http://api.coffeemanager.click",
            // Production domains - HTTPS
            "https://coffeemanager.click",
            "https://www.coffeemanager.click",
            "https://admin.coffeemanager.click",
            "https://api.coffeemanager.click",
            // IP access (nếu cần)
            "http://213.163.201.60"
    ));
    corsConfiguration.setAllowedHeaders(List.of("*"));
    corsConfiguration.setAllowedMethods(List.of("*"));
    corsConfiguration.setAllowCredentials(true);
    corsConfiguration.setMaxAge(3600L);
    corsConfiguration.setExposedHeaders(List.of(
            "Content-Disposition",
            "Content-Type",
            "Content-Length",
            "Location"
    ));

    UrlBasedCorsConfigurationSource urlBasedCorsConfigurationSource = new UrlBasedCorsConfigurationSource();
    urlBasedCorsConfigurationSource.registerCorsConfiguration("/**", corsConfiguration);

    return urlBasedCorsConfigurationSource;
}
```

**Sau khi sửa:**
1. Build lại JAR file
2. Rebuild Docker image
3. Restart container

### Bước 7: Cập nhật Frontend URLs (Build-time variables)

**⚠️ QUAN TRỌNG:** Frontend URLs phải được set lúc **BUILD** Docker image, không phải runtime!

**Cập nhật file `.env.prod` trên VPS:**

```bash
# Frontend Admin (fe_coffee_manager)
VITE_API_BASE_URL=https://api.coffeemanager.click
VITE_AI_SERVICE_URL=https://api.coffeemanager.click/api/ai

# Frontend Customer (web-app)
REACT_APP_API_GATEWAY=https://api.coffeemanager.click/api
```

**Hoặc cập nhật file `env.prod.example` trong repo để làm template.**

### Bước 8: Rebuild và Deploy Frontend Containers

**⚠️ KHÔNG copy folder dist/build lên VPS!** Dự án này dùng Docker containers.

**Trên VPS, rebuild containers với HTTPS URLs:**

```bash
# Di chuyển vào thư mục dự án
cd /path/to/coffee_management

# Đảm bảo file .env.prod đã có HTTPS URLs (xem Bước 7)

# Rebuild và restart frontend containers
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build frontend-admin frontend-customer

# Hoặc rebuild tất cả (nếu cần)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

**Giải thích:**
- `--build`: Rebuild images với build args mới (HTTPS URLs)
- `--env-file .env.prod`: Load biến môi trường từ file
- `frontend-admin frontend-customer`: Chỉ rebuild 2 services này (nhanh hơn)

**Kiểm tra images đã được rebuild:**
```bash
docker images | grep coffee-frontend
```

---

## GIAI ĐOẠN 4: Kiểm tra & Vận hành

### Bước 9: Khởi động lại toàn bộ

**⚠️ KHÔNG dùng `systemctl restart`!** Dự án này dùng Docker Compose.

**Restart containers:**

```bash
# Restart tất cả services
docker compose -f docker-compose.prod.yml restart

# Hoặc restart từng service cụ thể
docker compose -f docker-compose.prod.yml restart api-gateway
docker compose -f docker-compose.prod.yml restart frontend-admin
docker compose -f docker-compose.prod.yml restart frontend-customer

# Reload Nginx lần cuối
sudo systemctl reload nginx
```

**Kiểm tra containers đang chạy:**
```bash
docker compose -f docker-compose.prod.yml ps
```

### Bước 10: Test thực tế (End-to-End)

1. **Test HTTP → HTTPS redirect:**
   - Truy cập `http://coffeemanager.click` → Phải tự động redirect sang `https://coffeemanager.click`
   - Test tương tự cho `admin.coffeemanager.click` và `api.coffeemanager.click`

2. **Test Mixed Content:**
   - Mở browser, nhấn F12 → Tab Console
   - Đảm bảo **KHÔNG có** lỗi "Mixed Content" (HTTP resources trên HTTPS page)

3. **Test API calls:**
   - Thực hiện đăng nhập từ frontend
   - Kiểm tra Network tab trong DevTools
   - Tất cả API calls phải đi qua HTTPS

4. **Test SSL certificate:**
   - Truy cập: https://www.ssllabs.com/ssltest/
   - Nhập domain của bạn
   - Kiểm tra rating (nên đạt A hoặc A+)

### Bước 11: Kiểm tra tự động gia hạn

```bash
# Test renew (dry-run)
sudo certbot renew --dry-run
```

Nếu thấy thông báo **"Congratulations, all simulated renewals succeeded"**, bạn đã hoàn thành!

**Kiểm tra auto-renew timer:**
```bash
sudo systemctl status certbot.timer
```

Certbot sẽ tự động renew certificates trước khi hết hạn (mỗi 12 giờ kiểm tra, renew khi còn < 30 ngày).

---

## TÓM TẮT CÁC ĐIỂM QUAN TRỌNG

### ✅ Đúng:
- DNS và Firewall setup
- Certbot SSL installation
- Nginx configuration
- Testing procedures

### ⚠️ Điều chỉnh cần thiết:

1. **CORS Config:**
   - Dự án dùng **Spring Cloud Gateway** (reactive)
   - File: `WebClientConfiguration.java` (không phải `WebMvcConfigurer`)
   - Đã có sẵn, chỉ cần thêm domain `api.coffeemanager.click`

2. **Frontend Deployment:**
   - **KHÔNG copy** folder dist/build lên VPS
   - Phải **rebuild Docker containers** với HTTPS URLs
   - URLs được "baked" vào code lúc build, không thể thay đổi runtime

3. **Restart Services:**
   - **KHÔNG dùng** `systemctl restart`
   - Dùng `docker compose restart` hoặc `docker compose up -d`

4. **Nginx Configuration:**
   - Nginx host **proxy_pass** đến containers (không serve static files)
   - Containers bind `127.0.0.1` (chỉ truy cập nội bộ)
   - SSL termination tại Nginx host

---

## CHECKLIST TRIỂN KHAI

- [ ] DNS records đã trỏ đúng (4 A records)
- [ ] Firewall đã mở port 80, 443
- [ ] Nginx HTTP config đã hoạt động
- [ ] Certbot đã cài đặt
- [ ] SSL certificates đã được tạo (3 domains)
- [ ] CORS config đã cập nhật (thêm `api.coffeemanager.click`)
- [ ] `.env.prod` đã có HTTPS URLs
- [ ] Frontend containers đã rebuild với HTTPS URLs
- [ ] Containers đã restart
- [ ] HTTP → HTTPS redirect hoạt động
- [ ] Không có lỗi Mixed Content
- [ ] API calls qua HTTPS thành công
- [ ] SSL rating đạt A/A+
- [ ] Certbot auto-renew đã test thành công

---

## TROUBLESHOOTING

### Lỗi: "Mixed Content"
**Nguyên nhân:** Frontend vẫn gọi API qua HTTP  
**Giải pháp:** Rebuild frontend containers với HTTPS URLs trong `.env.prod`

### Lỗi: CORS blocked
**Nguyên nhân:** Domain chưa được thêm vào CORS config  
**Giải pháp:** Cập nhật `WebClientConfiguration.java`, rebuild API Gateway

### Lỗi: Certificate không renew
**Nguyên nhân:** Certbot timer chưa chạy  
**Giải pháp:** `sudo systemctl enable certbot.timer && sudo systemctl start certbot.timer`

### Lỗi: Nginx không start
**Nguyên nhân:** Cú pháp config sai  
**Giải pháp:** `sudo nginx -t` để kiểm tra, sửa lỗi

---

## TÀI LIỆU THAM KHẢO

- [Certbot Documentation](https://certbot.eff.org/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Spring Cloud Gateway CORS](https://docs.spring.io/spring-cloud-gateway/docs/current/reference/html/#cors-configuration)

