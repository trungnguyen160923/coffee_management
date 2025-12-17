package com.service.profile.service;

import com.service.profile.configuration.ShiftValidationProperties;
import com.service.profile.entity.*;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.repository.*;
import com.service.profile.repository.http_client.BranchClient;
import com.service.profile.repository.http_client.BranchClosureClient;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.ArrayList;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * Service để validate tất cả business rules cho shift assignment
 * Các service khác có thể inject và gọi các method validate này
 */
@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ShiftValidationService {

    ShiftAssignmentRepository assignmentRepository;
    StaffProfileRepository staffProfileRepository;
    ShiftRoleRequirementRepository shiftRoleRequirementRepository;
    StaffRoleAssignmentRepository staffRoleAssignmentRepository;
    BranchClient branchClient;
    BranchClosureClient branchClosureClient;
    ShiftValidationProperties validationProperties;

    // ========== Main Validation Method ==========

    /**
     * Validate tất cả business rules cho staff assignment vào shift
     * Throw exception nếu có lỗi
     * Default: strict validation - không cho phép hôm nay, không cho phép override role
     */
    public void validateStaffForShift(Integer staffUserId, Shift shift) {
        validateStaffForShift(staffUserId, shift, false, false);
    }

    /**
     * Validate tất cả business rules cho staff assignment vào shift với options
     * @param staffUserId ID của staff
     * @param shift Shift cần validate
     * @param allowToday Cho phép đăng ký ca trong ngày (default: false)
     * @param allowManagerOverride Cho phép manager override role requirements (default: false)
     */
    public void validateStaffForShift(Integer staffUserId, Shift shift, boolean allowToday, boolean allowManagerOverride) {
        validateStaffForShift(staffUserId, shift, allowToday, allowManagerOverride, false);
    }

    /**
     * Validate cho OVERTIME request: bỏ qua rest period, chỉ check tổng giờ <= 52h/tuần
     * @param staffUserId ID của staff
     * @param shift Shift cần validate
     */
    public void validateStaffForOvertimeShift(Integer staffUserId, Shift shift) {
        log.debug("Validating staff {} for OVERTIME shift {} (skip rest period, check 52h/week only)", 
                staffUserId, shift.getShiftId());

        // Get staff profile
        StaffProfile staff = staffProfileRepository.findById(staffUserId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND, "Staff not found"));

        // Get existing assignments (exclude OVERTIME_PENDING)
        List<ShiftAssignment> existingAssignments = assignmentRepository
                .findByStaffUserIdAndStatusIn(staffUserId,
                        List.of("PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT"));

        // Pre-load all shift data
        List<java.util.Map<String, Object>> existingAssignmentData = new ArrayList<>();
        for (ShiftAssignment assignment : existingAssignments) {
            Shift existingShift = assignment.getShift();
            java.util.Map<String, Object> data = new java.util.HashMap<>();
            data.put("shiftDate", existingShift.getShiftDate());
            data.put("startTime", existingShift.getStartTime());
            data.put("endTime", existingShift.getEndTime());
            data.put("durationHours", existingShift.getDurationHours());
            existingAssignmentData.add(data);
        }

        // Load shift assignments for capacity and duplicate checks
        List<ShiftAssignment> shiftAssignments = assignmentRepository.findByShift(shift);

        // Pre-load shift fields
        LocalDate shiftDate = shift.getShiftDate();
        BigDecimal shiftDuration = shift.getDurationHours();
        String shiftStatus = shift.getStatus();
        LocalTime shiftStartTime = shift.getStartTime();
        LocalTime shiftEndTime = shift.getEndTime();
        Integer maxStaffAllowed = shift.getMaxStaffAllowed();
        String shiftEmploymentType = shift.getEmploymentType();
        ShiftTemplate shiftTemplate = shift.getTemplate();

        // Basic validations (same as normal validation)
        validateShiftDate(shiftDate, false);
        if (!List.of("DRAFT", "PUBLISHED").contains(shiftStatus)) {
            throw new AppException(ErrorCode.SHIFT_NOT_AVAILABLE,
                    "Cannot assign to shift with status: " + shiftStatus);
        }
        validateShiftDuration(shiftDuration);
        String employmentType = shiftEmploymentType;
        if (employmentType == null && shiftTemplate != null) {
            employmentType = shiftTemplate.getEmploymentType();
        }
        if (employmentType == null) {
            employmentType = "ANY";
        }
        if (!"ANY".equals(employmentType) && !employmentType.equals(staff.getEmploymentType())) {
            throw new AppException(ErrorCode.SHIFT_EMPLOYMENT_TYPE_MISMATCH,
                    "Shift requires " + employmentType + " employment type");
        }
        validateRoleRequirements(staff, shift, false);
        
        // Check capacity
        if (maxStaffAllowed != null) {
            long currentCount = shiftAssignments.stream()
                    .filter(a -> !"CANCELLED".equals(a.getStatus()) && !"OVERTIME_PENDING".equals(a.getStatus()))
                    .count();
            boolean alreadyAssigned = shiftAssignments.stream()
                    .anyMatch(a -> a.getStaffUserId().equals(staffUserId) && 
                            !"CANCELLED".equals(a.getStatus()) && !"OVERTIME_PENDING".equals(a.getStatus()));
            if (!alreadyAssigned && currentCount >= maxStaffAllowed) {
                throw new AppException(ErrorCode.SHIFT_FULL,
                        "Shift has reached maximum staff capacity");
            }
        }
        
        // Check duplicate
        boolean alreadyAssigned = shiftAssignments.stream()
                .anyMatch(a -> a.getStaffUserId().equals(staffUserId) && 
                        !"CANCELLED".equals(a.getStatus()) && !"OVERTIME_PENDING".equals(a.getStatus()));
        if (alreadyAssigned) {
            throw new AppException(ErrorCode.SHIFT_ALREADY_REGISTERED,
                    "Staff is already assigned to this shift");
        }

        // Assignment-based validations (OVERTIME: skip rest period, but check daily limit)
        validateTimeConflictWithData(staffUserId, shiftDate, shiftStartTime, shiftEndTime, existingAssignmentData);
        // Skip: validateRestPeriodWithData (no rest period requirement for overtime)
        
        // Check daily hours: total <= 12h/ngày (8h + 4h OT) - theo quy định lao động VN
        BigDecimal MAX_DAILY_HOURS_OVERTIME = validationProperties.getMaxDailyHours()
            .add(validationProperties.getMaxOvertimePerDay()); // 8 + 4 = 12h/ngày
        BigDecimal totalDailyHours = shiftDuration;
        for (java.util.Map<String, Object> data : existingAssignmentData) {
            LocalDate existingDate = (LocalDate) data.get("shiftDate");
            if (existingDate.equals(shiftDate)) {
                BigDecimal existingDuration = (BigDecimal) data.get("durationHours");
                totalDailyHours = totalDailyHours.add(existingDuration);
            }
        }
        
        if (totalDailyHours.compareTo(MAX_DAILY_HOURS_OVERTIME) > 0) {
            throw new AppException(ErrorCode.SHIFT_EXCEEDS_DAILY_HOURS,
                    "Maximum " + MAX_DAILY_HOURS_OVERTIME + " hours per day allowed (8 base + 4 overtime)");
        }
        
        // Check weekly hours: total <= 52h (40 + 12)
        BigDecimal MAX_WEEKLY_HOURS_OVERTIME = validationProperties.getMaxWeeklyHours()
            .add(validationProperties.getMaxOvertimePerWeek()); // 40 + 12 = 52
        LocalDate weekStart = shiftDate.minusDays(shiftDate.getDayOfWeek().getValue() - 1);
        LocalDate weekEnd = weekStart.plusDays(6);
        
        BigDecimal totalWeeklyHours = shiftDuration;
        for (java.util.Map<String, Object> data : existingAssignmentData) {
            LocalDate existingDate = (LocalDate) data.get("shiftDate");
            if (!existingDate.isBefore(weekStart) && !existingDate.isAfter(weekEnd)) {
                BigDecimal existingDuration = (BigDecimal) data.get("durationHours");
                totalWeeklyHours = totalWeeklyHours.add(existingDuration);
            }
        }
        
        if (totalWeeklyHours.compareTo(MAX_WEEKLY_HOURS_OVERTIME) > 0) {
            throw new AppException(ErrorCode.SHIFT_EXCEEDS_OVERTIME_LIMIT,
                    "Maximum " + MAX_WEEKLY_HOURS_OVERTIME + " hours per week allowed for overtime (40 base + 12 overtime)");
        }
        
        // Skip other validations for overtime (consecutive days, weekend work, shift pattern, etc.)
        log.debug("OVERTIME validation passed for staff {} and shift {}", staffUserId, shift.getShiftId());
    }

    /**
     * Validate tất cả business rules cho staff assignment vào shift với options
     * @param staffUserId ID của staff
     * @param shift Shift cần validate
     * @param allowToday Cho phép đăng ký ca trong ngày (default: false)
     * @param allowManagerOverride Cho phép manager override role requirements (default: false)
     * @param skipCapacityCheck Bỏ qua kiểm tra capacity (đã được xử lý riêng)
     */
    public void validateStaffForShift(Integer staffUserId, Shift shift, boolean allowToday, boolean allowManagerOverride, boolean skipCapacityCheck) {
        log.debug("Validating staff {} for shift {} (allowToday: {}, allowManagerOverride: {})", 
                staffUserId, shift.getShiftId(), allowToday, allowManagerOverride);

        // Get staff profile
        StaffProfile staff = staffProfileRepository.findById(staffUserId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND, "Staff not found"));

        // Get existing assignments
        List<ShiftAssignment> existingAssignments = assignmentRepository
                .findByStaffUserIdAndStatusIn(staffUserId,
                        List.of("PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT"));

        // Pre-load all shift data from existingAssignments to avoid Hibernate session issues in async threads
        // Create a list of maps containing primitive values from existing assignments
        List<java.util.Map<String, Object>> existingAssignmentData = new ArrayList<>();
        for (ShiftAssignment assignment : existingAssignments) {
            Shift existingShift = assignment.getShift();
            java.util.Map<String, Object> data = new java.util.HashMap<>();
            data.put("shiftDate", existingShift.getShiftDate());
            data.put("startTime", existingShift.getStartTime());
            data.put("endTime", existingShift.getEndTime());
            data.put("durationHours", existingShift.getDurationHours());
            existingAssignmentData.add(data);
        }

        // Load shift assignments for capacity and duplicate checks (must be done before parallel execution)
        // This prevents Hibernate session conflicts in parallel threads
        List<ShiftAssignment> shiftAssignments = assignmentRepository.findByShift(shift);

        // Pre-load shift fields that will be accessed in async threads to avoid Hibernate session issues
        // Access these fields while still in the main transaction context
        LocalDate shiftDate = shift.getShiftDate();
        BigDecimal shiftDuration = shift.getDurationHours();
        String shiftStatus = shift.getStatus();
        LocalTime shiftStartTime = shift.getStartTime();
        LocalTime shiftEndTime = shift.getEndTime();
        Integer maxStaffAllowed = shift.getMaxStaffAllowed();
        String shiftEmploymentType = shift.getEmploymentType();
        ShiftTemplate shiftTemplate = shift.getTemplate();

        // Group 1: Basic validations (independent, can run in parallel)
        // NOTE: Pre-load all entity fields before async execution to avoid Hibernate session issues
        List<CompletableFuture<Void>> basicValidations = new ArrayList<>();
        basicValidations.add(CompletableFuture.runAsync(() -> validateShiftDate(shiftDate, allowToday)));
        basicValidations.add(CompletableFuture.runAsync(() -> {
            if (!List.of("DRAFT", "PUBLISHED").contains(shiftStatus)) {
                throw new AppException(ErrorCode.SHIFT_NOT_AVAILABLE,
                        "Cannot assign to shift with status: " + shiftStatus);
            }
        }));
        basicValidations.add(CompletableFuture.runAsync(() -> validateShiftDuration(shiftDuration)));
        basicValidations.add(CompletableFuture.runAsync(() -> {
            String employmentType = shiftEmploymentType;
            if (employmentType == null && shiftTemplate != null) {
                employmentType = shiftTemplate.getEmploymentType();
            }
            if (employmentType == null) {
                employmentType = "ANY";
            }
            if (!"ANY".equals(employmentType) && !employmentType.equals(staff.getEmploymentType())) {
                throw new AppException(ErrorCode.SHIFT_EMPLOYMENT_TYPE_MISMATCH,
                        "Shift requires " + employmentType + " employment type");
            }
        }));
        basicValidations.add(CompletableFuture.runAsync(() -> validateRoleRequirements(staff, shift, allowManagerOverride)));
        basicValidations.add(CompletableFuture.runAsync(() -> {
            if (!skipCapacityCheck && maxStaffAllowed != null) {
                long currentCount = shiftAssignments.stream()
                        .filter(a -> !"CANCELLED".equals(a.getStatus()))
                        .count();
                boolean alreadyAssigned = shiftAssignments.stream()
                        .anyMatch(a -> a.getStaffUserId().equals(staffUserId) && !"CANCELLED".equals(a.getStatus()));
                if (!alreadyAssigned && currentCount >= maxStaffAllowed) {
                    throw new AppException(ErrorCode.SHIFT_FULL,
                            "Shift has reached maximum staff capacity");
                }
            }
        }));
        basicValidations.add(CompletableFuture.runAsync(() -> {
            boolean alreadyAssigned = shiftAssignments.stream()
                    .anyMatch(a -> a.getStaffUserId().equals(staffUserId) && !"CANCELLED".equals(a.getStatus()));
            if (alreadyAssigned) {
                throw new AppException(ErrorCode.SHIFT_ALREADY_REGISTERED,
                        "Staff is already assigned to this shift");
            }
        }));

        // Group 2: Assignment-based validations (all use existingAssignments, can run in parallel)
        // Use pre-loaded data instead of entities to avoid Hibernate session issues
        List<CompletableFuture<Void>> assignmentValidations = new ArrayList<>();
        assignmentValidations.add(CompletableFuture.runAsync(() -> validateTimeConflictWithData(staffUserId, shiftDate, shiftStartTime, shiftEndTime, existingAssignmentData)));
        assignmentValidations.add(CompletableFuture.runAsync(() -> validateDailyHoursWithData(staffUserId, shiftDate, shiftDuration, existingAssignmentData)));
        assignmentValidations.add(CompletableFuture.runAsync(() -> validateWeeklyHoursWithData(staffUserId, shiftDate, shiftDuration, existingAssignmentData)));
        assignmentValidations.add(CompletableFuture.runAsync(() -> validateDailyShiftsWithData(staffUserId, shiftDate, existingAssignmentData)));
        assignmentValidations.add(CompletableFuture.runAsync(() -> validateWeeklyShiftsWithData(staffUserId, shiftDate, existingAssignmentData)));
        assignmentValidations.add(CompletableFuture.runAsync(() -> validateConsecutiveDaysWithData(staffUserId, shiftDate, existingAssignmentData)));
        assignmentValidations.add(CompletableFuture.runAsync(() -> validateRestPeriodWithData(staffUserId, shiftDate, shiftStartTime, shiftEndTime, existingAssignmentData)));
        assignmentValidations.add(CompletableFuture.runAsync(() -> validateOvertimeLimitsWithData(staffUserId, shiftDate, shiftDuration, existingAssignmentData)));
        assignmentValidations.add(CompletableFuture.runAsync(() -> validateWeekendWorkWithData(staffUserId, shiftDate, existingAssignmentData)));
        assignmentValidations.add(CompletableFuture.runAsync(() -> validateShiftPatternWithData(staffUserId, shiftDate, shiftStartTime, shiftEndTime, existingAssignmentData)));

        // Wait for all validations to complete and collect any exceptions
        // Check basic validations first (fail fast)
        for (CompletableFuture<Void> future : basicValidations) {
            try {
                future.join();
            } catch (Exception e) {
                // Unwrap exceptions from CompletableFuture
                // CompletableFuture.join() throws CompletionException, not ExecutionException
                Throwable cause = unwrapException(e);
                if (cause instanceof AppException) {
                    throw (AppException) cause;
                }
                // If still not AppException, wrap with more context
                throw new RuntimeException("Validation error: " + (cause.getMessage() != null ? cause.getMessage() : cause.getClass().getSimpleName()), cause);
            }
        }
        
        // Then check assignment validations
        for (CompletableFuture<Void> future : assignmentValidations) {
            try {
                future.join();
            } catch (Exception e) {
                // Unwrap exceptions from CompletableFuture
                Throwable cause = unwrapException(e);
                if (cause instanceof AppException) {
                    throw (AppException) cause;
                }
                // If still not AppException, wrap with more context
                throw new RuntimeException("Validation error: " + (cause.getMessage() != null ? cause.getMessage() : cause.getClass().getSimpleName()), cause);
            }
        }

        log.debug("All validations passed for staff {} and shift {}", staffUserId, shift.getShiftId());
    }

    /**
     * Validate và return conflict reason nếu có (không throw exception)
     * Return null nếu valid
     * Default: strict validation - không cho phép hôm nay, không cho phép override role
     */
    public String validateStaffForShiftWithReason(Integer staffUserId, Shift shift) {
        return validateStaffForShiftWithReason(staffUserId, shift, false, false);
    }

    /**
     * Validate và return conflict reason nếu có (không throw exception) với options
     * Return null nếu valid
     * @param staffUserId ID của staff
     * @param shift Shift cần validate
     * @param allowToday Cho phép đăng ký ca trong ngày
     * @param allowManagerOverride Cho phép manager override role requirements
     */
    public String validateStaffForShiftWithReason(Integer staffUserId, Shift shift, boolean allowToday, boolean allowManagerOverride) {
        try {
            validateStaffForShift(staffUserId, shift, allowToday, allowManagerOverride);
            return null; // No conflict
        } catch (AppException e) {
            // Return specific error message from AppException
            return e.getMessage();
        } catch (RuntimeException e) {
            // Unwrap AppException from RuntimeException (from CompletableFuture)
            Throwable cause = unwrapException(e);
            if (cause instanceof AppException) {
                return cause.getMessage();
            }
            log.error("Unexpected RuntimeException during validation: {}", e.getMessage(), e);
            return "Validation error: " + (cause.getMessage() != null ? cause.getMessage() : cause.getClass().getSimpleName());
        } catch (Exception e) {
            log.error("Unexpected error during validation: {}", e.getMessage(), e);
            Throwable cause = unwrapException(e);
            if (cause instanceof AppException) {
                return cause.getMessage();
            }
            return "Validation error: " + (cause.getMessage() != null ? cause.getMessage() : cause.getClass().getSimpleName());
        }
    }

    // ========== Individual Validation Methods ==========

    /**
     * 1. Validate shift date (không được trong quá khứ, không quá xa)
     * @param shiftDate Ngày ca cần validate
     * @param allowToday Cho phép đăng ký ca trong ngày (default: false - không cho phép)
     */
    public void validateShiftDate(LocalDate shiftDate, boolean allowToday) {
        LocalDate today = LocalDate.now();
        LocalDate maxFutureDate = today.plusMonths(validationProperties.getMaxMonthsInAdvance());

        if (shiftDate.isBefore(today)) {
            throw new AppException(ErrorCode.SHIFT_DATE_IN_PAST,
                    "Cannot assign to shifts in the past");
        }

        if (!allowToday && shiftDate.equals(today)) {
            throw new AppException(ErrorCode.SHIFT_DATE_IN_PAST,
                    "Cannot register for shifts today. Only future shifts are available for registration");
        }

        if (shiftDate.isAfter(maxFutureDate)) {
            throw new AppException(ErrorCode.SHIFT_DATE_TOO_FAR,
                    "Cannot assign to shifts more than " + validationProperties.getMaxMonthsInAdvance() + " months in advance");
        }
    }

    /**
     * Validate shift date (default: không cho phép hôm nay)
     */
    public void validateShiftDate(LocalDate shiftDate) {
        validateShiftDate(shiftDate, false);
    }

    /**
     * 2. Validate shift status (chỉ DRAFT hoặc PUBLISHED)
     */
    public void validateShiftStatus(Shift shift) {
        if (!List.of("DRAFT", "PUBLISHED").contains(shift.getStatus())) {
            throw new AppException(ErrorCode.SHIFT_NOT_AVAILABLE,
                    "Cannot assign to shift with status: " + shift.getStatus());
        }
    }

    /**
     * 3. Validate shift duration (min và max)
     */
    public void validateShiftDuration(BigDecimal duration) {
        if (duration.compareTo(validationProperties.getMinShiftDuration()) < 0) {
            throw new AppException(ErrorCode.SHIFT_BELOW_MIN_DURATION,
                    "Minimum shift duration is " + validationProperties.getMinShiftDuration() + " hours");
        }

        if (duration.compareTo(validationProperties.getMaxShiftDuration()) > 0) {
            throw new AppException(ErrorCode.SHIFT_EXCEEDS_MAX_DURATION,
                    "Maximum shift duration is " + validationProperties.getMaxShiftDuration() + " hours");
        }
    }

    /**
     * Validate branch existence (used by template creation and other flows).
     * Throws BRANCH_NOT_FOUND if branch does not exist.
     * Does NOT fail hard if external service is unavailable (logs error and continues),
     * similar to other branch-related validations in this service.
     */
    public void validateBranchExists(Integer branchId) {
        if (branchId == null) {
            throw new AppException(ErrorCode.EMPTY_BRANCH_ID);
        }

        try {
            var branchResponse = branchClient.getBranchById(branchId);
            if (branchResponse == null || branchResponse.getResult() == null) {
                throw new AppException(ErrorCode.BRANCH_NOT_FOUND);
            }
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to validate branch existence from order-service: {}", e.getMessage(), e);
            // Do not block flow if external service is down
        }
    }

    /**
     * 4. Validate time conflict (không overlap với ca khác)
     */
    public void validateTimeConflict(Integer staffUserId, Shift newShift, List<ShiftAssignment> existingAssignments) {
        validateTimeConflict(staffUserId, newShift.getShiftDate(), newShift.getStartTime(), newShift.getEndTime(), existingAssignments);
    }

    private void validateTimeConflict(Integer staffUserId, LocalDate shiftDate, LocalTime startTime, LocalTime endTime, List<ShiftAssignment> existingAssignments) {
        validateTimeConflictWithData(staffUserId, shiftDate, startTime, endTime, 
            existingAssignments.stream().map(a -> {
                Shift s = a.getShift();
                java.util.Map<String, Object> data = new java.util.HashMap<>();
                data.put("shiftDate", s.getShiftDate());
                data.put("startTime", s.getStartTime());
                data.put("endTime", s.getEndTime());
                return data;
            }).collect(Collectors.toList()));
    }

    private void validateTimeConflictWithData(Integer staffUserId, LocalDate shiftDate, LocalTime startTime, LocalTime endTime, List<java.util.Map<String, Object>> existingAssignmentData) {
        for (java.util.Map<String, Object> data : existingAssignmentData) {
            LocalDate existingDate = (LocalDate) data.get("shiftDate");
            if (existingDate.equals(shiftDate)) {
                LocalTime existingStartTime = (LocalTime) data.get("startTime");
                LocalTime existingEndTime = (LocalTime) data.get("endTime");
                if (isTimeOverlapping(startTime, endTime, existingStartTime, existingEndTime)) {
                    throw new AppException(ErrorCode.SHIFT_TIME_CONFLICT,
                            "This shift conflicts with another shift on the same day");
                }
            }
        }
    }

    /**
     * 5. Validate daily hours (tối đa 8h/ngày)
     */
    public void validateDailyHours(Integer staffUserId, Shift newShift, List<ShiftAssignment> existingAssignments) {
        validateDailyHours(staffUserId, newShift.getShiftDate(), newShift.getDurationHours(), existingAssignments);
    }

    private void validateDailyHours(Integer staffUserId, LocalDate shiftDate, BigDecimal shiftDuration, List<ShiftAssignment> existingAssignments) {
        validateDailyHoursWithData(staffUserId, shiftDate, shiftDuration,
            existingAssignments.stream().map(a -> {
                Shift s = a.getShift();
                java.util.Map<String, Object> data = new java.util.HashMap<>();
                data.put("shiftDate", s.getShiftDate());
                data.put("durationHours", s.getDurationHours());
                return data;
            }).collect(Collectors.toList()));
    }

    private void validateDailyHoursWithData(Integer staffUserId, LocalDate shiftDate, BigDecimal shiftDuration, List<java.util.Map<String, Object>> existingAssignmentData) {
        BigDecimal totalDailyHours = shiftDuration;
        for (java.util.Map<String, Object> data : existingAssignmentData) {
            LocalDate existingDate = (LocalDate) data.get("shiftDate");
            if (existingDate.equals(shiftDate)) {
                BigDecimal existingDuration = (BigDecimal) data.get("durationHours");
                totalDailyHours = totalDailyHours.add(existingDuration);
            }
        }

        if (totalDailyHours.compareTo(validationProperties.getMaxDailyHours()) > 0) {
            throw new AppException(ErrorCode.SHIFT_EXCEEDS_DAILY_HOURS,
                    "Would exceed " + validationProperties.getMaxDailyHours() + " hours per day limit");
        }
    }

    /**
     * 6. Validate weekly hours (tối đa 40h/tuần)
     */
    public void validateWeeklyHours(Integer staffUserId, Shift newShift, List<ShiftAssignment> existingAssignments) {
        validateWeeklyHours(staffUserId, newShift.getShiftDate(), newShift.getDurationHours(), existingAssignments);
    }

    private void validateWeeklyHours(Integer staffUserId, LocalDate shiftDate, BigDecimal shiftDuration, List<ShiftAssignment> existingAssignments) {
        validateWeeklyHoursWithData(staffUserId, shiftDate, shiftDuration,
            existingAssignments.stream().map(a -> {
                Shift s = a.getShift();
                java.util.Map<String, Object> data = new java.util.HashMap<>();
                data.put("shiftDate", s.getShiftDate());
                data.put("durationHours", s.getDurationHours());
                return data;
            }).collect(Collectors.toList()));
    }

    private void validateWeeklyHoursWithData(Integer staffUserId, LocalDate shiftDate, BigDecimal shiftDuration, List<java.util.Map<String, Object>> existingAssignmentData) {
        LocalDate weekStart = shiftDate.minusDays(shiftDate.getDayOfWeek().getValue() - 1);
        LocalDate weekEnd = weekStart.plusDays(6);

        BigDecimal totalWeeklyHours = shiftDuration;
        for (java.util.Map<String, Object> data : existingAssignmentData) {
            LocalDate existingDate = (LocalDate) data.get("shiftDate");
            if (!existingDate.isBefore(weekStart) && !existingDate.isAfter(weekEnd)) {
                BigDecimal existingDuration = (BigDecimal) data.get("durationHours");
                totalWeeklyHours = totalWeeklyHours.add(existingDuration);
            }
        }

        if (totalWeeklyHours.compareTo(validationProperties.getMaxWeeklyHours()) > 0) {
            throw new AppException(ErrorCode.SHIFT_EXCEEDS_WEEKLY_HOURS,
                    "Would exceed " + validationProperties.getMaxWeeklyHours() + " hours per week limit");
        }
    }

    /**
     * 7. Validate số ca tối đa mỗi ngày
     */
    public void validateDailyShifts(Integer staffUserId, Shift newShift, List<ShiftAssignment> existingAssignments) {
        validateDailyShifts(staffUserId, newShift.getShiftDate(), existingAssignments);
    }

    private void validateDailyShifts(Integer staffUserId, LocalDate shiftDate, List<ShiftAssignment> existingAssignments) {
        validateDailyShiftsWithData(staffUserId, shiftDate,
            existingAssignments.stream().map(a -> {
                Shift s = a.getShift();
                java.util.Map<String, Object> data = new java.util.HashMap<>();
                data.put("shiftDate", s.getShiftDate());
                return data;
            }).collect(Collectors.toList()));
    }

    private void validateDailyShiftsWithData(Integer staffUserId, LocalDate shiftDate, List<java.util.Map<String, Object>> existingAssignmentData) {
        long shiftsOnSameDate = existingAssignmentData.stream()
                .filter(data -> shiftDate.equals((LocalDate) data.get("shiftDate")))
                .count();

        if (shiftsOnSameDate >= validationProperties.getMaxShiftsPerDay()) {
            throw new AppException(ErrorCode.SHIFT_EXCEEDS_DAILY_SHIFTS,
                    "Maximum " + validationProperties.getMaxShiftsPerDay() + " shifts per day allowed");
        }
    }

    /**
     * 8. Validate số ca tối đa mỗi tuần
     */
    public void validateWeeklyShifts(Integer staffUserId, Shift newShift, List<ShiftAssignment> existingAssignments) {
        validateWeeklyShifts(staffUserId, newShift.getShiftDate(), existingAssignments);
    }

    private void validateWeeklyShifts(Integer staffUserId, LocalDate shiftDate, List<ShiftAssignment> existingAssignments) {
        validateWeeklyShiftsWithData(staffUserId, shiftDate,
            existingAssignments.stream().map(a -> {
                Shift s = a.getShift();
                java.util.Map<String, Object> data = new java.util.HashMap<>();
                data.put("shiftDate", s.getShiftDate());
                return data;
            }).collect(Collectors.toList()));
    }

    private void validateWeeklyShiftsWithData(Integer staffUserId, LocalDate shiftDate, List<java.util.Map<String, Object>> existingAssignmentData) {
        LocalDate weekStart = shiftDate.minusDays(shiftDate.getDayOfWeek().getValue() - 1);
        LocalDate weekEnd = weekStart.plusDays(6);

        long shiftsInWeek = existingAssignmentData.stream()
                .filter(data -> {
                    LocalDate existingDate = (LocalDate) data.get("shiftDate");
                    return !existingDate.isBefore(weekStart) && !existingDate.isAfter(weekEnd);
                })
                .count();

        if (shiftsInWeek >= validationProperties.getMaxShiftsPerWeek()) {
            throw new AppException(ErrorCode.SHIFT_EXCEEDS_WEEKLY_SHIFTS,
                    "Maximum " + validationProperties.getMaxShiftsPerWeek() + " shifts per week allowed");
        }
    }

    /**
     * 9. Validate consecutive days (tối đa 6 ngày liên tiếp)
     */
    public void validateConsecutiveDays(Integer staffUserId, Shift newShift, List<ShiftAssignment> existingAssignments) {
        validateConsecutiveDays(staffUserId, newShift.getShiftDate(), existingAssignments);
    }

    private void validateConsecutiveDays(Integer staffUserId, LocalDate shiftDate, List<ShiftAssignment> existingAssignments) {
        validateConsecutiveDaysWithData(staffUserId, shiftDate,
            existingAssignments.stream().map(a -> {
                Shift s = a.getShift();
                java.util.Map<String, Object> data = new java.util.HashMap<>();
                data.put("shiftDate", s.getShiftDate());
                return data;
            }).collect(Collectors.toList()));
    }

    private void validateConsecutiveDaysWithData(Integer staffUserId, LocalDate shiftDate, List<java.util.Map<String, Object>> existingAssignmentData) {
        int consecutiveDays = 1;

        // Count backward
        LocalDate checkDateBackward = shiftDate.minusDays(1);
        while (consecutiveDays < validationProperties.getMaxConsecutiveDays()) {
            final LocalDate checkDate = checkDateBackward;
            boolean hasShiftOnDate = existingAssignmentData.stream()
                    .anyMatch(data -> checkDate.equals((LocalDate) data.get("shiftDate")));
            if (!hasShiftOnDate) break;
            consecutiveDays++;
            checkDateBackward = checkDateBackward.minusDays(1);
        }

        // Count forward
        LocalDate checkDateForward = shiftDate.plusDays(1);
        while (consecutiveDays < validationProperties.getMaxConsecutiveDays()) {
            final LocalDate checkDate = checkDateForward;
            boolean hasShiftOnDate = existingAssignmentData.stream()
                    .anyMatch(data -> checkDate.equals((LocalDate) data.get("shiftDate")));
            if (!hasShiftOnDate) break;
            consecutiveDays++;
            checkDateForward = checkDateForward.plusDays(1);
        }

        if (consecutiveDays >= validationProperties.getMaxConsecutiveDays()) {
            throw new AppException(ErrorCode.SHIFT_EXCEEDS_CONSECUTIVE_DAYS,
                    "Maximum " + validationProperties.getMaxConsecutiveDays() + " consecutive days allowed");
        }
    }

    /**
     * 10. Validate rest period (11h giữa các ca, 12h cho night shift)
     */
    public void validateRestPeriod(Integer staffUserId, Shift newShift, List<ShiftAssignment> existingAssignments) {
        validateRestPeriod(staffUserId, newShift.getShiftDate(), newShift.getStartTime(), newShift.getEndTime(), existingAssignments);
    }

    private void validateRestPeriod(Integer staffUserId, LocalDate shiftDate, LocalTime startTime, LocalTime endTime, List<ShiftAssignment> existingAssignments) {
        validateRestPeriodWithData(staffUserId, shiftDate, startTime, endTime,
            existingAssignments.stream().map(a -> {
                Shift s = a.getShift();
                java.util.Map<String, Object> data = new java.util.HashMap<>();
                data.put("shiftDate", s.getShiftDate());
                data.put("startTime", s.getStartTime());
                data.put("endTime", s.getEndTime());
                return data;
            }).collect(Collectors.toList()));
    }

    private void validateRestPeriodWithData(Integer staffUserId, LocalDate shiftDate, LocalTime startTime, LocalTime endTime, List<java.util.Map<String, Object>> existingAssignmentData) {
        LocalDateTime newShiftStart = shiftDate.atTime(startTime);
        LocalDateTime newShiftEnd = shiftDate.atTime(endTime);

        for (java.util.Map<String, Object> data : existingAssignmentData) {
            LocalDate existingDate = (LocalDate) data.get("shiftDate");
            LocalTime existingStartTime = (LocalTime) data.get("startTime");
            LocalTime existingEndTime = (LocalTime) data.get("endTime");
            LocalDateTime existingShiftStart = existingDate.atTime(existingStartTime);
            LocalDateTime existingShiftEnd = existingDate.atTime(existingEndTime);

            long hoursBetween = 0;
            // Check if existing or new shift is night shift
            boolean existingIsNight = (existingStartTime.isAfter(LocalTime.of(22, 0)) || existingEndTime.isBefore(LocalTime.of(6, 0)));
            boolean newIsNight = (startTime.isAfter(LocalTime.of(22, 0)) || endTime.isBefore(LocalTime.of(6, 0)));
            boolean isNightShift = existingIsNight || newIsNight;
            BigDecimal requiredRest = isNightShift ? validationProperties.getMinRestHoursNightShift() 
                : validationProperties.getMinRestHoursDayShift();

            // Check if new shift starts after existing shift
            if (newShiftStart.isAfter(existingShiftEnd)) {
                hoursBetween = ChronoUnit.HOURS.between(existingShiftEnd, newShiftStart);
                if (hoursBetween < requiredRest.intValue()) {
                    throw new AppException(ErrorCode.SHIFT_INSUFFICIENT_REST,
                            "Requires at least " + requiredRest + " hours rest between shifts");
                }
            }

            // Check if existing shift starts after new shift
            if (existingShiftStart.isAfter(newShiftEnd)) {
                hoursBetween = ChronoUnit.HOURS.between(newShiftEnd, existingShiftStart);
                if (hoursBetween < requiredRest.intValue()) {
                    throw new AppException(ErrorCode.SHIFT_INSUFFICIENT_REST,
                            "Requires at least " + requiredRest + " hours rest between shifts");
                }
            }
        }
    }

    /**
     * 11. Validate overtime limits
     */
    public void validateOvertimeLimits(Integer staffUserId, Shift newShift, List<ShiftAssignment> existingAssignments) {
        validateOvertimeLimits(staffUserId, newShift.getShiftDate(), newShift.getDurationHours(), existingAssignments);
    }

    private void validateOvertimeLimits(Integer staffUserId, LocalDate shiftDate, BigDecimal shiftDuration, List<ShiftAssignment> existingAssignments) {
        validateOvertimeLimitsWithData(staffUserId, shiftDate, shiftDuration,
            existingAssignments.stream().map(a -> {
                Shift s = a.getShift();
                java.util.Map<String, Object> data = new java.util.HashMap<>();
                data.put("shiftDate", s.getShiftDate());
                data.put("durationHours", s.getDurationHours());
                return data;
            }).collect(Collectors.toList()));
    }

    private void validateOvertimeLimitsWithData(Integer staffUserId, LocalDate shiftDate, BigDecimal shiftDuration, List<java.util.Map<String, Object>> existingAssignmentData) {
        // Calculate weekly hours
        LocalDate weekStart = shiftDate.minusDays(shiftDate.getDayOfWeek().getValue() - 1);
        LocalDate weekEnd = weekStart.plusDays(6);

        BigDecimal totalWeeklyHours = shiftDuration;
        for (java.util.Map<String, Object> data : existingAssignmentData) {
            LocalDate existingDate = (LocalDate) data.get("shiftDate");
            if (!existingDate.isBefore(weekStart) && !existingDate.isAfter(weekEnd)) {
                BigDecimal existingDuration = (BigDecimal) data.get("durationHours");
                totalWeeklyHours = totalWeeklyHours.add(existingDuration);
            }
        }

        BigDecimal overtimeHours = totalWeeklyHours.subtract(validationProperties.getMaxWeeklyHours());
        if (overtimeHours.compareTo(BigDecimal.ZERO) > 0) {
            if (overtimeHours.compareTo(validationProperties.getMaxOvertimePerWeek()) > 0) {
                throw new AppException(ErrorCode.SHIFT_EXCEEDS_OVERTIME_LIMIT,
                        "Maximum " + validationProperties.getMaxOvertimePerWeek() + " hours overtime per week allowed");
            }

            // Check daily overtime
            BigDecimal totalDailyHours = shiftDuration;
            for (java.util.Map<String, Object> data : existingAssignmentData) {
                LocalDate existingDate = (LocalDate) data.get("shiftDate");
                if (existingDate.equals(shiftDate)) {
                    BigDecimal existingDuration = (BigDecimal) data.get("durationHours");
                    totalDailyHours = totalDailyHours.add(existingDuration);
                }
            }

            BigDecimal dailyOvertime = totalDailyHours.subtract(validationProperties.getMaxDailyHours());
            if (dailyOvertime.compareTo(validationProperties.getMaxOvertimePerDay()) > 0) {
                throw new AppException(ErrorCode.SHIFT_EXCEEDS_DAILY_OVERTIME,
                        "Maximum " + validationProperties.getMaxOvertimePerDay() + " hours overtime per day allowed");
            }
        }
    }

    /**
     * 12. Validate employment type
     */
    public void validateEmploymentType(StaffProfile staff, Shift shift) {
        String shiftEmploymentType = shift.getEmploymentType();
        if (shiftEmploymentType == null && shift.getTemplate() != null) {
            shiftEmploymentType = shift.getTemplate().getEmploymentType();
        }
        if (shiftEmploymentType == null) {
            shiftEmploymentType = "ANY";
        }

        if (!"ANY".equals(shiftEmploymentType) && !shiftEmploymentType.equals(staff.getEmploymentType())) {
            throw new AppException(ErrorCode.SHIFT_EMPLOYMENT_TYPE_MISMATCH,
                    "Shift requires " + shiftEmploymentType + " employment type");
        }
    }

    /**
     * 13. Validate role requirements
     * @param staff Staff profile
     * @param shift Shift cần validate
     * @param allowManagerOverride Cho phép manager override (chỉ log warning, không throw exception)
     */
    public void validateRoleRequirements(StaffProfile staff, Shift shift, boolean allowManagerOverride) {
        List<ShiftRoleRequirement> requirements = shiftRoleRequirementRepository.findByShift(shift);

        if (requirements.isEmpty()) {
            return; // No role requirements
        }

        List<Integer> staffRoleIds = staffRoleAssignmentRepository.findByStaffProfile(staff).stream()
                .map(StaffRoleAssignment::getRoleId)
                .collect(Collectors.toList());

        if (staffRoleIds.isEmpty()) {
            throw new AppException(ErrorCode.SHIFT_ROLE_NOT_QUALIFIED,
                    "Staff must have at least one role assigned");
        }

        // Check if staff has at least one required role
        boolean hasRequiredRole = requirements.stream()
                .filter(req -> req.getRequired() == null || req.getRequired())
                .anyMatch(req -> staffRoleIds.contains(req.getRoleId()));

        if (!hasRequiredRole) {
            if (allowManagerOverride) {
                // Manager can override - chỉ log warning, không throw exception
                log.warn("Staff {} does not have required role for shift {} but manager override is allowed", 
                        staff.getUserId(), shift.getShiftId());
            } else {
                // Staff tự đăng ký - phải có role phù hợp
                throw new AppException(ErrorCode.SHIFT_ROLE_NOT_QUALIFIED,
                        "Staff does not have required role for this shift");
            }
        }
    }

    /**
     * Validate role requirements (default: không cho phép override)
     */
    public void validateRoleRequirements(StaffProfile staff, Shift shift) {
        validateRoleRequirements(staff, shift, false);
    }

    /**
     * 14. Validate shift capacity (with pre-loaded assignments to avoid database access in parallel threads)
     */
    public void validateShiftCapacity(Shift shift, Integer staffUserId, List<ShiftAssignment> shiftAssignments) {
        if (shift.getMaxStaffAllowed() != null) {
            long currentCount = shiftAssignments.stream()
                    .filter(a -> !"CANCELLED".equals(a.getStatus()))
                    .count();

            // Check if staff is already assigned
            boolean alreadyAssigned = shiftAssignments.stream()
                    .anyMatch(a -> a.getStaffUserId().equals(staffUserId) && !"CANCELLED".equals(a.getStatus()));

            if (!alreadyAssigned && currentCount >= shift.getMaxStaffAllowed()) {
                throw new AppException(ErrorCode.SHIFT_FULL,
                        "Shift has reached maximum staff capacity");
            }
        }
    }

    /**
     * 14. Validate shift capacity (backward compatibility - loads data itself)
     */
    public void validateShiftCapacity(Shift shift, Integer staffUserId) {
        List<ShiftAssignment> shiftAssignments = assignmentRepository.findByShift(shift);
        validateShiftCapacity(shift, staffUserId, shiftAssignments);
    }

    /**
     * 15. Validate duplicate assignment (with pre-loaded assignments to avoid database access in parallel threads)
     */
    public void validateDuplicateAssignment(Shift shift, Integer staffUserId, List<ShiftAssignment> shiftAssignments) {
        boolean alreadyAssigned = shiftAssignments.stream()
                .anyMatch(a -> a.getStaffUserId().equals(staffUserId) && !"CANCELLED".equals(a.getStatus()));

        if (alreadyAssigned) {
            throw new AppException(ErrorCode.SHIFT_ALREADY_REGISTERED,
                    "Staff is already assigned to this shift");
        }
    }

    /**
     * 15. Validate duplicate assignment (backward compatibility - loads data itself)
     */
    public void validateDuplicateAssignment(Shift shift, Integer staffUserId) {
        List<ShiftAssignment> shiftAssignments = assignmentRepository.findByShift(shift);
        validateDuplicateAssignment(shift, staffUserId, shiftAssignments);
    }

    /**
     * 16. Validate weekend work (optional - có thể bỏ qua nếu không cần)
     */
    public void validateWeekendWork(Integer staffUserId, Shift newShift, List<ShiftAssignment> existingAssignments) {
        validateWeekendWork(staffUserId, newShift.getShiftDate(), existingAssignments);
    }

    private void validateWeekendWork(Integer staffUserId, LocalDate shiftDate, List<ShiftAssignment> existingAssignments) {
        validateWeekendWorkWithData(staffUserId, shiftDate,
            existingAssignments.stream().map(a -> {
                Shift s = a.getShift();
                java.util.Map<String, Object> data = new java.util.HashMap<>();
                data.put("shiftDate", s.getShiftDate());
                return data;
            }).collect(Collectors.toList()));
    }

    private void validateWeekendWorkWithData(Integer staffUserId, LocalDate shiftDate, List<java.util.Map<String, Object>> existingAssignmentData) {
        if (!isWeekend(shiftDate)) {
            return; // Not a weekend
        }

        LocalDate weekStart = shiftDate.minusDays(shiftDate.getDayOfWeek().getValue() - 1);
        LocalDate weekEnd = weekStart.plusDays(6);

        long weekendShifts = existingAssignmentData.stream()
                .filter(data -> {
                    LocalDate date = (LocalDate) data.get("shiftDate");
                    return !date.isBefore(weekStart) && !date.isAfter(weekEnd) && isWeekend(date);
                })
                .count();

        if (weekendShifts >= validationProperties.getMaxWeekendDaysPerWeek()) {
            throw new AppException(ErrorCode.SHIFT_EXCEEDS_WEEKEND_LIMIT,
                    "Maximum " + validationProperties.getMaxWeekendDaysPerWeek() + " weekend day per week allowed");
        }
    }

    /**
     * 17. Validate shift pattern (night -> morning, afternoon -> night)
     */
    public void validateShiftPattern(Integer staffUserId, Shift newShift, List<ShiftAssignment> existingAssignments) {
        validateShiftPattern(staffUserId, newShift.getShiftDate(), newShift.getStartTime(), newShift.getEndTime(), existingAssignments);
    }

    private void validateShiftPattern(Integer staffUserId, LocalDate shiftDate, LocalTime startTime, LocalTime endTime, List<ShiftAssignment> existingAssignments) {
        validateShiftPatternWithData(staffUserId, shiftDate, startTime, endTime,
            existingAssignments.stream().map(a -> {
                Shift s = a.getShift();
                java.util.Map<String, Object> data = new java.util.HashMap<>();
                data.put("shiftDate", s.getShiftDate());
                data.put("startTime", s.getStartTime());
                data.put("endTime", s.getEndTime());
                return data;
            }).collect(Collectors.toList()));
    }

    private void validateShiftPatternWithData(Integer staffUserId, LocalDate shiftDate, LocalTime startTime, LocalTime endTime, List<java.util.Map<String, Object>> existingAssignmentData) {
        for (java.util.Map<String, Object> data : existingAssignmentData) {
            LocalDate existingDate = (LocalDate) data.get("shiftDate");
            LocalTime existingStartTime = (LocalTime) data.get("startTime");
            LocalTime existingEndTime = (LocalTime) data.get("endTime");

            // Check night shift -> morning shift pattern
            boolean existingIsNight = (existingStartTime.isAfter(LocalTime.of(22, 0)) || existingEndTime.isBefore(LocalTime.of(6, 0)));
            boolean newIsMorning = (startTime.isAfter(LocalTime.of(5, 59)) && startTime.isBefore(LocalTime.of(14, 0)));
            if (existingIsNight && newIsMorning &&
                    existingDate.plusDays(1).equals(shiftDate)) {
                throw new AppException(ErrorCode.SHIFT_PATTERN_RESTRICTED,
                        "Cannot work morning shift after night shift");
            }

            // Check afternoon -> night shift pattern
            boolean existingIsAfternoon = (existingStartTime.isAfter(LocalTime.of(13, 59)) && existingStartTime.isBefore(LocalTime.of(22, 0)));
            boolean newIsNight = (startTime.isAfter(LocalTime.of(22, 0)) || endTime.isBefore(LocalTime.of(6, 0)));
            if (existingIsAfternoon && newIsNight &&
                    existingDate.equals(shiftDate)) {
                throw new AppException(ErrorCode.SHIFT_PATTERN_RESTRICTED,
                        "Cannot work night shift after afternoon shift on same day");
            }
        }
    }

    // ========== Helper Methods ==========

    /**
     * Unwrap exception from CompletableFuture
     * CompletableFuture.join() throws CompletionException, which wraps the actual exception
     */
    private Throwable unwrapException(Throwable e) {
        Throwable cause = e;
        // CompletableFuture.join() throws CompletionException
        if (e instanceof java.util.concurrent.CompletionException) {
            cause = e.getCause();
        }
        // Also handle ExecutionException (from other async operations)
        if (e instanceof java.util.concurrent.ExecutionException) {
            cause = e.getCause();
        }
        // Recursively unwrap if cause is also wrapped
        if (cause != null && cause != e && 
            (cause instanceof java.util.concurrent.CompletionException || 
             cause instanceof java.util.concurrent.ExecutionException)) {
            return unwrapException(cause);
        }
        return cause != null ? cause : e;
    }

    private boolean isTimeOverlapping(LocalTime start1, LocalTime end1, LocalTime start2, LocalTime end2) {
        return start1.isBefore(end2) && start2.isBefore(end1);
    }

    private boolean isNightShift(Shift shift) {
        // Night shift: starts after 22:00 or ends before 06:00
        return shift.getStartTime().isAfter(LocalTime.of(22, 0)) ||
                shift.getEndTime().isBefore(LocalTime.of(6, 0));
    }

    private boolean isMorningShift(Shift shift) {
        // Morning shift: 06:00-14:00
        return shift.getStartTime().isAfter(LocalTime.of(5, 59)) &&
                shift.getStartTime().isBefore(LocalTime.of(14, 0));
    }

    private boolean isAfternoonShift(Shift shift) {
        // Afternoon shift: 14:00-22:00
        return shift.getStartTime().isAfter(LocalTime.of(13, 59)) &&
                shift.getStartTime().isBefore(LocalTime.of(22, 0));
    }

    private boolean isWeekend(LocalDate date) {
        int dayOfWeek = date.getDayOfWeek().getValue();
        return dayOfWeek == 6 || dayOfWeek == 7; // Saturday or Sunday
    }

    // ========== Branch Validation Methods ==========

    /**
     * 18. Validate branch working days (openDays)
     * Check if the shift date is within branch's working days
     * @param branchId Branch ID
     * @param shiftDate Shift date to validate
     */
    public void validateBranchWorkingDay(Integer branchId, LocalDate shiftDate) {
        if (branchId == null || shiftDate == null) {
            return; // Skip validation if branchId or shiftDate is null
        }

        try {
            var branchResponse = branchClient.getBranchById(branchId);
            if (branchResponse != null && branchResponse.getResult() != null) {
                String openDays = branchResponse.getResult().getOpenDays();
                if (openDays != null && !openDays.trim().isEmpty()) {
                    // Parse openDays: "1,2,3,4,5,6,7" -> [1,2,3,4,5,6,7]
                    List<Integer> openDaysList = java.util.Arrays.stream(openDays.split(","))
                            .map(String::trim)
                            .map(Integer::parseInt)
                            .filter(day -> day >= 1 && day <= 7)
                            .collect(Collectors.toList());
                    
                    // Get day of week: 1=Monday, 7=Sunday
                    int dayOfWeek = shiftDate.getDayOfWeek().getValue(); // 1=Monday, 7=Sunday
                    
                    if (!openDaysList.contains(dayOfWeek)) {
                        throw new AppException(ErrorCode.VALIDATION_FAILED, 
                                "Cannot create shift: Branch is not open on this day of the week");
                    }
                }
            }
        } catch (AppException e) {
            throw e; // Re-throw validation errors
        } catch (Exception e) {
            log.error("Failed to fetch branch info from order-service: {}", e.getMessage(), e);
            // Don't block shift creation if branch service is unavailable
            // Frontend should handle this validation
        }
    }

    /**
     * 19. Validate branch closure
     * Check if the shift date is within any branch closure period
     * @param branchId Branch ID
     * @param shiftDate Shift date to validate
     */
    public void validateBranchClosure(Integer branchId, LocalDate shiftDate) {
        if (branchId == null || shiftDate == null) {
            return; // Skip validation if branchId or shiftDate is null
        }

        List<com.service.profile.repository.http_client.BranchClosureClient.BranchClosureResponse> closuresList = new ArrayList<>();
        try {
            var closureResponse = branchClosureClient.listClosures(
                    branchId,
                    shiftDate,
                    shiftDate
            );
            if (closureResponse != null && closureResponse.getResult() != null) {
                closuresList = closureResponse.getResult();
            }
        } catch (Exception e) {
            log.error("Failed to fetch branch closures from order-service: {}", e.getMessage(), e);
            // Don't block shift creation if closure service is unavailable
            // Frontend should handle this validation
            return;
        }
        
        // Check if the shift date is within any closure
        for (com.service.profile.repository.http_client.BranchClosureClient.BranchClosureResponse closure : closuresList) {
            // Check if closure applies to this branch (null = global, or matches branchId)
            boolean appliesToBranch = closure.getBranchId() == null || 
                    closure.getBranchId().equals(branchId);
            if (appliesToBranch && 
                !shiftDate.isBefore(closure.getStartDate()) && 
                !shiftDate.isAfter(closure.getEndDate())) {
                String reason = closure.getReason() != null && !closure.getReason().isBlank() 
                        ? closure.getReason() 
                        : "Branch is closed on this date";
                throw new AppException(ErrorCode.VALIDATION_FAILED, 
                        "Cannot create shift: " + reason);
            }
        }
    }

    /**
     * Validate both branch working day and closure
     * @param branchId Branch ID
     * @param shiftDate Shift date to validate
     */
    public void validateBranchAvailability(Integer branchId, LocalDate shiftDate) {
        validateBranchWorkingDay(branchId, shiftDate);
        validateBranchClosure(branchId, shiftDate);
    }

    /**
     * Check if date is a working day (returns false if not, doesn't throw exception)
     * Used for batch operations where we want to skip invalid dates instead of failing
     * @param branchId Branch ID
     * @param shiftDate Shift date to check
     * @return true if working day, false otherwise
     */
    public boolean isBranchWorkingDay(Integer branchId, LocalDate shiftDate) {
        if (branchId == null || shiftDate == null) {
            return true; // Default to true if no info
        }

        try {
            var branchResponse = branchClient.getBranchById(branchId);
            if (branchResponse != null && branchResponse.getResult() != null) {
                String openDays = branchResponse.getResult().getOpenDays();
                if (openDays != null && !openDays.trim().isEmpty()) {
                    List<Integer> openDaysList = java.util.Arrays.stream(openDays.split(","))
                            .map(String::trim)
                            .map(Integer::parseInt)
                            .filter(day -> day >= 1 && day <= 7)
                            .collect(Collectors.toList());
                    
                    int dayOfWeek = shiftDate.getDayOfWeek().getValue();
                    return openDaysList.contains(dayOfWeek);
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch branch info from order-service: {}", e.getMessage(), e);
        }
        return true; // Default to true if service unavailable
    }

    /**
     * Check if date is closed (returns true if closed, doesn't throw exception)
     * Used for batch operations where we want to skip invalid dates instead of failing
     * @param branchId Branch ID
     * @param shiftDate Shift date to check
     * @param closures List of closures to check against
     * @return true if closed, false otherwise
     */
    public boolean isBranchClosed(Integer branchId, LocalDate shiftDate, 
            List<com.service.profile.repository.http_client.BranchClosureClient.BranchClosureResponse> closures) {
        if (branchId == null || shiftDate == null || closures == null) {
            return false;
        }

        for (com.service.profile.repository.http_client.BranchClosureClient.BranchClosureResponse closure : closures) {
            boolean appliesToBranch = closure.getBranchId() == null || 
                    closure.getBranchId().equals(branchId);
            if (appliesToBranch && 
                !shiftDate.isBefore(closure.getStartDate()) && 
                !shiftDate.isAfter(closure.getEndDate())) {
                return true;
            }
        }
        return false;
    }
}

