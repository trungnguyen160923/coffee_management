# Test Logging Setup

## Quick Start

### Chạy tests với logging (Windows):
```powershell
.\run-tests-with-logging.ps1 GoodsReceiptServiceTest
```

### Chạy tests với logging (Linux/Mac):
```bash
chmod +x run-tests-with-logging.sh
./run-tests-with-logging.sh GoodsReceiptServiceTest
```

## Log Files Location

Sau khi chạy tests, check các file log tại:
- `target/test-logs/test-output.log` - Tất cả log
- `target/test-logs/test-errors.log` - Chỉ lỗi
- `target/test-logs/goods-receipt-test.log` - Log chi tiết cho GoodsReceiptService tests

## Xem Log

### Windows:
```powershell
# Xem log lỗi
type target\test-logs\test-errors.log

# Xem log đầy đủ
type target\test-logs\test-output.log
```

### Linux/Mac:
```bash
# Xem log lỗi
cat target/test-logs/test-errors.log

# Xem log đầy đủ
cat target/test-logs/test-output.log

# Xem real-time
tail -f target/test-logs/test-output.log
```

## Troubleshooting

Nếu test fail, luôn check:
1. `target/test-logs/test-errors.log` - Xem lỗi chi tiết
2. `target/test-logs/goods-receipt-test.log` - Xem flow xử lý
3. `target/surefire-reports/` - Xem test reports

Xem thêm: `docs/test-logging-guide.md`

