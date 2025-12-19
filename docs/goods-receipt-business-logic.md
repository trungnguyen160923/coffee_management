# Logic Nghiệp Vụ: Xử Lý Nhận Hàng (Goods Receipt)

## Tổng Quan

Khi Manager nhận hàng từ nhà cung cấp, hệ thống cần xử lý các trường hợp:
- ✅ **Nhận đủ** (OK)
- ⚠️ **Thiếu** (SHORT)
- 📦 **Thừa** (OVER)
- 💥 **Hư hỏng** (DAMAGE)
- ↩️ **Trả hàng** (RETURN)

Mỗi trường hợp có các hành động (actions) khác nhau và ảnh hưởng đến tồn kho, giá vốn, và trạng thái Purchase Order.

---

## 1. Trường Hợp: Nhận Đủ (OK)

### Logic Frontend

**Điều kiện:**
- `receivedQty == orderedQty` (hoặc `remainingQty` nếu đã nhận một phần trước đó)
- Không có `damageQty`

**Xử lý:**
```typescript
// FE tự động detect status
if (receivedQty === targetQty) {
  status = ReceiptStatus.OK;
  message = "Received X = Ordered/Remaining X";
}
```

**Payload gửi lên BE:**
```json
{
  "poDetailId": 123,
  "ingredientId": 456,
  "unitCodeInput": "KG",
  "qtyInput": 100,
  "unitPrice": 50000,
  "status": "OK",
  "damageQty": 0,
  "note": ""
}
```

### Logic Backend

**Bước 1: Validate**
```java
// Kiểm tra qtyInput > 0
// Kiểm tra qtyInput khớp với remainingQty (tolerance 1%)
```

**Bước 2: Tính toán**
```java
qtyBase = qtyInput * conversionFactor;  // Quy về đơn vị chuẩn
lineTotal = qtyBase * unitPrice;
```

**Bước 3: Cập nhật tồn kho**
```java
// Trong createInventoryAndCostForDetails()
switch (status) {
  case "OK":
    qtyIn = qtyBase;  // Toàn bộ số lượng nhập kho
    break;
}

// Cập nhật Stock
stock.quantity = beforeQty + qtyIn;

// Cập nhật giá vốn bình quân (Weighted Average)
newAvgCost = (oldQty * oldAvgCost + qtyIn * unitPrice) / (oldQty + qtyIn);
```

**Bước 4: Cập nhật PO Status**
```java
// Nếu tất cả PO details đã nhận đủ → PO status = "RECEIVED"
// Nếu còn thiếu → PO status = "PARTIALLY_RECEIVED"
```

### Ví Dụ

**Scenario:**
- PO đặt: 100 KG cà phê
- Nhận: 100 KG cà phê
- Đơn giá: 50,000 VND/KG

**Kết quả:**
- ✅ Status: `OK`
- 📦 Tồn kho tăng: +100 KG
- 💰 Giá vốn bình quân được cập nhật
- 📋 PO Status: `RECEIVED` (nếu đây là lần nhập cuối)

---

## 2. Trường Hợp: Thiếu (SHORT)

### Logic Frontend

**Điều kiện:**
- `receivedQty < orderedQty` (hoặc `remainingQty`)

**Xử lý:**
```typescript
// FE tự động detect
if (receivedQty < targetQty) {
  status = ReceiptStatus.SHORT;
  message = "Received X < Ordered/Remaining Y";
}

// FE yêu cầu Manager chọn action:
// 1. SHORT_ACCEPTED - Chấp nhận thiếu, không cần follow-up
// 2. SHORT_PENDING - Thiếu, cần follow-up với supplier
```

**UI Actions:**
- Button "✅ Accept Shortage" → `SHORT_ACCEPTED`
- Button "⚠️ Mark for Follow-up" → `SHORT_PENDING`

**Payload gửi lên BE:**
```json
{
  "poDetailId": 123,
  "ingredientId": 456,
  "unitCodeInput": "KG",
  "qtyInput": 80,  // Nhận 80, đặt 100 → thiếu 20
  "unitPrice": 50000,
  "status": "SHORT_ACCEPTED",  // hoặc "SHORT_PENDING"
  "damageQty": 0,
  "note": "SHORT ACCEPTED: Only received 80 out of 100 ordered."
}
```

### Logic Backend

**Bước 1: Validate**
```java
// Kiểm tra qtyInput < remainingQty
if (qtyInput >= remainingQty) {
  throw new AppException("SHORT status requires quantity less than remaining");
}
```

**Bước 2: Tính toán**
```java
qtyBase = qtyInput * conversionFactor;  // Chỉ tính số lượng thực tế nhận được
lineTotal = qtyBase * unitPrice;
```

**Bước 3: Cập nhật tồn kho**
```java
switch (status) {
  case "SHORT_ACCEPTED":
  case "SHORT_PENDING":
    qtyIn = qtyBase;  // Chỉ nhập số lượng thực tế nhận được
    break;
}

// Tồn kho chỉ tăng bằng số lượng nhận được (80 KG)
stock.quantity = beforeQty + 80;
```

**Bước 4: Cập nhật PO Status**
```java
// Kiểm tra tất cả PO details
if (allReceived && !hasShortage && !hasDamage) {
  po.status = "RECEIVED";
} else {
  po.status = "PARTIALLY_RECEIVED";
}

// Nếu SHORT_ACCEPTED → canReceiveMore = false (không nhận thêm được)
// Nếu SHORT_PENDING → canReceiveMore = true (có thể nhận tiếp sau)
```

### Ví Dụ

**Scenario:**
- PO đặt: 100 KG cà phê
- Nhận: 80 KG cà phê (thiếu 20 KG)
- Manager chọn: "Accept Shortage"

**Kết quả:**
- ⚠️ Status: `SHORT_ACCEPTED`
- 📦 Tồn kho tăng: +80 KG (chỉ nhận được)
- 💰 Giá vốn: Tính theo 80 KG nhận được
- 📋 PO Status: `PARTIALLY_RECEIVED` hoặc `RECEIVED` (nếu manager chấp nhận thiếu)
- 🚫 `canReceiveMore = false` (không nhận thêm được nữa)

**Nếu Manager chọn "Mark for Follow-up":**
- ⚠️ Status: `SHORT_PENDING`
- 📦 Tồn kho tăng: +80 KG
- 📋 PO Status: `PARTIALLY_RECEIVED`
- ✅ `canReceiveMore = true` (có thể nhận tiếp 20 KG còn lại sau)

---

## 3. Trường Hợp: Thừa (OVER)

### Logic Frontend

**Điều kiện:**
- `receivedQty > orderedQty` (hoặc `remainingQty`)

**Xử lý:**
```typescript
// FE tự động detect
if (receivedQty > targetQty) {
  status = ReceiptStatus.OVER;
  message = "Received X > Ordered/Remaining Y";
}

// FE yêu cầu Manager chọn action:
// 1. OVER_ACCEPTED - Chấp nhận thừa, giữ tất cả
// 2. OVER_ADJUSTED - Điều chỉnh PO để khớp với số lượng nhận
// 3. OVER_RETURN - Trả phần thừa về supplier
```

**UI Actions:**
- Button "✅ Accept Overage" → `OVER_ACCEPTED`
- Button "📝 Adjust Order" → `OVER_ADJUSTED`
- Button "↩️ Return Excess" → `OVER_RETURN`

**Payload gửi lên BE:**
```json
{
  "poDetailId": 123,
  "ingredientId": 456,
  "unitCodeInput": "KG",
  "qtyInput": 120,  // Nhận 120, đặt 100 → thừa 20
  "unitPrice": 50000,
  "status": "OVER_ACCEPTED",  // hoặc "OVER_ADJUSTED", "OVER_RETURN"
  "damageQty": 0,
  "note": "OVER ACCEPTED: Received 120 vs ordered 100."
}
```

### Logic Backend

**Bước 1: Validate**
```java
// Kiểm tra qtyInput > remainingQty
if (qtyInput <= remainingQty) {
  throw new AppException("OVER status requires quantity more than remaining");
}
```

**Bước 2: Tính toán**
```java
qtyBase = qtyInput * conversionFactor;
lineTotal = qtyBase * unitPrice;
```

**Bước 3: Cập nhật tồn kho (theo status)**

#### 3.1. OVER_ACCEPTED
```java
case "OVER_ACCEPTED":
  qtyIn = qtyBase;  // Nhập toàn bộ số lượng nhận được (120 KG)
  break;
```
**Kết quả:** Tồn kho tăng +120 KG, tính tiền cho 120 KG

#### 3.2. OVER_ADJUSTED
```java
case "OVER_ADJUSTED":
  qtyIn = qtyBase;  // Nhập toàn bộ số lượng nhận được (120 KG)
  // PO detail được điều chỉnh: orderedQty = 120 (từ 100)
  break;
```
**Kết quả:** Tồn kho tăng +120 KG, PO được điều chỉnh để khớp

#### 3.3. OVER_RETURN
```java
case "OVER_RETURN":
  // Chỉ nhập phần đúng với ordered/remaining
  BigDecimal orderedQtyBase = poDetail.getQty();
  BigDecimal totalReceivedIncludingCurrent = getTotalReceivedQuantityForPoDetail(poDetailId);
  BigDecimal totalPrevReceivedBase = totalReceivedIncludingCurrent - qtyBase;
  BigDecimal remainingBase = orderedQtyBase - totalPrevReceivedBase;
  
  // Cap qtyIn to remainingBase (chỉ nhập phần đúng)
  qtyIn = remainingBase.min(qtyBase);  // Ví dụ: min(100, 120) = 100
  break;
```
**Kết quả:** 
- Tồn kho chỉ tăng +100 KG (phần đúng)
- Phần thừa (20 KG) được tạo Return Goods để trả supplier

**Bước 4: Tạo Return Goods (nếu OVER_RETURN)**
```java
// FE tự động tạo Return Goods request
{
  "poId": 123,
  "details": [{
    "ingredientId": 456,
    "unitCode": "KG",
    "qty": 20,  // Phần thừa
    "unitPrice": 50000,
    "returnReason": "Return excess over ordered quantity"
  }]
}
```

### Ví Dụ

**Scenario:**
- PO đặt: 100 KG cà phê
- Nhận: 120 KG cà phê (thừa 20 KG)
- Manager chọn: "Accept Overage"

**Kết quả:**
- 📦 Status: `OVER_ACCEPTED`
- 📦 Tồn kho tăng: +120 KG (giữ tất cả)
- 💰 Tính tiền: 120 KG × 50,000 = 6,000,000 VND
- 📋 PO Status: `RECEIVED`

**Nếu Manager chọn "Return Excess":**
- 📦 Status: `OVER_RETURN`
- 📦 Tồn kho tăng: +100 KG (chỉ phần đúng)
- ↩️ Return Goods: 20 KG được tạo để trả supplier
- 💰 Tính tiền: 100 KG × 50,000 = 5,000,000 VND

---

## 4. Trường Hợp: Hư Hỏng (DAMAGE)

### Logic Frontend

**Điều kiện:**
- `damageQty > 0`

**Xử lý:**
```typescript
// FE tự động detect
if (damageQty > 0) {
  status = ReceiptStatus.DAMAGE;
  
  const goodQty = receivedQty - damageQty;
  
  if (goodQty < 0) {
    message = "DAMAGE: Invalid - damage exceeds received";
  } else if (goodQty === 0) {
    message = "DAMAGE: All items damaged - Choose action below";
  } else {
    message = `DAMAGE: ${damageQty} damaged, ${goodQty} good items - Choose action below`;
  }
}

// FE yêu cầu Manager chọn action:
// 1. DAMAGE_ACCEPTED - Chấp nhận hư, nhập cả hư vào kho
// 2. DAMAGE_RETURN - Trả phần hư về supplier
// 3. DAMAGE_PARTIAL - Chỉ nhập phần tốt, trả phần hư
```

**UI Actions:**
- Button "⚡ Accept Full Damage" → `DAMAGE_ACCEPTED`
- Button "↩️ Return Damaged" → `DAMAGE_RETURN`
- Button "🔧 Take Good Parts" → `DAMAGE_PARTIAL`

**Payload gửi lên BE:**
```json
{
  "poDetailId": 123,
  "ingredientId": 456,
  "unitCodeInput": "KG",
  "qtyInput": 90,  // Số lượng tốt
  "damageQty": 10,  // Số lượng hư
  "unitPrice": 50000,
  "status": "DAMAGE_PARTIAL",  // hoặc "DAMAGE_ACCEPTED", "DAMAGE_RETURN"
  "note": "DAMAGE PARTIAL: 10 damaged, 90 good items accepted."
}
```

### Logic Backend

**Bước 1: Validate**
```java
// Kiểm tra damageQty > 0
if (damageQty <= 0) {
  throw new AppException("DAMAGE status requires damage quantity > 0");
}

// Kiểm tra damageQty <= receivedQty
if (damageQty > qtyInput) {
  throw new AppException("Damage quantity cannot exceed received quantity");
}
```

**Bước 2: Tính toán**
```java
// qtyInput = số lượng tốt (good quantity)
// damageQty = số lượng hư
// totalReceived = qtyInput + damageQty

qtyBase = qtyInput * conversionFactor;  // Chỉ tính phần tốt
// Hoặc nếu DAMAGE_ACCEPTED: qtyBase = (qtyInput + damageQty) * conversionFactor

lineTotal = qtyBase * unitPrice;
```

**Bước 3: Cập nhật tồn kho (theo status)**

#### 4.1. DAMAGE_ACCEPTED
```java
case "DAMAGE_ACCEPTED":
  // Nhập cả phần tốt và phần hư vào kho
  qtyIn = qtyBase;  // qtyBase đã bao gồm cả damage (nếu FE gửi đúng)
  // Hoặc: qtyIn = (qtyInput + damageQty) * conversionFactor
  break;
```
**Kết quả:** Tồn kho tăng = tổng số lượng nhận (tốt + hư)

#### 4.2. DAMAGE_RETURN
```java
case "DAMAGE_RETURN":
  // Chỉ nhập phần tốt
  qtyIn = qtyBase;  // qtyBase = qtyInput (phần tốt) * conversionFactor
  break;
```
**Kết quả:** 
- Tồn kho tăng = chỉ phần tốt
- Phần hư được tạo Return Goods để trả supplier

#### 4.3. DAMAGE_PARTIAL
```java
case "DAMAGE_PARTIAL":
  // Chỉ nhập phần tốt
  qtyIn = qtyBase;  // qtyBase = qtyInput (phần tốt) * conversionFactor
  break;
```
**Kết quả:** 
- Tồn kho tăng = chỉ phần tốt
- Phần hư được tạo Return Goods để trả supplier

**Bước 4: Tạo Return Goods (nếu DAMAGE_RETURN hoặc DAMAGE_PARTIAL)**
```java
// FE tự động tạo Return Goods request
{
  "poId": 123,
  "details": [{
    "ingredientId": 456,
    "unitCode": "KG",
    "qty": 10,  // Phần hư
    "unitPrice": 50000,
    "returnReason": "Return damaged items"
  }]
}
```

### Ví Dụ

**Scenario:**
- PO đặt: 100 KG cà phê
- Nhận: 100 KG cà phê
- Hư hỏng: 10 KG
- Tốt: 90 KG
- Manager chọn: "Take Good Parts"

**Kết quả:**
- 💥 Status: `DAMAGE_PARTIAL`
- 📦 Tồn kho tăng: +90 KG (chỉ phần tốt)
- ↩️ Return Goods: 10 KG được tạo để trả supplier
- 💰 Tính tiền: 90 KG × 50,000 = 4,500,000 VND
- 📋 PO Status: `PARTIALLY_RECEIVED` hoặc `RECEIVED` (tùy vào số lượng còn lại)

**Nếu Manager chọn "Accept Full Damage":**
- 💥 Status: `DAMAGE_ACCEPTED`
- 📦 Tồn kho tăng: +100 KG (cả tốt và hư)
- 💰 Tính tiền: 100 KG × 50,000 = 5,000,000 VND
- ⚠️ Lưu ý: Hàng hư vẫn được nhập kho (có thể dùng cho mục đích khác)

---

## 5. Trường Hợp: Trả Hàng (RETURN)

### Logic Frontend

**Điều kiện:**
- Manager chọn "Return Item" cho toàn bộ dòng hàng

**Xử lý:**
```typescript
// Manager chọn action "Return Item"
status = ReceiptStatus.RETURN;

// FE yêu cầu nhập lý do (notes bắt buộc)
if (!notes || notes.trim() === '') {
  throw new Error("Please provide a reason for returning this item");
}
```

**Payload:**
```json
// Không gửi trong Goods Receipt (vì qtyInput = 0 không hợp lệ)
// Thay vào đó, FE tạo Return Goods riêng:
{
  "poId": 123,
  "details": [{
    "ingredientId": 456,
    "unitCode": "KG",
    "qty": 100,  // Toàn bộ số lượng đặt
    "unitPrice": 50000,
    "returnReason": "Item returned to supplier - quality issue"
  }]
}
```

### Logic Backend

**Bước 1: FE không gửi trong Goods Receipt**
```typescript
// FE skip RETURN lines trong Goods Receipt request
if (status === ReceiptStatus.RETURN) {
  return null;  // Không gửi lên BE
}
```

**Bước 2: FE tạo Return Goods riêng**
```typescript
// FE tự động tạo Return Goods sau khi tạo Goods Receipt
await catalogService.createReturnGoods({
  poId: purchaseOrder.poId,
  supplierId: supplierId,
  branchId: purchaseOrder.branchId,
  returnReason: "Auto-generated from Goods Receipt actions",
  details: returnDetails  // Bao gồm RETURN items
});

// Auto-approve và process để trừ kho ngay
await catalogService.approveReturnGoods(returnId);
await catalogService.processReturnGoods(returnId);
```

**Bước 3: Return Goods Service xử lý**
```java
// Return Goods sẽ:
// 1. Trừ tồn kho (nếu đã nhập kho trước đó)
// 2. Tạo Return Goods record
// 3. Cập nhật PO status nếu cần
```

### Ví Dụ

**Scenario:**
- PO đặt: 100 KG cà phê
- Manager quyết định: Trả toàn bộ (chưa nhận)

**Kết quả:**
- ↩️ Status: `RETURN`
- 📦 Tồn kho: Không thay đổi (vì chưa nhập)
- 📋 Return Goods được tạo với lý do
- 📋 PO Status: `PARTIALLY_RECEIVED` hoặc giữ nguyên

---

## Flow Diagram Tổng Quan

```
Manager nhập số lượng nhận
         ↓
FE validate và detect status
    ├─ OK → Nhận đủ
    ├─ SHORT → Thiếu → Chọn: ACCEPTED / PENDING
    ├─ OVER → Thừa → Chọn: ACCEPTED / ADJUSTED / RETURN
    ├─ DAMAGE → Hư → Chọn: ACCEPTED / RETURN / PARTIAL
    └─ RETURN → Trả hàng
         ↓
FE gửi request lên BE
         ↓
BE validate và xử lý
    ├─ Tính qtyBase (quy đổi đơn vị)
    ├─ Tính lineTotal
    ├─ Xác định qtyIn (số lượng nhập kho)
    └─ Cập nhật tồn kho và giá vốn
         ↓
BE tạo Goods Receipt Detail
         ↓
BE cập nhật PO Status
    ├─ RECEIVED (nếu tất cả OK)
    └─ PARTIALLY_RECEIVED (nếu còn thiếu/pending)
         ↓
FE tạo Return Goods (nếu có)
    ├─ OVER_RETURN → Trả phần thừa
    ├─ DAMAGE_RETURN → Trả phần hư
    └─ RETURN → Trả toàn bộ
```

---

## Bảng Tóm Tắt: Số Lượng Nhập Kho (qtyIn)

| Status | qtyIn (Số lượng nhập kho) | Ghi chú |
|--------|---------------------------|---------|
| `OK` | `qtyBase` (toàn bộ) | Nhập đủ |
| `SHORT_ACCEPTED` | `qtyBase` (số nhận được) | Chỉ nhập phần nhận được |
| `SHORT_PENDING` | `qtyBase` (số nhận được) | Chỉ nhập phần nhận được, có thể nhận tiếp |
| `OVER_ACCEPTED` | `qtyBase` (toàn bộ) | Nhập cả phần thừa |
| `OVER_ADJUSTED` | `qtyBase` (toàn bộ) | Nhập cả phần thừa, PO được điều chỉnh |
| `OVER_RETURN` | `min(remainingQty, qtyBase)` | Chỉ nhập phần đúng, phần thừa trả về |
| `DAMAGE_ACCEPTED` | `qtyBase` (tốt + hư) | Nhập cả phần hư |
| `DAMAGE_RETURN` | `qtyBase` (chỉ tốt) | Chỉ nhập phần tốt, phần hư trả về |
| `DAMAGE_PARTIAL` | `qtyBase` (chỉ tốt) | Chỉ nhập phần tốt, phần hư trả về |
| `RETURN` | `0` (không nhập) | Tạo Return Goods riêng |

---

## Bảng Tóm Tắt: canReceiveMore

| Status | canReceiveMore | Ý nghĩa |
|--------|----------------|---------|
| `OK` | `false` | Đã nhận đủ, không nhận thêm |
| `SHORT_ACCEPTED` | `false` | Đã chấp nhận thiếu, không nhận thêm |
| `SHORT_PENDING` | `true` | Thiếu nhưng có thể nhận tiếp |
| `OVER_ACCEPTED` | `false` | Đã chấp nhận thừa, không nhận thêm |
| `OVER_ADJUSTED` | `false` | Đã điều chỉnh, không nhận thêm |
| `OVER_RETURN` | `false` | Đã trả phần thừa, không nhận thêm |
| `DAMAGE_ACCEPTED` | `false` | Đã chấp nhận hư, không nhận thêm |
| `DAMAGE_RETURN` | `false` | Đã trả phần hư, không nhận thêm |
| `DAMAGE_PARTIAL` | `false` | Đã xử lý hư, không nhận thêm |

---

## Ví Dụ Tổng Hợp

### Scenario 1: Nhận nhiều lần (Partial Receipt)

**Lần 1:**
- PO đặt: 100 KG
- Nhận: 60 KG
- Status: `OK` (cho 60 KG)
- Kết quả: Tồn kho +60 KG, PO status = `PARTIALLY_RECEIVED`, `remainingQty = 40 KG`

**Lần 2:**
- Nhận: 40 KG
- Status: `OK` (cho 40 KG còn lại)
- Kết quả: Tồn kho +40 KG, PO status = `RECEIVED`, `remainingQty = 0 KG`

### Scenario 2: Thiếu + Hư

**Lần 1:**
- PO đặt: 100 KG
- Nhận: 80 KG (thiếu 20 KG)
- Status: `SHORT_PENDING`
- Kết quả: Tồn kho +80 KG, PO status = `PARTIALLY_RECEIVED`, `canReceiveMore = true`

**Lần 2:**
- Nhận: 15 KG (còn thiếu 5 KG)
- Hư: 3 KG
- Tốt: 12 KG
- Status: `DAMAGE_PARTIAL` (cho 12 KG tốt)
- Kết quả: 
  - Tồn kho +12 KG
  - Return Goods: 3 KG hư
  - PO status = `PARTIALLY_RECEIVED` (vì còn thiếu 5 KG)
  - `canReceiveMore = true` (có thể nhận tiếp 5 KG)

### Scenario 3: Thừa + Trả phần thừa

**Lần 1:**
- PO đặt: 100 KG
- Nhận: 120 KG (thừa 20 KG)
- Manager chọn: `OVER_RETURN`
- Kết quả:
  - Tồn kho +100 KG (chỉ phần đúng)
  - Return Goods: 20 KG (phần thừa)
  - PO status = `RECEIVED`
  - `canReceiveMore = false`

---

## Lưu Ý Quan Trọng

1. **Chuyển đổi đơn vị:** Tất cả tính toán đều quy về đơn vị chuẩn của nguyên liệu (`qtyBase`)

2. **Giá vốn bình quân:** Luôn tính theo công thức Weighted Average:
   ```
   newAvgCost = (oldQty × oldAvgCost + qtyIn × unitPrice) / (oldQty + qtyIn)
   ```

3. **Return Goods:** Tự động được tạo khi:
   - `OVER_RETURN`: Trả phần thừa
   - `DAMAGE_RETURN`: Trả phần hư
   - `RETURN`: Trả toàn bộ dòng

4. **PO Status:** 
   - `RECEIVED`: Tất cả items đã xử lý xong (OK hoặc đã chấp nhận thiếu/hư)
   - `PARTIALLY_RECEIVED`: Còn items chưa xử lý xong (pending, có thể nhận tiếp)

5. **canReceiveMore:** Chỉ `true` khi status là `SHORT_PENDING`, các trường hợp khác đều `false`

---

## API Endpoints

### Frontend → Backend

**POST `/api/goods-receipts`**
```json
{
  "poId": 123,
  "supplierId": 456,
  "branchId": 789,
  "receivedBy": 1,
  "details": [
    {
      "poDetailId": 100,
      "ingredientId": 200,
      "unitCodeInput": "KG",
      "qtyInput": 100,
      "unitPrice": 50000,
      "status": "OK",
      "damageQty": 0,
      "lotNumber": "LOT001",
      "mfgDate": "2025-01-01",
      "expDate": "2026-01-01",
      "note": ""
    }
  ]
}
```

**POST `/api/return-goods`** (tự động tạo nếu có RETURN)
```json
{
  "poId": 123,
  "supplierId": 456,
  "branchId": 789,
  "returnReason": "Auto-generated from Goods Receipt actions",
  "details": [
    {
      "ingredientId": 200,
      "unitCode": "KG",
      "qty": 20,
      "unitPrice": 50000,
      "returnReason": "Return excess over ordered quantity"
    }
  ]
}
```

---

## Kết Luận

Hệ thống xử lý linh hoạt các trường hợp nhận hàng với các action rõ ràng, đảm bảo:
- ✅ Tính chính xác của tồn kho
- ✅ Tính đúng giá vốn bình quân
- ✅ Quản lý trạng thái PO hợp lý
- ✅ Hỗ trợ nhận nhiều lần (partial receipt)
- ✅ Tự động tạo Return Goods khi cần
