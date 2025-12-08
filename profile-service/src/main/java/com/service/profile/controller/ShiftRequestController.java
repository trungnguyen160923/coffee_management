package com.service.profile.controller;

import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.request.ShiftRequestCreationRequest;
import com.service.profile.dto.response.ShiftRequestResponse;
import com.service.profile.service.ShiftRequestService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/shift-requests")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ShiftRequestController {

    ShiftRequestService shiftRequestService;

    /**
     * Get requests by staff ID (for staff to view their own requests)
     */
    @GetMapping("/staff/{staffId}")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER') or hasRole('ADMIN')")
    public ApiResponse<List<ShiftRequestResponse>> getRequestsByStaff(@PathVariable Integer staffId) {
        Integer currentUserId = getUserIdFromSecurityContext();
        String currentUserRole = getUserRoleFromSecurityContext();

        // Staff can only view their own requests, managers/admins can view any
        if ("STAFF".equals(currentUserRole) && !currentUserId.equals(staffId)) {
            throw new com.service.profile.exception.AppException(
                    com.service.profile.exception.ErrorCode.ACCESS_DENIED,
                    "You can only view your own requests");
        }

        List<ShiftRequestResponse> result = shiftRequestService.getRequestsByStaff(staffId);
        return ApiResponse.<List<ShiftRequestResponse>>builder()
                .result(result)
                .build();
    }

    /**
     * Get request by ID
     */
    @GetMapping("/{requestId}")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER') or hasRole('ADMIN')")
    public ApiResponse<ShiftRequestResponse> getRequestById(@PathVariable Integer requestId) {
        ShiftRequestResponse result = shiftRequestService.getRequestById(requestId);
        
        Integer currentUserId = getUserIdFromSecurityContext();
        String currentUserRole = getUserRoleFromSecurityContext();

        // Staff can only view their own requests, managers/admins can view any
        if ("STAFF".equals(currentUserRole) && !result.getStaffUserId().equals(currentUserId)) {
            throw new com.service.profile.exception.AppException(
                    com.service.profile.exception.ErrorCode.ACCESS_DENIED,
                    "You can only view your own requests");
        }

        return ApiResponse.<ShiftRequestResponse>builder()
                .result(result)
                .build();
    }

    /**
     * Create a shift request (SWAP, LEAVE, or OVERTIME)
     */
    @PostMapping
    @PreAuthorize("hasRole('STAFF')")
    public ApiResponse<ShiftRequestResponse> createRequest(@RequestBody ShiftRequestCreationRequest request) {
        Integer staffUserId = getUserIdFromSecurityContext();
        
        // Override staffUserId from request with authenticated user
        request.setStaffUserId(staffUserId);
        
        ShiftRequestResponse result = shiftRequestService.createRequest(request, staffUserId);
        return ApiResponse.<ShiftRequestResponse>builder()
                .result(result)
                .build();
    }

    /**
     * Approve a shift request (Manager only)
     */
    @PutMapping("/{requestId}/approve")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public ApiResponse<ShiftRequestResponse> approveRequest(
            @PathVariable Integer requestId,
            @RequestBody(required = false) ApproveRejectRequest body) {
        Integer managerUserId = getUserIdFromSecurityContext();
        String reviewNotes = body != null ? body.getReviewNotes() : null;
        
        ShiftRequestResponse result = shiftRequestService.approveRequest(requestId, managerUserId, reviewNotes);
        return ApiResponse.<ShiftRequestResponse>builder()
                .result(result)
                .build();
    }

    /**
     * Reject a shift request (Manager only)
     */
    @PutMapping("/{requestId}/reject")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public ApiResponse<ShiftRequestResponse> rejectRequest(
            @PathVariable Integer requestId,
            @RequestBody(required = false) ApproveRejectRequest body) {
        Integer managerUserId = getUserIdFromSecurityContext();
        String reviewNotes = body != null ? body.getReviewNotes() : null;
        
        ShiftRequestResponse result = shiftRequestService.rejectRequest(requestId, managerUserId, reviewNotes);
        return ApiResponse.<ShiftRequestResponse>builder()
                .result(result)
                .build();
    }

    /**
     * Cancel a request (by staff who created it)
     */
    @PutMapping("/{requestId}/cancel")
    @PreAuthorize("hasRole('STAFF')")
    public ApiResponse<ShiftRequestResponse> cancelRequest(@PathVariable Integer requestId) {
        Integer staffUserId = getUserIdFromSecurityContext();
        
        ShiftRequestResponse result = shiftRequestService.cancelRequest(requestId, staffUserId);
        return ApiResponse.<ShiftRequestResponse>builder()
                .result(result)
                .build();
    }

    /**
     * Get requests waiting for target staff response
     */
    @GetMapping("/pending-response")
    @PreAuthorize("hasRole('STAFF')")
    public ApiResponse<List<ShiftRequestResponse>> getRequestsWaitingForResponse() {
        Integer targetStaffUserId = getUserIdFromSecurityContext();
        
        List<ShiftRequestResponse> result = shiftRequestService.getRequestsWaitingForResponse(targetStaffUserId);
        return ApiResponse.<List<ShiftRequestResponse>>builder()
                .result(result)
                .build();
    }

    /**
     * Get my requests (for staff to view their own requests)
     * Alternative to /staff/{staffId} to avoid path variable authentication issues
     */
    @GetMapping("/my-requests")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER') or hasRole('ADMIN')")
    public ApiResponse<List<ShiftRequestResponse>> getMyRequests() {
        Integer currentUserId = getUserIdFromSecurityContext();
        
        List<ShiftRequestResponse> result = shiftRequestService.getRequestsByStaff(currentUserId);
        return ApiResponse.<List<ShiftRequestResponse>>builder()
                .result(result)
                .build();
    }

    /**
     * Get all requests sent to current user (all statuses including REJECTED_BY_TARGET, APPROVED, etc.)
     */
    @GetMapping("/incoming-requests")
    @PreAuthorize("hasRole('STAFF')")
    public ApiResponse<List<ShiftRequestResponse>> getIncomingRequests() {
        Integer targetStaffUserId = getUserIdFromSecurityContext();
        
        List<ShiftRequestResponse> result = shiftRequestService.getRequestsSentToUser(targetStaffUserId);
        return ApiResponse.<List<ShiftRequestResponse>>builder()
                .result(result)
                .build();
    }

    /**
     * Target staff respond to request (SWAP, PICK_UP, TWO_WAY_SWAP)
     */
    @PutMapping("/{requestId}/respond")
    @PreAuthorize("hasRole('STAFF')")
    public ApiResponse<ShiftRequestResponse> respondToRequest(
            @PathVariable Integer requestId,
            @RequestBody RespondToRequestRequest body) {
        Integer targetStaffUserId = getUserIdFromSecurityContext();
        
        ShiftRequestResponse result = shiftRequestService.respondToRequest(
                requestId, 
                targetStaffUserId, 
                body.getAccept(),
                body.getResponseNotes()
        );
        return ApiResponse.<ShiftRequestResponse>builder()
                .result(result)
                .build();
    }

    /**
     * Get all requests by branch ID (for manager)
     * Returns all requests regardless of status
     */
    @GetMapping("/branch/{branchId}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public ApiResponse<List<ShiftRequestResponse>> getRequestsByBranch(@PathVariable Integer branchId) {
        List<ShiftRequestResponse> result = shiftRequestService.getRequestsByBranch(branchId);
        return ApiResponse.<List<ShiftRequestResponse>>builder()
                .result(result)
                .build();
    }

    /**
     * Get requests by branch ID that need manager approval
     * Only returns requests with status PENDING or PENDING_MANAGER_APPROVAL
     */
    @GetMapping("/branch/{branchId}/pending-manager")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public ApiResponse<List<ShiftRequestResponse>> getRequestsPendingManagerApprovalByBranch(@PathVariable Integer branchId) {
        List<ShiftRequestResponse> result = shiftRequestService.getRequestsPendingManagerApprovalByBranch(branchId);
        return ApiResponse.<List<ShiftRequestResponse>>builder()
                .result(result)
                .build();
    }

    /**
     * Helper method to get user ID from security context
     */
    private Integer getUserIdFromSecurityContext() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt)) {
            throw new com.service.profile.exception.AppException(
                    com.service.profile.exception.ErrorCode.UNAUTHENTICATED);
        }
        Jwt jwt = (Jwt) authentication.getPrincipal();
        String userIdStr = jwt.getClaimAsString("user_id");
        if (userIdStr == null) {
            throw new com.service.profile.exception.AppException(
                    com.service.profile.exception.ErrorCode.UNAUTHENTICATED);
        }
        return Integer.parseInt(userIdStr);
    }

    /**
     * Helper method to get user role from security context
     */
    private String getUserRoleFromSecurityContext() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt)) {
            throw new com.service.profile.exception.AppException(
                    com.service.profile.exception.ErrorCode.UNAUTHENTICATED);
        }
        Jwt jwt = (Jwt) authentication.getPrincipal();
        String role = jwt.getClaimAsString("role");
        if (role == null) {
            throw new com.service.profile.exception.AppException(
                    com.service.profile.exception.ErrorCode.UNAUTHENTICATED);
        }
        return role;
    }

    /**
     * DTO for approve/reject requests
     */
    @lombok.Data
    public static class ApproveRejectRequest {
        String reviewNotes;
    }

    /**
     * DTO for respond to request
     */
    @lombok.Data
    public static class RespondToRequestRequest {
        @lombok.NonNull
        Boolean accept;  // true = accept, false = reject
        String responseNotes;  // Optional notes from target staff
    }
}

