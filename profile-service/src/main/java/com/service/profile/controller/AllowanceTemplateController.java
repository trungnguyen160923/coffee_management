package com.service.profile.controller;

import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.request.AllowanceTemplateCreationRequest;
import com.service.profile.dto.request.AllowanceTemplateUpdateRequest;
import com.service.profile.dto.response.AllowanceTemplateResponse;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.service.AllowanceTemplateService;
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
@RequestMapping("/allowance-templates")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class AllowanceTemplateController {

    AllowanceTemplateService allowanceTemplateService;
    ManagerProfileRepository managerProfileRepository;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AllowanceTemplateResponse> createTemplate(
            @Valid @RequestBody AllowanceTemplateCreationRequest request
    ) {
        Integer adminUserId = getCurrentUserId();
        AllowanceTemplateResponse result = allowanceTemplateService.createTemplate(request, adminUserId);
        return ApiResponse.<AllowanceTemplateResponse>builder()
                .result(result)
                .message("Allowance template created successfully")
                .build();
    }

    @PostMapping("/manager")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<AllowanceTemplateResponse> createTemplateForManager(
            @Valid @RequestBody AllowanceTemplateCreationRequest request
    ) {
        Integer managerUserId = getCurrentUserId();
        Integer managerBranchId = getManagerBranchId(managerUserId);
        
        // Manager chỉ có thể tạo template cho branch của mình
        AllowanceTemplateCreationRequest managerRequest = AllowanceTemplateCreationRequest.builder()
            .branchId(managerBranchId) // Force branchId = managerBranchId
            .name(request.getName())
            .allowanceType(request.getAllowanceType())
            .amount(request.getAmount())
            .description(request.getDescription())
            .build();
        
        AllowanceTemplateResponse result = allowanceTemplateService.createTemplate(managerRequest, managerUserId);
        return ApiResponse.<AllowanceTemplateResponse>builder()
                .result(result)
                .message("Allowance template created successfully")
                .build();
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<List<AllowanceTemplateResponse>> getTemplates(
            @RequestParam(required = false) Integer branchId,
            @RequestParam(required = false) Boolean isActive
    ) {
        List<AllowanceTemplateResponse> result = allowanceTemplateService.getTemplates(branchId, isActive);
        return ApiResponse.<List<AllowanceTemplateResponse>>builder()
                .result(result)
                .build();
    }

    @GetMapping("/manager")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<List<AllowanceTemplateResponse>> getTemplatesForManager() {
        // Manager chỉ xem templates của branch mình hoặc SYSTEM
        Integer managerUserId = getCurrentUserId();
        Integer managerBranchId = getManagerBranchId(managerUserId);
        List<AllowanceTemplateResponse> result = allowanceTemplateService.getTemplatesForManager(managerBranchId);
        return ApiResponse.<List<AllowanceTemplateResponse>>builder()
                .result(result)
                .build();
    }

    @GetMapping("/{templateId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<AllowanceTemplateResponse> getTemplateById(
            @PathVariable Integer templateId
    ) {
        AllowanceTemplateResponse result = allowanceTemplateService.getTemplateById(templateId);
        return ApiResponse.<AllowanceTemplateResponse>builder()
                .result(result)
                .build();
    }

    @PutMapping("/{templateId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AllowanceTemplateResponse> updateTemplate(
            @PathVariable Integer templateId,
            @Valid @RequestBody AllowanceTemplateUpdateRequest request
    ) {
        AllowanceTemplateResponse result = allowanceTemplateService.updateTemplate(templateId, request);
        return ApiResponse.<AllowanceTemplateResponse>builder()
                .result(result)
                .message("Allowance template updated successfully")
                .build();
    }

    @DeleteMapping("/{templateId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> deleteTemplate(
            @PathVariable Integer templateId
    ) {
        allowanceTemplateService.deleteTemplate(templateId);
        return ApiResponse.<Void>builder()
                .message("Allowance template deleted successfully")
                .build();
    }

    @PutMapping("/{templateId}/manager")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<AllowanceTemplateResponse> updateTemplateForManager(
            @PathVariable Integer templateId,
            @Valid @RequestBody AllowanceTemplateUpdateRequest request
    ) {
        Integer managerUserId = getCurrentUserId();
        Integer managerBranchId = getManagerBranchId(managerUserId);
        AllowanceTemplateResponse result = allowanceTemplateService.updateTemplateForManager(templateId, request, managerBranchId);
        return ApiResponse.<AllowanceTemplateResponse>builder()
                .result(result)
                .message("Allowance template updated successfully")
                .build();
    }

    @DeleteMapping("/{templateId}/manager")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<Void> softDeleteTemplateForManager(
            @PathVariable Integer templateId
    ) {
        Integer managerUserId = getCurrentUserId();
        Integer managerBranchId = getManagerBranchId(managerUserId);
        allowanceTemplateService.softDeleteTemplateForManager(templateId, managerBranchId);
        return ApiResponse.<Void>builder()
                .message("Allowance template deleted successfully")
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

