package com.service.profile.controller;

import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.request.ApplyTemplateRequest;
import com.service.profile.dto.request.BonusCreationRequest;
import com.service.profile.dto.response.BonusResponse;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.service.BonusService;
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
@RequestMapping("/bonuses")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class BonusController {

    BonusService bonusService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<BonusResponse> createBonus(@Valid @RequestBody BonusCreationRequest request) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        BonusResponse result = bonusService.createBonus(request, currentUserId, currentUserRole);
        return ApiResponse.<BonusResponse>builder()
                .result(result)
                .message("Bonus created successfully")
                .build();
    }

    @PostMapping("/apply-template")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<BonusResponse> applyTemplate(@Valid @RequestBody ApplyTemplateRequest request) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        BonusResponse result = bonusService.createBonusFromTemplate(request, currentUserId, currentUserRole);
        return ApiResponse.<BonusResponse>builder()
                .result(result)
                .message("Bonus created from template successfully")
                .build();
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    public ApiResponse<List<BonusResponse>> getBonuses(
            @RequestParam(required = false) Integer userId,
            @RequestParam(required = false) Integer branchId,
            @RequestParam(required = false) String period,
            @RequestParam(required = false) String status
    ) {
        List<BonusResponse> result = bonusService.getBonuses(userId, branchId, period, status);
        return ApiResponse.<List<BonusResponse>>builder()
                .result(result)
                .build();
    }

    @GetMapping("/by-shift")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<List<BonusResponse>> getBonusesByShift(
            @RequestParam(required = false) Integer shiftId,
            @RequestParam(required = false) Integer userId
    ) {
        List<BonusResponse> result = bonusService.getBonusesByShift(shiftId, userId);
        return ApiResponse.<List<BonusResponse>>builder()
                .result(result)
                .build();
    }

    @GetMapping("/{bonusId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    public ApiResponse<BonusResponse> getBonusById(@PathVariable Integer bonusId) {
        BonusResponse result = bonusService.getBonusById(bonusId);
        return ApiResponse.<BonusResponse>builder()
                .result(result)
                .build();
    }

    @PutMapping("/{bonusId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<BonusResponse> updateBonus(
            @PathVariable Integer bonusId,
            @Valid @RequestBody BonusCreationRequest request
    ) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        BonusResponse result = bonusService.updateBonus(bonusId, request, currentUserId, currentUserRole);
        return ApiResponse.<BonusResponse>builder()
                .result(result)
                .message("Bonus updated successfully")
                .build();
    }

    @PutMapping("/{bonusId}/approve")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<BonusResponse> approveBonus(@PathVariable Integer bonusId) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        BonusResponse result = bonusService.approveBonus(bonusId, currentUserId, currentUserRole);
        return ApiResponse.<BonusResponse>builder()
                .result(result)
                .message("Bonus approved successfully")
                .build();
    }

    @PutMapping("/{bonusId}/reject")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<BonusResponse> rejectBonus(
            @PathVariable Integer bonusId,
            @RequestBody(required = false) String rejectionReason
    ) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        BonusResponse result = bonusService.rejectBonus(bonusId, rejectionReason, currentUserId, currentUserRole);
        return ApiResponse.<BonusResponse>builder()
                .result(result)
                .message("Bonus rejected successfully")
                .build();
    }

    @DeleteMapping("/{bonusId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<Void> deleteBonus(@PathVariable Integer bonusId) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        bonusService.deleteBonus(bonusId, currentUserId, currentUserRole);
        return ApiResponse.<Void>builder()
                .message("Bonus deleted successfully")
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

