package com.service.profile.repository.http_client;

import com.service.profile.configuration.AuthenticationRequestInterceptor;
import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.response.UserResponse;

import java.util.List;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(
        name = "auth-service",
        url = "${app.services.auth}",
        configuration = {AuthenticationRequestInterceptor.class})
public interface AuthClient {
    
    /**
     * Lấy danh sách nhân viên theo chi nhánh từ auth-service
     */
    @GetMapping(value = "/users/staffs/branch/{branchId}", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<List<UserResponse>> getStaffsByBranch(@PathVariable Integer branchId);
    
    /**
     * Lấy thông tin user theo userId từ auth-service
     */
    @GetMapping(value = "/users/{userId}", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<UserResponse> getUserById(@PathVariable Integer userId);
    
    /**
     * Internal endpoint - no authentication required
     */
    @GetMapping(value = "/users/internal/{userId}", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<UserResponse> getUserByIdInternal(@PathVariable Integer userId);
}

