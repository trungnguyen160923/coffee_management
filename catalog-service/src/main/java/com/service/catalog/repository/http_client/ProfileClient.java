package com.service.catalog.repository.http_client;

import com.service.catalog.dto.ApiResponse;
import lombok.Data;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;

@FeignClient(
        name = "profile-service",
        url = "${PROFILE_SERVICE_URL:http://localhost:8003}",
        configuration = {com.service.catalog.configuration.AuthenticationRequestInterceptor.class})
public interface ProfileClient {

    /**
     * Get active shift assignment for current staff (based on JWT token)
     */
    @GetMapping(value = "/shift-assignments/my-active-shift", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<ShiftAssignmentResponse> getMyActiveShift();

    @Data
    class ShiftAssignmentResponse {
        private Integer assignmentId;
        private Integer shiftId;
        private Integer staffUserId;
        private String status;
    }
}

