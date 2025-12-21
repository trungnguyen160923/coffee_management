package com.service.profile.controller;

import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.request.PayrollConfigurationCreationRequest;
import com.service.profile.dto.request.PayrollConfigurationUpdateRequest;
import com.service.profile.dto.response.PayrollConfigurationResponse;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.service.PayrollConfigurationService;
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
import java.util.Map;

@RestController
@RequestMapping("/payroll-config")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class PayrollConfigurationController {

    PayrollConfigurationService payrollConfigurationService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    public ApiResponse<List<PayrollConfigurationResponse>> getAllConfigs(
            @RequestParam(required = false, defaultValue = "false") Boolean includeInactive) {
        List<PayrollConfigurationResponse> result;
        if (includeInactive) {
            result = payrollConfigurationService.getAllConfigsIncludingInactive();
        } else {
            result = payrollConfigurationService.getAllConfigs();
        }
        return ApiResponse.<List<PayrollConfigurationResponse>>builder()
                .result(result)
                .build();
    }

    @GetMapping("/{configKey}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    public ApiResponse<PayrollConfigurationResponse> getConfigByKey(@PathVariable String configKey) {
        PayrollConfigurationResponse result = payrollConfigurationService.getConfigByKey(configKey);
        return ApiResponse.<PayrollConfigurationResponse>builder()
                .result(result)
                .build();
    }

    @PutMapping("/{configKey}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PayrollConfigurationResponse> updateConfig(
            @PathVariable String configKey,
            @Valid @RequestBody PayrollConfigurationUpdateRequest request) {
        Integer currentUserId = getCurrentUserId();
        PayrollConfigurationResponse result = payrollConfigurationService.updateConfig(
            configKey, request, currentUserId);
        return ApiResponse.<PayrollConfigurationResponse>builder()
                .result(result)
                .message("Payroll configuration updated successfully")
                .build();
    }

    @PutMapping("/batch")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<PayrollConfigurationResponse>> updateConfigsBatch(
            @Valid @RequestBody BatchUpdateRequest request) {
        Integer currentUserId = getCurrentUserId();
        List<PayrollConfigurationResponse> result = payrollConfigurationService.updateConfigsBatch(
            request.getUpdates(), currentUserId);
        return ApiResponse.<List<PayrollConfigurationResponse>>builder()
                .result(result)
                .message("Payroll configurations updated successfully")
                .build();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PayrollConfigurationResponse> createConfig(
            @Valid @RequestBody PayrollConfigurationCreationRequest request) {
        Integer currentUserId = getCurrentUserId();
        PayrollConfigurationResponse result = payrollConfigurationService.createConfig(
            request, currentUserId);
        return ApiResponse.<PayrollConfigurationResponse>builder()
                .result(result)
                .message("Payroll configuration created successfully")
                .build();
    }

    @DeleteMapping("/{configKey}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> deleteConfig(@PathVariable String configKey) {
        Integer currentUserId = getCurrentUserId();
        payrollConfigurationService.deleteConfig(configKey, currentUserId);
        return ApiResponse.<Void>builder()
                .message("Payroll configuration deleted successfully")
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

    @Data
    public static class BatchUpdateRequest {
        private Map<String, PayrollConfigurationUpdateRequest> updates;
    }
}

