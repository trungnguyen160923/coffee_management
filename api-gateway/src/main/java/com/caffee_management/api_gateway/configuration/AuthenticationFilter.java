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
            "/order-service/api/branches.*",
            "/order-service/api/branches",
            "/order-service/api/reservations",
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
            "/catalogs/public/purchase-orders/*/*/*"
    };

    @Value("${app.api-prefix}")
    @NonFinal
    private String apiPrefix;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        log.info("Enter authentication filter....");

        if (isPublicEndpoint(exchange.getRequest()))
            return chain.filter(exchange);

        // Get token from authorization header
        List<String> authHeader = exchange.getRequest().getHeaders().get(HttpHeaders.AUTHORIZATION);
        if (CollectionUtils.isEmpty(authHeader))
            return unauthenticated(exchange.getResponse());

        String token = authHeader.getFirst().replace("Bearer ", "");
        log.info("Token: {}", token);

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
        log.info("Request Path: {}", request.getURI().getPath());
        return Arrays.stream(publicEndpoints)
                .anyMatch(s -> request.getURI().getPath().matches(apiPrefix + s));
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
