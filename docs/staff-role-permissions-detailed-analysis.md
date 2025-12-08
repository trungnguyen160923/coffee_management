# Phân tích chi tiết: Staff Role Permissions

## Danh sách Menu/Features hiện có cho Staff

1. **Overview** (`/staff`) - Dashboard tổng quan
2. **POS** (`/staff/pos`) - Tạo order, thanh toán
3. **Orders** (`/staff/orders`) - Xem/quản lý orders
4. **Reservations** (`/staff/reservations`) - Quản lý đặt bàn
5. **Tables** (`/staff/tables`) - Quản lý bàn
6. **Recipes** (`/staff/recipes`) - Xem công thức pha chế
7. **Stock Usage** (`/staff/stock-usage`) - Ghi nhận sử dụng nguyên liệu
8. **Shift Registration** (`/staff/shifts`) - Đăng ký ca làm việc
9. **My Schedule** (`/staff/my-shifts`) - Xem lịch làm việc của tôi
10. **My Requests** (`/staff/my-requests`) - Yêu cầu ca làm việc

## Phân tích theo từng Role

### 1. SECURITY_STAFF (Bảo vệ)

**Nhiệm vụ chính**: Bảo vệ, an ninh, không liên quan đến hoạt động kinh doanh

**Nên có quyền**:
- ✅ **Shift menu**: Đăng ký ca, xem lịch, yêu cầu ca
  - `/staff/shifts` - Đăng ký ca
  - `/staff/my-shifts` - Xem lịch làm việc
  - `/staff/my-requests` - Yêu cầu ca

**Không nên có quyền**:
- ❌ **Overview** - Không cần dashboard kinh doanh
- ❌ **POS** - Không thanh toán
- ❌ **Orders** - Không xem/quản lý orders
- ❌ **Reservations** - Không quản lý đặt bàn
- ❌ **Tables** - Không quản lý bàn
- ❌ **Recipes** - Không cần công thức
- ❌ **Stock Usage** - Không ghi nhận nguyên liệu

**Kết luận**: Chỉ thấy **Shift menu group**, ẩn tất cả menu khác

---

### 2. CASHIER_STAFF (Thu ngân)

**Nhiệm vụ chính**: Thanh toán, xử lý đơn hàng, quản lý bàn

**Nên có quyền**:
- ✅ **Overview** - Xem dashboard (có thể hữu ích)
- ✅ **POS** - Thanh toán, tạo order
- ✅ **Orders** - Xem/quản lý orders để thanh toán
- ✅ **Reservations** - Xem đặt bàn (để biết khách đã đặt)
- ✅ **Tables** - Quản lý bàn (để thanh toán theo bàn)
- ✅ **Shift menu** - Đăng ký ca, xem lịch

**Không nên có quyền**:
- ❌ **Recipes** - Không cần công thức (đã nêu)
- ❌ **Stock Usage** - Không phải nhiệm vụ ghi nhận nguyên liệu

**Kết luận**: Có quyền xem tất cả trừ **Recipes** và **Stock Usage**

---

### 3. SERVER_STAFF (Phục vụ)

**Nhiệm vụ chính**: Phục vụ khách, quản lý bàn, đặt bàn

**Nên có quyền**:
- ✅ **Overview** - Xem dashboard
- ✅ **Orders** - Xem orders để phục vụ
- ✅ **Reservations** - Quản lý đặt bàn
- ✅ **Tables** - Quản lý bàn
- ✅ **Shift menu** - Đăng ký ca, xem lịch

**Không nên có quyền**:
- ❌ **POS** - Không thanh toán (thường là cashier)
- ❌ **Recipes** - Không cần công thức (đã nêu)
- ❌ **Stock Usage** - Không phải nhiệm vụ ghi nhận nguyên liệu

**Kết luận**: Có quyền xem tất cả trừ **POS**, **Recipes**, và **Stock Usage**

---

### 4. BARISTA_STAFF (Pha chế)

**Nhiệm vụ chính**: Pha chế đồ uống, sử dụng nguyên liệu

**Nên có quyền**:
- ✅ **Overview** - Xem dashboard
- ✅ **Orders** - Xem orders để pha chế
- ✅ **Recipes** - Cần công thức để pha chế
- ✅ **Stock Usage** - Ghi nhận sử dụng nguyên liệu
- ✅ **Shift menu** - Đăng ký ca, xem lịch

**Không nên có quyền**:
- ❌ **POS** - Không thanh toán
- ❌ **Reservations** - Không quản lý đặt bàn
- ❌ **Tables** - Không quản lý bàn

**Kết luận**: Có quyền xem **Orders**, **Recipes**, **Stock Usage**, và **Shift menu**

---

## Tổng hợp Matrix Quyền

| Feature | SECURITY | CASHIER | SERVER | BARISTA |
|---------|----------|---------|--------|---------|
| Overview | ❌ | ✅ | ✅ | ✅ |
| POS | ❌ | ✅ | ❌ | ❌ |
| Orders | ❌ | ✅ | ✅ | ✅ |
| Reservations | ❌ | ✅ | ✅ | ❌ |
| Tables | ❌ | ✅ | ✅ | ❌ |
| Recipes | ❌ | ❌ | ❌ | ✅ |
| Stock Usage | ❌ | ❌ | ❌ | ✅ |
| Shift menu | ✅ | ✅ | ✅ | ✅ |

## Khuyến nghị Implementation

### 1. Permission Functions cần thêm

```typescript
// Check if can view POS
export async function canViewPOS(user: User | null): Promise<boolean> {
  // Only CASHIER_STAFF
}

// Check if can view Orders
export async function canViewOrders(user: User | null): Promise<boolean> {
  // CASHIER_STAFF, SERVER_STAFF, BARISTA_STAFF
}

// Check if can view Reservations
export async function canViewReservations(user: User | null): Promise<boolean> {
  // CASHIER_STAFF, SERVER_STAFF
}

// Check if can view Tables
export async function canViewTables(user: User | null): Promise<boolean> {
  // CASHIER_STAFF, SERVER_STAFF
}

// Check if can view Stock Usage
export async function canViewStockUsage(user: User | null): Promise<boolean> {
  // Only BARISTA_STAFF
}
```

### 2. Components cần cập nhật

1. **Layout.tsx**:
   - Filter menu items dựa trên permissions
   - Ẩn menu groups nếu không có items nào

2. **StaffDashboard.tsx**:
   - Ẩn quick action buttons dựa trên permissions
   - Ẩn tabs dựa trên permissions

3. **Route Protection**:
   - Protect routes `/staff/pos`, `/staff/recipes`, etc.
   - Redirect hoặc show "Access Denied" nếu không có quyền

### 3. Backend API Protection

Cần validate permissions ở backend:
- POS APIs: Check CASHIER_STAFF
- Recipe APIs: Check BARISTA_STAFF
- Stock Usage APIs: Check BARISTA_STAFF
- Reservations APIs: Check CASHIER_STAFF, SERVER_STAFF
- Tables APIs: Check CASHIER_STAFF, SERVER_STAFF

## Lưu ý

1. **Overview/Dashboard**: Có thể hiển thị cho tất cả (trừ SECURITY), nhưng nội dung có thể khác nhau
2. **Orders**: Cần cho nhiều roles, nhưng có thể filter/limit data dựa trên role
3. **Flexibility**: Có thể cho phép staff có nhiều roles, quyền = union của tất cả roles

## Next Steps

1. ✅ Implement permission functions
2. ✅ Update Layout.tsx để filter menu
3. ✅ Update StaffDashboard.tsx để ẩn buttons/tabs
4. ✅ Add route protection
5. ⚠️ Backend API validation (recommended)

