package com.service.profile.controller;

import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.request.BonusTemplateCreationRequest;
import com.service.profile.dto.request.BonusTemplateUpdateRequest;
import com.service.profile.dto.response.BonusTemplateResponse;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.service.BonusTemplateService;
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
@RequestMapping("/bonus-templates")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class BonusTemplateController {

    BonusTemplateService bonusTemplateService;
    ManagerProfileRepository managerProfileRepository;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<BonusTemplateResponse> createTemplate(
            @Valid @RequestBody BonusTemplateCreationRequest request
    ) {
        Integer adminUserId = getCurrentUserId();
        BonusTemplateResponse result = bonusTemplateService.createTemplate(request, adminUserId);
        return ApiResponse.<BonusTemplateResponse>builder()
                .result(result)
                .message("Bonus template created successfully")
                .build();
    }

    @PostMapping("/manager")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<BonusTemplateResponse> createTemplateForManager(
            @Valid @RequestBody BonusTemplateCreationRequest request
    ) {
        Integer managerUserId = getCurrentUserId();
        Integer managerBranchId = getManagerBranchId(managerUserId);
        
        // Manager chỉ có thể tạo template cho branch của mình
        BonusTemplateCreationRequest managerRequest = BonusTemplateCreationRequest.builder()
            .branchId(managerBranchId) // Force branchId = managerBranchId
            .name(request.getName())
            .bonusType(request.getBonusType())
            .amount(request.getAmount())
            .description(request.getDescription())
            .criteriaRef(request.getCriteriaRef())
            .build();
        
        BonusTemplateResponse result = bonusTemplateService.createTemplate(managerRequest, managerUserId);
        return ApiResponse.<BonusTemplateResponse>builder()
                .result(result)
                .message("Bonus template created successfully")
                .build();
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<List<BonusTemplateResponse>> getTemplates(
            @RequestParam(required = false) Integer branchId,
            @RequestParam(required = false) Boolean isActive
    ) {
        List<BonusTemplateResponse> result = bonusTemplateService.getTemplates(branchId, isActive);
        return ApiResponse.<List<BonusTemplateResponse>>builder()
                .result(result)
                .build();
    }

    @GetMapping("/manager")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<List<BonusTemplateResponse>> getTemplatesForManager() {
        Integer managerUserId = getCurrentUserId();
        Integer managerBranchId = getManagerBranchId(managerUserId);
        List<BonusTemplateResponse> result = bonusTemplateService.getTemplatesForManager(managerBranchId);
        return ApiResponse.<List<BonusTemplateResponse>>builder()
                .result(result)
                .build();
    }

    @GetMapping("/{templateId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<BonusTemplateResponse> getTemplateById(
            @PathVariable Integer templateId
    ) {
        BonusTemplateResponse result = bonusTemplateService.getTemplateById(templateId);
        return ApiResponse.<BonusTemplateResponse>builder()
                .result(result)
                .build();
    }

    @PutMapping("/{templateId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<BonusTemplateResponse> updateTemplate(
            @PathVariable Integer templateId,
            @Valid @RequestBody BonusTemplateUpdateRequest request
    ) {
        BonusTemplateResponse result = bonusTemplateService.updateTemplate(templateId, request);
        return ApiResponse.<BonusTemplateResponse>builder()
                .result(result)
                .message("Bonus template updated successfully")
                .build();
    }

    @DeleteMapping("/{templateId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> deleteTemplate(
            @PathVariable Integer templateId
    ) {
        bonusTemplateService.deleteTemplate(templateId);
        return ApiResponse.<Void>builder()
                .message("Bonus template deleted successfully")
                .build();
    }

    @PutMapping("/{templateId}/manager")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<BonusTemplateResponse> updateTemplateForManager(
            @PathVariable Integer templateId,
            @Valid @RequestBody BonusTemplateUpdateRequest request
    ) {
        Integer managerUserId = getCurrentUserId();
        Integer managerBranchId = getManagerBranchId(managerUserId);
        BonusTemplateResponse result = bonusTemplateService.updateTemplateForManager(templateId, request, managerBranchId);
        return ApiResponse.<BonusTemplateResponse>builder()
                .result(result)
                .message("Bonus template updated successfully")
                .build();
    }

    @DeleteMapping("/{templateId}/manager")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<Void> softDeleteTemplateForManager(
            @PathVariable Integer templateId
    ) {
        Integer managerUserId = getCurrentUserId();
        Integer managerBranchId = getManagerBranchId(managerUserId);
        bonusTemplateService.softDeleteTemplateForManager(templateId, managerBranchId);
        return ApiResponse.<Void>builder()
                .message("Bonus template deleted successfully")
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

