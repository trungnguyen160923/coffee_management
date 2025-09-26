
package com.service.profile.controller;

import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.request.ManagerProfileCreationRequest;
import com.service.profile.dto.response.ManagerProfileResponse;
import com.service.profile.service.ManagerProfileService;

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
    
}
