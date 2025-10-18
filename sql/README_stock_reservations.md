# Stock Reservations System

## Tổng quan
Hệ thống giữ chỗ tồn kho theo công thức khi khách đặt món, tránh tình trạng oversell và đảm bảo tính chính xác của tồn kho.

## Cấu trúc Database

### 1. Bảng `stock_reservations`
- **Mục đích**: Lưu trữ thông tin giữ chỗ tồn kho tạm thời
- **Các trường chính**:
  - `reservation_group_id`: ID nhóm reservation (theo cart/guest)
  - `branch_id`: Chi nhánh
  - `ingredient_id`: Nguyên liệu
  - `quantity_reserved`: Số lượng đã giữ chỗ
  - `expires_at`: Thời gian hết hạn
  - `status`: Trạng thái (ACTIVE, COMMITTED, RELEASED)

### 2. Cập nhật bảng `stocks`
- **Thêm cột**: `reserved_quantity` - Số lượng đã được giữ chỗ
- **Mục đích**: Theo dõi tồn kho khả dụng = `quantity - reserved_quantity`

## Các API chính

### 1. POST `/stocks/check-and-reserve`
**Mục đích**: Kiểm tra và giữ chỗ tồn kho
```json
{
  "branchId": 1,
  "items": [
    {
      "productDetailId": 1,
      "quantity": 2
    }
  ],
  "cartId": "CART_001"
}
```

**Response thành công**:
```json
{
  "holdId": "RES_001",
  "expiresAt": "2024-01-01T15:30:00",
  "ingredientSummaries": [...],
  "itemSummaries": [...]
}
```

**Response lỗi (409)**:
```json
{
  "errors": [
    {
      "productDetailId": 1,
      "reason": "INSUFFICIENT_STOCK",
      "suggestQuantity": 1
    }
  ],
  "insufficientIngredients": [...]
}
```

### 2. POST `/stocks/commit`
**Mục đích**: Commit reservation (trừ kho thật)
```json
{
  "holdId": "RES_001",
  "orderId": 123
}
```

### 3. POST `/stocks/release`
**Mục đích**: Release reservation (hoàn trả)
```json
{
  "holdId": "RES_001"
}
```

## Luồng xử lý

### 1. Khi khách thêm vào giỏ hàng
1. Gọi API `check-and-reserve`
2. Nếu thành công → lưu `holdId` vào localStorage
3. Nếu thất bại → hiển thị lỗi và gợi ý số lượng

### 2. Khi khách checkout
1. Gọi API `commit` với `holdId`
2. Nếu thành công → tạo order
3. Nếu thất bại → gọi API `release`

### 3. Khi khách hủy đơn
1. Gọi API `release` với `holdId`

## Tự động cleanup

### 1. Event Scheduler
- Chạy mỗi 5 phút
- Tự động release các reservation hết hạn
- Cập nhật lại `reserved_quantity` trong stocks

### 2. Triggers
- **INSERT**: Tự động tăng `reserved_quantity`
- **UPDATE**: Xử lý chuyển đổi status
- **DELETE**: Tự động giảm `reserved_quantity`

## Views hữu ích

### 1. `v_stock_availability`
- Hiển thị tồn kho khả dụng
- Trạng thái stock (IN_STOCK, LOW_STOCK, OUT_OF_STOCK)

### 2. `v_active_reservations`
- Theo dõi các reservation đang active
- Thống kê theo nhóm reservation

## Monitoring

### 1. Metrics cần theo dõi
- Tỷ lệ reservation thành công/thất bại
- Số lượng reservation hết hạn
- Thời gian trung bình của reservation
- Top nguyên liệu thiếu

### 2. Logs quan trọng
- Reservation tạo mới
- Reservation commit/release
- Cleanup expired reservations
- Stock threshold alerts

## Cấu hình

### 1. TTL Reservation
```sql
-- Mặc định 15 phút
SET @reservation_ttl = 15;
```

### 2. Cleanup Interval
```sql
-- Mặc định 5 phút
SET @cleanup_interval = 5;
```

## Best Practices

### 1. Frontend
- Luôn check stock trước khi add to cart
- Lưu holdId để dùng khi checkout
- Handle timeout và refresh holdId

### 2. Backend
- Sử dụng pessimistic locking
- Batch operations khi có thể
- Monitor performance metrics

### 3. Database
- Regular cleanup expired reservations
- Monitor index performance
- Backup reservation data

## Troubleshooting

### 1. Reservation không được release
```sql
-- Kiểm tra reservations hết hạn
SELECT * FROM stock_reservations 
WHERE status = 'ACTIVE' AND expires_at < NOW();
```

### 2. Stock không chính xác
```sql
-- Kiểm tra reserved_quantity
SELECT s.*, 
       (s.quantity - s.reserved_quantity) as available,
       COALESCE(SUM(sr.quantity_reserved), 0) as total_reserved
FROM stocks s
LEFT JOIN stock_reservations sr ON s.ingredient_id = sr.ingredient_id 
    AND s.branch_id = sr.branch_id AND sr.status = 'ACTIVE'
GROUP BY s.stock_id;
```

### 3. Performance issues
- Kiểm tra indexes
- Monitor query execution time
- Consider partitioning for large datasets
