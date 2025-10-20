package com.service.catalog.repository.http_client;

import com.service.catalog.configuration.AuthenticationRequestInterceptor;
import com.service.catalog.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(
        name = "order-service-client",
        url = "http://localhost:8002",
        configuration = {AuthenticationRequestInterceptor.class})
public interface OrderClient {
    
    /**
     * Kiểm tra branch có tồn tại không
     */
    @GetMapping(value = "/api/branches/{branchId}", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<Object> checkBranchExists(@PathVariable Integer branchId);
    
    /**
     * Kiểm tra cart có tồn tại không
     */
    @GetMapping(value = "/api/cart/{cartId}", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<Object> checkCartExists(@PathVariable Integer cartId);
}
