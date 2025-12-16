package com.service.profile.service;

import com.service.profile.dto.request.ShiftRequestCreationRequest;
import com.service.profile.dto.response.ShiftRequestResponse;
import com.service.profile.entity.*;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.repository.*;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ShiftRequestService {

    ShiftRequestRepository shiftRequestRepository;
    ShiftAssignmentRepository assignmentRepository;
    ShiftRepository shiftRepository;
    StaffProfileRepository staffProfileRepository;
    ShiftValidationService shiftValidationService;
    ShiftRequestConflictService conflictService;
    ShiftNotificationService shiftNotificationService; // For sending notifications

    /**
     * Create a shift request (SWAP, PICK_UP, TWO_WAY_SWAP, LEAVE, or OVERTIME)
     */
    @Transactional
    public ShiftRequestResponse createRequest(ShiftRequestCreationRequest request, Integer staffUserId) {
        // Validate request type
        if (!List.of("SWAP", "PICK_UP", "TWO_WAY_SWAP", "LEAVE", "OVERTIME").contains(request.getRequestType())) {
            throw new AppException(ErrorCode.SHIFT_REQUEST_INVALID_TYPE);
        }

        ShiftAssignment assignment = null;
        Shift shift = null;

        // OVERTIME: can use shiftId instead of assignmentId (xin làm ca mới)
        if ("OVERTIME".equals(request.getRequestType())) {
            if (request.getShiftId() == null) {
                throw new AppException(ErrorCode.SHIFT_NOT_FOUND, "Shift ID is required for OVERTIME request");
            }
            shift = shiftRepository.findById(request.getShiftId())
                    .orElseThrow(() -> new AppException(ErrorCode.SHIFT_NOT_FOUND, "Shift not found"));
            
            // Check if staff already has assignment for this shift
            List<ShiftAssignment> existingAssignments = assignmentRepository.findByShift(shift);
            assignment = existingAssignments.stream()
                    .filter(a -> a.getStaffUserId().equals(staffUserId) && !"CANCELLED".equals(a.getStatus()))
                    .findFirst()
                    .orElse(null);
            
            // If no assignment exists, validate before creating temporary assignment
            if (assignment == null) {
                // Validate overtime limits early so staff knows immediately if request is invalid
                // This uses the same validation as manager approval (12h/day, 52h/week)
                shiftValidationService.validateStaffForOvertimeShift(staffUserId, shift);
                
                // Create temporary assignment for OVERTIME request
                assignment = ShiftAssignment.builder()
                        .shift(shift)
                        .staffUserId(staffUserId)
                        .assignmentType("OVERTIME_REQUEST")
                        .status("OVERTIME_PENDING")
                        .borrowedStaff(false)
                        .assignedBy(staffUserId) // Self-requested, so staff is the assigner
                        .build();
                assignment = assignmentRepository.save(assignment);
            } else {
                throw new AppException(ErrorCode.SHIFT_ALREADY_REGISTERED,
                        "You already have an assignment for this shift");
            }
        } else {
            // Other request types require assignmentId
            if (request.getAssignmentId() == null) {
                throw new AppException(ErrorCode.SHIFT_NOT_FOUND, "Assignment ID is required");
            }
            assignment = assignmentRepository.findById(request.getAssignmentId())
                    .orElseThrow(() -> new AppException(ErrorCode.SHIFT_NOT_FOUND, "Assignment not found"));
            shift = assignment.getShift();
            
            // Re-validate assignment status (race condition protection)
            conflictService.validateAssignmentStatus(assignment, "creating request");
        }

        String initialStatus = "PENDING"; // Default status

        // Validate request type specific requirements
        if ("SWAP".equals(request.getRequestType())) {
            // SWAP: A có ca X → cho B ca X (B phải đồng ý)
            
            // Make assignment final for lambda
            final ShiftAssignment finalAssignment = assignment;
            
            // Group 1: Basic validations (independent, can run in parallel)
            List<CompletableFuture<Void>> basicValidations = new ArrayList<>();
            basicValidations.add(CompletableFuture.runAsync(() -> {
                if (!finalAssignment.getStaffUserId().equals(staffUserId)) {
                    throw new AppException(ErrorCode.SHIFT_REQUEST_ASSIGNMENT_NOT_OWNED);
                }
            }));
            basicValidations.add(CompletableFuture.runAsync(() -> {
                if (request.getTargetStaffUserId() == null) {
                    throw new AppException(ErrorCode.SHIFT_REQUEST_SWAP_TARGET_REQUIRED);
                }
            }));
            basicValidations.add(CompletableFuture.runAsync(() -> {
                if (request.getTargetStaffUserId() != null && request.getTargetStaffUserId().equals(staffUserId)) {
                    throw new AppException(ErrorCode.SHIFT_REQUEST_SWAP_TARGET_SAME_STAFF);
                }
            }));
            
            // Wait for basic validations (fail fast)
            for (CompletableFuture<Void> future : basicValidations) {
                try {
                    future.join();
                } catch (Exception e) {
                    Throwable cause = e;
                    if (e instanceof ExecutionException) {
                        cause = e.getCause();
                    }
                    if (cause instanceof AppException) {
                        throw (AppException) cause;
                    }
                    if (cause instanceof RuntimeException && cause.getCause() instanceof AppException) {
                        throw (AppException) cause.getCause();
                    }
                    throw new RuntimeException("Validation error", cause);
                }
            }
            
            // Group 2: Database-dependent validations (must run sequentially after basic validations)
            // Validate target staff exists and is in same branch
            StaffProfile targetStaff = staffProfileRepository.findById(request.getTargetStaffUserId())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND, "Target staff not found"));
            if (!targetStaff.getBranchId().equals(finalAssignment.getShift().getBranchId())) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_SWAP_TARGET_NOT_AVAILABLE,
                        "Target staff must be in the same branch");
            }
            
            // Validate target staff can receive this shift (time conflict, daily hours, role requirements, etc.)
            // This prevents creating requests that will definitely fail when manager approves
            // We use validateStaffForShiftWithReason to get a clear error message
            // Note: allowManagerOverride = false here because Manager hasn't approved yet
            // Manager can only override when approving the request, not when creating it
            String conflictReason = shiftValidationService.validateStaffForShiftWithReason(
                    request.getTargetStaffUserId(),
                    finalAssignment.getShift(),
                    false, // allowToday = false (strict)
                    false  // allowManagerOverride = false (strict validation - role must match)
            );
            if (conflictReason != null) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_SWAP_TARGET_NOT_AVAILABLE,
                        "Target staff cannot receive this shift: " + conflictReason);
            }
            
            // Check for circular request
            conflictService.checkCircularRequest(
                    request.getRequestType(),
                    assignment,
                    staffUserId,
                    request.getTargetStaffUserId()
            );
            
            // SWAP requires B's approval → PENDING_TARGET_APPROVAL
            initialStatus = "PENDING_TARGET_APPROVAL";

        } else if ("PICK_UP".equals(request.getRequestType())) {
            // PICK_UP: A không có ca → xin ca Y từ B (B phải đồng ý)
            if (request.getTargetStaffUserId() == null) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_SWAP_TARGET_REQUIRED);
            }
            // Validate assignment thuộc về target staff (B)
            if (!assignment.getStaffUserId().equals(request.getTargetStaffUserId())) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_PICK_UP_ASSIGNMENT_NOT_OWNED_BY_TARGET,
                        "Assignment must belong to target staff for PICK_UP request");
            }
            // Validate target staff exists and is in same branch
            StaffProfile targetStaff = staffProfileRepository.findById(request.getTargetStaffUserId())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND, "Target staff not found"));
            if (!targetStaff.getBranchId().equals(assignment.getShift().getBranchId())) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_SWAP_TARGET_NOT_AVAILABLE,
                        "Target staff must be in the same branch");
            }
            
            // Validate A (requesting staff) can receive this shift (time conflict, daily hours, role requirements, etc.)
            // Note: allowManagerOverride = false here because Manager hasn't approved yet
            String conflictReason = shiftValidationService.validateStaffForShiftWithReason(
                    staffUserId, // A (người xin ca)
                    assignment.getShift(),
                    false, // allowToday = false (strict)
                    false  // allowManagerOverride = false (strict validation - role must match)
            );
            if (conflictReason != null) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_SWAP_TARGET_NOT_AVAILABLE,
                        "You cannot pick up this shift: " + conflictReason);
            }
            
            // Check for circular request
            conflictService.checkCircularRequest(
                    request.getRequestType(),
                    assignment,
                    staffUserId,
                    request.getTargetStaffUserId()
            );
            
            // PICK_UP requires B's approval → PENDING_TARGET_APPROVAL
            initialStatus = "PENDING_TARGET_APPROVAL";

        } else if ("TWO_WAY_SWAP".equals(request.getRequestType())) {
            // TWO_WAY_SWAP: A có ca X, B có ca Y → đổi cho nhau (B phải đồng ý)
            if (!assignment.getStaffUserId().equals(staffUserId)) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_ASSIGNMENT_NOT_OWNED);
            }
            if (request.getTargetStaffUserId() == null) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_SWAP_TARGET_REQUIRED);
            }
            if (request.getTargetAssignmentId() == null) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_TWO_WAY_SWAP_TARGET_ASSIGNMENT_REQUIRED);
            }
            if (request.getTargetStaffUserId().equals(staffUserId)) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_SWAP_TARGET_SAME_STAFF);
            }
            // Validate target assignment exists and belongs to target staff
            ShiftAssignment targetAssignment = assignmentRepository.findById(request.getTargetAssignmentId())
                    .orElseThrow(() -> new AppException(ErrorCode.SHIFT_ASSIGNMENT_NOT_FOUND, "Target assignment not found"));
            if (!targetAssignment.getStaffUserId().equals(request.getTargetStaffUserId())) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_TWO_WAY_SWAP_TARGET_ASSIGNMENT_NOT_FOUND,
                        "Target assignment must belong to target staff");
            }
            // Validate target staff exists and is in same branch
            StaffProfile targetStaff = staffProfileRepository.findById(request.getTargetStaffUserId())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND, "Target staff not found"));
            if (!targetStaff.getBranchId().equals(assignment.getShift().getBranchId())) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_SWAP_TARGET_NOT_AVAILABLE,
                        "Target staff must be in the same branch");
            }
            
            Shift targetShift = targetAssignment.getShift();
            
            // Validate A can receive B's shift (ca Y) - time conflict, daily hours, role requirements, etc.
            // Note: allowManagerOverride = false here because Manager hasn't approved yet
            String conflictReasonA = shiftValidationService.validateStaffForShiftWithReason(
                    staffUserId, // A
                    targetShift, // Ca Y của B
                    false, // allowToday = false (strict)
                    false  // allowManagerOverride = false (strict validation - role must match)
            );
            if (conflictReasonA != null) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_SWAP_TARGET_NOT_AVAILABLE,
                        "You cannot receive target staff's shift: " + conflictReasonA);
            }
            
            // Validate B can receive A's shift (ca X) - time conflict, daily hours, role requirements, etc.
            // Note: allowManagerOverride = false here because Manager hasn't approved yet
            String conflictReasonB = shiftValidationService.validateStaffForShiftWithReason(
                    request.getTargetStaffUserId(), // B
                    assignment.getShift(), // Ca X của A
                    false, // allowToday = false (strict)
                    false  // allowManagerOverride = false (strict validation - role must match)
            );
            if (conflictReasonB != null) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_SWAP_TARGET_NOT_AVAILABLE,
                        "Target staff cannot receive your shift: " + conflictReasonB);
            }
            
            // Check for circular request
            conflictService.checkCircularRequest(
                    request.getRequestType(),
                    assignment,
                    staffUserId,
                    request.getTargetStaffUserId()
            );
            
            // TWO_WAY_SWAP requires B's approval → PENDING_TARGET_APPROVAL
            initialStatus = "PENDING_TARGET_APPROVAL";

        } else if ("LEAVE".equals(request.getRequestType())) {
            // LEAVE: A có ca → xin nghỉ (không cần B đồng ý)
            if (!assignment.getStaffUserId().equals(staffUserId)) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_ASSIGNMENT_NOT_OWNED);
            }
            // Validate assignment status (must be CONFIRMED or PENDING)
            if (!List.of("PENDING", "CONFIRMED").contains(assignment.getStatus())) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_INVALID_ASSIGNMENT,
                        "Can only create requests for PENDING or CONFIRMED assignments");
            }
            
            // Validate deadline: must submit at least 12 hours before shift start
            if (shift != null && shift.getShiftDate() != null && shift.getStartTime() != null) {
                LocalDate shiftDate = shift.getShiftDate();
                LocalTime shiftStartTime = shift.getStartTime();
                // Start time is always on shiftDate (even for shifts that span midnight)
                LocalDateTime shiftStart = shiftDate.atTime(shiftStartTime);
                
                LocalDateTime now = LocalDateTime.now();
                long hoursUntilShift = ChronoUnit.HOURS.between(now, shiftStart);
                
                if (hoursUntilShift < 12) {
                    throw new AppException(ErrorCode.SHIFT_REQUEST_LEAVE_DEADLINE_PASSED,
                            "Leave request must be submitted at least 12 hours before shift start time. " +
                            "Shift starts at " + shiftStart + ", but current time is " + now);
                }
            }
            
            // LEAVE: Status PENDING (chờ manager)
            initialStatus = "PENDING";
        } else if ("OVERTIME".equals(request.getRequestType())) {
            // OVERTIME: A xin làm ca mới (không cần B đồng ý)
            // Assignment is already created above (temporary with status OVERTIME_PENDING)
            // OVERTIME: Status PENDING (chờ manager)
            initialStatus = "PENDING";
        }

        // Validate assignment status for non-OVERTIME requests
        if (!"OVERTIME".equals(request.getRequestType()) && !List.of("PENDING", "CONFIRMED").contains(assignment.getStatus())) {
            throw new AppException(ErrorCode.SHIFT_REQUEST_INVALID_ASSIGNMENT,
                    "Can only create requests for PENDING or CONFIRMED assignments");
        }

        // Check if there's already a pending request for this assignment (including PENDING_MANAGER_APPROVAL)
        conflictService.checkPendingRequests(assignment);

        // Create request
        // For TWO_WAY_SWAP, store targetAssignmentId in reviewNotes temporarily
        String reasonWithTargetAssignment = request.getReason();
        if ("TWO_WAY_SWAP".equals(request.getRequestType()) && request.getTargetAssignmentId() != null) {
            reasonWithTargetAssignment = request.getReason() + "|TARGET_ASSIGNMENT_ID:" + request.getTargetAssignmentId();
        }
        
        ShiftRequest shiftRequest = ShiftRequest.builder()
                .assignment(assignment)
                .staffUserId(staffUserId)
                .requestType(request.getRequestType())
                .targetStaffUserId(request.getTargetStaffUserId())
                .overtimeHours(request.getOvertimeHours())
                .reason(reasonWithTargetAssignment)
                .status(initialStatus)
                .requestedAt(LocalDateTime.now())
                .build();

        shiftRequest = shiftRequestRepository.save(shiftRequest);
        log.info("Staff {} created {} request for assignment {} with status {}", 
                staffUserId, request.getRequestType(), request.getAssignmentId(), initialStatus);

        // Notify relevant parties
        try {
            shiftNotificationService.notifyRequestCreated(shiftRequest, shift, shift.getBranchId());
        } catch (Exception e) {
            log.error("Failed to send request created notification", e);
        }

        return toResponse(shiftRequest);
    }

    /**
     * Get requests by staff ID
     */
    public List<ShiftRequestResponse> getRequestsByStaff(Integer staffUserId) {
        List<ShiftRequest> requests = shiftRequestRepository.findByStaffUserId(staffUserId);
        return requests.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get request by ID
     */
    public ShiftRequestResponse getRequestById(Integer requestId) {
        ShiftRequest request = shiftRequestRepository.findById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_REQUEST_NOT_FOUND));
        return toResponse(request);
    }

    /**
     * Get requests waiting for target staff response (PICK_UP, SWAP, TWO_WAY_SWAP)
     */
    public List<ShiftRequestResponse> getRequestsWaitingForResponse(Integer targetStaffUserId) {
        List<ShiftRequest> requests = shiftRequestRepository.findByTargetStaffUserIdAndStatus(
                targetStaffUserId, "PENDING_TARGET_APPROVAL");
        return requests.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get all requests sent to a user (all statuses including REJECTED_BY_TARGET, APPROVED, etc.)
     */
    public List<ShiftRequestResponse> getRequestsSentToUser(Integer targetStaffUserId) {
        List<ShiftRequest> requests = shiftRequestRepository.findByTargetStaffUserId(targetStaffUserId);
        return requests.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get all requests by branch ID (for manager to view all requests in their branch)
     * Returns all requests regardless of status
     */
    public List<ShiftRequestResponse> getRequestsByBranch(Integer branchId) {
        List<ShiftRequest> requests = shiftRequestRepository.findByBranchId(branchId);
        return requests.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get requests by branch ID that need manager approval
     * Only returns requests with status PENDING (for LEAVE/OVERTIME) 
     * or PENDING_MANAGER_APPROVAL (for SWAP/PICK_UP/TWO_WAY_SWAP after target approval)
     */
    public List<ShiftRequestResponse> getRequestsPendingManagerApprovalByBranch(Integer branchId) {
        List<ShiftRequest> requests = shiftRequestRepository.findByBranchIdAndStatusPendingManager(branchId);
        return requests.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Target staff (B) respond to request (SWAP, PICK_UP, TWO_WAY_SWAP)
     */
    @Transactional
    public ShiftRequestResponse respondToRequest(Integer requestId, Integer targetStaffUserId, boolean accept, String responseNotes) {
        ShiftRequest request = shiftRequestRepository.findById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_REQUEST_NOT_FOUND));

        // Validate request type (chỉ SWAP, PICK_UP, TWO_WAY_SWAP cần B đồng ý)
        if (!List.of("SWAP", "PICK_UP", "TWO_WAY_SWAP").contains(request.getRequestType())) {
            throw new AppException(ErrorCode.SHIFT_REQUEST_INVALID_TYPE,
                    "Only SWAP, PICK_UP, and TWO_WAY_SWAP requests can be responded by target staff");
        }

        // Validate status
        if (!"PENDING_TARGET_APPROVAL".equals(request.getStatus())) {
            throw new AppException(ErrorCode.SHIFT_REQUEST_NOT_WAITING_FOR_TARGET);
        }

        // Validate target staff
        if (!request.getTargetStaffUserId().equals(targetStaffUserId)) {
            throw new AppException(ErrorCode.SHIFT_REQUEST_ONLY_TARGET_CAN_RESPOND);
        }

        // Validate assignment before responding
        conflictService.validateAssignmentBeforeRespond(request);

        Shift shift = request.getAssignment().getShift();
        if (accept) {
            // B đồng ý → chuyển sang chờ manager
            request.setStatus("PENDING_MANAGER_APPROVAL");
            request.setReviewNotes(responseNotes); // B's response notes
            log.info("Target staff {} accepted {} request {}", targetStaffUserId, request.getRequestType(), requestId);
        } else {
            // B từ chối → kết thúc
            request.setStatus("REJECTED_BY_TARGET");
            request.setReviewNotes(responseNotes); // B's rejection reason
            log.info("Target staff {} rejected {} request {}", targetStaffUserId, request.getRequestType(), requestId);
        }

        request = shiftRequestRepository.save(request);
        
        // Notify relevant parties
        try {
            shiftNotificationService.notifyTargetResponded(request, shift, shift.getBranchId(), accept);
        } catch (Exception e) {
            log.error("Failed to send target responded notification", e);
        }
        
        return toResponse(request);
    }

    /**
     * Approve a shift request
     */
    @Transactional
    public ShiftRequestResponse approveRequest(Integer requestId, Integer managerUserId, String reviewNotes) {
        ShiftRequest request = shiftRequestRepository.findById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_REQUEST_NOT_FOUND));

        // Validate status based on request type
        String requestType = request.getRequestType();
        if (List.of("SWAP", "PICK_UP", "TWO_WAY_SWAP").contains(requestType)) {
            // SWAP/PICK_UP/TWO_WAY_SWAP: Phải ở PENDING_MANAGER_APPROVAL (B đã đồng ý)
            if (!"PENDING_MANAGER_APPROVAL".equals(request.getStatus())) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_MUST_BE_APPROVED_BY_TARGET);
            }
        } else {
            // LEAVE/OVERTIME: Phải ở PENDING
            if (!"PENDING".equals(request.getStatus())) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_ALREADY_PROCESSED);
            }
        }

        ShiftAssignment assignment = request.getAssignment();
        Shift shift = assignment.getShift();

        // Validate assignment before approving
        conflictService.validateAssignmentBeforeApprove(request);

        // Process based on request type
        if ("SWAP".equals(requestType)) {
            // SWAP: A có ca X → cho B ca X
            Integer targetStaffUserId = request.getTargetStaffUserId();
            if (targetStaffUserId == null) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_SWAP_TARGET_REQUIRED);
            }

            // Validate target staff có thể nhận ca này (role requirements must be met)
            shiftValidationService.validateStaffForShift(targetStaffUserId, shift, false, false);

            // Check if target staff already has assignment for this shift
            if (conflictService.hasExistingAssignment(shift.getShiftId(), targetStaffUserId)) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_ASSIGNMENT_ALREADY_REASSIGNED,
                        "Target staff already has an assignment for this shift");
            }

            // Perform swap: cancel A's assignment, create new assignment for B
            assignment.setStatus("CANCELLED");
            assignment.setNotes("Cancelled due to swap request approval");
            assignmentRepository.save(assignment);

            // Create new assignment for B
            ShiftAssignment newAssignment = ShiftAssignment.builder()
                    .shift(shift)
                    .staffUserId(targetStaffUserId)
                    .assignmentType("SWAPPED")
                    .status("CONFIRMED")
                    .borrowedStaff(false)
                    .assignedBy(managerUserId)
                    .build();
            assignmentRepository.save(newAssignment);

            // Cancel conflicting requests for the cancelled assignment
            conflictService.cancelConflictingRequests(
                    assignment,
                    requestId,
                    managerUserId,
                    "Assignment was reassigned due to swap request approval"
            );

            // Cancel requests for target staff's new assignment (if any)
            conflictService.cancelRequestsForNewAssignment(
                    shift.getShiftId(),
                    targetStaffUserId,
                    managerUserId,
                    "New assignment created due to swap request approval"
            );

            log.info("Manager {} approved SWAP request {}: staff {} gave shift {} to staff {}",
                    managerUserId, requestId, request.getStaffUserId(), shift.getShiftId(), targetStaffUserId);

        } else if ("PICK_UP".equals(requestType)) {
            // PICK_UP: A không có ca → xin ca Y từ B
            Integer requestingStaffUserId = request.getStaffUserId(); // A
            Integer targetStaffUserId = request.getTargetStaffUserId(); // B

            // Validate A có thể nhận ca (role requirements must be met)
            shiftValidationService.validateStaffForShift(requestingStaffUserId, shift, false, false);

            // Check if requesting staff already has assignment for this shift
            if (conflictService.hasExistingAssignment(shift.getShiftId(), requestingStaffUserId)) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_ASSIGNMENT_ALREADY_REASSIGNED,
                        "Requesting staff already has an assignment for this shift");
            }

            // Cancel B's assignment
            assignment.setStatus("CANCELLED");
            assignment.setNotes("Cancelled due to pick up request approval");
            assignmentRepository.save(assignment);

            // Create new assignment for A
            ShiftAssignment newAssignment = ShiftAssignment.builder()
                    .shift(shift)
                    .staffUserId(requestingStaffUserId)  // A
                    .assignmentType("PICKED_UP")
                    .status("CONFIRMED")
                    .borrowedStaff(false)
                    .assignedBy(managerUserId)
                    .build();
            assignmentRepository.save(newAssignment);

            // Cancel conflicting requests for the cancelled assignment
            conflictService.cancelConflictingRequests(
                    assignment,
                    requestId,
                    managerUserId,
                    "Assignment was reassigned due to pick-up request approval"
            );

            // Cancel requests for requesting staff's new assignment (if any)
            conflictService.cancelRequestsForNewAssignment(
                    shift.getShiftId(),
                    requestingStaffUserId,
                    managerUserId,
                    "New assignment created due to pick-up request approval"
            );

            log.info("Manager {} approved PICK_UP request {}: staff {} picked up shift {} from staff {}",
                    managerUserId, requestId, requestingStaffUserId, shift.getShiftId(), targetStaffUserId);

        } else if ("TWO_WAY_SWAP".equals(requestType)) {
            // TWO_WAY_SWAP: A có ca X, B có ca Y → đổi cho nhau
            Integer requestingStaffUserId = request.getStaffUserId(); // A
            Integer targetStaffUserId = request.getTargetStaffUserId(); // B

            // Get B's assignment (target assignment) from reviewNotes
            Integer targetAssignmentId = null;
            String reason = request.getReason();
            if (reason != null && reason.contains("|TARGET_ASSIGNMENT_ID:")) {
                String[] parts = reason.split("\\|TARGET_ASSIGNMENT_ID:");
                if (parts.length > 1) {
                    try {
                        targetAssignmentId = Integer.parseInt(parts[1].trim());
                    } catch (NumberFormatException e) {
                        log.warn("Failed to parse targetAssignmentId from reason: {}", reason);
                    }
                }
            }
            
            if (targetAssignmentId == null) {
                // Fallback: Find assignment on the same date
                List<ShiftAssignment> targetAssignments = assignmentRepository
                        .findByStaffUserIdAndStatusIn(targetStaffUserId, List.of("PENDING", "CONFIRMED"));
                ShiftAssignment found = targetAssignments.stream()
                        .filter(a -> a.getShift().getShiftDate().equals(shift.getShiftDate()))
                        .findFirst()
                        .orElseThrow(() -> new AppException(ErrorCode.SHIFT_REQUEST_TWO_WAY_SWAP_TARGET_ASSIGNMENT_NOT_FOUND,
                                "Target staff does not have an assignment on the same date"));
                targetAssignmentId = found.getAssignmentId();
            }
            
            ShiftAssignment targetAssignment = assignmentRepository.findById(targetAssignmentId)
                    .orElseThrow(() -> new AppException(ErrorCode.SHIFT_ASSIGNMENT_NOT_FOUND, "Target assignment not found"));
            
            if (!targetAssignment.getStaffUserId().equals(targetStaffUserId)) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_TWO_WAY_SWAP_TARGET_ASSIGNMENT_NOT_FOUND,
                        "Target assignment must belong to target staff");
            }

            // Validate target assignment
            conflictService.validateTargetAssignment(targetAssignment);

            Shift targetShift = targetAssignment.getShift();

            // Validate A có thể nhận ca Y của B (role requirements must be met)
            shiftValidationService.validateStaffForShift(requestingStaffUserId, targetShift, false, false);
            // Validate B có thể nhận ca X của A (role requirements must be met)
            shiftValidationService.validateStaffForShift(targetStaffUserId, shift, false, false);

            // Cancel A's assignment (ca X)
            assignment.setStatus("CANCELLED");
            assignment.setNotes("Cancelled due to two-way swap request approval");
            assignmentRepository.save(assignment);

            // Cancel B's assignment (ca Y)
            targetAssignment.setStatus("CANCELLED");
            targetAssignment.setNotes("Cancelled due to two-way swap request approval");
            assignmentRepository.save(targetAssignment);

            // Create assignment for A (ca Y)
            ShiftAssignment newAssignmentA = ShiftAssignment.builder()
                    .shift(targetShift)  // Ca Y
                    .staffUserId(requestingStaffUserId)  // A
                    .assignmentType("SWAPPED")
                    .status("CONFIRMED")
                    .borrowedStaff(false)
                    .assignedBy(managerUserId)
                    .build();
            assignmentRepository.save(newAssignmentA);

            // Create assignment for B (ca X)
            ShiftAssignment newAssignmentB = ShiftAssignment.builder()
                    .shift(shift)  // Ca X
                    .staffUserId(targetStaffUserId)  // B
                    .assignmentType("SWAPPED")
                    .status("CONFIRMED")
                    .borrowedStaff(false)
                    .assignedBy(managerUserId)
                    .build();
            assignmentRepository.save(newAssignmentB);

            // Cancel conflicting requests for both cancelled assignments
            conflictService.cancelConflictingRequests(
                    assignment,
                    requestId,
                    managerUserId,
                    "Assignment was reassigned due to two-way swap request approval"
            );
            conflictService.cancelConflictingRequests(
                    targetAssignment,
                    requestId,
                    managerUserId,
                    "Assignment was reassigned due to two-way swap request approval"
            );

            // Cancel requests for both staff's new assignments
            conflictService.cancelRequestsForNewAssignment(
                    targetShift.getShiftId(),
                    requestingStaffUserId,
                    managerUserId,
                    "New assignment created due to two-way swap request approval"
            );
            conflictService.cancelRequestsForNewAssignment(
                    shift.getShiftId(),
                    targetStaffUserId,
                    managerUserId,
                    "New assignment created due to two-way swap request approval"
            );

            log.info("Manager {} approved TWO_WAY_SWAP request {}: staff {} and staff {} swapped shifts",
                    managerUserId, requestId, requestingStaffUserId, targetStaffUserId);

        } else if ("LEAVE".equals(requestType)) {
            // Cancel the assignment
            assignment.setStatus("CANCELLED");
            assignment.setNotes("Cancelled due to leave request approval: " + (reviewNotes != null ? reviewNotes : request.getReason()));
            assignmentRepository.save(assignment);

            log.info("Manager {} approved LEAVE request {}: assignment {} cancelled",
                    managerUserId, requestId, assignment.getAssignmentId());

        } else if ("OVERTIME".equals(requestType)) {
            // OVERTIME: A xin làm ca mới (bỏ qua rest period, chỉ check 52h/tuần)
            Integer requestingStaffUserId = request.getStaffUserId();
            Shift overtimeShift = assignment.getShift();
            
            // Validate staff can work this shift with OVERTIME rules (skip rest period, check 52h/week only)
            shiftValidationService.validateStaffForOvertimeShift(requestingStaffUserId, overtimeShift);
            
            // Update temporary assignment to confirmed assignment (don't delete to avoid foreign key constraint)
            if ("OVERTIME_PENDING".equals(assignment.getStatus())) {
                // Update the temporary assignment to become the real assignment
                assignment.setStatus("CONFIRMED");
                assignment.setAssignmentType("OVERTIME");
                assignment.setAssignedBy(managerUserId);
                assignment.setNotes("Overtime request approved: " + (reviewNotes != null ? reviewNotes : request.getReason()));
                assignment = assignmentRepository.save(assignment);
                
                log.info("Manager {} approved OVERTIME request {}: staff {} assigned to shift {} (overtime, skip rest period)",
                        managerUserId, requestId, requestingStaffUserId, overtimeShift.getShiftId());
            } else {
                // If assignment is not OVERTIME_PENDING, check if it's already a valid assignment
                // This should not happen after validation, but handle it gracefully
                if (!"CONFIRMED".equals(assignment.getStatus()) && !"PENDING".equals(assignment.getStatus())) {
                    throw new AppException(ErrorCode.SHIFT_ALREADY_REGISTERED,
                            "Staff already has an assignment for this shift with status: " + assignment.getStatus());
                }
                // Update existing assignment
                assignment.setStatus("CONFIRMED");
                assignment.setAssignmentType("OVERTIME");
                assignment.setAssignedBy(managerUserId);
                assignment.setNotes("Overtime request approved: " + (reviewNotes != null ? reviewNotes : request.getReason()));
                assignment = assignmentRepository.save(assignment);
                
                log.info("Manager {} approved OVERTIME request {}: updated existing assignment {} for staff {} and shift {}",
                        managerUserId, requestId, assignment.getAssignmentId(), requestingStaffUserId, overtimeShift.getShiftId());
            }
        }

        // Update request status
        request.setStatus("APPROVED");
        request.setReviewedBy(managerUserId);
        request.setReviewedAt(LocalDateTime.now());
        if (reviewNotes != null) {
            request.setReviewNotes(reviewNotes);
        }
        request = shiftRequestRepository.save(request);

        // Notify staff about approval (both requesting staff and target staff if applicable)
        try {
            shiftNotificationService.notifyRequestApproved(request, shift, shift.getBranchId());
        } catch (Exception e) {
            log.error("Failed to send request approved notification", e);
        }

        return toResponse(request);
    }

    /**
     * Reject a shift request
     */
    @Transactional
    public ShiftRequestResponse rejectRequest(Integer requestId, Integer managerUserId, String reviewNotes) {
        ShiftRequest request = shiftRequestRepository.findById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_REQUEST_NOT_FOUND));

        // Validate status based on request type
        String requestType = request.getRequestType();
        if (List.of("SWAP", "PICK_UP", "TWO_WAY_SWAP").contains(requestType)) {
            // Manager có thể reject ở bất kỳ stage nào (trước hoặc sau khi B đồng ý)
            if (!List.of("PENDING_TARGET_APPROVAL", "PENDING_MANAGER_APPROVAL").contains(request.getStatus())) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_ALREADY_PROCESSED);
            }
        } else {
            // LEAVE/OVERTIME: Phải ở PENDING
            if (!"PENDING".equals(request.getStatus())) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_ALREADY_PROCESSED);
            }
        }

        // Update request status
        request.setStatus("REJECTED");
        request.setReviewedBy(managerUserId);
        request.setReviewedAt(LocalDateTime.now());
        request.setReviewNotes(reviewNotes);
        request = shiftRequestRepository.save(request);

        log.info("Manager {} rejected {} request {}: {}", managerUserId, requestType, requestId, reviewNotes);
        
        // Notify staff about rejection
        try {
            Shift shift = request.getAssignment().getShift();
            shiftNotificationService.notifyRequestRejected(request, shift, shift.getBranchId());
        } catch (Exception e) {
            log.error("Failed to send request rejected notification", e);
        }

        return toResponse(request);
    }

    /**
     * Cancel a request (by staff who created it)
     */
    @Transactional
    public ShiftRequestResponse cancelRequest(Integer requestId, Integer staffUserId) {
        ShiftRequest request = shiftRequestRepository.findById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIFT_REQUEST_NOT_FOUND));

        // Validate ownership
        if (!request.getStaffUserId().equals(staffUserId)) {
            throw new AppException(ErrorCode.ACCESS_DENIED, "You can only cancel your own requests");
        }

        // Validate status (có thể cancel khi đang chờ B đồng ý hoặc chờ manager)
        if (!List.of("PENDING", "PENDING_TARGET_APPROVAL", "PENDING_MANAGER_APPROVAL").contains(request.getStatus())) {
            throw new AppException(ErrorCode.SHIFT_REQUEST_ALREADY_PROCESSED);
        }

        // Update request status
        request.setStatus("CANCELLED");
        request = shiftRequestRepository.save(request);

        log.info("Staff {} cancelled request {}", staffUserId, requestId);
        
        // Notify relevant parties about cancellation
        try {
            Shift shift = request.getAssignment().getShift();
            shiftNotificationService.notifyRequestCancelled(request, shift, shift.getBranchId());
        } catch (Exception e) {
            log.error("Failed to send request cancelled notification", e);
        }

        return toResponse(request);
    }

    /**
     * Helper method to check time overlap
     */

    /**
     * Convert entity to response DTO
     */
    private ShiftRequestResponse toResponse(ShiftRequest request) {
        ShiftRequestResponse response = new ShiftRequestResponse();
        response.setRequestId(request.getRequestId());
        response.setAssignmentId(request.getAssignment().getAssignmentId());
        response.setStaffUserId(request.getStaffUserId());
        response.setRequestType(request.getRequestType());
        response.setTargetStaffUserId(request.getTargetStaffUserId());
        response.setOvertimeHours(request.getOvertimeHours());
        
        // Parse targetAssignmentId from reason for TWO_WAY_SWAP
        String reason = request.getReason();
        if ("TWO_WAY_SWAP".equals(request.getRequestType()) && reason != null && reason.contains("|TARGET_ASSIGNMENT_ID:")) {
            String[] parts = reason.split("\\|TARGET_ASSIGNMENT_ID:");
            if (parts.length > 0) {
                response.setReason(parts[0].trim()); // Original reason without targetAssignmentId
            }
            if (parts.length > 1) {
                try {
                    response.setTargetAssignmentId(Integer.parseInt(parts[1].trim()));
                } catch (NumberFormatException e) {
                    log.warn("Failed to parse targetAssignmentId from reason: {}", reason);
                }
            }
        } else {
            response.setReason(reason);
        }
        
        response.setStatus(request.getStatus());
        response.setRequestedAt(request.getRequestedAt());
        response.setReviewedBy(request.getReviewedBy());
        response.setReviewedAt(request.getReviewedAt());
        response.setReviewNotes(request.getReviewNotes());
        
        // Add shift information
        Shift shift = request.getAssignment().getShift();
        if (shift != null) {
            response.setShiftId(shift.getShiftId());
            response.setShiftDate(shift.getShiftDate());
            response.setStartTime(shift.getStartTime());
            response.setEndTime(shift.getEndTime());
            response.setDurationHours(shift.getDurationHours());
        }
        
        return response;
    }
}

