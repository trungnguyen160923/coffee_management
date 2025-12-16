package com.service.profile.controller;

import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.request.AllowanceCreationRequest;
import com.service.profile.dto.request.ApplyTemplateRequest;
import com.service.profile.dto.response.AllowanceResponse;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.service.AllowanceService;
import jakarta.validation.Valid;
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
@RequestMapping("/allowances")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class AllowanceController {

    AllowanceService allowanceService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<AllowanceResponse> createAllowance(@Valid @RequestBody AllowanceCreationRequest request) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        AllowanceResponse result = allowanceService.createAllowance(request, currentUserId, currentUserRole);
        return ApiResponse.<AllowanceResponse>builder()
                .result(result)
                .message("Allowance created successfully")
                .build();
    }

    @PostMapping("/apply-template")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<AllowanceResponse> applyTemplate(@Valid @RequestBody ApplyTemplateRequest request) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        AllowanceResponse result = allowanceService.createAllowanceFromTemplate(request, currentUserId, currentUserRole);
        return ApiResponse.<AllowanceResponse>builder()
                .result(result)
                .message("Allowance created from template successfully")
                .build();
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    public ApiResponse<List<AllowanceResponse>> getAllowances(
            @RequestParam(required = false) Integer userId,
            @RequestParam(required = false) Integer branchId,
            @RequestParam(required = false) String period,
            @RequestParam(required = false) String status
    ) {
        List<AllowanceResponse> result = allowanceService.getAllowances(userId, branchId, period, status);
        return ApiResponse.<List<AllowanceResponse>>builder()
                .result(result)
                .build();
    }

    @GetMapping("/{allowanceId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    public ApiResponse<AllowanceResponse> getAllowanceById(@PathVariable Integer allowanceId) {
        AllowanceResponse result = allowanceService.getAllowanceById(allowanceId);
        return ApiResponse.<AllowanceResponse>builder()
                .result(result)
                .build();
    }

    @PutMapping("/{allowanceId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<AllowanceResponse> updateAllowance(
            @PathVariable Integer allowanceId,
            @Valid @RequestBody AllowanceCreationRequest request
    ) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        AllowanceResponse result = allowanceService.updateAllowance(allowanceId, request, currentUserId, currentUserRole);
        return ApiResponse.<AllowanceResponse>builder()
                .result(result)
                .message("Allowance updated successfully")
                .build();
    }

    @DeleteMapping("/{allowanceId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<Void> deleteAllowance(@PathVariable Integer allowanceId) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        allowanceService.deleteAllowance(allowanceId, currentUserId, currentUserRole);
        return ApiResponse.<Void>builder()
                .message("Allowance deleted successfully")
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
        String role = jwt.getClaimAsString("role");
        if (role == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        return role;
    }
}

