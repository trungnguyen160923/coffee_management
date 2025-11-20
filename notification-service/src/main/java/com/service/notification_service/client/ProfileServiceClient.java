package com.service.notification_service.client;

import java.util.List;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import com.service.notification_service.dto.ApiResponse;
import com.service.notification_service.dto.response.StaffProfileResponse;

@FeignClient(name = "profile-service", url = "${app.services.profile}")
public interface ProfileServiceClient {

    @GetMapping("/staff-profiles/branch/{branchId}")
    ApiResponse<List<StaffProfileResponse>> getStaffByBranch(@PathVariable("branchId") Integer branchId);
}

