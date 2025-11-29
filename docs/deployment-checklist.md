# Checklist triển khai Production

## Giai đoạn 1: Container hóa (Dockerization) - ƯU TIÊN CAO

### 1.1 Java Services (6 services)
- [x] **api-gateway**: Tạo Dockerfile multi-stage
- [x] **auth**: Tạo Dockerfile multi-stage
- [x] **catalog-service**: Tạo Dockerfile multi-stage
- [x] **order-service**: Tạo Dockerfile multi-stage
- [x] **profile-service**: Tạo Dockerfile multi-stage
- [x] **notification-service**: Tạo Dockerfile multi-stage

**Yêu cầu mỗi Dockerfile:**
- Multi-stage: build với Maven, run với `eclipse-temurin:17-jre-slim`
- Set `JAVA_OPTS` qua biến môi trường (`-Xms256m -Xmx512m`)
- User non-root
- Expose port đúng theo `SERVER_PORT`

### 1.2 AI Service (Python)
- [x] Dockerfile đã có (cần cải thiện)
- [x] Cải thiện: multi-stage, user non-root, tối ưu layer caching

### 1.3 Frontend (2 applications)
- [x] **fe_coffee_manager** (Admin/Manager/Staff - React/Vite): Tạo Dockerfile multi-stage
- [x] **web-app** (Customer - React/CRA): Tạo Dockerfile multi-stage
- [x] Cấu hình nginx.conf với `try_files $uri $uri/ /index.html;` cho cả 2
- [x] Đảm bảo biến môi trường được set lúc build (VITE_ prefix cho Vite, REACT_APP_ prefix cho CRA)

---

## Giai đoạn 2: Docker Compose Production - ƯU TIÊN CAO

- [x] Tạo `docker-compose.prod.yml` với tất cả services
- [x] Cấu hình networks: `frontend-net`, `backend-net`, `db-net`
- [x] Thêm `restart: always` cho mọi service
- [x] Cấu hình `depends_on` với healthcheck
- [x] Giới hạn RAM cho từng container (`deploy.resources.limits.memory`)
- [x] Bind port về `127.0.0.1` (không expose ra ngoài)
- [x] Cấu hình log rotation (`max-size: "10m", max-file: "3"`)
- [x] Volume cho MySQL, Kafka data
- [x] Tạo file `.env.prod.example` (template, không có secret thật)

---

## Giai đoạn 3: Quản lý cấu hình - ƯU TIÊN TRUNG BÌNH

### Option A: Đơn giản (Khuyến nghị cho bước đầu)
- [x] Tạo file `env.prod.example` (template, commit được)
- [x] Di chuyển tất cả secret ra khỏi `application.yaml` (loại bỏ default values)
- [x] Cập nhật `docker-compose.prod.yml` để inject đầy đủ biến môi trường
- [ ] Tạo file `.env.prod` trên server (không commit) - Làm trên VPS

### Option B: Config Server (Nâng cao, tùy chọn)
- [ ] Tạo module `config-server`
- [ ] Tạo repo cấu hình riêng (Git private)
- [ ] Thêm `bootstrap.yaml` cho mỗi service
- [ ] Cập nhật `pom.xml` thêm `spring-cloud-starter-config`

---

## Giai đoạn 4: Infrastructure Scripts - ƯU TIÊN TRUNG BÌNH

- [ ] Script setup VPS (`scripts/setup-vps.sh`):
  - Cài Docker, Docker Compose
  - Tạo swap file 4-8GB
  - Cài Nginx
- [ ] Script cấu hình Nginx (`scripts/setup-nginx.sh`)
- [ ] Script backup MySQL (`scripts/backup-mysql.sh`)
- [ ] Cron job cho backup tự động

---

## Giai đoạn 5: CI/CD Pipeline - ƯU TIÊN THẤP (có thể làm sau)

- [ ] Tạo `.github/workflows/deploy.yml`
- [ ] Build Docker images trên GitHub Actions
- [ ] Push images lên Docker Hub/GHCR
- [ ] SSH deploy script trên VPS
- [ ] Cấu hình GitHub Secrets (SSH key, registry token)

---

## Giai đoạn 6: Monitoring & Logging - ƯU TIÊN THẤP

- [ ] Cài Dozzle hoặc cấu hình Docker log rotation
- [ ] (Tùy chọn) Netdata cho metrics
- [ ] Healthcheck endpoints cho mọi service (`/actuator/health`)

---

## Giai đoạn 7: Security & SSL - ƯU TIÊN CAO (khi có domain)

- [ ] Trỏ domain về IP VPS
- [ ] Cài Certbot
- [ ] Cấu hình SSL cho Nginx
- [ ] Test HTTPS

---

## Thứ tự thực hiện đề xuất:

1. **Tuần 1**: Giai đoạn 1 (Container hóa) - Tạo tất cả Dockerfile
2. **Tuần 1-2**: Giai đoạn 2 (Docker Compose) - Tạo `docker-compose.prod.yml`
3. **Tuần 2**: Giai đoạn 3 (Config) - Di chuyển secret ra `.env`
4. **Tuần 3**: Giai đoạn 4 (Scripts) - Tạo scripts setup
5. **Tuần 4**: Test deploy trên VPS thật
6. **Sau đó**: CI/CD, Monitoring (có thể làm dần)

---

## Lưu ý quan trọng:

- **Không commit secret**: File `.env.prod` chỉ tồn tại trên server
- **Test local trước**: Chạy `docker compose -f docker-compose.prod.yml up` trên máy dev trước khi deploy
- **Backup trước khi deploy**: Đảm bảo có backup DB trước khi thay đổi production
- **Rollback plan**: Chuẩn bị kế hoạch rollback nếu có sự cố

