package com.service.profile.service;

import com.service.profile.entity.ShiftAssignment;
import com.service.profile.entity.ShiftRequest;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.repository.ShiftAssignmentRepository;
import com.service.profile.repository.ShiftRequestRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service to handle shift request conflicts and resolution
 * Handles:
 * - Circular request detection
 * - Conflicting requests cancellation
 * - Assignment validity checks
 * - Duplicate assignment prevention
 */
@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ShiftRequestConflictService {

    ShiftRequestRepository shiftRequestRepository;
    ShiftAssignmentRepository assignmentRepository;

    /**
     * Check for circular request before creating a new request
     * 
     * @param requestType Type of request (SWAP, PICK_UP, TWO_WAY_SWAP)
     * @param assignment Assignment for the request
     * @param staffUserId Staff creating the request
     * @param targetStaffUserId Target staff (if applicable)
     */
    public void checkCircularRequest(String requestType, ShiftAssignment assignment, 
                                     Integer staffUserId, Integer targetStaffUserId) {
        if (targetStaffUserId == null) {
            return; // No target staff, no circular check needed
        }

        if ("SWAP".equals(requestType)) {
            // SWAP: A nhường ca cho B
            // Check: B có đang yêu cầu lấy ca này từ A không?
            List<ShiftRequest> conflictingRequests = shiftRequestRepository
                    .findByTargetStaffUserIdAndAssignmentAndStatusIn(
                            targetStaffUserId, assignment, 
                            List.of("PENDING", "PENDING_TARGET_APPROVAL", "PENDING_MANAGER_APPROVAL"));
            
            boolean hasCircular = conflictingRequests.stream()
                    .anyMatch(r -> "PICK_UP".equals(r.getRequestType()) && 
                                  r.getStaffUserId().equals(targetStaffUserId) &&
                                  r.getTargetStaffUserId().equals(staffUserId));
            
            if (hasCircular) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_CIRCULAR_DETECTED,
                        "Circular request detected: Target staff already has a pick-up request for this shift");
            }
        } else if ("PICK_UP".equals(requestType)) {
            // PICK_UP: A yêu cầu lấy ca từ B
            // Check: B có đang nhường ca này cho A không?
            List<ShiftRequest> conflictingRequests = shiftRequestRepository
                    .findByStaffUserIdAndAssignmentAndStatusIn(
                            targetStaffUserId, assignment,
                            List.of("PENDING", "PENDING_TARGET_APPROVAL", "PENDING_MANAGER_APPROVAL"));
            
            boolean hasCircular = conflictingRequests.stream()
                    .anyMatch(r -> "SWAP".equals(r.getRequestType()) &&
                                  r.getStaffUserId().equals(targetStaffUserId) &&
                                  r.getTargetStaffUserId().equals(staffUserId));
            
            if (hasCircular) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_CIRCULAR_DETECTED,
                        "Circular request detected: Target staff already has a swap request for this shift");
            }
        } else if ("TWO_WAY_SWAP".equals(requestType)) {
            // TWO_WAY_SWAP: A đổi ca với B
            // Check: B có đang đổi ca với A không?
            List<ShiftRequest> conflictingRequests = shiftRequestRepository
                    .findByStaffUserIdAndTargetStaffUserIdAndStatusIn(
                            targetStaffUserId, staffUserId,
                            List.of("PENDING", "PENDING_TARGET_APPROVAL", "PENDING_MANAGER_APPROVAL"));
            
            boolean hasCircular = conflictingRequests.stream()
                    .anyMatch(r -> "TWO_WAY_SWAP".equals(r.getRequestType()));
            
            if (hasCircular) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_CIRCULAR_DETECTED,
                        "Circular request detected: Target staff already has a two-way swap request with you");
            }
        }
    }

    /**
     * Check if assignment is still valid (not CANCELLED)
     * 
     * @param assignment Assignment to check
     * @param context Context for error message (e.g., "creating request", "approving request")
     */
    public void validateAssignmentStatus(ShiftAssignment assignment, String context) {
        if (assignment == null) {
            throw new AppException(ErrorCode.SHIFT_ASSIGNMENT_NOT_FOUND, 
                    "Assignment not found when " + context);
        }
        
        if ("CANCELLED".equals(assignment.getStatus())) {
            throw new AppException(ErrorCode.SHIFT_REQUEST_ASSIGNMENT_ALREADY_CANCELLED,
                    "Assignment has already been cancelled. Cannot " + context);
        }
        
        if (!List.of("PENDING", "CONFIRMED").contains(assignment.getStatus())) {
            throw new AppException(ErrorCode.SHIFT_REQUEST_INVALID_ASSIGNMENT,
                    "Assignment status is " + assignment.getStatus() + ". Cannot " + context);
        }
    }

    /**
     * Check if there are pending requests (including PENDING_MANAGER_APPROVAL)
     * 
     * @param assignment Assignment to check
     */
    public void checkPendingRequests(ShiftAssignment assignment) {
        List<ShiftRequest> existingRequests = shiftRequestRepository.findByAssignment(assignment);
        boolean hasPendingRequest = existingRequests.stream()
                .anyMatch(r -> List.of("PENDING", "PENDING_TARGET_APPROVAL", "PENDING_MANAGER_APPROVAL")
                        .contains(r.getStatus()));
        
        if (hasPendingRequest) {
            throw new AppException(ErrorCode.SHIFT_REQUEST_INVALID_ASSIGNMENT,
                    "There is already a pending request for this assignment");
        }
    }

    /**
     * Check if target staff already has an assignment for the shift
     * 
     * @param shiftId Shift ID
     * @param targetStaffUserId Target staff user ID
     * @return true if target staff already has assignment, false otherwise
     */
    public boolean hasExistingAssignment(Integer shiftId, Integer targetStaffUserId) {
        // Note: This requires a method in ShiftAssignmentRepository to find by shift and staff
        // For now, we'll use a workaround by checking all assignments for the staff
        // and filtering by shift
        List<ShiftAssignment> assignments = assignmentRepository
                .findByStaffUserIdAndStatusIn(targetStaffUserId, List.of("PENDING", "CONFIRMED"));
        
        return assignments.stream()
                .anyMatch(a -> a.getShift().getShiftId().equals(shiftId));
    }

    /**
     * Cancel all conflicting requests for an assignment
     * Called when a request is approved
     * 
     * @param assignment Assignment that was reassigned
     * @param approvedRequestId ID of the request that was approved (to exclude from cancellation)
     * @param managerUserId Manager who approved the request
     * @param reason Reason for cancellation
     */
    @Transactional
    public void cancelConflictingRequests(ShiftAssignment assignment, Integer approvedRequestId, 
                                         Integer managerUserId, String reason) {
        List<ShiftRequest> conflictingRequests = shiftRequestRepository.findByAssignment(assignment)
                .stream()
                .filter(r -> !r.getRequestId().equals(approvedRequestId)) // Exclude approved request
                .filter(r -> List.of("PENDING", "PENDING_TARGET_APPROVAL", "PENDING_MANAGER_APPROVAL")
                        .contains(r.getStatus()))
                .collect(Collectors.toList());

        for (ShiftRequest conflictingRequest : conflictingRequests) {
            conflictingRequest.setStatus("CANCELLED");
            conflictingRequest.setReviewNotes("Auto-cancelled: " + reason);
            conflictingRequest.setReviewedBy(managerUserId);
            conflictingRequest.setReviewedAt(LocalDateTime.now());
            shiftRequestRepository.save(conflictingRequest);
            
            log.info("Auto-cancelled conflicting request {} for assignment {}: {}", 
                    conflictingRequest.getRequestId(), assignment.getAssignmentId(), reason);
        }
    }

    /**
     * Cancel all requests for a target staff's assignment
     * Called when a new assignment is created for target staff
     * 
     * @param shiftId Shift ID
     * @param targetStaffUserId Target staff user ID
     * @param managerUserId Manager who approved the request
     * @param reason Reason for cancellation
     */
    @Transactional
    public void cancelRequestsForNewAssignment(Integer shiftId, Integer targetStaffUserId, 
                                              Integer managerUserId, String reason) {
        // Find all assignments for target staff and this shift
        List<ShiftAssignment> assignments = assignmentRepository
                .findByStaffUserIdAndStatusIn(targetStaffUserId, List.of("PENDING", "CONFIRMED"));
        
        assignments.stream()
                .filter(a -> a.getShift().getShiftId().equals(shiftId))
                .forEach(assignment -> {
                    List<ShiftRequest> requests = shiftRequestRepository.findByAssignment(assignment)
                            .stream()
                            .filter(r -> List.of("PENDING", "PENDING_TARGET_APPROVAL", "PENDING_MANAGER_APPROVAL")
                                    .contains(r.getStatus()))
                            .collect(Collectors.toList());
                    
                    for (ShiftRequest request : requests) {
                        request.setStatus("CANCELLED");
                        request.setReviewNotes("Auto-cancelled: " + reason);
                        request.setReviewedBy(managerUserId);
                        request.setReviewedAt(LocalDateTime.now());
                        shiftRequestRepository.save(request);
                        
                        log.info("Auto-cancelled request {} for assignment {}: {}", 
                                request.getRequestId(), assignment.getAssignmentId(), reason);
                    }
                });
    }

    /**
     * Validate that assignment is still valid before responding
     * 
     * @param request Request to respond to
     */
    public void validateAssignmentBeforeRespond(ShiftRequest request) {
        ShiftAssignment assignment = request.getAssignment();
        validateAssignmentStatus(assignment, "responding to request");
        
        // Check if assignment has been reassigned by another approved request
        List<ShiftRequest> approvedRequests = shiftRequestRepository.findByAssignment(assignment)
                .stream()
                .filter(r -> "APPROVED".equals(r.getStatus()))
                .filter(r -> !r.getRequestId().equals(request.getRequestId()))
                .collect(Collectors.toList());
        
        if (!approvedRequests.isEmpty()) {
            throw new AppException(ErrorCode.SHIFT_REQUEST_ASSIGNMENT_ALREADY_REASSIGNED,
                    "This shift has already been reassigned by another approved request");
        }
    }

    /**
     * Validate that assignment is still valid before approving
     * 
     * @param request Request to approve
     */
    public void validateAssignmentBeforeApprove(ShiftRequest request) {
        ShiftAssignment assignment = request.getAssignment();
        
        // For OVERTIME requests, allow OVERTIME_PENDING status (temporary assignment)
        if ("OVERTIME".equals(request.getRequestType())) {
            if (assignment == null) {
                throw new AppException(ErrorCode.SHIFT_ASSIGNMENT_NOT_FOUND, 
                        "Assignment not found when approving request");
            }
            if ("CANCELLED".equals(assignment.getStatus())) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_ASSIGNMENT_ALREADY_CANCELLED,
                        "Assignment has already been cancelled. Cannot approving request");
            }
            // Allow OVERTIME_PENDING, PENDING, or CONFIRMED for OVERTIME requests
            if (!List.of("OVERTIME_PENDING", "PENDING", "CONFIRMED").contains(assignment.getStatus())) {
                throw new AppException(ErrorCode.SHIFT_REQUEST_INVALID_ASSIGNMENT,
                        "Assignment status is " + assignment.getStatus() + ". Cannot approving request");
            }
        } else {
            // For other request types, use standard validation
            validateAssignmentStatus(assignment, "approving request");
        }
        
        // Check if assignment has been reassigned by another approved request
        List<ShiftRequest> approvedRequests = shiftRequestRepository.findByAssignment(assignment)
                .stream()
                .filter(r -> "APPROVED".equals(r.getStatus()))
                .filter(r -> !r.getRequestId().equals(request.getRequestId()))
                .collect(Collectors.toList());
        
        if (!approvedRequests.isEmpty()) {
            throw new AppException(ErrorCode.SHIFT_REQUEST_ASSIGNMENT_ALREADY_REASSIGNED,
                    "This shift has already been reassigned by another approved request");
        }
    }

    /**
     * Validate target assignment for TWO_WAY_SWAP
     * 
     * @param targetAssignment Target assignment
     */
    public void validateTargetAssignment(ShiftAssignment targetAssignment) {
        if (targetAssignment == null) {
            throw new AppException(ErrorCode.SHIFT_ASSIGNMENT_NOT_FOUND, 
                    "Target assignment not found");
        }
        
        validateAssignmentStatus(targetAssignment, "processing two-way swap");
    }
}

