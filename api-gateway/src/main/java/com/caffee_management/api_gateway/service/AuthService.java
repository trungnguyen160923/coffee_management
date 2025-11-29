package com.caffee_management.api_gateway.service;

import com.caffee_management.api_gateway.dto.ApiResponse;
import com.caffee_management.api_gateway.dto.request.IntrospectRequest;
import com.caffee_management.api_gateway.dto.response.IntrospectResponse;
import com.caffee_management.api_gateway.repository.AuthClient;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class AuthService {
    AuthClient authClient;

    public Mono<ApiResponse<IntrospectResponse>> introspect(String token){
        log.info("[AuthService] Calling introspect for token: {}...", token != null && token.length() > 20 ? token.substring(0, 20) : "null");
        return authClient.introspect(IntrospectRequest.builder()
                        .token(token)
                .build())
                .doOnSuccess(response -> {
                    log.info("[AuthService] Introspect response: valid={}", response != null && response.getResult() != null ? response.getResult().isValid() : "null");
                })
                .doOnError(error -> {
                    log.error("[AuthService] Introspect error: {}", error.getMessage(), error);
                });
    }
}
