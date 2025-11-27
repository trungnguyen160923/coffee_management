package com.service.notification_service.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.core.annotation.Order;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private static final String[] PUBLIC_ENDPOINTS = {"/notifications/internal"};
    private static final String[] PUBLIC_GET_ENDPOINTS = {"/notification-templates/test"};

    private final CustomJwtDecoder customJwtDecoder;

    public SecurityConfig(CustomJwtDecoder customJwtDecoder) {
        this.customJwtDecoder = customJwtDecoder;
    }

    /**
     * SecurityFilterChain for WebSocket endpoints - NO OAuth2ResourceServer, NO FilterSecurityInterceptor
     * This chain matches WebSocket paths and permits all without authentication
     * 
     * CRITICAL FIX: Disable FilterSecurityInterceptor by not calling authorizeHttpRequests
     * Instead, use a custom filter to bypass security completely
     */
    @Bean
    @Order(1)
    public SecurityFilterChain websocketSecurityFilterChain(HttpSecurity httpSecurity) throws Exception {
        httpSecurity
                // Match all possible WebSocket paths (gateway strips prefix, but we need to match both)
                // Note: /**/ws/** is invalid - cannot have anything after **
                .securityMatcher("/ws/**", "/ws", "/notification-service/ws/**", "/notification-service/ws")
                // CRITICAL: Do NOT call authorizeHttpRequests - this prevents FilterSecurityInterceptor from being added
                // Instead, WebSocketSecurityBypassFilter will handle authentication
                .cors(cors -> cors.disable())
                .csrf(AbstractHttpConfigurer::disable);
        
        // NO OAuth2ResourceServer for WebSocket endpoints - this is the key!
        // NO authorizeHttpRequests - this prevents FilterSecurityInterceptor from blocking!
        
        return httpSecurity.build();
    }

    /**
     * SecurityFilterChain for all other endpoints - WITH OAuth2ResourceServer
     */
    @Bean
    @Order(2)
    public SecurityFilterChain filterChain(HttpSecurity httpSecurity) throws Exception {
        httpSecurity
                .authorizeHttpRequests(request -> {
                    request.requestMatchers(HttpMethod.POST, PUBLIC_ENDPOINTS)
                            .permitAll()
                            .requestMatchers(HttpMethod.GET, PUBLIC_GET_ENDPOINTS)
                            .permitAll()
                            .anyRequest()
                            .authenticated();
                })
                .cors(cors -> cors.disable())
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwtConfigurer -> jwtConfigurer
                                .decoder(customJwtDecoder)
                                .jwtAuthenticationConverter(jwtAuthenticationConverter()))
                        .authenticationEntryPoint(new JwtAuthenticationEntryPoint()))
                .csrf(AbstractHttpConfigurer::disable);

        return httpSecurity.build();
    }

    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter jwtGrantedAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();
        jwtGrantedAuthoritiesConverter.setAuthorityPrefix("");

        JwtAuthenticationConverter jwtAuthenticationConverter = new JwtAuthenticationConverter();
        jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(jwtGrantedAuthoritiesConverter);

        return jwtAuthenticationConverter;
    }

}
