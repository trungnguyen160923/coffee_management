package com.service.profile.controller;

import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.request.ApplyTemplateRequest;
import com.service.profile.dto.request.PenaltyCreationRequest;
import com.service.profile.dto.response.PenaltyResponse;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.service.PenaltyService;
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
@RequestMapping("/penalties")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class PenaltyController {

    PenaltyService penaltyService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<PenaltyResponse> createPenalty(@Valid @RequestBody PenaltyCreationRequest request) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        PenaltyResponse result = penaltyService.createPenalty(request, currentUserId, currentUserRole);
        return ApiResponse.<PenaltyResponse>builder()
                .result(result)
                .message("Penalty created successfully")
                .build();
    }

    @PostMapping("/apply-template")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<PenaltyResponse> applyTemplate(@Valid @RequestBody ApplyTemplateRequest request) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        PenaltyResponse result = penaltyService.createPenaltyFromTemplate(request, currentUserId, currentUserRole);
        return ApiResponse.<PenaltyResponse>builder()
                .result(result)
                .message("Penalty created from template successfully")
                .build();
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    public ApiResponse<List<PenaltyResponse>> getPenalties(
            @RequestParam(required = false) Integer userId,
            @RequestParam(required = false) Integer branchId,
            @RequestParam(required = false) String period,
            @RequestParam(required = false) String status
    ) {
        List<PenaltyResponse> result = penaltyService.getPenalties(userId, branchId, period, status);
        return ApiResponse.<List<PenaltyResponse>>builder()
                .result(result)
                .build();
    }

    @GetMapping("/by-shift")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<List<PenaltyResponse>> getPenaltiesByShift(
            @RequestParam(required = false) Integer shiftId,
            @RequestParam(required = false) Integer userId
    ) {
        List<PenaltyResponse> result = penaltyService.getPenaltiesByShift(shiftId, userId);
        return ApiResponse.<List<PenaltyResponse>>builder()
                .result(result)
                .build();
    }

    @GetMapping("/{penaltyId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    public ApiResponse<PenaltyResponse> getPenaltyById(@PathVariable Integer penaltyId) {
        PenaltyResponse result = penaltyService.getPenaltyById(penaltyId);
        return ApiResponse.<PenaltyResponse>builder()
                .result(result)
                .build();
    }

    @PutMapping("/{penaltyId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<PenaltyResponse> updatePenalty(
            @PathVariable Integer penaltyId,
            @Valid @RequestBody PenaltyCreationRequest request
    ) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        PenaltyResponse result = penaltyService.updatePenalty(penaltyId, request, currentUserId, currentUserRole);
        return ApiResponse.<PenaltyResponse>builder()
                .result(result)
                .message("Penalty updated successfully")
                .build();
    }

    @PutMapping("/{penaltyId}/approve")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<PenaltyResponse> approvePenalty(@PathVariable Integer penaltyId) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        PenaltyResponse result = penaltyService.approvePenalty(penaltyId, currentUserId, currentUserRole);
        return ApiResponse.<PenaltyResponse>builder()
                .result(result)
                .message("Penalty approved successfully")
                .build();
    }

    @PutMapping("/{penaltyId}/reject")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<PenaltyResponse> rejectPenalty(
            @PathVariable Integer penaltyId,
            @RequestBody(required = false) String rejectionReason
    ) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        PenaltyResponse result = penaltyService.rejectPenalty(penaltyId, rejectionReason, currentUserId, currentUserRole);
        return ApiResponse.<PenaltyResponse>builder()
                .result(result)
                .message("Penalty rejected successfully")
                .build();
    }

    @DeleteMapping("/{penaltyId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<Void> deletePenalty(@PathVariable Integer penaltyId) {
        Integer currentUserId = getCurrentUserId();
        String currentUserRole = getCurrentUserRole();
        penaltyService.deletePenalty(penaltyId, currentUserId, currentUserRole);
        return ApiResponse.<Void>builder()
                .message("Penalty deleted successfully")
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

