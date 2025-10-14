package com.service.catalog.repository.http_client;

import com.service.catalog.dto.ApiResponse;
import com.service.catalog.dto.response.UserResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(
        name = "auth-service",
        url = "${app.services.auth}",
        configuration = {com.service.catalog.configuration.AuthenticationRequestInterceptor.class})
public interface UserClient {
    
    @GetMapping(value = "/auth-service/users/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<UserResponse> getUserById(@PathVariable Integer id);
}
