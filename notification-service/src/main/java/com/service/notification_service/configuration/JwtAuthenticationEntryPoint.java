package com.service.notification_service.configuration;

import java.io.IOException;

import com.service.notification_service.dto.ApiResponse;
import com.service.notification_service.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;

import com.fasterxml.jackson.databind.ObjectMapper;

@Slf4j
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {
    @Override
    public void commence(
            HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
            throws IOException {
        String servletPath = request.getServletPath();
        boolean isWebSocketPath = servletPath.startsWith("/ws") || servletPath.equals("/ws");
        
        log.info("JwtAuthenticationEntryPoint.commence() called for path: {}", servletPath);
        log.info("Is WebSocket path: {}", isWebSocketPath);
        
        // For WebSocket endpoints, do NOT send 403 - allow request to continue to authorizeHttpRequests
        if (isWebSocketPath) {
            log.info("WebSocket endpoint detected in AuthenticationEntryPoint, allowing request to continue");
            // Don't set error status - let the request continue through the filter chain
            // The authorizeHttpRequests will handle permitAll() for WebSocket endpoints
            return;
        }
        
        // For other endpoints, send the standard 403 response
        ErrorCode errorCode = ErrorCode.UNAUTHENTICATED;

        response.setStatus(errorCode.getStatusCode().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        ApiResponse<?> apiResponse = ApiResponse.builder()
                .code(errorCode.getCode())
                .message(errorCode.getMessage())
                .build();

        ObjectMapper objectMapper = new ObjectMapper();

        response.getWriter().write(objectMapper.writeValueAsString(apiResponse));
        response.flushBuffer();
    }
}
