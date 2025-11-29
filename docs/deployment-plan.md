## Kế hoạch triển khai Production (Docker Compose trên VPS)

### 1. Tổng quan
- Mục tiêu: đưa hệ thống microservices (Spring Boot, Python AI, React frontend) lên môi trường production ổn định, bảo mật.
- Mô hình: Docker Compose trên VPS Ubuntu 22.04/24.04 với Nginx reverse proxy và Certbot SSL.
- Thành phần chính:
  1. Java services (api-gateway, auth, catalog, order, profile, notification) - 6 services
  2. Python `ai-service`
  3. Frontend Vite (`fe_coffee_manager`) build thành static và phục vụ qua Nginx container
  4. CSDL MySQL (có thể dùng managed DB hoặc container riêng)
  5. Kafka (container riêng như hiện tại hoặc managed)

### 2. Chuẩn bị container (Dockerization)
1. **Java services**
   - Tạo Dockerfile multi-stage (build image Maven, run image Temurin JRE hoặc distroless).
   - Cấu hình JVM options qua biến `JAVA_OPTS` (ví dụ `-Xms256m -Xmx512m`) để khống chế RAM.
   - Chạy container bằng user non-root (thêm `USER app`).
   - Đảm bảo expose port theo `SERVER_PORT`.
2. **AI service (Python)**
   - Dùng Dockerfile hiện tại, bổ sung user non-root và tách requirements stage.
   - Cấu hình `.env` qua biến hoặc mount secret.
3. **Frontend**
   - Dockerfile multi-stage: stage build (node:18-alpine) chạy `npm ci && npm run build`, stage run (nginx:alpine) copy `dist/`.
   - Thiết lập biến `VITE_API_URL` (và các biến build-time khác) ngay lúc build để trỏ tới domain production.
   - Cấu hình Nginx **bên trong container frontend** để phục vụ static, set cache headers, và thêm dòng `try_files $uri $uri/ /index.html;` hỗ trợ SPA routing (Nginx host chỉ proxy pass).

### 3. Chuẩn bị server (VPS)
1. Thuê VPS tối thiểu 4 vCPU / 8GB RAM / 80GB SSD (ưu tiên ổ NVMe). Nếu ngân sách cho phép, cân nhắc 16GB để có dư địa.
2. Cài đặt:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y ca-certificates curl gnupg
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
   echo \
     "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
     $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
   sudo apt update
   sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   sudo usermod -aG docker $USER
   ```
3. Tạo swap file 4–8GB để tránh OOM khi RAM thật hết:
   ```bash
   sudo fallocate -l 4G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```
4. Cài đặt Nginx host:
   ```bash
   sudo apt install -y nginx
   sudo systemctl enable nginx
   ```

### 4. Quản lý cấu hình & secret
1. **Config Server**: deploy module `config-server` (hoặc container) trỏ tới repo cấu hình private.
2. **Repo cấu hình**:
   ```
   coffee-config/
     application.yml
     auth-service.yml
     ...
   ```
   - Không chứa secret; chỉ giữ thông số chung (port, feature flag, timeout).
3. **Secret**:
   - Đối với hạ tầng Docker Compose, ưu tiên lưu trong file `.env` trên server (không commit) hoặc Parameter Store đơn giản (SSM). HashiCorp Vault chỉ phù hợp khi có đội ngũ vận hành riêng.
   - Tên biến thống nhất (ví dụ `AUTH_DB_PASSWORD`, `JWT_SIGNER_KEY`).
   - Inject trực tiếp bằng biến môi trường khi chạy `docker compose`.

### 5. Docker Compose production
1. Tạo `docker-compose.prod.yml` với các service:
   - `config-server`
   - `api-gateway`, `auth`, `catalog-service`, `order-service`, `profile-service`, `notification-service`
   - `ai-service`
   - `frontend` (Nginx phục vụ static, tự xử lý routing)
   - `mysql` (hoặc external DB)
   - `kafka` (nếu tự host)
2. Nguyên tắc:
   - Dùng `restart: always`
   - Khai báo `depends_on` + healthcheck
   - Tách network: `frontend-net`, `backend-net`, `db-net`
   - Volume cho DB/Kafka/logs:
     ```yaml
     volumes:
       mysql-data:
       kafka-data:
     ```
   - Thiết lập giới hạn tài nguyên cho từng container:
     ```yaml
     deploy:
       resources:
         limits:
           memory: 512M
     ```
     (Compose v3 dành cho Swarm; nếu chạy standalone, dùng `mem_limit` hoặc `JAVA_OPTS` cho JVM).
   - Đảm bảo log driver cấu hình rotation: `logging: { driver: "json-file", options: { max-size: "10m", max-file: "3" } }`.
   - Ràng buộc port chỉ nghe trên localhost để tránh bị truy cập trực tiếp bỏ qua Nginx/SSL:
     ```yaml
     ports:
       - "127.0.0.1:8080:8080"
     ```
   - Với Kafka, giới hạn heap ngay trong compose để tránh chiếm hết RAM:
     ```yaml
     environment:
       KAFKA_HEAP_OPTS: "-Xms512m -Xmx512m"
     ```
     Đồng thời cân nhắc Kafka Kraft mode hoặc Redpanda nếu cần giảm footprint.
3. File `.env.prod` đặt cùng compose:
   ```
   SPRING_PROFILES_ACTIVE=prod
   CONFIG_SERVER_URI=http://config-server:8888
   DB_HOST=mysql
   DB_PASSWORD=<secret>
   ```
   (File này không commit, chỉ tồn tại trên server).
4. Healthcheck & thứ tự khởi động:
   ```yaml
   services:
     config-server:
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:8888/actuator/health"]
         interval: 30s
         timeout: 5s
         retries: 5

     api-gateway:
       depends_on:
         config-server:
           condition: service_healthy
         auth:
           condition: service_started
   ```
   Điều này đảm bảo các service phụ thuộc không khởi động khi Config Server/DB chưa sẵn sàng.

### 6. Reverse proxy & domain
1. Trỏ domain (vd `coffee-shop.com`) về IP VPS.
2. Cấu hình `/etc/nginx/sites-available/coffee` (forward đầy đủ header, tăng timeout):
   ```
   server {
     listen 80;
     server_name coffee-shop.com;

     location / {
       proxy_pass http://127.0.0.1:8080; # port frontend container expose
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_read_timeout 120s;
     }
   }
   ```
3. Enable site + reload:
   ```bash
   sudo ln -s /etc/nginx/sites-available/coffee /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### 7. Triển khai code
**Cách 1 – Thủ công**
1. SSH vào VPS, clone repo: `git clone <repo>`
2. Tạo `.env.prod`, `docker-compose.prod.yml`.
3. Build & chạy:
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
   ```

**Cách 2 – CI/CD (GitHub Actions)**
1. Workflow steps:
   - Checkout code
   - Build Docker images **trên GitHub Actions runner** (không build trên VPS), push lên registry (Docker Hub/GHCR)
   - SSH vào VPS, chạy `docker compose pull && docker compose up -d`
2. Bảo mật:
   - Dùng GitHub Secrets lưu SSH key, registry token.
   - Tạo script deploy trên VPS (`deploy.sh`) để action gọi.

### 8. HTTPS (SSL)
1. Cài Certbot:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   ```
2. Tạo chứng chỉ:
   ```bash
   sudo certbot --nginx -d coffee-shop.com -d www.coffee-shop.com
   ```
3. Certbot tự thêm block `listen 443 ssl`. Kiểm tra renew:
   ```bash
   sudo systemctl status certbot.timer
   ```

### 9. Giám sát & backup
1. **Logs**: với VPS 8GB, tránh cài ELK. Dùng log rotation của Docker hoặc tool nhẹ như [Dozzle](https://github.com/amir20/dozzle) để theo dõi log; cân nhắc cron job xóa log cũ.
2. **Metrics**: nếu tài nguyên hạn chế, dùng Netdata hoặc dịch vụ cloud. Chỉ triển khai Prometheus/Grafana khi có server riêng.
3. **Backup DB & tuning**:
   - Cron job chạy `mysqldump` lưu vào S3/backblaze (ví dụ `/etc/cron.d/mysql-backup`).
   - Tạo file `mysql-conf/my.cnf`:
     ```
     [mysqld]
     innodb_buffer_pool_size = 1G
     max_connections = 100
     ```
     và mount vào container để kiểm soát RAM của MySQL.

### 10. Quy trình cập nhật
1. Phát triển → merge vào `main`.
2. CI build & test → push hình ảnh mới.
3. Ở VPS:
   ```bash
   git pull
   docker compose -f docker-compose.prod.yml --env-file .env.prod pull
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
   docker image prune -f
   ```
4. Kiểm tra health `/actuator/health` từng service.

### 11. Checklist trước khi go-live
- [ ] Tất cả secret đã ra khỏi repo, lưu trong `.env` server hoặc store an toàn.
- [ ] Dockerfile multi-stage cho mọi service.
- [ ] `docker-compose.prod.yml` kiểm tra `docker compose config`.
- [ ] Domain trỏ đúng, HTTPS hợp lệ.
- [ ] Monitoring nhẹ + log rotation hoạt động.
- [ ] Backup DB thử restore thành công.
- [ ] Tài liệu hướng dẫn vận hành/rollback cho team.

### 12. Lưu ý quan trọng (Red Flags)
- **RAM hạn chế**: 8GB cho nhiều JVM rất dễ OOM. Luôn cấu hình swap + giới hạn RAM container + `JAVA_OPTS`.
- **DB & I/O**: Khi chạy MySQL cùng server, tránh ghi log quá nhiều, ưu tiên ổ NVMe, cân nhắc tách DB nếu load tăng.
- **Secret management**: Không nên dùng Vault nếu chưa có kinh nghiệm; `.env` được quản lý chặt trên server là đủ an toàn cho quy mô này.
- **Frontend build-time env**: Các biến `VITE_*` cố định tại build; test kỹ trước khi deploy.
- **Monitoring/Logging**: tránh stack nặng (ELK). Chỉ dùng khi có tài nguyên tương xứng.
- **CI/CD**: Build hình ảnh ở GitHub Actions, server chỉ pull để tránh tiêu tốn CPU/RAM trên production.
- **Kafka**: Nếu cần Kafka, ưu tiên chế độ Kraft (không cần Zookeeper) hoặc dùng Redpanda để tiết kiệm RAM.
- **Healthcheck/khởi động**: cấu hình `depends_on` với `condition: service_healthy` để đảm bảo Config Server, DB sẵn sàng trước khi các service phụ thuộc chạy.
- **Ảnh base cho Java**: Nếu cần healthcheck dùng `curl`, ưu tiên image `eclipse-temurin:17-jre-slim` thay vì distroless (distroless không có shell/curl). Nếu vẫn dùng distroless thì phải dựa vào healthcheck nội bộ của Spring Boot.
- **Quyền file MySQL config**: File `mysql-conf/my.cnf` cần quyền `644` trước khi mount (ví dụ `chmod 644 mysql-conf/my.cnf`) để MySQL chấp nhận đọc.
- **Biến môi trường frontend**: Trong pipeline build (GitHub Actions), bắt buộc set `VITE_API_URL=https://api.coffee-shop.com` (hoặc domain thật) trước khi chạy `npm run build`, tránh tình trạng bundle vẫn trỏ về `localhost`.

---

Tài liệu này là khung chi tiết; mỗi mục (Dockerfile, compose, CI/CD) nên có file hướng dẫn/ script cụ thể trong repo để thực thi dễ dàng.


