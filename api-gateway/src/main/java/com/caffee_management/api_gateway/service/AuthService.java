package com.caffee_management.api_gateway.service;

import com.caffee_management.api_gateway.dto.ApiResponse;
import com.caffee_management.api_gateway.dto.request.IntrospectRequest;
import com.caffee_management.api_gateway.dto.response.IntrospectResponse;
import com.caffee_management.api_gateway.repository.AuthClient;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthService {
    AuthClient authClient;

    public Mono<ApiResponse<IntrospectResponse>> introspect(String token){
        return authClient.introspect(IntrospectRequest.builder()
                        .token(token)
                .build());
    }
}
