package com.service.auth.repository.http_client;

import com.service.auth.configuration.AuthenticationRequestInterceptor;
import com.service.auth.dto.request.CustomerProfileCreationRequest;
import com.service.auth.dto.request.ManagerProfileCreationRequest;
import com.service.auth.dto.request.ManagerProfileRequest;
import com.service.auth.dto.request.StaffProfileCreationRequest;
import com.service.auth.dto.request.StaffProfileRequest;
import com.service.auth.dto.request.StaffUpdateV2Request;
import com.service.auth.dto.response.AdminProfileResponse;
import com.service.auth.dto.response.ApiResponse;
import com.service.auth.dto.response.CustomerProfileResponse;
import com.service.auth.dto.response.ManagerProfileResponse;
import com.service.auth.dto.response.StaffProfileResponse;

import java.util.List;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;


@FeignClient(
        name = "profile-service",
        url = "${app.services.profile}",
        configuration = {AuthenticationRequestInterceptor.class})
public interface ProfileClient {
    @PostMapping(value = "/customer-profiles/internal", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<CustomerProfileResponse> createProfile(@RequestBody CustomerProfileCreationRequest request);

    @PostMapping(value = "/manager-profiles", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<ManagerProfileResponse> createManagerProfile(@RequestBody ManagerProfileRequest request);

    @PostMapping(value = "/staff-profiles", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<StaffProfileResponse> createStaffProfile(@RequestBody StaffProfileRequest request);

    @GetMapping(value = "/customer-profiles/{userId}", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<CustomerProfileResponse> getCustomerProfile(@PathVariable Integer userId);

    @GetMapping(value = "/manager-profiles/{userId}", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<ManagerProfileResponse> getManagerProfile(@PathVariable Integer userId);

    @GetMapping(value = "/staff-profiles/{userId}", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<StaffProfileResponse> getStaffProfile(@PathVariable Integer userId);

    @GetMapping(value = "/admin-profiles/{userId}", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<AdminProfileResponse> getAdminProfile(@PathVariable Integer userId);

    @GetMapping(value = "/manager-profiles", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<List<ManagerProfileResponse>> getAllManagerProfiles();

    @GetMapping(value = "/staff-profiles", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<List<StaffProfileResponse>> getAllStaffProfiles();

    @GetMapping(value = "/staff-profiles/branch/{branchId}", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<List<StaffProfileResponse>> getStaffProfilesByBranch(@PathVariable Integer branchId);

    @GetMapping(value = "/staff-profiles/internal/branch/{branchId}", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<List<StaffProfileResponse>> getStaffProfilesByBranchInternal(@PathVariable Integer branchId);

    @PutMapping(value = "/staff-profiles/full/{userId}", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<Void> updateStaffProfileFull(@PathVariable Integer userId,
                                             @RequestBody StaffUpdateV2Request request);
}
