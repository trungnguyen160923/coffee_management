# Stage 1: Builder - Install dependencies and build tools
FROM python:3.11-slim AS builder

WORKDIR /app

# Cài đặt các công cụ build cần thiết cho các thư viện AI (numpy, pandas thường cần gcc)
# Lưu ý: libgomp1 là runtime library, không cần trong builder stage
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements trước để tận dụng Docker cache layer
COPY requirements.txt .

# Tạo venv và cài đặt dependencies
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip setuptools wheel && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime - Image nhẹ nhất để chạy
FROM python:3.11-slim

# Thiết lập biến môi trường để log Python in ra ngay lập tức (không bị buffer)
# Rất quan trọng để xem log trên Docker Compose/Portainer
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH="/app"

WORKDIR /app

# Cài đặt libgomp1 (OpenMP) - BẮT BUỘC cho Scikit-learn/Numpy trên slim image
# Nếu thiếu dòng này, AI service có thể bị crash khi import model
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Tạo non-root user để bảo mật
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy virtual environment từ builder stage
COPY --from=builder /opt/venv /opt/venv

# Copy mã nguồn và đổi quyền sở hữu ngay lập tức (tối ưu layer)
COPY --chown=appuser:appuser app ./app
# Lưu ý: report.json bị exclude trong .dockerignore, nếu cần thì bỏ exclude hoặc xóa dòng trên

# Chuyển sang user thường
USER appuser

# Expose port
EXPOSE 8005

# Healthcheck
# Kiểm tra endpoint gốc /, nếu app bạn không có route /, hãy đổi thành /health hoặc /docs
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8005/', timeout=5)" || exit 1

# Lệnh chạy server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8005"]