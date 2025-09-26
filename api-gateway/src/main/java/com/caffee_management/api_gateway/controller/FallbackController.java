package com.caffee_management.api_gateway.controller;

import com.caffee_management.api_gateway.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class FallbackController {

    @GetMapping("/fallback")
    public ResponseEntity<ApiResponse<String>> fallback() {
        ApiResponse<String> response = ApiResponse.<String>builder()
                .code(9999)
                .message("Service is not available")
                .build();
        
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }
}
