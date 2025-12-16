package com.service.auth.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private static final String[] PUBLIC_ENDPOINTS = {
            "/users/registration", "/auth/token", "/auth/introspect", "/auth/logout", "/auth/refresh", "/users-v2/create-customer",
            "/actuator/**", // Allow actuator endpoints (health checks, metrics, etc.) without authentication
            "/v3/api-docs/**", "/v3/api-docs", // Allow OpenAPI endpoints
            "/swagger-ui/**", "/swagger-ui.html" // Allow Swagger UI endpoints
    };

    private static final String[] PUBLIC_GET_ENDPOINTS = {
            "/users/{userId}", // Allow GET /users/{userId} for internal service calls (by ID)
            "/users/staffs", "/users/customers", "/users/managers", // Allow listing endpoints
            "/users/staffs/**", "/users/customers/**", "/users/managers/**", // Allow nested endpoints
            "/actuator/**", // Allow actuator endpoints (health checks, metrics, etc.) without authentication
    };

    private static final String[] INTERNAL_SERVICE_ENDPOINTS = {
            "/users/internal/**" // Allow internal service calls without authentication
    };

    private final CustomJwtDecoder customJwtDecoder;

    public SecurityConfig(CustomJwtDecoder customJwtDecoder) {
        this.customJwtDecoder = customJwtDecoder;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity httpSecurity) throws Exception {
        httpSecurity.authorizeHttpRequests(request -> request
                .requestMatchers(HttpMethod.POST, PUBLIC_ENDPOINTS)
                .permitAll()
                .requestMatchers(HttpMethod.GET, PUBLIC_ENDPOINTS)
                .permitAll()
                .requestMatchers(HttpMethod.GET, PUBLIC_GET_ENDPOINTS)
                .permitAll()
                .requestMatchers(INTERNAL_SERVICE_ENDPOINTS)
                .permitAll()
                // /users/me requires authentication
                .requestMatchers(HttpMethod.GET, "/users/me")
                .authenticated()
                .anyRequest()
                .authenticated());

        // Only configure OAuth2 resource server for authenticated endpoints
        httpSecurity.oauth2ResourceServer(oauth2 -> oauth2.jwt(jwtConfigurer -> jwtConfigurer
                .decoder(customJwtDecoder)
                .jwtAuthenticationConverter(jwtAuthenticationConverter()))
                .authenticationEntryPoint(new JwtAuthenticationEntryPoint()));

        httpSecurity.csrf(AbstractHttpConfigurer::disable);
        httpSecurity.cors(cors -> cors.disable()); // Disable CORS for internal service calls

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

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }
}
