
package com.service.profile.controller;

import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.request.StaffProfileCreationRequest;
import com.service.profile.dto.response.StaffProfileResponse;
import com.service.profile.service.StaffProfileService;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

import org.springframework.web.bind.annotation.PostMapping;
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
}
