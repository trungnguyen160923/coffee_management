package com.caffee_management.api_gateway.configuration;

import com.caffee_management.api_gateway.dto.ApiResponse;
import com.caffee_management.api_gateway.service.AuthService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.Arrays;
import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PACKAGE, makeFinal = true)
public class AuthenticationFilter implements GlobalFilter, Ordered {
    AuthService authService;
    ObjectMapper objectMapper;

    @NonFinal
    private String[] publicEndpoints = {
            "/auth-service/auth/.*",
            "/auth-service/users/registration",
            "/auth-service/users-v2/create-customer",
            "/order-service/api/branches.*",
            "/order-service/api/branches",
            "/order-service/api/reservations",
            // Public reservation tracking endpoint
            "/order-service/api/reservations/public/.*",
            // Public order tracking endpoint
            "/order-service/api/orders/public/.*",
            // Make cart endpoints public (no token required)
            "/order-service/api/cart",
            "/order-service/api/cart/.*",
            // Make guest order endpoint public (no token required)
            "/order-service/api/orders/guest",
            // Make discount endpoints public (no token required for guest users)
            "/order-service/api/discounts/validate",
            "/order-service/api/discounts/apply",
            "/order-service/api/discounts/available",
            "/catalogs/sizes",
            "/catalogs/files/images/products/.*",
            "/catalogs/products",
            "/catalogs/products/.*",
            "/catalogs/products/detail/.*",
            // Public categories endpoints
            "/catalogs/categories",
            "/catalogs/categories/.*",
            "/order-service/api/email/send-order-confirmation",
            "/order-service/api/email/send-order-confirmation/.*",
            // Provinces proxy endpoints (public)
            "/provinces/.*",

            // Public purchase order endpoints
            "/catalogs/public/purchase-orders/.*",
            "/catalogs/public/purchase-orders",
            "/catalogs/public/purchase-orders/*",
            "/catalogs/public/purchase-orders/*/*",
            "/catalogs/public/purchase-orders/*/*/*",

            // Public stock endpoints
            "/catalogs/stocks/check-and-reserve",
            "/catalogs/stocks/check-and-reserve/.*",
            "/catalogs/stocks/.*",

            // Public reviews endpoints
            "/order-service/reviews/filter",
            // Analytics endpoints for AI Service (no authentication required)
            "/order-service/api/analytics/metrics",
            "/order-service/api/analytics/metrics/.*",
            // AI Service endpoints (no authentication required for metrics)
            "/ai/.*",
            
            // Actuator endpoints (health checks, metrics, etc.) - all methods
            "/profiles/actuator/.*",
            "/notification-service/actuator/.*",
            "/catalogs/actuator/.*",  // Match /api/catalogs/actuator/** route
            "/order-service/actuator/.*",
            "/auth-service/actuator/.*",
            "/ai-service/actuator/.*",
            "/ai/actuator/.*",  // Alternative for AI service
            "/actuator/.*",

    };

    @NonFinal
    private String[] publicGetEndpoints = {
        "/profiles/actuator/.*",
        "/notification-service/actuator/.*",
        "/catalogs/actuator/.*",  // Match /api/catalogs/actuator/** route
        "/order-service/actuator/.*",
        "/auth-service/actuator/.*",
        "/ai-service/actuator/.*",
        "/ai/actuator/.*",  // Alternative for AI service
        "/actuator/.*",
    };

    @Value("${app.api-prefix}")
    @NonFinal
    private String apiPrefix;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        String method = exchange.getRequest().getMethod().name();
        
        // Skip authentication for OPTIONS requests (CORS preflight)
        if ("OPTIONS".equals(method)) {
            return chain.filter(exchange);
        }
        
        // Skip authentication for WebSocket handshake and SockJS endpoints
        boolean isWebSocketPath = path.contains("/ws/") || path.contains("/notification-service/ws");
        
        if (isWebSocketPath) {
            return chain.filter(exchange);
        }

        if (isPublicEndpoint(exchange.getRequest()))
            return chain.filter(exchange);

        // Get token from authorization header
        List<String> authHeader = exchange.getRequest().getHeaders().get(HttpHeaders.AUTHORIZATION);
        if (CollectionUtils.isEmpty(authHeader))
            return unauthenticated(exchange.getResponse());

        String token = authHeader.getFirst().replace("Bearer ", "");

        return authService.introspect(token).flatMap(introspectResponse -> {
            if (introspectResponse.getResult().isValid())
                return chain.filter(exchange);
            else
                return unauthenticated(exchange.getResponse());
        }).onErrorResume(throwable -> unauthenticated(exchange.getResponse()));
    }

    @Override
    public int getOrder() {
        return -1;
    }

    private boolean isPublicEndpoint(ServerHttpRequest request) {
        String requestPath = request.getURI().getPath();
        String method = request.getMethod().name();
        
        // Check public endpoints (all methods)
        boolean isPublic = Arrays.stream(publicEndpoints)
                .anyMatch(pattern -> {
                    String fullPattern = apiPrefix + pattern;
                    return requestPath.matches(fullPattern);
                });
        
        // Check public GET endpoints
        if (!isPublic && "GET".equals(method)) {
            isPublic = Arrays.stream(publicGetEndpoints)
                    .anyMatch(pattern -> {
                        String fullPattern = apiPrefix + pattern;
                        return requestPath.matches(fullPattern);
                    });
        }
        
        return isPublic;
    }

    Mono<Void> unauthenticated(ServerHttpResponse response) {
        ApiResponse<?> apiResponse = ApiResponse.builder()
                .code(1401)
                .message("Unauthenticated")
                .build();

        String body = null;
        try {
            body = objectMapper.writeValueAsString(apiResponse);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }

        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().add(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);

        return response.writeWith(
                Mono.just(response.bufferFactory().wrap(body.getBytes())));
    }
}
