## Checklist triển khai hệ thống chia ca (Shift Scheduling)

### 1. Chuẩn bị & chốt thiết kế
- **1.1. Rà soát tài liệu thiết kế**
  - Đọc lại `docs/shift-scheduling-design.md` (bản mới nhất).
  - Xác nhận danh sách bảng & API sẽ triển khai (không thêm/bớt nữa).
- **1.2. Thống nhất roles nghiệp vụ**
  - Danh sách role trong `auth_db.roles` dùng cho ca làm việc:
    - `BARISTA_STAFF`, `CASHIER_STAFF`, `SERVER_STAFF`, `SECURITY_STAFF`.
  - Quy ước rõ: staff có thể có nhiều role (qua `staff_role_assignments`).

---

### 2. Database – auth_db
- **2.1. Mở rộng bảng `roles`**
  - [x] Thêm cột `role_name VARCHAR(100)` (tên hiển thị tiếng Việt).
  - [x] Seed các role nghiệp vụ:
    - [x] `BARISTA_STAFF` – Pha chế
    - [x] `CASHIER_STAFF` – Thu ngân
    - [x] `SERVER_STAFF` – Phục vụ
    - [x] `SECURITY_STAFF` – Bảo vệ
- **2.2. Kiểm tra tương thích**
  - [x] Đảm bảo các chỗ khác dùng bảng `roles` không bị ảnh hưởng bởi cột mới.

---

### 3. Database – profile_db

#### 3.1. Mở rộng `staff_profiles`
- [ ] Thêm cột:
  - [ ] `employment_type ENUM('FULL_TIME', 'PART_TIME', 'CASUAL') DEFAULT 'FULL_TIME'`
  - [ ] `pay_type ENUM('MONTHLY', 'HOURLY') DEFAULT 'MONTHLY'`
  - [ ] `base_salary DECIMAL(12,2)`
  - [ ] `hourly_rate DECIMAL(12,2)`
  - [ ] `overtime_rate DECIMAL(12,2)`
- [ ] Cập nhật script migration tương ứng.

#### 3.2. Tạo các bảng mới cho shifts
- **3.2.1. `staff_role_assignments`**
  - [ ] Tạo bảng theo thiết kế (mapping staff ↔ role_id từ `auth_db.roles`).
- **3.2.2. `shift_templates`**
  - [ ] Tạo bảng mẫu ca (branch, start_time, end_time, duration_hours, ...).
- **3.2.3. `shift_template_role_requirements` (nếu sử dụng)**
  - [ ] Tạo bảng yêu cầu role cho mẫu ca.
- **3.2.4. `shifts`**
  - [ ] Tạo bảng ca làm việc cụ thể (ngày, giờ, branch, status, ...).
- **3.2.5. `shift_role_requirements`**
  - [ ] Tạo bảng yêu cầu role cho ca cụ thể.
- **3.2.6. `shift_assignments`**
  - [ ] Tạo bảng phân công nhân viên vào ca (role_id, is_borrowed_staff, actual_hours, ...).
- **3.2.7. `cross_branch_requests`**
  - [ ] Tạo bảng yêu cầu mượn nhân viên giữa các chi nhánh.
- **3.2.8. `shift_requests`**
  - [ ] Tạo bảng gộp yêu cầu: SWAP / LEAVE / OVERTIME.
- **3.2.9. `staff_availability`**
  - [ ] Tạo bảng lịch rảnh nhân viên (day_of_week, time range).

#### 3.3. Migration & kiểm thử
- [ ] Viết file SQL `sql/profile_db_shifts.sql` chứa toàn bộ CREATE/ALTER cần thiết.
- [ ] Chạy migration trên DB dev/test.
- [ ] Kiểm tra index, enum, ràng buộc FK nội bộ (trong profile_db).

---

### 4. Backend – profile-service (module Shifts)

#### 4.1. Cấu trúc code
- [ ] Tạo package/module mới trong `profile-service`:
  - [ ] `entity` – các entity: `Shift`, `ShiftAssignment`, `ShiftRoleRequirement`, `ShiftTemplate`, `ShiftRequest`, `CrossBranchRequest`, `StaffAvailability`.
  - [ ] `repository` – JPA repositories.
  - [ ] `dto` – request/response cho API.
  - [ ] `service` – business logic (auto-assign, validation, payroll estimation).
  - [ ] `controller` – REST controllers với prefix `/api/shifts/**`.

#### 4.2. API cho Manager/Regional Manager
- **Shift Templates**
  - [ ] `GET /api/shift-templates/branch/{branchId}`
  - [ ] `POST /api/shift-templates`
  - [ ] `PUT /api/shift-templates/{templateId}`
  - [ ] `DELETE /api/shift-templates/{templateId}`
- **Shifts**
  - [ ] `GET /api/shifts/branch/{branchId}` (lọc theo ngày & status)
  - [ ] `GET /api/shifts/{shiftId}`
  - [ ] `POST /api/shifts`
  - [ ] `PUT /api/shifts/{shiftId}`
  - [ ] `DELETE /api/shifts/{shiftId}`
  - [ ] `POST /api/shifts/{shiftId}/publish`
  - [ ] `POST /api/shifts/batch-create`
- **Shift Role Requirements**
  - [ ] `GET /api/shift-role-requirements/shift/{shiftId}`
  - [ ] `POST /api/shift-role-requirements`
  - [ ] `PUT /api/shift-role-requirements/{id}`
  - [ ] `DELETE /api/shift-role-requirements/{id}`

#### 4.3. API phân công & self-service
- **Assignments (Manager/Regional Manager)**
  - [ ] `GET /api/shift-assignments/shift/{shiftId}`
  - [ ] `GET /api/shift-assignments/staff/{staffId}`
  - [ ] `POST /api/shift-assignments`
  - [ ] `PUT /api/shift-assignments/{assignmentId}`
  - [ ] `DELETE /api/shift-assignments/{assignmentId}`
- **Check-in / Check-out (Staff)**
  - [ ] `POST /api/shift-assignments/{assignmentId}/check-in`
  - [ ] `POST /api/shift-assignments/{assignmentId}/check-out`
- **Self-service đăng ký ca (Staff)**
  - [ ] `GET /api/shifts/available?branchId=&startDate=&endDate=`
  - [ ] `POST /api/shifts/{shiftId}/register`
  - [ ] `DELETE /api/shift-assignments/{assignmentId}/unregister`

#### 4.4. API shift_requests & cross_branch_requests
- **Shift Requests (SWAP/LEAVE/OVERTIME)**
  - [ ] `GET /api/shift-requests/staff/{staffId}`
  - [ ] `POST /api/shift-requests`
  - [ ] `PUT /api/shift-requests/{id}/approve`
  - [ ] `PUT /api/shift-requests/{id}/reject`
- **Cross Branch Requests (mượn nhân viên)**
  - [ ] `GET /api/cross-branch-requests?branchId=&status=`
  - [ ] `POST /api/cross-branch-requests`
  - [ ] `PUT /api/cross-branch-requests/{id}/approve`
  - [ ] `PUT /api/cross-branch-requests/{id}/reject`

#### 4.5. Authorization & Validation
- [ ] Cấu hình `@PreAuthorize`:
  - Manager – chỉ được thao tác trên branch của mình.
  - Regional Manager – xem/override nhiều branch.
  - Staff – chỉ xem/đăng ký/đổi/xin nghỉ ca của chính mình.
- [ ] Implement:
  - [ ] `validateManagerAccess(managerId, branchId)`
  - [ ] `filterEligibleStaff(...)` (availability, employment_type, hours/day, hours/week, nghỉ 11h, trùng ca).
  - [ ] Kiểm soát giới hạn giờ theo `employment_type` (FULL_TIME/PART_TIME/CASUAL).

#### 4.6. Tính lương & cost estimation
- [ ] Implement service tính lương theo ca (theo pseudo-code trong design):
  - FULL_TIME (MONTHLY): `base_salary + overtime_hours * overtime_rate`.
  - PART_TIME / CASUAL (HOURLY): `Σ(actual_hours × hourly_rate)`.
- [ ] API:
  - [ ] `GET /api/shifts/payroll/staff/{staffId}?from=&to=`
  - [ ] `GET /api/shifts/payroll/branch/{branchId}?from=&to=`

---

### 5. Tích hợp với các service khác

#### 5.1. notification-service
- [ ] Gửi notification khi:
  - [ ] Ca mới được phân công cho nhân viên.
  - [ ] Yêu cầu SWAP/LEAVE/OVERTIME được tạo.
  - [ ] Yêu cầu được duyệt / từ chối.
  - [ ] Ca sắp diễn ra mà thiếu nhân sự (trước X giờ).
  - [ ] Nhân viên không check-in sau Y phút (NO_SHOW).

#### 5.2. order-service & profile-service (phần hiện có)
- [ ] Dùng API hiện tại để:
  - [ ] Lấy thông tin branch (openHours, endHours, manager_user_id).
  - [ ] Lấy danh sách staff theo branch.

---

### 6. Frontend – fe_coffee_manager

#### 6.1. Service layer
- [ ] Thêm `shiftService.ts` với các hàm gọi API (shifts, assignments, requests,...).
- [ ] Định nghĩa types:
  - `Shift`, `ShiftAssignment`, `ShiftRequest`, `ShiftRoleRequirement`, `StaffAvailability`, ...

#### 6.2. Trang Manager – `ShiftManagement.tsx`
- [ ] Calendar view (tuần/tháng) hiển thị ca theo ngày.
- [ ] Modal tạo/sửa ca (dùng template hoặc custom).
- [ ] Giao diện phân công nhân viên:
  - [ ] Chọn theo role.
  - [ ] Hiển thị trạng thái đủ/thiếu nhân viên từng role.
- [ ] Cost estimation:
  - [ ] Tổng giờ/tuần.
  - [ ] Tổng cost dự kiến (theo lương/giờ hoặc chia theo tháng).
  - [ ] Cảnh báo nếu vượt ngân sách.

#### 6.3. Trang Staff – `MyShifts.tsx`
- [ ] Lịch ca cá nhân (tuần/tháng).
- [ ] Chức năng:
  - [ ] Đăng ký ca trống.
  - [ ] Xin nghỉ ca.
  - [ ] Yêu cầu đổi ca (SWAP).
  - [ ] Check-in / Check-out.

#### 6.4. Trang Regional Manager – `RegionalShiftView.tsx` (nếu cần)
- [ ] Bảng/timeline nhiều chi nhánh.
- [ ] Filter theo chi nhánh, ngày, role.
- [ ] Tóm tắt thiếu nhân sự & cost theo branch.

---

### 7. Testing & Rollout

#### 7.1. Unit & Integration Tests
- [ ] Test cho:
  - [ ] Auto-assign theo role & employment_type.
  - [ ] Validation giờ/ngày, trùng ca, nghỉ 11h.
  - [ ] Self-service đăng ký / xin nghỉ / đổi ca.
  - [ ] Cross-branch requests.
  - [ ] Tính lương theo ca.

#### 7.2. Feature Flag
- [ ] Thêm config: `app.shifts.enabled=true/false` trong profile-service.
- [ ] Khi `false`: ẩn menu/lối vào frontend, chặn API.

#### 7.3. Rollout
- [ ] Dev → Staging → Pilot 1–2 chi nhánh → Rollout toàn bộ.
- [ ] Thu feedback từ Manager/Staff, điều chỉnh rule/UX nếu cần.

---

### 8. Bảo trì & Cải tiến
- [ ] Theo dõi performance query trên bảng `shifts`, `shift_assignments`, `shift_requests`.
+- [ ] Xem xét bổ sung thêm báo cáo & dashboard (biểu đồ heatmap theo giờ, role, chi nhánh).


