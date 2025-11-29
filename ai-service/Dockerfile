# Stage 1: Builder - Cài đặt dependencies và build tools
FROM python:3.11-slim AS builder

WORKDIR /app

# Cài đặt các công cụ build cần thiết (gcc, g++) để biên dịch các thư viện C/C++ của Python
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy file requirements.txt trước để tận dụng Docker cache
COPY requirements.txt .

# Tạo môi trường ảo (venv) và cài đặt các thư viện Python
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip setuptools wheel && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime - Image nhẹ nhất để chạy ứng dụng
FROM python:3.11-slim

# Thiết lập biến môi trường:
# - PYTHONUNBUFFERED=1: Log Python in ra console ngay lập tức (quan trọng để debug trên Docker)
# - PYTHONDONTWRITEBYTECODE=1: Không sinh ra file .pyc
# - PATH: Ưu tiên dùng python/pip trong venv
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Cài đặt thư viện runtime hệ thống cần thiết
# libgomp1: Bắt buộc cho các thư viện AI như scikit-learn, numpy (OpenMP support)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Tạo user non-root để tăng cường bảo mật
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy môi trường ảo (venv) từ giai đoạn builder
COPY --from=builder /opt/venv /opt/venv

# --- PHẦN SỬA LỖI QUAN TRỌNG ---
# Thay vì COPY app ./app (dễ gây sai cấu trúc), ta dùng COPY . .
# Lệnh này copy TOÀN BỘ thư mục hiện tại (ai-service) vào thư mục WORKDIR (/app)
# Kết quả: Trong container sẽ có /app/app, /app/requirements.txt, v.v.
# Khi đó lệnh `uvicorn app.main:app` chạy từ /app sẽ tìm thấy package `app` đúng chỗ.
COPY --chown=appuser:appuser . .

# Chuyển sang user non-root
USER appuser

# Expose port 8005
EXPOSE 8005

# Healthcheck để đảm bảo service đang chạy tốt
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8005/', timeout=5)" || exit 1

# Lệnh khởi động server
# Vì ta đã COPY toàn bộ, Python sẽ tìm thấy module 'app' ngay tại thư mục hiện tại (/app)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8005"]