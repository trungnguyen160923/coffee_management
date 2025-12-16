
package com.service.profile.controller;

import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.request.AssignManagerRequest;
import com.service.profile.dto.request.AssignManagerRequest_;
import com.service.profile.dto.request.ManagerProfileCreationRequest;
import com.service.profile.dto.request.ManagerProfileUpdateRequest;
import com.service.profile.dto.response.ManagerProfileResponse;
import com.service.profile.service.ManagerProfileService;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/manager-profiles")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ManagerProfileController {
    ManagerProfileService managerProfileService;

    @PostMapping
    ApiResponse<ManagerProfileResponse> createManagerProfile(@Valid @RequestBody ManagerProfileCreationRequest request) {
        ManagerProfileResponse result = managerProfileService.createManagerProfile(request);
        return ApiResponse.<ManagerProfileResponse>builder().result(result).build();
    }

    @GetMapping("/{userId}")
    ApiResponse<ManagerProfileResponse> getManagerProfile(@PathVariable Integer userId) {
        ManagerProfileResponse result = managerProfileService.getManagerProfile(userId);
        return ApiResponse.<ManagerProfileResponse>builder().result(result).build();
    }

    @GetMapping
    ApiResponse<List<ManagerProfileResponse>> getAllManagerProfiles() {
        List<ManagerProfileResponse> result = managerProfileService.getAllManagerProfiles();
        return ApiResponse.<List<ManagerProfileResponse>>builder().result(result).build();
    }

    @PutMapping("/{userId}")
    ApiResponse<ManagerProfileResponse> updateManagerProfile(@PathVariable Integer userId, @Valid @RequestBody ManagerProfileUpdateRequest request) {
        ManagerProfileResponse result = managerProfileService.updateManagerProfile(userId, request);
        return ApiResponse.<ManagerProfileResponse>builder().result(result).build();
    }

    @PutMapping("/{userId}/own")
    ApiResponse<ManagerProfileResponse> updateOwnManagerProfile(@PathVariable Integer userId, @Valid @RequestBody ManagerProfileUpdateRequest request) {
        ManagerProfileResponse result = managerProfileService.updateOwnManagerProfile(userId, request);
        return ApiResponse.<ManagerProfileResponse>builder().result(result).build();
    }

    @PutMapping("/unassign-manager/{userId}")
    ApiResponse<Void> unassignManager(@PathVariable Integer userId) {
         managerProfileService.unassignManager(userId);
        return ApiResponse.<Void>builder()
            .code(200)
            .message("Unassign manager successfully")
            .build();
    }

    @PutMapping("/assign-manager")
    ApiResponse<Void> assignManager(@Valid @RequestBody AssignManagerRequest_ request) {
         managerProfileService.assignManager(request);
        return ApiResponse.<Void>builder()
            .code(200)
            .message("Assign manager successfully")
            .build();
    }
}
