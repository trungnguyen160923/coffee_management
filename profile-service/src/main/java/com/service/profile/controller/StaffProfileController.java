
package com.service.profile.controller;

import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.request.StaffProfileCreationRequest;
import com.service.profile.dto.request.StaffProfileUpdateRequest;
import com.service.profile.dto.request.StaffProfileFullUpdateRequest;
import com.service.profile.dto.response.StaffProfileResponse;
import com.service.profile.dto.response.StaffWithUserResponse;
import com.service.profile.service.StaffProfileService;

import java.util.List;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/staff-profiles")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class StaffProfileController {
    StaffProfileService staffProfileService;

    @PostMapping
    ApiResponse<StaffProfileResponse> createStaffProfile(@Valid @RequestBody StaffProfileCreationRequest request) {
        StaffProfileResponse result = staffProfileService.createStaffProfile(request);
        return ApiResponse.<StaffProfileResponse>builder().result(result).build();
    }

    @PutMapping("/{userId}")
    ApiResponse<StaffProfileResponse> updateStaffProfile(@PathVariable Integer userId, @Valid @RequestBody StaffProfileUpdateRequest request) {
        StaffProfileResponse result = staffProfileService.updateStaffProfile(userId, request);
        return ApiResponse.<StaffProfileResponse>builder().result(result).build();
    }

    @PutMapping("/full/{userId}")
    ApiResponse<Void> updateStaffProfileFull(@PathVariable Integer userId,
                                             @Valid @RequestBody StaffProfileFullUpdateRequest request) {
        staffProfileService.updateStaffProfileFull(userId, request);
        return ApiResponse.<Void>builder().build();
    }

    @GetMapping
    ApiResponse<List<StaffProfileResponse>> getAllStaffProfiles() {
        List<StaffProfileResponse> result = staffProfileService.getAllStaffProfiles();
        return ApiResponse.<List<StaffProfileResponse>>builder().result(result).build();
    }

    @GetMapping("/{userId}")
    ApiResponse<StaffProfileResponse> getStaffProfile(@PathVariable Integer userId) {
        StaffProfileResponse result = staffProfileService.getStaffProfile(userId);
        return ApiResponse.<StaffProfileResponse>builder().result(result).build();
    }

    @GetMapping("/branch/{branchId}")
    ApiResponse<List<StaffProfileResponse>> getStaffProfilesByBranch(@PathVariable Integer branchId) {
        List<StaffProfileResponse> result = staffProfileService.getStaffProfilesByBranch(branchId);
        return ApiResponse.<List<StaffProfileResponse>>builder().result(result).build();
    }

    /**
     * Public endpoint for internal services (notification-service, etc.)
     * to get staff by branch without authentication
     */
    @GetMapping("/internal/branch/{branchId}")
    ApiResponse<List<StaffProfileResponse>> getStaffProfilesByBranchInternal(@PathVariable Integer branchId) {
        List<StaffProfileResponse> result = staffProfileService.getStaffProfilesByBranchInternal(branchId);
        return ApiResponse.<List<StaffProfileResponse>>builder().result(result).build();
    }

    @DeleteMapping("/{userId}")
    ApiResponse<Void> deleteStaffProfile(@PathVariable Integer userId) {
        staffProfileService.deleteStaffProfile(userId);
        return ApiResponse.<Void>builder().build();
    }

    /**
     * GET /staff-profiles/branch/{branchId}/with-user-info
     * Lấy danh sách nhân viên ở chi nhánh kèm thông tin đầy đủ từ auth-service
     */
    @GetMapping("/branch/{branchId}/with-user-info")
    ApiResponse<List<StaffWithUserResponse>> getStaffsWithUserInfoByBranch(@PathVariable Integer branchId) {
        List<StaffWithUserResponse> result = staffProfileService.getStaffsWithUserInfoByBranch(branchId);
        return ApiResponse.<List<StaffWithUserResponse>>builder().result(result).build();
    }
}
