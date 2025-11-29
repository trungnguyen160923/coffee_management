package com.service.catalog.repository.http_client;

import com.service.catalog.dto.ApiResponse;
import com.service.catalog.dto.response.BranchResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(
        name = "order-service",
        url = "${ORDER_SERVICE_URL:http://localhost:8002}",
        configuration = {com.service.catalog.configuration.AuthenticationRequestInterceptor.class})
public interface BranchClient {
    
    @GetMapping(value = "/order-service/api/branches/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<BranchResponse> getBranchById(@PathVariable Integer id);
}
