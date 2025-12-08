# Shift Validation - Business Rules & Edge Cases

## ✅ Validation hiện có

Code hiện tại đã validate:
1. ✅ **Daily hours limit**: 8 hours/day
2. ✅ **Weekly hours limit**: 40 hours/week
3. ✅ **Rest period**: 11 hours giữa các ca
4. ✅ **Time conflict**: Không overlap thời gian
5. ✅ **Employment type**: Match với shift requirement
6. ✅ **Shift capacity**: Không vượt maxStaffAllowed

## ❌ Validation còn thiếu

### 1. Số ca tối đa mỗi ngày (Maximum Shifts Per Day)

**Vấn đề**: Hiện tại chỉ check tổng giờ, không check số ca.

**Ví dụ lỗi**:
```
Staff có thể có:
- Ca 1: 06:00-08:00 (2h)
- Ca 2: 10:00-12:00 (2h)
- Ca 3: 14:00-18:00 (4h)
Tổng: 8h ✅ (pass)
Nhưng: 3 ca trong 1 ngày ❌ (có thể không hợp lý)
```

**Business Rule đề xuất**:
- Tối đa **2 ca/ngày** (hoặc configurable)
- Hoặc: Tối đa **1 ca/ngày** nếu ca dài (>6h)

**Implementation**:
```java
// Validate maximum shifts per day
int shiftsOnSameDate = (int) existingAssignments.stream()
    .filter(a -> a.getShift().getShiftDate().equals(shiftDate))
    .count();
    
if (shiftsOnSameDate >= 2) { // Configurable limit
    throw new AppException(ErrorCode.SHIFT_EXCEEDS_DAILY_SHIFTS,
        "Maximum 2 shifts per day allowed");
}
```

### 2. Số ca tối đa mỗi tuần (Maximum Shifts Per Week)

**Vấn đề**: Chỉ check tổng giờ, không check số ca.

**Ví dụ lỗi**:
```
Staff có thể có:
- 7 ca x 5.5h = 38.5h ✅ (pass weekly hours)
Nhưng: 7 ca/tuần ❌ (làm cả tuần không nghỉ)
```

**Business Rule đề xuất**:
- Tối đa **6 ca/tuần** (nghỉ ít nhất 1 ngày)
- Hoặc: Tối đa **5 ca/tuần** cho full-time

**Implementation**:
```java
// Validate maximum shifts per week
LocalDate weekStart = shiftDate.minusDays(shiftDate.getDayOfWeek().getValue() - 1);
LocalDate weekEnd = weekStart.plusDays(6);

long shiftsInWeek = existingAssignments.stream()
    .filter(a -> {
        LocalDate existingDate = a.getShift().getShiftDate();
        return !existingDate.isBefore(weekStart) && !existingDate.isAfter(weekEnd);
    })
    .count();
    
if (shiftsInWeek >= 6) { // Configurable limit
    throw new AppException(ErrorCode.SHIFT_EXCEEDS_WEEKLY_SHIFTS,
        "Maximum 6 shifts per week allowed");
}
```

### 3. Consecutive Days Limit (Giới hạn ngày làm liên tiếp)

**Vấn đề**: Staff có thể làm 7 ngày liên tiếp (chỉ check weekly hours).

**Ví dụ lỗi**:
```
Thứ 2-7: Mỗi ngày 1 ca 6h = 36h ✅ (pass weekly hours)
Nhưng: 6 ngày liên tiếp ❌ (không có ngày nghỉ)
```

**Business Rule đề xuất**:
- Tối đa **5-6 ngày liên tiếp**
- Sau đó phải nghỉ ít nhất 1 ngày

**Implementation**:
```java
// Validate consecutive days
int maxConsecutiveDays = 6; // Configurable
LocalDate checkDate = shiftDate.minusDays(1);
int consecutiveDays = 1;

// Count backward
while (consecutiveDays < maxConsecutiveDays) {
    boolean hasShiftOnDate = existingAssignments.stream()
        .anyMatch(a -> a.getShift().getShiftDate().equals(checkDate));
    if (!hasShiftOnDate) break;
    consecutiveDays++;
    checkDate = checkDate.minusDays(1);
}

// Count forward
checkDate = shiftDate.plusDays(1);
while (consecutiveDays < maxConsecutiveDays) {
    boolean hasShiftOnDate = existingAssignments.stream()
        .anyMatch(a -> a.getShift().getShiftDate().equals(checkDate));
    if (!hasShiftOnDate) break;
    consecutiveDays++;
    checkDate = checkDate.plusDays(1);
}

if (consecutiveDays >= maxConsecutiveDays) {
    throw new AppException(ErrorCode.SHIFT_EXCEEDS_CONSECUTIVE_DAYS,
        "Maximum " + maxConsecutiveDays + " consecutive days allowed");
}
```

### 4. Maximum Shift Duration (Thời lượng ca tối đa)

**Vấn đề**: Không giới hạn thời lượng 1 ca.

**Ví dụ lỗi**:
```
Ca 12 giờ liên tiếp ❌ (quá dài, không an toàn)
```

**Business Rule đề xuất**:
- Tối đa **8-10 giờ/ca** (tùy quy định lao động)
- Nếu >8h, bắt buộc có break time

**Implementation**:
```java
// Validate maximum shift duration
BigDecimal maxShiftDuration = BigDecimal.valueOf(10); // Configurable
if (shiftDuration.compareTo(maxShiftDuration) > 0) {
    throw new AppException(ErrorCode.SHIFT_EXCEEDS_MAX_DURATION,
        "Maximum shift duration is " + maxShiftDuration + " hours");
}
```

### 5. Minimum Shift Duration (Thời lượng ca tối đa)

**Vấn đề**: Có thể tạo ca quá ngắn (ví dụ: 30 phút).

**Ví dụ lỗi**:
```
Ca 0.5 giờ ❌ (không thực tế)
```

**Business Rule đề xuất**:
- Tối thiểu **2-3 giờ/ca**

**Implementation**:
```java
// Validate minimum shift duration
BigDecimal minShiftDuration = BigDecimal.valueOf(2); // Configurable
if (shiftDuration.compareTo(minShiftDuration) < 0) {
    throw new AppException(ErrorCode.SHIFT_BELOW_MIN_DURATION,
        "Minimum shift duration is " + minShiftDuration + " hours");
}
```

### 6. Break Time Requirements (Yêu cầu nghỉ giữa ca)

**Vấn đề**: Ca dài (>6h) cần có break time, nhưng không validate.

**Business Rule đề xuất**:
- Ca >6h: Bắt buộc có break ít nhất 30 phút
- Ca >8h: Bắt buộc có break ít nhất 1 giờ

**Implementation**:
```java
// Validate break time for long shifts
if (shiftDuration.compareTo(BigDecimal.valueOf(6)) > 0) {
    // Check if shift has break time defined
    // Or calculate: actual work time = duration - break time
    BigDecimal requiredBreak = shiftDuration.compareTo(BigDecimal.valueOf(8)) > 0
        ? BigDecimal.valueOf(1)  // 1 hour break for >8h shifts
        : BigDecimal.valueOf(0.5); // 30 min break for >6h shifts
    
    // Validate break time in shift template or shift
    if (shift.getBreakDuration() == null || 
        shift.getBreakDuration().compareTo(requiredBreak) < 0) {
        throw new AppException(ErrorCode.SHIFT_MISSING_BREAK_TIME,
            "Shifts longer than " + shiftDuration + " hours require at least " 
            + requiredBreak + " hours break time");
    }
}
```

### 7. Shift Pattern Restrictions (Hạn chế pattern ca)

**Vấn đề**: Không validate pattern ca (ví dụ: không được làm ca đêm rồi ca sáng).

**Ví dụ lỗi**:
```
Thứ 2: Ca đêm 22:00-06:00 (ngày hôm sau)
Thứ 3: Ca sáng 07:00-15:00
→ Chỉ có 1 giờ nghỉ ❌ (dù đã pass 11h rest period)
```

**Business Rule đề xuất**:
- Không được làm ca đêm (22:00-06:00) rồi ca sáng (06:00-14:00) ngày hôm sau
- Không được làm ca chiều (14:00-22:00) rồi ca đêm (22:00-06:00) cùng ngày

**Implementation**:
```java
// Validate shift pattern
for (ShiftAssignment existing : existingAssignments) {
    Shift existingShift = existing.getShift();
    
    // Check night shift -> morning shift pattern
    if (isNightShift(existingShift) && isMorningShift(newShift) &&
        existingShift.getShiftDate().plusDays(1).equals(shiftDate)) {
        throw new AppException(ErrorCode.SHIFT_PATTERN_RESTRICTED,
            "Cannot work morning shift after night shift");
    }
    
    // Check afternoon -> night shift pattern
    if (isAfternoonShift(existingShift) && isNightShift(newShift) &&
        existingShift.getShiftDate().equals(shiftDate)) {
        throw new AppException(ErrorCode.SHIFT_PATTERN_RESTRICTED,
            "Cannot work night shift after afternoon shift on same day");
    }
}

private boolean isNightShift(Shift shift) {
    // Night shift: 22:00-06:00 (next day)
    return shift.getStartTime().isAfter(LocalTime.of(22, 0)) ||
           shift.getEndTime().isBefore(LocalTime.of(6, 0));
}

private boolean isMorningShift(Shift shift) {
    // Morning shift: 06:00-14:00
    return shift.getStartTime().isAfter(LocalTime.of(5, 59)) &&
           shift.getStartTime().isBefore(LocalTime.of(14, 0));
}
```

### 8. Overtime Limits (Giới hạn tăng ca)

**Vấn đề**: Không validate giới hạn overtime.

**Ví dụ lỗi**:
```
Staff làm 50h/tuần (vượt 40h = 10h overtime) ❌
```

**Business Rule đề xuất**:
- Tối đa **10-12 giờ overtime/tuần**
- Tối đa **2 giờ overtime/ngày**

**Implementation**:
```java
// Validate overtime limits
BigDecimal weeklyHours = calculateWeeklyHours(staffUserId, newShift);
BigDecimal baseWeeklyHours = BigDecimal.valueOf(40);
BigDecimal overtimeHours = weeklyHours.subtract(baseWeeklyHours);

if (overtimeHours.compareTo(BigDecimal.ZERO) > 0) {
    BigDecimal maxOvertimePerWeek = BigDecimal.valueOf(12); // Configurable
    if (overtimeHours.compareTo(maxOvertimePerWeek) > 0) {
        throw new AppException(ErrorCode.SHIFT_EXCEEDS_OVERTIME_LIMIT,
            "Maximum " + maxOvertimePerWeek + " hours overtime per week allowed");
    }
    
    // Check daily overtime
    BigDecimal dailyHours = calculateDailyHours(staffUserId, newShift, shiftDate);
    BigDecimal baseDailyHours = BigDecimal.valueOf(8);
    BigDecimal dailyOvertime = dailyHours.subtract(baseDailyHours);
    
    if (dailyOvertime.compareTo(BigDecimal.valueOf(2)) > 0) {
        throw new AppException(ErrorCode.SHIFT_EXCEEDS_DAILY_OVERTIME,
            "Maximum 2 hours overtime per day allowed");
    }
}
```

### 9. Minimum Hours Between Shifts (Tối thiểu giờ giữa các ca)

**Vấn đề**: Chỉ check 11h rest period, nhưng có thể cần thêm buffer.

**Ví dụ lỗi**:
```
Ca 1: 22:00-06:00 (ngày 1)
Ca 2: 17:00-22:00 (ngày 1)
→ Có 11h rest ✅
Nhưng: Quá sát nhau, không thực tế ❌
```

**Business Rule đề xuất**:
- Tối thiểu **12 giờ** giữa ca đêm và ca ngày
- Tối thiểu **10 giờ** giữa 2 ca ngày

**Implementation**:
```java
// Enhanced rest period validation
for (ShiftAssignment existing : existingAssignments) {
    Shift existingShift = existing.getShift();
    long hoursBetween = calculateHoursBetween(existingShift, newShift);
    
    // Night shift requires more rest
    if (isNightShift(existingShift) || isNightShift(newShift)) {
        if (hoursBetween < 12) {
            throw new AppException(ErrorCode.SHIFT_INSUFFICIENT_REST,
                "Night shifts require at least 12 hours rest");
        }
    } else {
        // Day shifts require at least 10 hours
        if (hoursBetween < 10) {
            throw new AppException(ErrorCode.SHIFT_INSUFFICIENT_REST,
                "Day shifts require at least 10 hours rest");
        }
    }
}
```

### 10. Weekend Work Restrictions (Hạn chế làm cuối tuần)

**Vấn đề**: Không validate số ngày cuối tuần làm việc.

**Business Rule đề xuất**:
- Tối đa **1 ngày cuối tuần/tuần** (thứ 7 hoặc chủ nhật)
- Hoặc: Bắt buộc nghỉ ít nhất 1 ngày cuối tuần

**Implementation**:
```java
// Validate weekend work
if (isWeekend(shiftDate)) {
    LocalDate weekStart = shiftDate.minusDays(shiftDate.getDayOfWeek().getValue() - 1);
    LocalDate weekEnd = weekStart.plusDays(6);
    
    long weekendShifts = existingAssignments.stream()
        .filter(a -> {
            LocalDate date = a.getShift().getShiftDate();
            return !date.isBefore(weekStart) && !date.isAfter(weekEnd) && isWeekend(date);
        })
        .count();
    
    if (weekendShifts >= 1) {
        throw new AppException(ErrorCode.SHIFT_EXCEEDS_WEEKEND_LIMIT,
            "Maximum 1 weekend day per week allowed");
    }
}
```

### 11. Shift Date Validation (Validate ngày ca)

**Vấn đề**: Có thể tạo ca trong quá khứ hoặc quá xa.

**Business Rule đề xuất**:
- Không được tạo ca trong quá khứ
- Không được tạo ca quá xa (ví dụ: >3 tháng)

**Implementation**:
```java
// Validate shift date
LocalDate today = LocalDate.now();
LocalDate maxFutureDate = today.plusMonths(3); // Configurable

if (shiftDate.isBefore(today)) {
    throw new AppException(ErrorCode.SHIFT_DATE_IN_PAST,
        "Cannot create shifts in the past");
}

if (shiftDate.isAfter(maxFutureDate)) {
    throw new AppException(ErrorCode.SHIFT_DATE_TOO_FAR,
        "Cannot create shifts more than 3 months in advance");
}
```

### 12. Role Requirements Validation (Validate yêu cầu role)

**Vấn đề**: Chỉ check employment type, không check role requirements.

**Ví dụ lỗi**:
```
Shift cần Barista nhưng staff chỉ có role Cashier ❌
```

**Implementation**:
```java
// Validate role requirements
if (shift.getRoleRequirements() != null && !shift.getRoleRequirements().isEmpty()) {
    List<Integer> staffRoleIds = staffRoleAssignmentRepository
        .findByStaffProfile(staff)
        .stream()
        .map(StaffRoleAssignment::getRoleId)
        .collect(Collectors.toList());
    
    List<Integer> requiredRoleIds = shift.getRoleRequirements().stream()
        .map(ShiftRoleRequirement::getRoleId)
        .collect(Collectors.toList());
    
    boolean hasRequiredRole = requiredRoleIds.stream()
        .anyMatch(requiredRoleId -> staffRoleIds.contains(requiredRoleId));
    
    if (!hasRequiredRole) {
        throw new AppException(ErrorCode.SHIFT_ROLE_NOT_QUALIFIED,
            "Staff does not have required role for this shift");
    }
}
```

### 13. Shift Status Validation (Validate trạng thái ca)

**Vấn đề**: Có thể assign vào ca đã PUBLISHED nhưng không validate.

**Business Rule đề xuất**:
- Chỉ assign vào ca có status: `DRAFT`, `PUBLISHED`
- Không assign vào ca: `CANCELLED`, `COMPLETED`

**Implementation**:
```java
// Validate shift status
if (!List.of("DRAFT", "PUBLISHED").contains(shift.getStatus())) {
    throw new AppException(ErrorCode.SHIFT_NOT_AVAILABLE,
        "Cannot assign to shift with status: " + shift.getStatus());
}
```

### 14. Assignment Status Validation (Validate trạng thái assignment)

**Vấn đề**: Có thể tạo nhiều assignment cho cùng 1 shift.

**Business Rule đề xuất**:
- Không được có 2 assignment ACTIVE cho cùng 1 shift
- Chỉ 1 assignment có thể là CONFIRMED

**Implementation**:
```java
// Validate no duplicate active assignment
boolean alreadyAssigned = assignmentRepository.findByShift(shift).stream()
    .anyMatch(a -> a.getStaffUserId().equals(staffUserId) &&
                   !"CANCELLED".equals(a.getStatus()));
    
if (alreadyAssigned) {
    throw new AppException(ErrorCode.SHIFT_ALREADY_REGISTERED,
        "Staff is already assigned to this shift");
}
```

### 15. Cross-branch Assignment Validation (Validate cross-branch)

**Vấn đề**: Có thể assign staff branch A vào shift branch B (nếu là borrowed staff).

**Business Rule đề xuất**:
- Cross-branch assignment cần approval đặc biệt
- Validate borrowed staff có đủ điều kiện

**Implementation**:
```java
// Validate cross-branch assignment
if (!staff.getBranchId().equals(shift.getBranchId())) {
    // This is cross-branch assignment
    // Check if borrowing is allowed
    if (!shift.isAllowBorrowedStaff()) {
        throw new AppException(ErrorCode.SHIFT_CROSS_BRANCH_NOT_ALLOWED,
            "This shift does not allow cross-branch staff");
    }
    
    // Additional validation for borrowed staff
    validateBorrowedStaffEligibility(staff, shift);
}
```

## 📋 Tóm tắt các validation cần thêm

| # | Validation | Mức độ ưu tiên | Độ phức tạp |
|---|-----------|---------------|-------------|
| 1 | Max shifts per day | 🔴 Cao | Dễ |
| 2 | Max shifts per week | 🔴 Cao | Dễ |
| 3 | Consecutive days limit | 🟡 Trung bình | Trung bình |
| 4 | Max shift duration | 🟡 Trung bình | Dễ |
| 5 | Min shift duration | 🟢 Thấp | Dễ |
| 6 | Break time requirements | 🟡 Trung bình | Trung bình |
| 7 | Shift pattern restrictions | 🟡 Trung bình | Khó |
| 8 | Overtime limits | 🔴 Cao | Trung bình |
| 9 | Min hours between shifts | 🟡 Trung bình | Trung bình |
| 10 | Weekend work restrictions | 🟢 Thấp | Dễ |
| 11 | Shift date validation | 🔴 Cao | Dễ |
| 12 | Role requirements | 🔴 Cao | Trung bình |
| 13 | Shift status validation | 🔴 Cao | Dễ |
| 14 | Assignment status validation | 🔴 Cao | Dễ |
| 15 | Cross-branch validation | 🟡 Trung bình | Trung bình |

## 🎯 Khuyến nghị implementation

**Phase 1 (Ưu tiên cao)**:
1. Max shifts per day/week
2. Overtime limits
3. Shift date validation
4. Role requirements
5. Shift/Assignment status validation

**Phase 2 (Ưu tiên trung bình)**:
6. Consecutive days limit
7. Break time requirements
8. Shift pattern restrictions
9. Min hours between shifts
10. Cross-branch validation

**Phase 3 (Ưu tiên thấp)**:
11. Min shift duration
12. Weekend work restrictions

