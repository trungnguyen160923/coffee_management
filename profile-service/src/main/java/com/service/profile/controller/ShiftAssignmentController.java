package com.service.profile.controller;

import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.request.ShiftAssignmentCreateRequest;
import com.service.profile.dto.request.ShiftAssignmentRejectRequest;
import com.service.profile.dto.request.ShiftAssignmentUpdateRequest;
import com.service.profile.dto.response.AvailableStaffForShiftResponse;
import com.service.profile.dto.response.BranchPublicScheduleResponse;
import com.service.profile.dto.response.ShiftAssignmentResponse;
import com.service.profile.service.ShiftAssignmentService;
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
@RequestMapping("/shift-assignments")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ShiftAssignmentController {

    ShiftAssignmentService shiftAssignmentService;

    // ========== Staff APIs ==========

    /**
     * Staff get their own assignments
     * GET /api/shift-assignments/my-assignments?startDate={date}&endDate={date}
     */
    @GetMapping("/my-assignments")
    @PreAuthorize("hasRole('STAFF')")
    public ApiResponse<List<ShiftAssignmentResponse>> getMyAssignments(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        Integer staffUserId = getUserIdFromSecurityContext();
        List<ShiftAssignmentResponse> result = shiftAssignmentService.getAssignmentsByStaff(
                staffUserId, startDate, endDate);
        return ApiResponse.<List<ShiftAssignmentResponse>>builder()
                .result(result)
                .build();
    }

    /**
     * Staff unregister from a shift (cancel self-registration)
     * DELETE /api/shift-assignments/{assignmentId}/unregister
     */
    @DeleteMapping("/{assignmentId}/unregister")
    @PreAuthorize("hasRole('STAFF')")
    public ApiResponse<Void> unregisterFromShift(
            @PathVariable Integer assignmentId
    ) {
        Integer staffUserId = getUserIdFromSecurityContext();
        
        shiftAssignmentService.unregisterFromShift(assignmentId, staffUserId);
        
        return ApiResponse.<Void>builder()
                .message("Successfully unregistered from shift")
                .build();
    }

    /**
     * Staff check in for a shift
     * POST /api/shift-assignments/{assignmentId}/check-in
     */
    @PostMapping("/{assignmentId}/check-in")
    @PreAuthorize("hasRole('STAFF')")
    public ApiResponse<ShiftAssignmentResponse> checkIn(
            @PathVariable Integer assignmentId
    ) {
        Integer staffUserId = getUserIdFromSecurityContext();
        ShiftAssignmentResponse result = shiftAssignmentService.checkIn(assignmentId, staffUserId);
        return ApiResponse.<ShiftAssignmentResponse>builder()
                .result(result)
                .message("Checked in successfully")
                .build();
    }

    /**
     * Staff check out from a shift
     * POST /api/shift-assignments/{assignmentId}/check-out
     */
    @PostMapping("/{assignmentId}/check-out")
    @PreAuthorize("hasRole('STAFF')")
    public ApiResponse<ShiftAssignmentResponse> checkOut(
            @PathVariable Integer assignmentId
    ) {
        Integer staffUserId = getUserIdFromSecurityContext();
        ShiftAssignmentResponse result = shiftAssignmentService.checkOut(assignmentId, staffUserId);
        return ApiResponse.<ShiftAssignmentResponse>builder()
                .result(result)
                .message("Checked out successfully")
                .build();
    }

    // ========== Manager APIs ==========

    /**
     * Get assignments by shift ID
     * GET /api/shift-assignments/shift/{shiftId}
     */
    @GetMapping("/shift/{shiftId}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN') or hasRole('STAFF')")
    public ApiResponse<List<ShiftAssignmentResponse>> getAssignmentsByShift(
            @PathVariable Integer shiftId
    ) {
        List<ShiftAssignmentResponse> result = shiftAssignmentService.getAssignmentsByShift(shiftId);
        return ApiResponse.<List<ShiftAssignmentResponse>>builder()
                .result(result)
                .build();
    }

    /**
     * Get assignments by staff ID
     * GET /api/shift-assignments/staff/{staffId}?startDate={date}&endDate={date}
     */
    @GetMapping("/staff/{staffId}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public ApiResponse<List<ShiftAssignmentResponse>> getAssignmentsByStaff(
            @PathVariable Integer staffId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        List<ShiftAssignmentResponse> result = shiftAssignmentService.getAssignmentsByStaff(
                staffId, startDate, endDate);
        return ApiResponse.<List<ShiftAssignmentResponse>>builder()
                .result(result)
                .build();
    }

    /**
     * Get assignments by branch and date range
     * GET /api/shift-assignments/branch/{branchId}?startDate={date}&endDate={date}&status={status}
     */
    @GetMapping("/branch/{branchId}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public ApiResponse<List<ShiftAssignmentResponse>> getAssignmentsByBranch(
            @PathVariable Integer branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String status
    ) {
        List<ShiftAssignmentResponse> result = shiftAssignmentService.getAssignmentsByBranchAndDateRange(
                branchId, startDate, endDate, status);
        return ApiResponse.<List<ShiftAssignmentResponse>>builder()
                .result(result)
                .build();
    }

    /**
     * Manager manually create assignment
     * POST /api/shift-assignments
     */
    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<ShiftAssignmentResponse> createAssignment(
            @RequestBody ShiftAssignmentCreateRequest request
    ) {
        Integer managerUserId = getUserIdFromSecurityContext();
        ShiftAssignmentResponse result = shiftAssignmentService.createAssignment(
                request.getShiftId(), request.getStaffUserId(), managerUserId, 
                request.getOverrideReason(), request.getCapacityOverrideReason());
        return ApiResponse.<ShiftAssignmentResponse>builder()
                .result(result)
                .build();
    }

    /**
     * Manager update assignment
     * PUT /api/shift-assignments/{assignmentId}
     */
    @PutMapping("/{assignmentId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<ShiftAssignmentResponse> updateAssignment(
            @PathVariable Integer assignmentId,
            @RequestBody ShiftAssignmentUpdateRequest request
    ) {
        Integer managerUserId = getUserIdFromSecurityContext();
        ShiftAssignmentResponse result = shiftAssignmentService.updateAssignment(
                assignmentId, managerUserId);
        return ApiResponse.<ShiftAssignmentResponse>builder()
                .result(result)
                .build();
    }

    /**
     * Manager delete assignment
     * DELETE /api/shift-assignments/{assignmentId}
     */
    @DeleteMapping("/{assignmentId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<Void> deleteAssignment(
            @PathVariable Integer assignmentId
    ) {
        Integer managerUserId = getUserIdFromSecurityContext();
        shiftAssignmentService.deleteAssignment(assignmentId, managerUserId);
        return ApiResponse.<Void>builder()
                .message("Assignment deleted successfully")
                .build();
    }

    /**
     * Manager approve assignment
     * POST /api/shift-assignments/{assignmentId}/approve
     */
    @PostMapping("/{assignmentId}/approve")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<ShiftAssignmentResponse> approveAssignment(
            @PathVariable Integer assignmentId
    ) {
        Integer managerUserId = getUserIdFromSecurityContext();
        ShiftAssignmentResponse result = shiftAssignmentService.approveAssignment(assignmentId, managerUserId);
        return ApiResponse.<ShiftAssignmentResponse>builder()
                .result(result)
                .build();
    }

    /**
     * Manager reject assignment
     * POST /api/shift-assignments/{assignmentId}/reject
     */
    @PostMapping("/{assignmentId}/reject")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<ShiftAssignmentResponse> rejectAssignment(
            @PathVariable Integer assignmentId,
            @RequestBody(required = false) ShiftAssignmentRejectRequest request
    ) {
        Integer managerUserId = getUserIdFromSecurityContext();
        String reason = request != null ? request.getReason() : null;
        ShiftAssignmentResponse result = shiftAssignmentService.rejectAssignment(assignmentId, managerUserId, reason);
        return ApiResponse.<ShiftAssignmentResponse>builder()
                .result(result)
                .build();
    }

    /**
     * Get available staff for a shift (filtered by employment_type, not already assigned, no conflicts)
     * GET /api/shift-assignments/shift/{shiftId}/available-staff
     */
    @GetMapping("/shift/{shiftId}/available-staff")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public ApiResponse<List<AvailableStaffForShiftResponse>> getAvailableStaffForShift(
            @PathVariable Integer shiftId
    ) {
        List<AvailableStaffForShiftResponse> result = shiftAssignmentService.getAvailableStaffForShift(shiftId);
        return ApiResponse.<List<AvailableStaffForShiftResponse>>builder()
                .result(result)
                .build();
    }

    /**
     * Get public branch schedule (chỉ tên nhân viên và giờ ca làm việc)
     * GET /api/shift-assignments/branch/{branchId}/public-schedule?startDate={date}&endDate={date}
     */
    @GetMapping("/branch/{branchId}/public-schedule")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER') or hasRole('ADMIN')")
    public ApiResponse<List<BranchPublicScheduleResponse>> getPublicBranchSchedule(
            @PathVariable Integer branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        Integer currentStaffUserId = getUserIdFromSecurityContext();
        List<BranchPublicScheduleResponse> result = shiftAssignmentService.getPublicBranchSchedule(
                branchId, startDate, endDate, currentStaffUserId);
        return ApiResponse.<List<BranchPublicScheduleResponse>>builder()
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
}

