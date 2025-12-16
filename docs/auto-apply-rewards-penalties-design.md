## Auto Apply Rewards / Penalties / Allowances – Business Logic Spec

### 1. Mục tiêu & Bối cảnh

- **Bối cảnh**: Hệ thống đã có:
  - Template thưởng/phụ cấp/phạt (`BonusTemplate`, `AllowanceTemplate`, `PenaltyConfig`).
  - Các service tạo bản ghi thực tế: `Bonus`, `Penalty`, `Allowance`.
  - Màn FE `ManagerBonusPenaltyAllowanceManagement` với modal **Auto apply** mới chỉ là mock.
- **Mục tiêu tính năng Auto apply**:
  - Cho phép **Manager cấu hình rule tự động** áp dụng thưởng/phụ cấp/phạt:
    - Dựa trên **template có sẵn**.
    - Theo **lịch chạy** (đầu tháng, cuối tháng, hàng tuần, hoặc manual).
    - Theo **phạm vi áp dụng** (toàn branch, theo role, theo loại hợp đồng, hoặc custom danh sách nhân viên).
  - Tự động sinh các bản ghi `Bonus / Allowance / Penalty` **đúng kỳ lương**, **không trùng lặp**, theo đúng quyền hạn.
  - Hỗ trợ cả **chạy định kỳ (scheduler)** và **chạy tay (Apply now)** từ FE.

---

### 2. Khái niệm chính

#### 2.1. Template (hiện có)

- **BonusTemplate**: mẫu thưởng.
- **AllowanceTemplate**: mẫu phụ cấp.
- **PenaltyConfig**: cấu hình phạt (coi như template phạt).
- Đặc điểm:
  - Tạo bởi Admin, có thể scope SYSTEM/BRANCH (xem thêm `payroll-management-complete-guide.md`).
  - Dùng để generate `Bonus`, `Allowance`, `Penalty` thực tế thông qua apply template.

#### 2.2. Auto Apply Rule (mới)

Đây là entity lưu cấu hình **rule tự động** của Manager:

- Thuộc tính đề xuất (mang tính business, mapping DB chi tiết sẽ làm ở SQL):
  - `ruleId`: khóa chính.
  - `branchId`: chi nhánh mà rule áp dụng.
  - `ownerManagerId`: userId của Manager tạo rule.
  - `type`: `BONUS | PENALTY | ALLOWANCE`.
  - `templateId`: ID của template tương ứng:
    - Nếu `type = BONUS` → tham chiếu `BonusTemplate.templateId`.
    - Nếu `type = ALLOWANCE` → tham chiếu `AllowanceTemplate.templateId`.
    - Nếu `type = PENALTY` → tham chiếu `PenaltyConfig.configId` (hoặc `templateId` nếu unify).
  - `isActive`: rule đang bật hay tắt.
  - **Scope**:
    - `scopeType`: `BRANCH | ROLE | EMPLOYMENT | CUSTOM`.
    - `roleCodes[]`: nếu scope là ROLE.
    - `employmentTypes[]`: nếu scope là EMPLOYMENT (FULL_TIME, PART_TIME, CASUAL...).
    - `staffUserIds[]`: nếu scope là CUSTOM – danh sách user cụ thể.
  - **Schedule**:
    - `schedule`: `MONTHLY_START | MONTHLY_END | WEEKLY_MONDAY | MANUAL`.
    - (Tuỳ chọn mở rộng) `dayOfMonth`, `dayOfWeek`, `timeOfDay`.
  - **Hành vi**:
    - `autoApprove`: `true/false` – tạo bản ghi ở trạng thái APPROVED/ACTIVE hay PENDING.
    - `notifyStaff`: `true/false` – có gửi thông báo cho nhân viên khi áp dụng không.
  - **Tracking**:
    - `name` / `note`: mô tả nội bộ cho Manager.
    - `createdAt`, `createdBy`, `updatedAt`, `updatedBy`.
    - (Tuỳ chọn) `lastRunAt`, `lastRunStatus`, `lastRunError`.

#### 2.3. Run Log (tuỳ chọn nhưng nên có)

Để theo dõi lịch sử chạy rule:

- `AutoApplyRunLog`:
  - `runId`.
  - `ruleId`.
  - `period`: chu kỳ lương target, ví dụ `YYYY-MM`.
  - `triggerType`: `SCHEDULED | MANUAL`.
  - `runAt`: thời điểm chạy.
  - `numCreated`: số bản ghi được tạo.
  - `numSkipped`: số bản ghi bỏ qua do trùng / conflict.
  - `status`: `SUCCESS | PARTIAL_SUCCESS | FAILED`.
  - `errorMessage`: mô tả lỗi nếu có.

---

### 3. Business Rules tổng quát

1. **Không tạo trùng bản ghi trong cùng kỳ**:
   - Với cùng `userId`, `period`, `type`, `templateId`, `ruleId` **chỉ được tồn tại tối đa 1 bonus/allowance/penalty**.
   - Đảm bảo bằng **logic + unique constraint** ở DB (ví dụ: unique index logical).
2. **Respect scope & quyền hạn**:
   - Manager chỉ được tạo rule cho **branch của mình**.
   - Scope không được “vượt biên”:
     - `BRANCH`: tất cả staff thuộc `branchId` của rule.
     - `ROLE`: chỉ các staff có role nằm trong `roleCodes[]` và cùng `branchId`.
     - `EMPLOYMENT`: staff cùng `branchId` và loại hợp đồng trong `employmentTypes[]`.
     - `CUSTOM`: danh sách `staffUserIds` phải thuộc `branchId` của Manager.
3. **Template phải hợp lệ & active**:
   - Rule chỉ chạy nếu:
     - `template.isActive = true`.
     - Manager có quyền dùng template (SYSTEM hoặc cùng branch).
4. **Tự động vs Manual**:
   - Scheduler **tự kích hoạt** rule theo lịch (hàng ngày kiểm tra xem hôm nay có match rule schedule không).
   - Từ FE, Manager có thể chọn **Apply now** cho 1 rule, có thể truyền `period` hoặc dùng kỳ hiện tại.
5. **Trạng thái sau khi tạo**:
   - Nếu `autoApprove = true`:
     - Bonus/Penalty (loại cho phép) → `status = APPROVED`.
     - Allowance → `status = ACTIVE`.
   - Nếu `autoApprove = false`:
     - `status = PENDING` (hoặc logic tương ứng).
6. **Thông báo**:
   - Nếu `notifyStaff = true`, sau khi tạo record:
     - Gửi notification qua `notification-service` (hoặc stub).
7. **Rollback / Idempotency**:
   - Mỗi lần chạy rule phải idempotent:
     - Kiểm tra tồn tại trước khi tạo.
     - Nếu tạo fail giữa chừng, nên log lại và có thể retry; **không xoá record đã tạo hợp lệ nếu không cần**.

---

### 4. Luồng nghiệp vụ chi tiết

#### 4.1. Manager tạo / chỉnh sửa Auto Apply Rule

**Từ góc nhìn FE (ví dụ modal Auto apply trong `ManagerBonusPenaltyAllowanceManagement`):**

1. Manager mở modal Auto apply.
2. Chọn:
   - `type` (bonus/penalty/allowance) – hoặc suy ra từ template.
   - **Template**:
     - FE gọi `payrollTemplateService` để load templates tương ứng:
       - `getBonusTemplatesForManager()`
       - `getAllowanceTemplatesForManager()`
       - `getPenaltyConfigsForManager()`
     - Manager chọn **1 template** → lấy `templateId`.
   - `schedule`: `MONTHLY_START | MONTHLY_END | WEEKLY_MONDAY | MANUAL`.
   - `scopeType` + chi tiết:
     - `BRANCH`: không cần chọn thêm (áp dụng branch hiện tại).
     - `ROLE`: chọn danh sách role (FE tạm có placeholder, cần nối API role sau).
     - `EMPLOYMENT`: tick FULL_TIME / PART_TIME / CASUAL,...
     - `CUSTOM`: tick danh sách nhân viên (dùng `staffService.getStaffsWithUserInfoByBranch`).
   - `autoApprove`: ON/OFF.
   - `notifyStaff`: ON/OFF.
   - `autoNote`: ghi chú nội bộ.
3. FE gửi request tạo/sửa rule:
   - `POST /api/profile/auto-rules`
   - hoặc `PUT /api/profile/auto-rules/{ruleId}` để update.

**Backend xử lý:**

1. Validate quyền:
   - Auth-service trả về `currentUserId`, `currentUserRole`.
   - Nếu role ≠ MANAGER/ADMIN → reject.
   - Lấy `managerBranchId` của Manager, ensure `rule.branchId = managerBranchId`.
2. Validate template:
   - Tìm template theo `type` + `templateId`.
   - Check:
     - `template.isActive = true`.
     - Template thuộc SYSTEM hoặc cùng `branchId` với Manager (xem spec templates).
3. Validate scope:
   - Nếu `scopeType = BRANCH` → OK, branch = managerBranchId.
   - Nếu `ROLE`:
     - Danh sách `roleCodes[]` không rỗng.
   - Nếu `EMPLOYMENT`:
     - `employmentTypes[]` không rỗng.
   - Nếu `CUSTOM`:
     - `staffUserIds[]` không rỗng.
     - Mỗi userId phải thuộc `managerBranchId`.
4. Lưu `AutoApplyRule` trong DB.

#### 4.2. Scheduler – chạy tự động theo lịch

**Ý tưởng**: 1 job (Quartz/Spring Scheduler) chạy **hàng ngày** (ví dụ 01:00), kiểm tra tất cả rule đang active, xem rule nào match với “hôm nay”.

1. Job load tất cả `AutoApplyRule` với `isActive = true`.
2. Với từng rule:
   - Xác định hôm nay có phải ngày nên chạy không:
     - `MONTHLY_START`: ngày = ngày đầu tháng.
     - `MONTHLY_END`: ngày = ngày cuối tháng.
     - `WEEKLY_MONDAY`: `LocalDate.now().getDayOfWeek() == MONDAY`.
     - `MANUAL`: **không chạy trong scheduler**, chỉ chạy khi có request manual.
   - Nếu không match → skip.
3. Xác định **kỳ lương (period)**:
   - Thường dùng format `YYYY-MM` của tháng hiện tại.
   - Có thể linh hoạt nếu business yêu cầu, nhưng nên giữ consistent với các phần còn lại của payroll.
4. Gọi service `runRule(ruleId, period, triggerType = SCHEDULED)`.
5. Ghi log vào `AutoApplyRunLog`:
   - Ghi nhận `numCreated`, `numSkipped`, status, error nếu có.

#### 4.3. Manual "Apply now"

**FE (ví dụ trong modal Auto apply):**

- Manager nhấn nút **Apply now**:
  - FE chọn:
    - `ruleId`.
    - `period` (option – nếu không gửi thì backend dùng kỳ hiện tại).
  - Gọi `POST /api/profile/auto-rules/{ruleId}/apply-now?period=YYYY-MM`.

**Backend:**

1. Validate quyền: Manager chỉ chạy rule thuộc branch của mình.
2. Gọi cùng một core logic `runRule(ruleId, period, triggerType = MANUAL)`.
3. Trả về FE:
   - `numCreated`, `numSkipped`, `period`, `type`.
4. FE hiển thị kết quả (toast / bảng tóm tắt).

#### 4.4. Core logic: runRule(rule, period, triggerType)

Pseudocode nghiệp vụ:

1. Load `AutoApplyRule` theo `ruleId`:
   - Nếu `!isActive` → reject (hoặc chỉ log).
2. Load template tương ứng:
   - Nếu `type = BONUS` → `BonusTemplate`.
   - Nếu `type = ALLOWANCE` → `AllowanceTemplate`.
   - Nếu `type = PENALTY` → `PenaltyConfig`.
   - Validate template như phần 4.1.
3. Xác định danh sách **nhân viên target**:
   - `scopeType = BRANCH`:
     - `staffService.getStaffsByBranch(rule.branchId)`.
   - `scopeType = ROLE`:
     - `staffService.getStaffsByBranchAndRoles(branchId, roleCodes[])`.
   - `scopeType = EMPLOYMENT`:
     - `staffService.getStaffsByBranchAndEmploymentTypes(branchId, employmentTypes[])`.
   - `scopeType = CUSTOM`:
     - Lấy các staff có `userId` trong `staffUserIds[]`, confirm branchId khớp.
4. Với từng staff trong danh sách:
   - Check **idempotency** – xem đã có record hay chưa:
     - Ví dụ cho BONUS:
       - Tìm `Bonus` với:
         - `userId = staff.userId`
         - `period = period`
         - `sourceTemplateId = rule.templateId`
         - `autoRuleId = ruleId` (nếu thêm field này vào bảng).
     - Nếu đã tồn tại → tăng `numSkipped` và bỏ qua.
   - Nếu chưa tồn tại:
     - Tạo `Bonus / Allowance / Penalty` mới:
       - `userId = staff.userId`.
       - `branchId = rule.branchId`.
       - `period = period`.
       - `amount`, `description`, `type` lấy từ template (cho phép override sau nếu cần).
       - `sourceTemplateId = rule.templateId`.
       - `autoRuleId = ruleId` (gợi ý thêm field).
       - `createdBy = rule.ownerManagerId` hoặc một SYSTEM user.
       - `status`:
         - Nếu `type = ALLOWANCE`:
           - `status = ACTIVE` nếu `autoApprove = true`, else `INACTIVE` hoặc `PENDING` (tùy logic hiện tại).
         - Nếu `type = BONUS`/`PENALTY`:
           - `status = APPROVED` nếu `autoApprove = true`, else `PENDING`.
     - Lưu DB.
     - Nếu `notifyStaff = true` → gửi thông báo cho staff.
5. Ghi `AutoApplyRunLog` + trả `numCreated`, `numSkipped`.

---

### 5. Thiết kế API đề xuất

#### 5.1. Auto Rules – Backend

Prefix gợi ý: `/api/profile/auto-rules`

- **Tạo rule**:

```http
POST /api/profile/auto-rules
```

Request body (business-level):

- `type`: `"BONUS" | "PENALTY" | "ALLOWANCE"`
- `templateId`: number
- `schedule`: `"MONTHLY_START" | "MONTHLY_END" | "WEEKLY_MONDAY" | "MANUAL"`
- `scopeType`: `"BRANCH" | "ROLE" | "EMPLOYMENT" | "CUSTOM"`
- `roles?`: string[]
- `employmentTypes?`: string[]
- `staffUserIds?`: number[]
- `autoApprove`: boolean
- `notifyStaff`: boolean
- `note?`: string

Backend tự map:

- `branchId` = branch của Manager (lấy từ profile).
- `ownerManagerId` = currentUserId.

- **Cập nhật rule**:

```http
PUT /api/profile/auto-rules/{ruleId}
```

- **Lấy danh sách rule** (cho Manager):

```http
GET /api/profile/auto-rules?branchId=... (backend có thể ignore param & tự dựa vào auth)
```

- **Bật/tắt rule**:

```http
PUT /api/profile/auto-rules/{ruleId}/toggle-active
```

- **Xoá rule**:

```http
DELETE /api/profile/auto-rules/{ruleId}
```

#### 5.2. Chạy rule (Manual & Scheduled)

- **Manual apply**:

```http
POST /api/profile/auto-rules/{ruleId}/apply-now?period=YYYY-MM
```

Response:

```json
{
  "ruleId": 123,
  "period": "2025-03",
  "type": "BONUS",
  "numCreated": 15,
  "numSkipped": 3,
  "status": "SUCCESS"
}
```

- **Preview (optional)** – chỉ tính toán danh sách target + tổng tiền, **không tạo record**:

```http
GET /api/profile/auto-rules/{ruleId}/preview?period=YYYY-MM
```

Response (ví dụ):

```json
{
  "ruleId": 123,
  "period": "2025-03",
  "type": "ALLOWANCE",
  "targetCount": 20,
  "estimatedTotalAmount": 4000000,
  "targets": [
    { "userId": 101, "fullname": "Nguyen A", "amount": 200000 },
    { "userId": 102, "fullname": "Tran B", "amount": 200000 }
  ]
}
```

Scheduler sẽ **không dùng endpoint này**, mà gọi trực tiếp service `runRule`.

---

### 6. Frontend integration (ManagerBonusPenaltyAllowanceManagement)

#### 6.1. Màn chính vs Quick page

- Màn chính `Rewards & Penalties Management`:
  - Quản lý transaction thực tế (Bonus/Penalty/Allowance).
  - Nút `Quick Rewards / Penalties / Allowances` mở Quick page.
- Quick page:
  - Cho phép Manager apply nhanh các template cho nhiều staff.
  - Nút **Auto apply** mở modal cấu hình rule:
    - Nên hiển thị **danh sách rule hiện có** và nút **Thêm rule mới**.

#### 6.2. Auto apply modal – luồng đề xuất

1. Khi mở modal:
   - FE gọi:
     - `GET /api/profile/auto-rules` để load các rule hiện có.
     - Load templates (nếu cho phép tạo rule từ đây).
2. Chế độ:
   - **Tab 1 – Danh sách rules**:
     - Table: Tên rule, type, template name, schedule, scope, autoApprove, active, lastRunAt, actions (Edit, Toggle, Apply now).
   - **Tab 2 – Tạo/Chỉnh sửa rule**:
     - Form như phần 4.1.
     - Sau khi submit → gọi `POST/PUT /auto-rules`.
3. Nút **Apply now** ở mỗi rule:
   - Gọi `POST /auto-rules/{ruleId}/apply-now`.
   - Sau khi thành công: toast kết quả, optional reload danh sách bonus/allowance/penalty bằng `fetchData()`.

---

### 7. Quy tắc dữ liệu & idempotency

#### 7.1. Ràng buộc tránh trùng

- Đề xuất thêm field:
  - `autoRuleId` vào bảng `bonuses`, `allowances`, `penalties`.
- Unique logic (hoặc index):
  - `UNIQUE (user_id, period, source_template_id, auto_rule_id, type)` – type implicit bởi bảng, có thể bỏ `type`.
- Mỗi lần run rule:
  - Trước khi tạo record mới, check tồn tại bằng key này.

#### 7.2. Tương tác với payroll

- Bonus/Allowance/Penalty tạo bởi Auto rule vẫn chỉ là **transaction bình thường**:
  - Payroll service tiêu thụ chúng như các record khác:
    - Bonus APPROVED.
    - Allowance ACTIVE.
    - Penalty APPROVED.
- Không cần logic đặc biệt ở payroll – Auto apply chỉ là **cách tạo record**.

---

### 8. Quyền hạn & bảo mật

1. **Manager**:
   - Chỉ tạo/chỉnh sửa/xoá rules cho **branch của mình**.
   - Chỉ dùng template:
     - SYSTEM (branch_id = NULL).
     - Hoặc `branch_id = managerBranchId`.
   - Chỉ chạy rule (Apply now) cho rule thuộc branch mình.
2. **Admin**:
   - Có thể xem tất cả rules.
   - Có thể override (tuỳ nhu cầu) – không bắt buộc trong phase đầu.
3. **Staff**:
   - Không xem / không quản lý rules.
   - Chỉ nhận notification & thấy kết quả trong payroll / transaction list.

---

### 9. Triển khai từng bước (Roadmap ngắn)

**Phase 1 – Backend Core**

- [ ] Thiết kế & tạo bảng `auto_apply_rules` (+ optional `auto_apply_run_logs`).
- [ ] Implement service:
  - [ ] `createRule`, `updateRule`, `deleteRule`, `toggleActive`, `getRulesForManager`.
  - [ ] `runRule(ruleId, period, triggerType)`.
- [ ] Implement endpoints REST tương ứng.
- [ ] Thêm field `autoRuleId` + unique logic vào `bonuses/allowances/penalties`.

**Phase 2 – Scheduler**

- [ ] Tạo scheduler job (Spring @Scheduled hoặc Quartz):
  - [ ] Chạy hàng ngày.
  - [ ] Filter rules theo schedule & current date.
  - [ ] Gọi `runRule`.
  - [ ] Ghi log run.

**Phase 3 – Frontend**

- [ ] Cập nhật `payrollTemplateService` hoặc tạo `autoApplyRuleService`:
  - [ ] CRUD cho `auto-rules`.
  - [ ] `applyNow(ruleId, period)`.
  - [ ] `preview(ruleId, period)` (optional).
- [ ] Cập nhật modal Auto apply trong `ManagerBonusPenaltyAllowanceManagement`:
  - [ ] Hiển thị danh sách rule.
  - [ ] Form tạo/sửa rule.
  - [ ] Nút Apply now, Preview.
  - [ ] Sau khi apply: reload transactions.

**Phase 4 – Monitoring & UX**

- [ ] Hiển thị `lastRunAt`, `lastRunStatus` trong UI.
- [ ] Trang log (optional) cho Admin/Manager xem lịch sử auto apply.
- [ ] Thêm cảnh báo:
  - [ ] Nếu rule tạo quá nhiều bản ghi.
  - [ ] Nếu job fail nhiều lần liên tiếp.

---

### 10. Thiết kế bảng DB

#### 10.1. Bảng `auto_apply_rules`

```sql
CREATE TABLE auto_apply_rules (
  rule_id           INT PRIMARY KEY AUTO_INCREMENT,
  branch_id         INT NOT NULL COMMENT 'Branch mà rule áp dụng',
  owner_manager_id  INT NOT NULL COMMENT 'Manager tạo rule',

  rule_type         ENUM('BONUS', 'PENALTY', 'ALLOWANCE') NOT NULL,
  template_id       INT NOT NULL COMMENT 'ID template nguồn (bonus/allowance/penalty_config)',

  is_active         TINYINT(1) NOT NULL DEFAULT 1,

  scope_type        ENUM('BRANCH', 'ROLE', 'EMPLOYMENT', 'CUSTOM') NOT NULL,

  schedule          ENUM('MONTHLY_START', 'MONTHLY_END', 'WEEKLY_MONDAY', 'MANUAL') NOT NULL,
  auto_approve      TINYINT(1) NOT NULL DEFAULT 0,
  notify_staff      TINYINT(1) NOT NULL DEFAULT 1,

  name              VARCHAR(255) NULL,
  note              TEXT NULL,

  last_run_at       DATETIME NULL,
  last_run_status   ENUM('SUCCESS', 'PARTIAL_SUCCESS', 'FAILED') NULL,
  last_run_error    TEXT NULL,

  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by        INT NOT NULL,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by        INT NULL,

  KEY idx_branch    (branch_id),
  KEY idx_manager   (owner_manager_id),
  KEY idx_active    (is_active),
  KEY idx_type      (rule_type),
  KEY idx_schedule  (schedule)
  -- Có thể thêm FK tới bảng branch, user, template tương ứng nếu schema cho phép
);
```

#### 10.2. Bảng `auto_apply_run_logs` (tuỳ chọn)

```sql
CREATE TABLE auto_apply_run_logs (
  run_id        INT PRIMARY KEY AUTO_INCREMENT,
  rule_id       INT NOT NULL,
  period        CHAR(7) NOT NULL COMMENT 'YYYY-MM',
  trigger_type  ENUM('SCHEDULED', 'MANUAL') NOT NULL,
  run_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  num_created   INT NOT NULL DEFAULT 0,
  num_skipped   INT NOT NULL DEFAULT 0,
  status        ENUM('SUCCESS', 'PARTIAL_SUCCESS', 'FAILED') NOT NULL,
  error_message TEXT NULL,

  KEY idx_rule_period (rule_id, period),
  KEY idx_run_at      (run_at),
  CONSTRAINT fk_auto_run_rule
    FOREIGN KEY (rule_id) REFERENCES auto_apply_rules(rule_id)
      ON DELETE CASCADE
);
```

#### 10.3. Cập nhật các bảng `bonuses`, `allowances`, `penalties`

Giả sử 3 bảng này (đã có) tương ứng với transaction thực tế:

```sql
ALTER TABLE bonuses
  ADD COLUMN auto_rule_id INT NULL COMMENT 'Rule auto-apply đã tạo bonus này',
  ADD KEY idx_bonus_auto_rule (auto_rule_id),
  ADD CONSTRAINT fk_bonus_auto_rule
    FOREIGN KEY (auto_rule_id) REFERENCES auto_apply_rules(rule_id);

ALTER TABLE allowances
  ADD COLUMN auto_rule_id INT NULL COMMENT 'Rule auto-apply đã tạo allowance này',
  ADD KEY idx_allowance_auto_rule (auto_rule_id),
  ADD CONSTRAINT fk_allowance_auto_rule
    FOREIGN KEY (auto_rule_id) REFERENCES auto_apply_rules(rule_id);

ALTER TABLE penalties
  ADD COLUMN auto_rule_id INT NULL COMMENT 'Rule auto-apply đã tạo penalty này',
  ADD KEY idx_penalty_auto_rule (auto_rule_id),
  ADD CONSTRAINT fk_penalty_auto_rule
    FOREIGN KEY (auto_rule_id) REFERENCES auto_apply_rules(rule_id);
```

#### 10.4. Bảng quan hệ scope theo role (đạt chuẩn 3NF)

Thay vì lưu `role_codes` dạng JSON trong `auto_apply_rules`, ta tách ra bảng N-N:

```sql
CREATE TABLE auto_apply_rule_roles (
  rule_id    INT NOT NULL,
  role_code  VARCHAR(100) NOT NULL,

  PRIMARY KEY (rule_id, role_code),
  CONSTRAINT fk_auto_rule_roles_rule
    FOREIGN KEY (rule_id) REFERENCES auto_apply_rules(rule_id)
      ON DELETE CASCADE
);
```

#### 10.5. Bảng quan hệ scope theo loại hợp đồng

```sql
CREATE TABLE auto_apply_rule_employment_types (
  rule_id          INT NOT NULL,
  employment_type  VARCHAR(50) NOT NULL COMMENT 'VD: FULL_TIME, PART_TIME, CASUAL',

  PRIMARY KEY (rule_id, employment_type),
  CONSTRAINT fk_auto_rule_employment_rule
    FOREIGN KEY (rule_id) REFERENCES auto_apply_rules(rule_id)
      ON DELETE CASCADE
);
```

#### 10.6. Bảng quan hệ scope theo danh sách nhân viên (CUSTOM)

```sql
CREATE TABLE auto_apply_rule_staff (
  rule_id    INT NOT NULL,
  staff_id   INT NOT NULL COMMENT 'user_id của Staff',

  PRIMARY KEY (rule_id, staff_id),
  CONSTRAINT fk_auto_rule_staff_rule
    FOREIGN KEY (rule_id) REFERENCES auto_apply_rules(rule_id)
      ON DELETE CASCADE
);
```

Ba bảng phụ này giúp:

- Đảm bảo **3NF hoàn chỉnh**: không còn thuộc tính đa trị (list) trong `auto_apply_rules`.
- Query vẫn đơn giản theo nhu cầu business:
  - Lấy roles của 1 rule: `SELECT role_code FROM auto_apply_rule_roles WHERE rule_id = ?`.
  - Lấy staff theo rule: join `auto_apply_rule_staff` với `staff_profiles`.

**Ràng buộc tránh trùng (ví dụ với `bonuses`)** – đảm bảo 1 rule + 1 template không tạo nhiều bản ghi cho cùng user/kỳ:

```sql
CREATE UNIQUE INDEX ux_bonus_auto_rule_unique
ON bonuses (user_id, period, source_template_id, auto_rule_id);
```

Tương tự có thể áp dụng cho `allowances` và `penalties` nếu business muốn strict uniqueness.

---

### 11. Ghi chú triển khai

- **Không nên** chạy trực tiếp Auto apply trong request của payroll calculation – đây là luồng độc lập.
- Đảm bảo **timeout hợp lý**:
  - Với branch lớn, nên chạy batch (chunk) hoặc async.
- Luôn test với các case:
  - Rule scope BRANCH với 0 staff (không crash, chỉ tạo 0 record).
  - Rule scope CUSTOM với 1 staff đổi branch → rule không còn áp dụng.
  - Template bị deactivate sau khi tạo rule:
    - Rule vẫn tồn tại nhưng khi run phải skip với message “template inactive”.

Tài liệu này là **chuẩn nghiệp vụ đề xuất** cho tính năng Auto apply Rewards / Penalties / Allowances. Khi triển khai thực tế, team có thể điều chỉnh chi tiết kỹ thuật (tên bảng, field cụ thể) nhưng **nên giữ nguyên các nguyên tắc business chính** nêu ở trên.

