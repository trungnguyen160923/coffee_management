package com.service.profile.controller;

import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.response.AdminProfileResponse;
import com.service.profile.service.AdminProfileService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin-profiles")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class AdminProfileController {
    AdminProfileService adminProfileService;

    @GetMapping("/{userId}")
    ApiResponse<AdminProfileResponse> getAdminProfile(@PathVariable Integer userId) {
        AdminProfileResponse result = adminProfileService.getAdminProfile(userId);
        return ApiResponse.<AdminProfileResponse>builder().result(result).build();
    }
}
