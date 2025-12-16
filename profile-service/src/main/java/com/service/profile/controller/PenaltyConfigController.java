package com.service.profile.controller;

import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.request.PenaltyConfigCreationRequest;
import com.service.profile.dto.request.PenaltyConfigUpdateRequest;
import com.service.profile.dto.response.PenaltyConfigResponse;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.service.PenaltyConfigService;
import com.service.profile.repository.ManagerProfileRepository;
import com.service.profile.entity.ManagerProfile;
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
@RequestMapping("/penalty-configs")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class PenaltyConfigController {

    PenaltyConfigService penaltyConfigService;
    ManagerProfileRepository managerProfileRepository;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PenaltyConfigResponse> createConfig(
            @Valid @RequestBody PenaltyConfigCreationRequest request
    ) {
        Integer adminUserId = getCurrentUserId();
        PenaltyConfigResponse result = penaltyConfigService.createConfig(request, adminUserId);
        return ApiResponse.<PenaltyConfigResponse>builder()
                .result(result)
                .message("Penalty config created successfully")
                .build();
    }

    @PostMapping("/manager")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<PenaltyConfigResponse> createConfigForManager(
            @Valid @RequestBody PenaltyConfigCreationRequest request
    ) {
        Integer managerUserId = getCurrentUserId();
        Integer managerBranchId = getManagerBranchId(managerUserId);
        
        // Manager chỉ có thể tạo config cho branch của mình
        PenaltyConfigCreationRequest managerRequest = PenaltyConfigCreationRequest.builder()
            .branchId(managerBranchId) // Force branchId = managerBranchId
            .name(request.getName())
            .penaltyType(request.getPenaltyType())
            .amount(request.getAmount())
            .description(request.getDescription())
            .build();
        
        PenaltyConfigResponse result = penaltyConfigService.createConfig(managerRequest, managerUserId);
        return ApiResponse.<PenaltyConfigResponse>builder()
                .result(result)
                .message("Penalty config created successfully")
                .build();
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<List<PenaltyConfigResponse>> getConfigs(
            @RequestParam(required = false) Integer branchId,
            @RequestParam(required = false) Boolean isActive
    ) {
        List<PenaltyConfigResponse> result = penaltyConfigService.getConfigs(branchId, isActive);
        return ApiResponse.<List<PenaltyConfigResponse>>builder()
                .result(result)
                .build();
    }

    @GetMapping("/manager")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<List<PenaltyConfigResponse>> getConfigsForManager() {
        Integer managerUserId = getCurrentUserId();
        Integer managerBranchId = getManagerBranchId(managerUserId);
        List<PenaltyConfigResponse> result = penaltyConfigService.getConfigsForManager(managerBranchId);
        return ApiResponse.<List<PenaltyConfigResponse>>builder()
                .result(result)
                .build();
    }

    @GetMapping("/{configId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<PenaltyConfigResponse> getConfigById(
            @PathVariable Integer configId
    ) {
        PenaltyConfigResponse result = penaltyConfigService.getConfigById(configId);
        return ApiResponse.<PenaltyConfigResponse>builder()
                .result(result)
                .build();
    }

    @PutMapping("/{configId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PenaltyConfigResponse> updateConfig(
            @PathVariable Integer configId,
            @Valid @RequestBody PenaltyConfigUpdateRequest request
    ) {
        PenaltyConfigResponse result = penaltyConfigService.updateConfig(configId, request);
        return ApiResponse.<PenaltyConfigResponse>builder()
                .result(result)
                .message("Penalty config updated successfully")
                .build();
    }

    @DeleteMapping("/{configId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> deleteConfig(
            @PathVariable Integer configId
    ) {
        penaltyConfigService.deleteConfig(configId);
        return ApiResponse.<Void>builder()
                .message("Penalty config deleted successfully")
                .build();
    }

    @PutMapping("/{configId}/manager")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<PenaltyConfigResponse> updateConfigForManager(
            @PathVariable Integer configId,
            @Valid @RequestBody PenaltyConfigUpdateRequest request
    ) {
        Integer managerUserId = getCurrentUserId();
        Integer managerBranchId = getManagerBranchId(managerUserId);
        PenaltyConfigResponse result = penaltyConfigService.updateConfigForManager(configId, request, managerBranchId);
        return ApiResponse.<PenaltyConfigResponse>builder()
                .result(result)
                .message("Penalty config updated successfully")
                .build();
    }

    @DeleteMapping("/{configId}/manager")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<Void> softDeleteConfigForManager(
            @PathVariable Integer configId
    ) {
        Integer managerUserId = getCurrentUserId();
        Integer managerBranchId = getManagerBranchId(managerUserId);
        penaltyConfigService.softDeleteConfigForManager(configId, managerBranchId);
        return ApiResponse.<Void>builder()
                .message("Penalty config deleted successfully")
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

    private Integer getManagerBranchId(Integer managerUserId) {
        ManagerProfile managerProfile = managerProfileRepository.findById(managerUserId)
            .orElseThrow(() -> new AppException(ErrorCode.USER_ID_NOT_FOUND));
        return managerProfile.getBranchId();
    }
}

