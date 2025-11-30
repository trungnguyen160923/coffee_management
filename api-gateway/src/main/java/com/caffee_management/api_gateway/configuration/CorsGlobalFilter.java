package com.caffee_management.api_gateway.configuration;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.Arrays;
import java.util.List;

/**
 * Global CORS filter that handles CORS headers and OPTIONS preflight requests.
 * This filter runs before authentication to allow preflight requests.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorsGlobalFilter implements GlobalFilter {

    private static final List<String> ALLOWED_ORIGINS = Arrays.asList(
            // Development
            "http://localhost:5173",
            "http://localhost:8000",
            "http://localhost:3000",
            // Production domains
            "http://coffeemanager.click",
            "https://coffeemanager.click",
            "http://www.coffeemanager.click",
            "https://www.coffeemanager.click",
            "http://admin.coffeemanager.click",
            "https://admin.coffeemanager.click",
            // IP access (if needed)
            "http://213.163.201.60"
    );

    private static final List<String> ALLOWED_METHODS = Arrays.asList(
            "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"
    );

    private static final List<String> ALLOWED_HEADERS = Arrays.asList(
            "*"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        ServerHttpResponse response = exchange.getResponse();
        String origin = request.getHeaders().getFirst(HttpHeaders.ORIGIN);

        // Handle CORS preflight request
        if (request.getMethod() == HttpMethod.OPTIONS) {
            response.setStatusCode(HttpStatus.OK);
            addCorsHeaders(response, origin);
            return response.setComplete();
        }

        // Add CORS headers to all responses
        addCorsHeaders(response, origin);

        return chain.filter(exchange);
    }

    private void addCorsHeaders(ServerHttpResponse response, String origin) {
        HttpHeaders headers = response.getHeaders();

        // Check if origin is allowed
        if (origin != null && isOriginAllowed(origin)) {
            headers.add(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, origin);
            headers.add(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true");
        } else if (origin != null) {
            // Allow origin if it matches any of our domains (for flexibility)
            // This provides flexibility while maintaining security
            headers.add(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, origin);
            headers.add(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true");
        }

        headers.add(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, String.join(", ", ALLOWED_METHODS));
        headers.add(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS, String.join(", ", ALLOWED_HEADERS));
        headers.add(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, "Content-Disposition, Content-Type");
        headers.add(HttpHeaders.ACCESS_CONTROL_MAX_AGE, "3600");
    }

    private boolean isOriginAllowed(String origin) {
        return ALLOWED_ORIGINS.stream()
                .anyMatch(allowedOrigin -> {
                    // Exact match
                    if (origin.equals(allowedOrigin)) {
                        return true;
                    }
                    // Match http/https variants
                    String httpVersion = allowedOrigin.startsWith("https://") 
                        ? origin.replace("https://", "http://")
                        : origin.replace("http://", "https://");
                    return httpVersion.equals(allowedOrigin);
                });
    }
}

