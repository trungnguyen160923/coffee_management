package com.service.auth.repository.http_client;

import com.service.auth.configuration.AuthenticationRequestInterceptor;
import com.service.auth.dto.request.CustomerProfileCreationRequest;
import com.service.auth.dto.response.ApiResponse;
import com.service.auth.dto.response.CustomerProfileResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;


@FeignClient(
        name = "profile-service",
        url = "${app.services.profile}",
        configuration = {AuthenticationRequestInterceptor.class})
public interface ProfileClient {
    @PostMapping(value = "/internal/customer-profiles", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<CustomerProfileResponse> createProfile(@RequestBody CustomerProfileCreationRequest request);
}
