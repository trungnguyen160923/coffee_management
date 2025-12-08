package com.service.profile.repository.http_client;

import com.service.profile.configuration.AuthenticationRequestInterceptor;
import com.service.profile.dto.ApiResponse;

import java.util.Map;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(
        name = "notification-service",
        url = "${app.services.notification}",
        configuration = {AuthenticationRequestInterceptor.class})
public interface NotificationClient {
    
    @PostMapping(value = "/notifications/shifts", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<Void> sendShiftNotification(@RequestBody SendShiftNotificationRequest request);

    // Inner class for request DTO
    record SendShiftNotificationRequest(
            Integer userId,
            Integer branchId,
            String targetRole,
            String type,
            String title,
            String content,
            Map<String, Object> metadata
    ) {}
}

