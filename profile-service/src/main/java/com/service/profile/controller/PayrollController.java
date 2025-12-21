package com.service.profile.controller;

import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.request.PayrollCalculationRequest;
import com.service.profile.dto.response.PayrollResponse;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.service.PayrollService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.Data;
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
@RequestMapping("/payrolls")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class PayrollController {

    PayrollService payrollService;

    @PostMapping("/calculate")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<PayrollResponse> calculatePayroll(@Valid @RequestBody PayrollCalculationRequest request) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        PayrollResponse result = payrollService.calculatePayroll(request, currentUserId, currentUserRole);
        return ApiResponse.<PayrollResponse>builder()
                .result(result)
                .message("Payroll calculated successfully")
                .build();
    }

    @PostMapping("/calculate-batch")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<List<PayrollResponse>> calculatePayrollBatch(@Valid @RequestBody BatchCalculateRequest request) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        List<PayrollResponse> result = payrollService.calculatePayrollBatch(
            request.getUserIds(), request.getPeriod(), currentUserId, currentUserRole);
        return ApiResponse.<List<PayrollResponse>>builder()
                .result(result)
                .message("Payroll batch calculated successfully")
                .build();
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    public ApiResponse<List<PayrollResponse>> getPayrolls(
            @RequestParam(required = false) Integer userId,
            @RequestParam(required = false) Integer branchId,
            @RequestParam(required = false) String period,
            @RequestParam(required = false) String status
    ) {
        List<PayrollResponse> result = payrollService.getPayrolls(userId, branchId, period, status);
        return ApiResponse.<List<PayrollResponse>>builder()
                .result(result)
                .build();
    }

    @GetMapping("/{payrollId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    public ApiResponse<PayrollResponse> getPayrollById(@PathVariable Integer payrollId) {
        PayrollResponse result = payrollService.getPayrollById(payrollId);
        return ApiResponse.<PayrollResponse>builder()
                .result(result)
                .build();
    }

    @PutMapping("/{payrollId}/approve")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<PayrollResponse> approvePayroll(@PathVariable Integer payrollId) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        PayrollResponse result = payrollService.approvePayroll(payrollId, currentUserId, currentUserRole);
        return ApiResponse.<PayrollResponse>builder()
                .result(result)
                .message("Payroll approved successfully")
                .build();
    }

    @PutMapping("/approve-batch")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<List<PayrollResponse>> approvePayrollBatch(@Valid @RequestBody BatchApproveRequest request) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        List<PayrollResponse> result = payrollService.approvePayrollBatch(
            request.getPayrollIds(), currentUserId, currentUserRole);
        return ApiResponse.<List<PayrollResponse>>builder()
                .result(result)
                .message("Payroll batch approved successfully")
                .build();
    }

    @PutMapping("/{payrollId}/pay")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<PayrollResponse> markPayrollAsPaid(@PathVariable Integer payrollId) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        PayrollResponse result = payrollService.markPayrollAsPaid(payrollId, currentUserId, currentUserRole);
        return ApiResponse.<PayrollResponse>builder()
                .result(result)
                .message("Payroll marked as paid successfully")
                .build();
    }

    @PutMapping("/pay-batch")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<List<PayrollResponse>> markPayrollAsPaidBatch(@Valid @RequestBody BatchApproveRequest request) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        List<PayrollResponse> result = payrollService.markPayrollAsPaidBatch(request.getPayrollIds(), currentUserId, currentUserRole);
        return ApiResponse.<List<PayrollResponse>>builder()
                .result(result)
                .message("Payroll batch marked as paid successfully")
                .build();
    }

    @PutMapping("/{payrollId}/revert")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<PayrollResponse> revertPayrollStatus(@PathVariable Integer payrollId) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        PayrollResponse result = payrollService.revertPayrollStatus(payrollId, currentUserId, currentUserRole);
        return ApiResponse.<PayrollResponse>builder()
                .result(result)
                .message("Payroll status reverted successfully")
                .build();
    }

    @PutMapping("/revert-batch")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<List<PayrollResponse>> revertPayrollStatusBatch(@Valid @RequestBody BatchApproveRequest request) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        List<PayrollResponse> result = payrollService.revertPayrollStatusBatch(request.getPayrollIds(), currentUserId, currentUserRole);
        return ApiResponse.<List<PayrollResponse>>builder()
                .result(result)
                .message("Payroll batch status reverted successfully")
                .build();
    }

    @PostMapping("/{payrollId}/recalculate")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<PayrollResponse> recalculatePayroll(@PathVariable Integer payrollId) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        PayrollResponse result = payrollService.recalculatePayroll(payrollId, currentUserId, currentUserRole);
        return ApiResponse.<PayrollResponse>builder()
                .result(result)
                .message("Payroll recalculated successfully")
                .build();
    }

    @GetMapping("/shift-work-summary")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    public ApiResponse<PayrollService.ShiftWorkSummary> getShiftWorkSummary(
            @RequestParam Integer userId,
            @RequestParam String period
    ) {
        PayrollService.ShiftWorkSummary result = payrollService.calculateShiftWorkSummary(userId, period);
        return ApiResponse.<PayrollService.ShiftWorkSummary>builder()
                .result(result)
                .build();
    }

    private Integer getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt)) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        Jwt jwt = (Jwt) authentication.getPrincipal();
        Object userIdClaim = jwt.getClaim("user_id");
        if (userIdClaim instanceof Integer) {
            return (Integer) userIdClaim;
        } else if (userIdClaim instanceof Long) {
            return ((Long) userIdClaim).intValue();
        } else if (userIdClaim instanceof String) {
            try {
                return Integer.parseInt((String) userIdClaim);
            } catch (NumberFormatException e) {
                throw new AppException(ErrorCode.UNAUTHENTICATED);
            }
        }
        throw new AppException(ErrorCode.UNAUTHENTICATED);
    }

    private String getCurrentUserRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt)) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        Jwt jwt = (Jwt) authentication.getPrincipal();
        
        // First, try to get from JWT claims
        Object roleClaim = jwt.getClaim("role");
        if (roleClaim != null) {
            String role = roleClaim.toString().toUpperCase();
            // Remove "ROLE_" prefix if present
            return role.startsWith("ROLE_") ? role.substring(5) : role;
        }
        
        // Fallback: try to get from authorities
        if (authentication.getAuthorities() != null && !authentication.getAuthorities().isEmpty()) {
            String authority = authentication.getAuthorities().iterator().next().getAuthority();
            // Remove "ROLE_" prefix if present
            return authority.startsWith("ROLE_") ? authority.substring(5) : authority;
        }
        
        throw new AppException(ErrorCode.UNAUTHENTICATED, "Could not extract user role from JWT token");
    }

    @Data
    public static class BatchCalculateRequest {
        private List<Integer> userIds;
        private String period;
    }

    @Data
    public static class BatchApproveRequest {
        private List<Integer> payrollIds;
    }
}

