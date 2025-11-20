package com.service.notification_service.configuration;

import java.util.List;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableConfigurationProperties(CorsProperties.class)
public class CorsConfig {

    private final CorsProperties corsProperties;

    public CorsConfig(CorsProperties corsProperties) {
        this.corsProperties = corsProperties;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration corsConfiguration = new CorsConfiguration();
        corsConfiguration.setAllowedOrigins(corsProperties.getAllowedOrigins());
        corsConfiguration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        corsConfiguration.setAllowedHeaders(List.of("*"));
        corsConfiguration.setAllowCredentials(true);
        corsConfiguration.setExposedHeaders(List.of("Content-Disposition"));
        corsConfiguration.setMaxAge(3600L);

        // Disable CORS for WebSocket paths
        // API Gateway already handles CORS, so we don't want duplicate headers
        CorsConfiguration websocketCorsConfig = new CorsConfiguration();
        // Set empty allowed origins to prevent Spring from adding CORS headers
        websocketCorsConfig.setAllowedOrigins(List.of()); // Empty list = no CORS headers
        websocketCorsConfig.setAllowedMethods(List.of()); // Empty list
        websocketCorsConfig.setAllowedHeaders(List.of()); // Empty list
        websocketCorsConfig.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // Register empty CORS config for WebSocket paths first (more specific, takes precedence)
        source.registerCorsConfiguration("/ws/**", websocketCorsConfig);
        source.registerCorsConfiguration("/notification-service/ws/**", websocketCorsConfig);
        // Then register general CORS configuration for all other paths
        source.registerCorsConfiguration("/**", corsConfiguration);
        return source;
    }
}

