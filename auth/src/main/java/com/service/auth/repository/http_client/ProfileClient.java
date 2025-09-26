package com.service.auth.repository.http_client;

import com.service.auth.configuration.AuthenticationRequestInterceptor;
import com.service.auth.dto.request.CustomerProfileCreationRequest;
import com.service.auth.dto.request.ManagerProfileCreationRequest;
import com.service.auth.dto.request.ManagerProfileRequest;
import com.service.auth.dto.request.StaffProfileCreationRequest;
import com.service.auth.dto.request.StaffProfileRequest;
import com.service.auth.dto.response.ApiResponse;
import com.service.auth.dto.response.CustomerProfileResponse;
import com.service.auth.dto.response.ManagerProfileResponse;
import com.service.auth.dto.response.StaffProfileResponse;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
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
}
