package com.service.profile.controller;

import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.request.ShiftBatchCreateRequest;
import com.service.profile.dto.request.ShiftCreationRequest;
import com.service.profile.dto.request.ShiftUpdateRequest;
import com.service.profile.dto.response.ShiftAssignmentResponse;
import com.service.profile.dto.response.ShiftResponse;
import com.service.profile.service.ShiftAssignmentService;
import com.service.profile.service.ShiftService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/shifts")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ShiftController {

    ShiftService shiftService;
    ShiftAssignmentService shiftAssignmentService;

    @GetMapping("/branch/{branchId}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public ApiResponse<List<ShiftResponse>> getShiftsByBranchAndDateRange(
            @PathVariable Integer branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String status
    ) {
        List<ShiftResponse> result = shiftService.getShiftsByBranchAndDateRange(branchId, startDate, endDate, status);
        return ApiResponse.<List<ShiftResponse>>builder()
                .result(result)
                .build();
    }

    @GetMapping("/{shiftId}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN') or hasRole('STAFF')")
    public ApiResponse<ShiftResponse> getShiftById(@PathVariable Integer shiftId) {
        // For STAFF, verify they have an assignment with this shift
        Integer userId = getUserIdFromSecurityContext();
        String userRole = getUserRoleFromSecurityContext();
        
        if ("STAFF".equals(userRole)) {
            // Check if staff has an assignment with this shift
            boolean hasAssignment = shiftAssignmentService.hasAssignmentForShift(userId, shiftId);
            if (!hasAssignment) {
                throw new com.service.profile.exception.AppException(
                    com.service.profile.exception.ErrorCode.UNAUTHORIZED,
                    "You can only view shifts you are assigned to"
                );
            }
        }
        
        ShiftResponse result = shiftService.getShift(shiftId);
        return ApiResponse.<ShiftResponse>builder()
                .result(result)
                .build();
    }

    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<ShiftResponse> createShift(
            @RequestBody ShiftCreationRequest request
    ) {
        // TODO: Lấy managerUserId từ security context
        Integer managerUserId = 0;
        ShiftResponse result = shiftService.createShift(request, managerUserId);
        return ApiResponse.<ShiftResponse>builder()
                .result(result)
                .build();
    }

    @PutMapping("/{shiftId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<ShiftResponse> updateShift(
            @PathVariable Integer shiftId,
            @RequestBody ShiftUpdateRequest request
    ) {
        // TODO: Lấy managerUserId từ security context nếu cần audit
        Integer managerUserId = 0;
        ShiftResponse result = shiftService.updateShift(shiftId, request, managerUserId);
        return ApiResponse.<ShiftResponse>builder()
                .result(result)
                .build();
    }

    @DeleteMapping("/{shiftId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<Void> deleteShift(@PathVariable Integer shiftId) {
        shiftService.deleteShift(shiftId);
        return ApiResponse.<Void>builder().build();
    }

    @PostMapping("/{shiftId}/publish")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<ShiftResponse> publishShift(@PathVariable Integer shiftId) {
        ShiftResponse result = shiftService.publishShift(shiftId);
        return ApiResponse.<ShiftResponse>builder()
                .result(result)
                .build();
    }

    @PostMapping("/{shiftId}/revert-to-draft")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<ShiftResponse> revertToDraft(@PathVariable Integer shiftId) {
        ShiftResponse result = shiftService.revertToDraft(shiftId);
        return ApiResponse.<ShiftResponse>builder()
                .result(result)
                .build();
    }

    @PostMapping("/batch-create")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<List<ShiftResponse>> batchCreateShifts(
            @RequestBody ShiftBatchCreateRequest request
    ) {
        // TODO: Lấy managerUserId từ security context
        Integer managerUserId = 0;
        List<ShiftResponse> result = shiftService.batchCreateShifts(request, managerUserId);
        return ApiResponse.<List<ShiftResponse>>builder()
                .result(result)
                .build();
    }

    @PostMapping("/batch-publish")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<com.service.profile.dto.response.BatchOperationResponse> batchPublishShifts(
            @RequestParam Integer branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        com.service.profile.dto.response.BatchOperationResponse result = 
                shiftService.batchPublishShifts(branchId, startDate, endDate);
        return ApiResponse.<com.service.profile.dto.response.BatchOperationResponse>builder()
                .result(result)
                .build();
    }

    @PostMapping("/batch-cancel")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<com.service.profile.dto.response.BatchOperationResponse> batchCancelShifts(
            @RequestParam Integer branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        com.service.profile.dto.response.BatchOperationResponse result = 
                shiftService.batchCancelShifts(branchId, startDate, endDate);
        return ApiResponse.<com.service.profile.dto.response.BatchOperationResponse>builder()
                .result(result)
                .build();
    }

    // ========== Staff Self-Service APIs ==========

    /**
     * Get available shifts for staff to register
     * GET /api/shifts/available?branchId={id}&startDate={date}&endDate={date}
     */
    @GetMapping("/available")
    @PreAuthorize("hasRole('STAFF')")
    public ApiResponse<List<ShiftResponse>> getAvailableShifts(
            @RequestParam Integer branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        Integer staffUserId = getUserIdFromSecurityContext();
        
        List<ShiftResponse> result = shiftAssignmentService.getAvailableShifts(
                branchId, startDate, endDate, staffUserId);
        
        return ApiResponse.<List<ShiftResponse>>builder()
                .result(result)
                .build();
    }

    /**
     * Staff self-register for a shift
     * POST /api/shifts/{shiftId}/register
     */
    @PostMapping("/{shiftId}/register")
    @PreAuthorize("hasRole('STAFF')")
    public ApiResponse<ShiftAssignmentResponse> registerForShift(
            @PathVariable Integer shiftId
    ) {
        Integer staffUserId = getUserIdFromSecurityContext();
        
        ShiftAssignmentResponse result = shiftAssignmentService.registerForShift(shiftId, staffUserId);
        
        return ApiResponse.<ShiftAssignmentResponse>builder()
                .result(result)
                .build();
    }

    private Integer getUserIdFromSecurityContext() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            Object userIdClaim = jwt.getClaim("user_id");
            if (userIdClaim instanceof Integer userId) {
                return userId;
            } else if (userIdClaim instanceof Long userIdLong) {
                return userIdLong.intValue();
            } else if (userIdClaim instanceof String userIdStr) {
                try {
                    return Integer.parseInt(userIdStr);
                } catch (NumberFormatException e) {
                    log.error("Invalid user_id format in JWT token: {}", userIdStr);
                }
            }
        }
        log.warn("Could not extract user_id from security context, returning 0");
        return 0;
    }

    private String getUserRoleFromSecurityContext() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities() != null) {
            return auth.getAuthorities().stream()
                    .map(a -> a.getAuthority().replace("ROLE_", ""))
                    .findFirst()
                    .orElse("");
        }
        return "";
    }
}


