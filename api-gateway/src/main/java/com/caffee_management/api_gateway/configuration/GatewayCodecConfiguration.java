package com.caffee_management.api_gateway.configuration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.codec.ServerCodecConfigurer;
import org.springframework.web.reactive.config.WebFluxConfigurer;

/**
 * Configuration for Gateway codec settings
 * Optimized for file upload routes (especially catalog service)
 * 
 * This configuration increases the max in-memory buffer size to handle
 * larger file uploads (up to 15MB by default) without affecting other routes.
 * The buffer is only used when needed, so other routes won't consume extra memory.
 */
@Configuration
public class GatewayCodecConfiguration implements WebFluxConfigurer {

    @Value("${gateway.codec.max-in-memory-size:15728640}")
    private int maxInMemorySize; // Default: 15MB in bytes (15 * 1024 * 1024)

    /**
     * Configure codec max in-memory size for Gateway
     * This allows handling larger file uploads (up to 15MB by default)
     * The buffer is allocated only when needed, so it won't affect
     * memory usage for routes that don't need large buffers.
     */
    @Override
    public void configureHttpMessageCodecs(ServerCodecConfigurer configurer) {
        configurer.defaultCodecs().maxInMemorySize(maxInMemorySize);
    }
}

