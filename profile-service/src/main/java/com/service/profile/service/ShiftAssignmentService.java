package com.service.profile.service;

import com.service.profile.dto.response.AvailableStaffForShiftResponse;
import com.service.profile.dto.response.BranchPublicScheduleResponse;
import com.service.profile.dto.response.ShiftAssignmentResponse;
import com.service.profile.dto.response.ShiftResponse;
import com.service.profile.dto.response.StaffWithUserResponse;
import com.service.profile.entity.*;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.repository.*;
import com.service.profile.repository.http_client.AuthClient;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ShiftAssignmentService {

    ShiftAssignmentRepository assignmentRepository;
    ShiftRepository shiftRepository;
    StaffProfileRepository staffProfileRepository;
    ShiftRoleRequirementRepository shiftRoleRequirementRepository;
    StaffRoleAssignmentRepository staffRoleAssignmentRepository;
    ShiftRequestRepository shiftRequestRepository;
    ShiftService shiftService; // Reuse toShiftResponse method
    StaffProfileService staffProfileService; // For getting staff with user info
    ShiftValidationService shiftValidationService; // Centralized validation service
    AuthClient authClient; // For fetching user info from auth-service
    ShiftNotificationService shiftNotificationService; // For sending real-time notifications
    org.springframework.context.ApplicationEventPublisher eventPublisher; // For publishing events
    com.service.profile.service.PenaltyService penaltyService; // For canceling auto penalty
    com.service.profile.repository.PayrollRepository payrollRepository; // For checking payroll status

    /**
     * Get available shifts for staff to register
     * Filters by:
     * - Status = PUBLISHED
     * - employment_type matches staff's employment_type or is ANY
     * - Not already registered
     * - Not full (if max_staff_allowed is set)
     * - Has available role requirements
     */
    public List<ShiftResponse> getAvailableShifts(Integer branchId, LocalDate startDate, LocalDate endDate, Integer staffUserId) {
        // Get staff profile to check employment_type
        // TODO: Remove this check when staffUserId is properly retrieved from security context
        if (staffUserId == null || staffUserId == 0) {
            // For now, skip employment_type filtering if userId is not available
            // This allows the API to work while security context is being set up
            log.warn("staffUserId is 0 or null, skipping employment_type filtering");
            List<Shift> shifts = shiftRepository.findByBranchIdAndShiftDateBetweenAndStatus(
                    branchId, startDate, endDate, "PUBLISHED");
            return shifts.stream()
                    .map(shift -> shiftService.getShift(shift.getShiftId()))
                    .collect(Collectors.toList());
        }
        
        StaffProfile staff = staffProfileRepository.findById(staffUserId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));

        // Get all PUBLISHED shifts in date range (including expired, full, already registered)
        List<Shift> shifts = shiftRepository.findByBranchIdAndShiftDateBetweenAndStatus(
                branchId, startDate, endDate, "PUBLISHED");
        
        LocalDate today = LocalDate.now();
        List<Integer> staffRoleIds = staffRoleAssignmentRepository.findByStaffProfile(staff).stream()
                .map(StaffRoleAssignment::getRoleId)
                .collect(Collectors.toList());
        
        // Return all shifts with availability info (don't filter, let frontend display status)
        return shifts.stream()
                .filter(shift -> {
                    // Only show future shifts (after today, not including today)
                    if (!shift.getShiftDate().isAfter(today)) {
                        return false;
                    }
                    
                    // Only filter by employment_type match
                    String shiftEmploymentType = shift.getEmploymentType();
                    if (shiftEmploymentType == null && shift.getTemplate() != null) {
                        shiftEmploymentType = shift.getTemplate().getEmploymentType();
                    }
                    if (shiftEmploymentType == null) {
                        shiftEmploymentType = "ANY";
                    }
                    
                    // Filter out shifts that don't match employment_type
                    return "ANY".equals(shiftEmploymentType) || shiftEmploymentType.equals(staff.getEmploymentType());
                })
                .map(shift -> {
                    ShiftResponse response = shiftService.getShift(shift.getShiftId());
                    
                    // Check if shift is expired (date has passed)
                    boolean isExpired = shift.getShiftDate().isBefore(today);
                    
                    // Check if already registered and get assignment ID
                    boolean alreadyRegistered = false;
                    Integer assignmentId = null;
                    List<ShiftAssignment> staffAssignments = assignmentRepository.findByShift(shift).stream()
                            .filter(assignment -> assignment.getStaffUserId().equals(staffUserId) 
                                    && !"CANCELLED".equals(assignment.getStatus()))
                            .collect(Collectors.toList());
                    if (!staffAssignments.isEmpty()) {
                        alreadyRegistered = true;
                        assignmentId = staffAssignments.get(0).getAssignmentId();
                    }
                    
                    // Check if shift is full
                    boolean isFull = false;
                    if (shift.getMaxStaffAllowed() != null) {
                        long currentStaffCount = assignmentRepository.findByShift(shift).stream()
                                .filter(a -> !"CANCELLED".equals(a.getStatus()))
                                .count();
                        isFull = currentStaffCount >= shift.getMaxStaffAllowed();
                    }
                    
                    // Check role requirements availability
                    // Staff can register if they have at least one role that matches shift requirements
                    // Logic: Check if staff has any role that is in the shift's required roles
                    boolean hasAvailableRole = false;
                    List<ShiftRoleRequirement> requirements = shiftRoleRequirementRepository.findByShift(shift);
                    if (requirements.isEmpty()) {
                        hasAvailableRole = true; // No role requirements = anyone can register
                    } else {
                        // Check if staff has at least one role that matches shift requirements
                        for (ShiftRoleRequirement req : requirements) {
                            if (req.getRequired() && staffRoleIds.contains(req.getRoleId())) {
                                hasAvailableRole = true;
                                break; // Staff has at least one matching role
                            }
                        }
                    }
                    
                    // Set availability flags
                    response.setIsExpired(isExpired);
                    response.setIsFull(isFull);
                    response.setIsRegistered(alreadyRegistered);
                    response.setIsAvailable(!isExpired && !alreadyRegistered && !isFull && hasAvailableRole);
                    response.setAssignmentId(assignmentId);
                    
                    return response;
                })
                .collect(Collectors.toList());
    }

    /**
     * Staff self-register for a shift
     * Creates assignment with type = SELF_REGISTERED, status = PENDING (requires manager approval)
     */
    @Transactional
    public ShiftAssignmentResponse registerForShift(Integer shiftId, Integer staffUserId) {
        // Get shift
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_NOT_FOUND));

        // Business logic validations (specific to staff self-registration)
        // 1. Shift must be PUBLISHED (not DRAFT)
        if (!"PUBLISHED".equals(shift.getStatus())) {
            throw new AppException(ErrorCode.SHIFT_NOT_AVAILABLE, 
                "Shift is not published and cannot be registered");
        }

        // 2. Shift must not have started yet
        LocalDateTime shiftStart = shift.getShiftDate().atTime(shift.getStartTime());
        if (shiftStart.isBefore(LocalDateTime.now())) {
            throw new AppException(ErrorCode.SHIFT_NOT_AVAILABLE, 
                "Cannot register for a shift that has already started");
        }

        // 3. Staff must be in same branch
        StaffProfile staff = staffProfileRepository.findById(staffUserId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));
        if (!staff.getBranchId().equals(shift.getBranchId())) {
            throw new AppException(ErrorCode.SHIFT_NOT_AVAILABLE, 
                "You can only register for shifts in your branch");
        }

        // Use centralized validation service (strict: không cho phép hôm nay, không cho phép override role)
        shiftValidationService.validateStaffForShift(staffUserId, shift, false, false);

        // Create assignment (no role_id needed - staff will work with all their roles)
        ShiftAssignment assignment = ShiftAssignment.builder()
                .shift(shift)
                .staffUserId(staffUserId)
                .assignmentType("SELF_REGISTERED")
                .status("PENDING") // Requires manager approval
                .borrowedStaff(false)
                .assignedBy(staffUserId) // Self-registered
                .build();

        assignment = assignmentRepository.save(assignment);
        log.info("Staff {} registered for shift {} (assignment ID: {})", staffUserId, shiftId, assignment.getAssignmentId());

        // Notify manager about new registration
        try {
            shiftNotificationService.notifyManagerNewRegistration(assignment, shift, shift.getBranchId());
        } catch (Exception e) {
            log.error("Failed to send notification for new registration", e);
        }

        return toAssignmentResponse(assignment);
    }

    /**
     * Staff unregister from a shift (cancel self-registration)
     */
    @Transactional
    public void unregisterFromShift(Integer assignmentId, Integer staffUserId) {
        ShiftAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_ASSIGNMENT_NOT_FOUND));

        // Validate assignment belongs to staff
        if (!assignment.getStaffUserId().equals(staffUserId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "You can only unregister from your own assignments");
        }

        // Validate it's self-registered
        if (!"SELF_REGISTERED".equals(assignment.getAssignmentType())) {
            throw new AppException(ErrorCode.SHIFT_ASSIGNMENT_NOT_SELF_REGISTERED);
        }

        // Validate status allows unregistering
        if ("CONFIRMED".equals(assignment.getStatus()) || 
            "CHECKED_IN".equals(assignment.getStatus()) || 
            "CHECKED_OUT".equals(assignment.getStatus())) {
            throw new AppException(ErrorCode.SHIFT_ASSIGNMENT_ALREADY_CONFIRMED, 
                "Cannot unregister from a confirmed or completed assignment");
        }

        // Check if shift has started
        Shift shift = assignment.getShift();
        LocalDateTime shiftStart = shift.getShiftDate().atTime(shift.getStartTime());
        if (shiftStart.isBefore(LocalDateTime.now())) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 
                "Cannot unregister from a shift that has already started");
        }

        // Cancel assignment
        assignment.setStatus("CANCELLED");
        assignmentRepository.save(assignment);
        log.info("Staff {} unregistered from shift {} (assignment ID: {})", staffUserId, shift.getShiftId(), assignmentId);
        
        // Notify manager for real-time update (no toast notification needed)
        try {
            shiftNotificationService.notifyAssignmentUnregistered(assignment, shift, shift.getBranchId());
        } catch (Exception e) {
            log.error("Failed to send assignment unregistered update", e);
        }
    }


    // ========== Manager APIs ==========

    /**
     * Get assignments by shift ID
     */
    public List<ShiftAssignmentResponse> getAssignmentsByShift(Integer shiftId) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_NOT_FOUND));
        
        List<ShiftAssignment> assignments = assignmentRepository.findByShift(shift);
        LocalDate today = LocalDate.now();
        
        // Filter out:
        // 1. CANCELLED assignments that were self-cancelled by staff (not rejected by manager)
        // 2. Shifts that are in the past (only show today and future shifts)
        return assignments.stream()
                .filter(a -> {
                    // Show REJECTED assignments (CANCELLED with "Rejected by manager" in notes)
                    if ("CANCELLED".equals(a.getStatus())) {
                        String notes = a.getNotes();
                        return notes != null && notes.contains("Rejected by manager");
                    }
                    // Show all other non-CANCELLED assignments
                    return !"CANCELLED".equals(a.getStatus());
                })
                // Show today and future shifts (shiftDate >= today)
                .filter(a -> !shift.getShiftDate().isBefore(today))
                .map(this::toAssignmentResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get assignments by staff ID
     * For staff viewing their own schedule, show all assignments (today and future)
     * Only filter out past shifts and self-cancelled assignments
     */
    public List<ShiftAssignmentResponse> getAssignmentsByStaff(Integer staffUserId, LocalDate startDate, LocalDate endDate) {
        List<ShiftAssignment> assignments = assignmentRepository.findByStaffUserIdAndShift_ShiftDateBetween(
                staffUserId, startDate, endDate);
        LocalDate today = LocalDate.now();
        
        // Filter out:
        // 1. CANCELLED assignments that were self-cancelled by staff (not rejected by manager)
        // 2. Shifts that are in the past (show today and future shifts)
        return assignments.stream()
                .filter(a -> {
                    // Show REJECTED assignments (CANCELLED with "Rejected by manager" in notes)
                    if ("CANCELLED".equals(a.getStatus())) {
                        String notes = a.getNotes();
                        return notes != null && notes.contains("Rejected by manager");
                    }
                    // Show all other non-CANCELLED assignments
                    return !"CANCELLED".equals(a.getStatus());
                })
                .filter(a -> {
                    Shift shift = a.getShift();
                    // Show today and future shifts (not past)
                    return shift != null && !shift.getShiftDate().isBefore(today);
                })
                .map(this::toAssignmentResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get assignments by branch and date range (for manager)
     */
    public List<ShiftAssignmentResponse> getAssignmentsByBranchAndDateRange(
            Integer branchId, LocalDate startDate, LocalDate endDate, String status) {
        // Get all shifts in branch and date range
        List<Shift> shifts = shiftRepository.findByBranchIdAndShiftDateBetween(branchId, startDate, endDate);
        
        // Get all assignments for these shifts
        List<ShiftAssignment> allAssignments = new java.util.ArrayList<>();
        for (Shift shift : shifts) {
            List<ShiftAssignment> shiftAssignments = assignmentRepository.findByShift(shift);
            allAssignments.addAll(shiftAssignments);
        }
        
        LocalDate today = LocalDate.now();
        
        // Filter out:
        // 1. CANCELLED assignments that were self-cancelled by staff (not rejected by manager)
        // Note: For manager view, we show all shifts including past ones (for viewing purposes)
        allAssignments = allAssignments.stream()
                .filter(a -> {
                    // Show REJECTED assignments (CANCELLED with "Rejected by manager" in notes)
                    if ("CANCELLED".equals(a.getStatus())) {
                        String notes = a.getNotes();
                        return notes != null && notes.contains("Rejected by manager");
                    }
                    // Show all other non-CANCELLED assignments
                    return !"CANCELLED".equals(a.getStatus());
                })
                // Removed past date filter - manager can view past shifts
                .collect(Collectors.toList());
        
        // Filter by status if provided
        if (status != null && !status.isBlank()) {
            allAssignments = allAssignments.stream()
                    .filter(a -> status.equalsIgnoreCase(a.getStatus()))
                    .collect(Collectors.toList());
        }
        
        return allAssignments.stream()
                .map(this::toAssignmentResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get public branch schedule (chỉ tên nhân viên và giờ ca làm việc)
     * Tuân thủ business rules: không hiển thị thông tin nhạy cảm
     * Chỉ hiển thị assignments CONFIRMED, PENDING (để staff biết ai sẽ làm ca nào)
     * Filter theo employment type của nhân viên hiện tại (nếu có)
     */
    public List<BranchPublicScheduleResponse> getPublicBranchSchedule(
            Integer branchId, LocalDate startDate, LocalDate endDate, Integer currentStaffUserId) {
        // Get current staff's employment type (nếu có)
        String currentStaffEmploymentType = null;
        if (currentStaffUserId != null && currentStaffUserId > 0) {
            StaffProfile currentStaff = staffProfileRepository.findById(currentStaffUserId).orElse(null);
            if (currentStaff != null) {
                currentStaffEmploymentType = currentStaff.getEmploymentType();
            }
        }
        
        // Get all shifts in branch and date range
        List<Shift> shifts = shiftRepository.findByBranchIdAndShiftDateBetween(branchId, startDate, endDate);
        log.info("Found {} shifts in branch {} between {} and {}", shifts.size(), branchId, startDate, endDate);
        
        // Get all assignments for these shifts
        List<ShiftAssignment> allAssignments = new java.util.ArrayList<>();
        for (Shift shift : shifts) {
            List<ShiftAssignment> shiftAssignments = assignmentRepository.findByShift(shift);
            allAssignments.addAll(shiftAssignments);
        }
        log.info("Found {} total assignments before filtering", allAssignments.size());
        
        // Filter: chỉ hiển thị CONFIRMED và PENDING assignments (không hiển thị CANCELLED)
        int beforeStatusFilter = allAssignments.size();
        allAssignments = allAssignments.stream()
                .filter(a -> List.of("CONFIRMED", "PENDING").contains(a.getStatus()))
                .collect(Collectors.toList());
        log.info("After status filter (CONFIRMED/PENDING): {} assignments (removed {})", 
                allAssignments.size(), beforeStatusFilter - allAssignments.size());
        
        // Filter theo employment type của nhân viên hiện tại
        // Nếu nhân viên là PART_TIME, chỉ hiển thị ca của PART_TIME và ANY
        // Nếu nhân viên là FULL_TIME, chỉ hiển thị ca của FULL_TIME và ANY
        if (currentStaffEmploymentType != null && !"ANY".equals(currentStaffEmploymentType)) {
            log.info("Filtering by employment type: {}", currentStaffEmploymentType);
            final String finalEmploymentType = currentStaffEmploymentType;
            int beforeEmploymentFilter = allAssignments.size();
            allAssignments = allAssignments.stream()
                    .filter(assignment -> {
                        Shift shift = assignment.getShift();
                        if (shift == null) return false;
                        
                        String shiftEmploymentType = shift.getEmploymentType();
                        if (shiftEmploymentType == null && shift.getTemplate() != null) {
                            shiftEmploymentType = shift.getTemplate().getEmploymentType();
                        }
                        
                        // Hiển thị nếu shift là ANY hoặc match với employment type của nhân viên
                        boolean match = "ANY".equals(shiftEmploymentType) || finalEmploymentType.equals(shiftEmploymentType);
                        return match;
                    })
                    .collect(Collectors.toList());
        }
        
        // Get staff names - lấy tất cả staff trong branch trước
        List<StaffWithUserResponse> staffList = staffProfileService.getStaffsWithUserInfoByBranch(branchId);
        java.util.Map<Integer, String> staffNameMap = new java.util.HashMap<>();
        
        // Lấy danh sách unique staffUserId từ assignments trước
        java.util.Set<Integer> assignmentStaffUserIds = allAssignments.stream()
                .map(ShiftAssignment::getStaffUserId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        
        // Nếu getStaffsWithUserInfoByBranch fail hoặc không có fullname, fallback sang getUserById cho từng staff
        for (StaffWithUserResponse staff : staffList) {
            if (staff.getUserId() != null) {
                String fullname = staff.getFullname();
                
                // Nếu fullname null hoặc empty, thử lấy từ email hoặc dùng "Staff " + userId
                if (fullname == null || fullname.trim().isEmpty()) {
                    if (staff.getEmail() != null && !staff.getEmail().trim().isEmpty()) {
                        // Lấy phần trước @ của email
                        fullname = staff.getEmail().split("@")[0];
                    } else {
                        // Fallback: lấy từ auth-service trực tiếp
                        try {
                            com.service.profile.dto.response.UserResponse user = 
                                    authClient.getUserById(staff.getUserId()).getResult();
                            if (user != null && user.getFullname() != null && !user.getFullname().trim().isEmpty()) {
                                fullname = user.getFullname();
                            } else if (user != null && user.getEmail() != null && !user.getEmail().trim().isEmpty()) {
                                fullname = user.getEmail().split("@")[0];
                            } else {
                                fullname = "Staff " + staff.getUserId();
                            }
                        } catch (Exception e) {
                            fullname = "Staff " + staff.getUserId();
                        }
                    }
                }
                staffNameMap.put(staff.getUserId(), fullname);
            }
        }
        
        // Lấy thông tin staff còn thiếu (có thể staff đã chuyển branch nhưng vẫn có assignment)
        java.util.Set<Integer> missingStaffIds = new java.util.HashSet<>();
        for (Integer staffUserId : assignmentStaffUserIds) {
            if (!staffNameMap.containsKey(staffUserId)) {
                missingStaffIds.add(staffUserId);
            }
        }
        
        for (Integer staffUserId : missingStaffIds) {
            try {
                // Thử lấy từ StaffProfile trước
                StaffProfile staffProfile = staffProfileRepository.findById(staffUserId).orElse(null);
                if (staffProfile != null) {
                    // Lấy từ auth-service
                    try {
                        com.service.profile.dto.response.UserResponse user = 
                                authClient.getUserById(staffUserId).getResult();
                        if (user != null) {
                            if (user.getFullname() != null && !user.getFullname().trim().isEmpty()) {
                                staffNameMap.put(staffUserId, user.getFullname());
                            } else if (user.getEmail() != null && !user.getEmail().trim().isEmpty()) {
                                String emailPrefix = user.getEmail().split("@")[0];
                                staffNameMap.put(staffUserId, emailPrefix);
                            } else {
                                staffNameMap.put(staffUserId, "Staff " + staffUserId);
                            }
                        } else {
                            staffNameMap.put(staffUserId, "Staff " + staffUserId);
                        }
                    } catch (Exception e) {
                        staffNameMap.put(staffUserId, "Staff " + staffUserId);
                    }
                } else {
                    // Vẫn thử lấy từ auth-service
                    try {
                        com.service.profile.dto.response.UserResponse user = 
                                authClient.getUserById(staffUserId).getResult();
                        if (user != null && user.getFullname() != null && !user.getFullname().trim().isEmpty()) {
                            staffNameMap.put(staffUserId, user.getFullname());
                        } else {
                            staffNameMap.put(staffUserId, "Staff " + staffUserId);
                        }
                    } catch (Exception e) {
                        staffNameMap.put(staffUserId, "Staff " + staffUserId);
                    }
                }
            } catch (Exception e) {
                staffNameMap.put(staffUserId, "Staff " + staffUserId);
            }
        }
        
        // Map to public schedule response
        return allAssignments.stream()
                .map(assignment -> {
                    Shift shift = assignment.getShift();
                    if (shift == null) return null;
                    
                    String staffName = staffNameMap.getOrDefault(assignment.getStaffUserId(), 
                            "Staff " + assignment.getStaffUserId());
                    
                    return BranchPublicScheduleResponse.builder()
                            .shiftDate(shift.getShiftDate().toString())
                            .startTime(shift.getStartTime().toString().substring(0, 5)) // HH:mm
                            .endTime(shift.getEndTime().toString().substring(0, 5)) // HH:mm
                            .staffName(staffName)
                            .staffUserId(assignment.getStaffUserId())
                            .shiftId(shift.getShiftId())
                            .assignmentId(assignment.getAssignmentId())
                            .build();
                })
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
    }

    /**
     * Manager approve assignment (change status from PENDING to CONFIRMED)
     */
    @Transactional
    public ShiftAssignmentResponse approveAssignment(Integer assignmentId, Integer managerUserId) {
        ShiftAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_ASSIGNMENT_NOT_FOUND));

        // Validate assignment is in PENDING status
        if (!"PENDING".equals(assignment.getStatus())) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 
                "Only PENDING assignments can be approved");
        }

        // Update status to CONFIRMED
        assignment.setStatus("CONFIRMED");
        assignment.setAssignedBy(managerUserId); // Update assigned_by to manager who approved
        assignment = assignmentRepository.save(assignment);
        
        log.info("Manager {} approved assignment {} for shift {}", 
                managerUserId, assignmentId, assignment.getShift().getShiftId());
        
        // Notify staff about approval
        try {
            shiftNotificationService.notifyAssignmentApproved(assignment, assignment.getShift(), assignment.getShift().getBranchId());
        } catch (Exception e) {
            log.error("Failed to send notification for assignment approval", e);
        }
        
        return toAssignmentResponse(assignment);
    }

    /**
     * Manager reject assignment (change status to CANCELLED)
     */
    @Transactional
    public ShiftAssignmentResponse rejectAssignment(Integer assignmentId, Integer managerUserId, String reason) {
        ShiftAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_ASSIGNMENT_NOT_FOUND));

        // Validate assignment is in PENDING status
        if (!"PENDING".equals(assignment.getStatus())) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 
                "Only PENDING assignments can be rejected");
        }

        // Update status to CANCELLED
        assignment.setStatus("CANCELLED");
        if (reason != null && !reason.isBlank()) {
            assignment.setNotes((assignment.getNotes() != null ? assignment.getNotes() + "\n" : "") + 
                    "Rejected by manager. Reason: " + reason);
        }
        assignment = assignmentRepository.save(assignment);
        
        log.info("Manager {} rejected assignment {} for shift {}", 
                managerUserId, assignmentId, assignment.getShift().getShiftId());
        
        // Notify staff about rejection
        try {
            shiftNotificationService.notifyAssignmentRejected(assignment, assignment.getShift(), assignment.getShift().getBranchId());
        } catch (Exception e) {
            log.error("Failed to send notification for assignment rejection", e);
        }
        
        return toAssignmentResponse(assignment);
    }

    /**
     * Manager manually create assignment
     * @param overrideReason Optional reason for overriding role requirements (required if staff doesn't have required role)
     * @param capacityOverrideReason Optional reason for overriding capacity limit (required if exceeding maxStaffAllowed)
     */
    @Transactional
    public ShiftAssignmentResponse createAssignment(
            Integer shiftId, Integer staffUserId, Integer managerUserId, 
            String overrideReason, String capacityOverrideReason) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_NOT_FOUND));

        // Get staff profile
        StaffProfile staff = staffProfileRepository.findById(staffUserId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));

        // Validate staff belongs to same branch
        if (!staff.getBranchId().equals(shift.getBranchId())) {
            throw new AppException(ErrorCode.SHIFT_NOT_AVAILABLE, 
                "Staff must belong to the same branch as the shift");
        }

        // Check capacity and validate override if needed
        if (shift.getMaxStaffAllowed() != null) {
            long currentCount = assignmentRepository.findByShift(shift).stream()
                    .filter(a -> !"CANCELLED".equals(a.getStatus()))
                    .count();
            boolean alreadyAssigned = assignmentRepository.findByShift(shift).stream()
                    .anyMatch(a -> a.getStaffUserId().equals(staffUserId) && !"CANCELLED".equals(a.getStatus()));
            
            if (!alreadyAssigned && currentCount >= shift.getMaxStaffAllowed()) {
                // Check if exceeding 20% limit
                int maxAllowedWithOverride = (int) Math.ceil(shift.getMaxStaffAllowed() * 1.20); // 20% over
                if (currentCount >= maxAllowedWithOverride) {
                    throw new AppException(ErrorCode.VALIDATION_FAILED,
                        String.format("Cannot exceed capacity limit. Maximum allowed with override: %d (20%% over %d)", 
                                maxAllowedWithOverride, shift.getMaxStaffAllowed()));
                }
                
                // Capacity override reason is mandatory when exceeding capacity
                if (capacityOverrideReason == null || capacityOverrideReason.trim().isEmpty()) {
                    throw new AppException(ErrorCode.VALIDATION_FAILED,
                        "Capacity override reason is required when assigning staff beyond the maximum capacity limit");
                }
            }
        }

        // Check if staff has required role
        boolean hasRequiredRole = checkStaffHasRequiredRole(staff, shift);
        
        // If staff doesn't have required role, overrideReason is mandatory
        if (!hasRequiredRole) {
            if (overrideReason == null || overrideReason.trim().isEmpty()) {
                throw new AppException(ErrorCode.VALIDATION_FAILED,
                    "Override reason is required when assigning staff without required role for this shift");
            }
        }

        // Use centralized validation service (manager can override role requirements and capacity)
        // allowToday = true để cho phép gán ca trong ngày (sẽ bị chặn nếu ca đã kết thúc)
        // Skip capacity validation since we already handled it above
        shiftValidationService.validateStaffForShift(staffUserId, shift, true, true, true);

        // Build notes with override reasons if provided
        StringBuilder notesBuilder = new StringBuilder();
        if (overrideReason != null && !overrideReason.trim().isEmpty()) {
            notesBuilder.append("Manager override (role): ").append(overrideReason.trim());
        }
        if (capacityOverrideReason != null && !capacityOverrideReason.trim().isEmpty()) {
            if (notesBuilder.length() > 0) {
                notesBuilder.append(" | ");
            }
            notesBuilder.append("Manager override (capacity): ").append(capacityOverrideReason.trim());
        }
        String notes = notesBuilder.length() > 0 ? notesBuilder.toString() : null;

        // Determine initial status:
        // - If manager assigns while the shift is currently in progress today,
        //   treat it as already checked-in (CHECKED_IN) to avoid missing check-in window.
        // - Otherwise, keep CONFIRMED (will require normal check-in flow).
        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime shiftStart = shift.getShiftDate().atTime(shift.getStartTime());
        LocalDateTime shiftEnd = shift.getShiftDate().atTime(shift.getEndTime());
        if (shift.getEndTime().isBefore(shift.getStartTime())) {
            shiftEnd = shiftEnd.plusDays(1);
        }

        boolean isToday = shift.getShiftDate().equals(today);
        boolean isDuringShift = isToday && !now.isBefore(shiftStart) && !now.isAfter(shiftEnd);

        String initialStatus = isDuringShift ? "CHECKED_IN" : "CONFIRMED";
        LocalDateTime initialCheckedInAt = isDuringShift ? now : null;

        // Create assignment (status depends on whether we're already inside the shift window)
        // No role_id needed - staff will work with all their roles
        ShiftAssignment assignment = ShiftAssignment.builder()
                .shift(shift)
                .staffUserId(staffUserId)
                .assignmentType("MANUAL")
                .status(initialStatus)
                .borrowedStaff(false)
                .assignedBy(managerUserId)
                .checkedInAt(initialCheckedInAt)
                .notes(notes)
                .build();

        assignment = assignmentRepository.save(assignment);
        log.info("Manager {} manually assigned staff {} to shift {} (overrideReason: {})", 
                managerUserId, staffUserId, shiftId, overrideReason != null ? "provided" : "none");
        
        // Notify staff about new assignment
        try {
            shiftNotificationService.notifyAssignmentCreated(assignment, shift, shift.getBranchId());
        } catch (Exception e) {
            log.error("Failed to send notification for new assignment", e);
        }
        
        return toAssignmentResponse(assignment);
    }

    /**
     * Check if staff has at least one required role for the shift
     */
    private boolean checkStaffHasRequiredRole(StaffProfile staff, Shift shift) {
        List<ShiftRoleRequirement> requirements = shiftRoleRequirementRepository.findByShift(shift);
        
        if (requirements.isEmpty()) {
            return true; // No role requirements
        }

        List<Integer> staffRoleIds = staffRoleAssignmentRepository.findByStaffProfile(staff).stream()
                .map(StaffRoleAssignment::getRoleId)
                .collect(Collectors.toList());

        if (staffRoleIds.isEmpty()) {
            return false; // Staff has no roles
        }

        // Check if staff has at least one required role
        return requirements.stream()
                .filter(req -> req.getRequired() == null || req.getRequired())
                .anyMatch(req -> staffRoleIds.contains(req.getRoleId()));
    }

    /**
     * Manager update assignment
     * Note: Since role_id is removed, this method is kept for backward compatibility
     * but doesn't update role anymore (staff works with all their roles)
     */
    @Transactional
    public ShiftAssignmentResponse updateAssignment(
            Integer assignmentId, Integer managerUserId) {
        ShiftAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_ASSIGNMENT_NOT_FOUND));

        // Only allow updating for PENDING or CONFIRMED assignments
        if (!"PENDING".equals(assignment.getStatus()) && !"CONFIRMED".equals(assignment.getStatus())) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 
                "Cannot update assignment that is already checked in or completed");
        }

        assignment.setAssignedBy(managerUserId);
        assignment = assignmentRepository.save(assignment);
        
        log.info("Manager {} updated assignment {}", managerUserId, assignmentId);
        
        return toAssignmentResponse(assignment);
    }

    /**
     * Manager delete assignment
     * Constraints:
     * 1. Only PENDING or CONFIRMED assignments can be deleted
     * 2. Cannot delete if assignment is CHECKED_IN or CHECKED_OUT (staff has already worked)
     * 3. Cannot delete if shift has already started
     */
    @Transactional
    public void deleteAssignment(Integer assignmentId, Integer managerUserId) {
        ShiftAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_ASSIGNMENT_NOT_FOUND));

        String status = assignment.getStatus();
        
        // Constraint 1 & 2: Check status - cannot delete if already checked in or checked out
        if ("CHECKED_IN".equals(status)) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 
                "Cannot delete assignment that is already checked in. Staff has started working.");
        }
        
        if ("CHECKED_OUT".equals(status)) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 
                "Cannot delete assignment that is already checked out. Staff has completed the shift.");
        }
        
        // Only allow deleting PENDING or CONFIRMED assignments
        if (!"PENDING".equals(status) && !"CONFIRMED".equals(status)) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 
                "Cannot delete assignment with status: " + status + ". Only PENDING or CONFIRMED assignments can be deleted.");
        }

        // Constraint 3: Check if shift has started
        Shift shift = assignment.getShift();
        if (shift == null) {
            throw new AppException(ErrorCode.SHIFT_NOT_FOUND, 
                "Shift not found for assignment");
        }
        
        LocalDateTime shiftStart = shift.getShiftDate().atTime(shift.getStartTime());
        LocalDateTime now = LocalDateTime.now();
        if (shiftStart.isBefore(now) || shiftStart.isEqual(now)) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 
                "Cannot delete assignment for a shift that has already started. Shift start time: " + 
                shift.getShiftDate() + " " + shift.getStartTime());
        }

        // Save info before deletion for notification
        Integer staffUserId = assignment.getStaffUserId();
        Integer branchId = shift.getBranchId();
        
        // Cleanup related shift requests to avoid FK violations
        List<ShiftRequest> relatedRequests = shiftRequestRepository.findByAssignment(assignment);
        if (!relatedRequests.isEmpty()) {
            shiftRequestRepository.deleteAll(relatedRequests);
            log.info("Deleted {} shift requests for assignment {}", relatedRequests.size(), assignmentId);
        }
        
        assignmentRepository.delete(assignment);
        log.info("Manager {} deleted assignment {} for shift {} (status: {})", 
                managerUserId, assignmentId, shift.getShiftId(), status);
        
        // Notify staff about deletion (create a temporary assignment object for notification)
        try {
            ShiftAssignment tempAssignment = ShiftAssignment.builder()
                    .assignmentId(assignmentId)
                    .staffUserId(staffUserId)
                    .shift(shift)
                    .status(status)
                    .build();
            shiftNotificationService.notifyAssignmentDeleted(tempAssignment, shift, branchId);
        } catch (Exception e) {
            log.error("Failed to send notification for assignment deletion", e);
        }
    }


    /**
     * Check if staff has an assignment with a shift (excluding CANCELLED)
     */
    public boolean hasAssignmentForShift(Integer staffUserId, Integer shiftId) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_NOT_FOUND));
        
        return assignmentRepository.existsByShiftAndStaffUserIdAndStatusNot(
                shift, staffUserId, "CANCELLED");
    }

    /**
     * Get all staff for a shift with availability info and conflict reasons
     * Used by manager to assign staff to shifts
     * Returns all staff (available and unavailable) with conflict reasons
     */
    public List<AvailableStaffForShiftResponse> getAvailableStaffForShift(Integer shiftId) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_NOT_FOUND));

        // Get all staff in the branch
        List<StaffWithUserResponse> allStaff = staffProfileService.getStaffsWithUserInfoByBranch(shift.getBranchId());

        // Determine required employment type for this shift (FULL_TIME, PART_TIME, CASUAL, ANY)
        String requiredEmploymentType = shift.getEmploymentType();
        if (requiredEmploymentType == null && shift.getTemplate() != null) {
            requiredEmploymentType = shift.getTemplate().getEmploymentType();
        }
        if (requiredEmploymentType == null) {
            requiredEmploymentType = "ANY";
        }
        final String finalRequiredEmploymentType = requiredEmploymentType;

        // Get already assigned staff IDs
        List<Integer> assignedStaffIds = assignmentRepository.findByShift(shift).stream()
                .filter(a -> !"CANCELLED".equals(a.getStatus()))
                .map(ShiftAssignment::getStaffUserId)
                .collect(Collectors.toList());

        // Calculate remaining slots
        int currentStaffCount = assignedStaffIds.size();
        int maxStaffAllowed = shift.getMaxStaffAllowed() != null ? shift.getMaxStaffAllowed() : Integer.MAX_VALUE;
        int remainingSlots = Math.max(0, maxStaffAllowed - currentStaffCount);

        // Check each staff and return with availability info
        return allStaff.stream()
                // Filter by employment type: only staff with matching employmentType (or ANY) are returned
                .filter(staff -> {
                    if ("ANY".equalsIgnoreCase(finalRequiredEmploymentType)) {
                        return true;
                    }
                    String staffEmploymentType = staff.getEmploymentType();
                    return staffEmploymentType != null && finalRequiredEmploymentType.equalsIgnoreCase(staffEmploymentType);
                })
                .map(staff -> {
                    String conflictReason = null;
                    boolean isAvailable = true;

                    // 1. Check if already assigned (business logic riêng)
                    if (assignedStaffIds.contains(staff.getUserId())) {
                        isAvailable = false;
                        conflictReason = "Already assigned to this shift";
                    }

                    // 2. Use centralized validation service (manager can override role requirements)
                    if (isAvailable) {
                        // allowToday = true để cho phép gán ca trong ngày,
                        // nhưng ShiftValidationService sẽ chặn nếu ca đã kết thúc.
                        conflictReason = shiftValidationService.validateStaffForShiftWithReason(
                                staff.getUserId(), shift, true, true);
                        if (conflictReason != null) {
                            isAvailable = false;
                        }
                    }

                    return AvailableStaffForShiftResponse.builder()
                            .staff(staff)
                            .isAvailable(isAvailable)
                            .conflictReason(conflictReason)
                            .remainingSlots(remainingSlots)
                            .build();
                })
                .collect(Collectors.toList());
    }


    private ShiftAssignmentResponse toAssignmentResponse(ShiftAssignment assignment) {
        ShiftAssignmentResponse resp = new ShiftAssignmentResponse();
        resp.setAssignmentId(assignment.getAssignmentId());
        resp.setShiftId(assignment.getShift().getShiftId());
        resp.setStaffUserId(assignment.getStaffUserId());
        // roleId removed - staff works with all their roles
        resp.setAssignmentType(assignment.getAssignmentType());
        resp.setStatus(assignment.getStatus());
        resp.setBorrowedStaff(assignment.getBorrowedStaff());
        resp.setStaffBaseBranchId(assignment.getStaffBaseBranchId());
        resp.setCheckedInAt(assignment.getCheckedInAt());
        resp.setCheckedOutAt(assignment.getCheckedOutAt());
        resp.setActualHours(assignment.getActualHours());
        resp.setNotes(assignment.getNotes());
        resp.setCreateAt(assignment.getCreateAt());
        return resp;
    }

    // ========== Staff Check-in/Check-out APIs ==========

    /**
     * Staff check in for a shift
     * Validations:
     * 1. Assignment exists and belongs to staff
     * 2. Status is CONFIRMED or PENDING
     * 3. Not already checked in or checked out
     * 4. Time is within check-in window (15 minutes before/after shift start)
     * 5. Shift exists and is not cancelled
     */
    @Transactional
    public ShiftAssignmentResponse checkIn(Integer assignmentId, Integer staffUserId) {
        // 1. Get assignment
        ShiftAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_ASSIGNMENT_NOT_FOUND, 
                        "Assignment not found"));

        // 2. Validate assignment belongs to staff
        if (!assignment.getStaffUserId().equals(staffUserId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, 
                    "You can only check in for your own assignments");
        }

        // 3. Validate status
        String status = assignment.getStatus();
        if ("CHECKED_IN".equals(status)) {
            throw new AppException(ErrorCode.SHIFT_CHECKIN_ALREADY_CHECKED_IN,
                    "You have already checked in for this shift");
        }
        if ("CHECKED_OUT".equals(status)) {
            throw new AppException(ErrorCode.SHIFT_CHECKIN_ALREADY_CHECKED_OUT,
                    "Cannot check in. You have already checked out");
        }
        if ("CANCELLED".equals(status)) {
            throw new AppException(ErrorCode.VALIDATION_FAILED,
                    "Cannot check in. Assignment has been cancelled");
        }
        if (!"CONFIRMED".equals(status) && !"PENDING".equals(status)) {
            throw new AppException(ErrorCode.SHIFT_CHECKIN_INVALID_STATUS,
                    "Can only check in for CONFIRMED or PENDING assignments. Current status: " + status);
        }

        // 4. Get shift and validate
        Shift shift = assignment.getShift();
        if (shift == null) {
            throw new AppException(ErrorCode.SHIFT_NOT_FOUND, 
                    "Shift not found for assignment");
        }
        if ("CANCELLED".equals(shift.getStatus())) {
            throw new AppException(ErrorCode.SHIFT_NOT_AVAILABLE,
                    "Cannot check in. Shift has been cancelled");
        }

        // 5. Validate time window (15 minutes before shift start to 10 minutes before shift end)
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime shiftStart = shift.getShiftDate().atTime(shift.getStartTime());
        LocalDateTime shiftEnd = shift.getShiftDate().atTime(shift.getEndTime());
        
        // If shift spans midnight, adjust end time
        if (shift.getEndTime().isBefore(shift.getStartTime())) {
            shiftEnd = shiftEnd.plusDays(1);
        }

        // Check if shift date is in the future
        if (shift.getShiftDate().isAfter(LocalDate.now())) {
            throw new AppException(ErrorCode.SHIFT_CHECKIN_SHIFT_NOT_STARTED,
                    "Cannot check in. Shift date is in the future");
        }

        // Check-in window: 15 minutes before shift start to 10 minutes before shift end
        LocalDateTime checkInWindowStart = shiftStart.minusMinutes(15);
        LocalDateTime checkInWindowEnd = shiftEnd.minusMinutes(10);

        if (now.isBefore(checkInWindowStart)) {
            throw new AppException(ErrorCode.SHIFT_CHECKIN_TOO_EARLY,
                    "Cannot check in. Too early. Check-in window opens 15 minutes before shift start");
        }
        if (now.isAfter(checkInWindowEnd)) {
            throw new AppException(ErrorCode.SHIFT_CHECKIN_TOO_LATE,
                    "Cannot check in. Too late. Check-in window closed 10 minutes before shift end");
        }

        // 6. Update assignment
        assignment.setStatus("CHECKED_IN");
        assignment.setCheckedInAt(now);
        assignment = assignmentRepository.save(assignment);

        log.info("Staff {} checked in for assignment {} (shift {})", 
                staffUserId, assignmentId, shift.getShiftId());

        // Notify staff and manager about check-in
        try {
            shiftNotificationService.notifyAssignmentCheckedIn(assignment, shift, shift.getBranchId());
        } catch (Exception e) {
            log.error("Failed to send notification for check-in", e);
        }

        return toAssignmentResponse(assignment);
    }

    /**
     * Staff check out from a shift
     * Validations:
     * 1. Assignment exists and belongs to staff
     * 2. Status is CHECKED_IN
     * 3. Not already checked out
     * 4. Time is within check-out window (5 minutes before shift end, or after)
     * 5. Calculate actual_hours
     */
    @Transactional
    public ShiftAssignmentResponse checkOut(Integer assignmentId, Integer staffUserId) {
        // 1. Get assignment
        ShiftAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_ASSIGNMENT_NOT_FOUND, 
                        "Assignment not found"));

        // 2. Validate assignment belongs to staff
        if (!assignment.getStaffUserId().equals(staffUserId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, 
                    "You can only check out for your own assignments");
        }

        // 3. Validate status
        String status = assignment.getStatus();
        if ("CHECKED_OUT".equals(status)) {
            throw new AppException(ErrorCode.SHIFT_CHECKOUT_ALREADY_CHECKED_OUT,
                    "You have already checked out for this shift");
        }
        if (!"CHECKED_IN".equals(status)) {
            throw new AppException(ErrorCode.SHIFT_CHECKOUT_NOT_CHECKED_IN,
                    "Cannot check out. You must check in first. Current status: " + status);
        }
        if ("CANCELLED".equals(status)) {
            throw new AppException(ErrorCode.VALIDATION_FAILED,
                    "Cannot check out. Assignment has been cancelled");
        }

        // 4. Validate check-in time exists
        if (assignment.getCheckedInAt() == null) {
            throw new AppException(ErrorCode.SHIFT_CHECKOUT_MISSING_CHECKIN_TIME,
                    "Cannot check out. Check-in time is missing");
        }

        // 5. Get shift and validate
        Shift shift = assignment.getShift();
        if (shift == null) {
            throw new AppException(ErrorCode.SHIFT_NOT_FOUND, 
                    "Shift not found for assignment");
        }
        if ("CANCELLED".equals(shift.getStatus())) {
            throw new AppException(ErrorCode.SHIFT_NOT_AVAILABLE,
                    "Cannot check out. Shift has been cancelled");
        }

        // 6. Validate time window (5 minutes before shift end, or after)
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime shiftEnd = shift.getShiftDate().atTime(shift.getEndTime());
        
        // If shift spans midnight, adjust end time
        if (shift.getEndTime().isBefore(shift.getStartTime())) {
            shiftEnd = shiftEnd.plusDays(1);
        }

        // Check-out window: 5 minutes before shift end, or after
        LocalDateTime checkOutWindowStart = shiftEnd.minusMinutes(5);
        
        if (now.isBefore(checkOutWindowStart)) {
            throw new AppException(ErrorCode.SHIFT_CHECKOUT_TOO_EARLY,
                    "Cannot check out. Too early. Check-out window opens 5 minutes before shift end");
        }
        // Allow check-out after shift end (late check-out)

        // 7. Calculate actual hours
        LocalDateTime checkedInAt = assignment.getCheckedInAt();
        if (checkedInAt == null) {
            throw new AppException(ErrorCode.SHIFT_CHECKOUT_MISSING_CHECKIN_TIME,
                    "Cannot check out. Check-in time is missing");
        }

        // Validate check-out time is after check-in time
        if (now.isBefore(checkedInAt)) {
            throw new AppException(ErrorCode.SHIFT_CHECKOUT_INVALID_TIME_RANGE,
                    "Invalid time range. Check-out time must be after check-in time");
        }

        // Calculate hours (in decimal, e.g., 8.5 hours)
        long minutesBetween = java.time.Duration.between(checkedInAt, now).toMinutes();
        java.math.BigDecimal actualHours = java.math.BigDecimal.valueOf(minutesBetween)
                .divide(java.math.BigDecimal.valueOf(60), 2, java.math.RoundingMode.HALF_UP);

        // Validate actual hours is reasonable (not negative, not too large)
        if (actualHours.compareTo(java.math.BigDecimal.ZERO) < 0) {
            throw new AppException(ErrorCode.SHIFT_CHECKOUT_INVALID_HOURS,
                    "Invalid hours calculated. Please contact manager");
        }
        if (actualHours.compareTo(java.math.BigDecimal.valueOf(24)) > 0) {
            log.warn("Staff {} checked out with unusually long hours: {} for assignment {}", 
                    staffUserId, actualHours, assignmentId);
            // Still allow but log warning
        }

        // 7.5. Nếu assignment đang là NO_SHOW, tự động hủy penalty tương ứng
        String oldStatus = assignment.getStatus();
        if ("NO_SHOW".equals(oldStatus)) {
            try {
                penaltyService.cancelAutoPenalty(staffUserId, shift.getShiftId());
                log.info("Cancelled auto penalty for assignment {} (NO_SHOW → CHECKED_OUT)", assignmentId);
            } catch (Exception e) {
                log.warn("Failed to cancel auto penalty for assignment {}: {}", assignmentId, e.getMessage());
                // Không throw exception, tiếp tục với check-out
            }
        }

        // 8. Update assignment
        assignment.setStatus("CHECKED_OUT");
        assignment.setCheckedOutAt(now);
        assignment.setActualHours(actualHours);
        assignment = assignmentRepository.save(assignment);

        log.info("Staff {} checked out for assignment {} (shift {}). Actual hours: {}", 
                staffUserId, assignmentId, shift.getShiftId(), actualHours);

        // Notify staff and manager about check-out
        try {
            shiftNotificationService.notifyAssignmentCheckedOut(assignment, shift, shift.getBranchId());
        } catch (Exception e) {
            log.error("Failed to send notification for check-out", e);
        }

        return toAssignmentResponse(assignment);
    }

    /**
     * Manager manually mark assignment as NO_SHOW
     */
    @Transactional
    public ShiftAssignmentResponse markAsNoShow(Integer assignmentId, Integer managerUserId) {
        ShiftAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_ASSIGNMENT_NOT_FOUND));

        // Validate assignment is in CONFIRMED or CHECKED_IN status
        String currentStatus = assignment.getStatus();
        if (!"CONFIRMED".equals(currentStatus) && !"CHECKED_IN".equals(currentStatus)) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 
                "Cannot mark as NO_SHOW. Assignment must be in CONFIRMED or CHECKED_IN status");
        }

        // Validate payroll chưa được APPROVED
        Shift shift = assignment.getShift();
        if (shift == null) {
            throw new AppException(ErrorCode.SHIFT_NOT_FOUND);
        }

        String period = java.time.YearMonth.from(shift.getShiftDate()).toString();
        // Check if payroll đã APPROVED
        java.util.Optional<com.service.profile.entity.Payroll> payrollOpt = 
            payrollRepository.findByUserIdAndPeriod(assignment.getStaffUserId(), period);
        
        if (payrollOpt.isPresent()) {
            com.service.profile.entity.Payroll payroll = payrollOpt.get();
            if (payroll.getStatus() == com.service.profile.entity.Payroll.PayrollStatus.APPROVED ||
                payroll.getStatus() == com.service.profile.entity.Payroll.PayrollStatus.PAID) {
                throw new AppException(ErrorCode.PAYROLL_ALREADY_APPROVED, 
                    "Cannot mark as NO_SHOW. Payroll for this period has already been approved");
            }
        }

        // Update status to NO_SHOW
        assignment.setStatus("NO_SHOW");
        String existingNotes = assignment.getNotes() != null ? assignment.getNotes() : "";
        assignment.setNotes(existingNotes + (existingNotes.isEmpty() ? "" : "\n") +
                "Marked as NO_SHOW by manager " + managerUserId + " at " + java.time.LocalDateTime.now());
        assignment = assignmentRepository.save(assignment);

        log.info("Manager {} marked assignment {} as NO_SHOW for shift {}", 
                managerUserId, assignmentId, shift.getShiftId());

        // Publish StaffAbsentEvent để tự động tạo penalty
        publishStaffAbsentEvent(assignment, shift, managerUserId);

        return toAssignmentResponse(assignment);
    }

    /**
     * Publish StaffAbsentEvent khi set NO_SHOW
     */
    private void publishStaffAbsentEvent(ShiftAssignment assignment, Shift shift, Integer managerUserId) {
        try {
            String period = java.time.YearMonth.from(shift.getShiftDate()).toString(); // Format: YYYY-MM
            
            com.service.profile.event.StaffAbsentEvent event = com.service.profile.event.StaffAbsentEvent.builder()
                .userId(assignment.getStaffUserId())
                .shiftId(shift.getShiftId())
                .branchId(shift.getBranchId())
                .shiftDate(shift.getShiftDate())
                .period(period)
                .managerUserId(managerUserId)
                .build();
            
            eventPublisher.publishEvent(event);
            log.info("Published StaffAbsentEvent for userId={}, shiftId={}", 
                assignment.getStaffUserId(), shift.getShiftId());
        } catch (Exception e) {
            log.error("Failed to publish StaffAbsentEvent for assignmentId={}", 
                assignment.getAssignmentId(), e);
            // Không throw exception để không ảnh hưởng đến flow chính
        }
    }

    /**
     * Get active shift assignment for a staff member
     * Active means: status = CHECKED_IN and current time is within shift time window
     * 
     * @param staffUserId Staff user ID
     * @return ShiftAssignmentResponse if staff is in an active shift, null otherwise
     */
    public ShiftAssignmentResponse getActiveShiftAssignment(Integer staffUserId) {
        // Find all CHECKED_IN assignments for this staff
        List<ShiftAssignment> checkedInAssignments = assignmentRepository.findByStaffUserIdAndStatus(
                staffUserId, "CHECKED_IN");
        
        if (checkedInAssignments.isEmpty()) {
            return null;
        }
        
        LocalDateTime now = LocalDateTime.now();
        
        // Find the assignment where current time is within shift time window
        for (ShiftAssignment assignment : checkedInAssignments) {
            Shift shift = assignment.getShift();
            if (shift == null) {
                continue;
            }
            
            LocalDateTime shiftStart = shift.getShiftDate().atTime(shift.getStartTime());
            LocalDateTime shiftEnd = shift.getShiftDate().atTime(shift.getEndTime());
            
            // If shift spans midnight, adjust end time
            if (shift.getEndTime().isBefore(shift.getStartTime())) {
                shiftEnd = shiftEnd.plusDays(1);
            }
            
            // Check if current time is within shift time window
            if (!now.isBefore(shiftStart) && !now.isAfter(shiftEnd)) {
                return toAssignmentResponse(assignment);
            }
        }
        
        return null;
    }
}

