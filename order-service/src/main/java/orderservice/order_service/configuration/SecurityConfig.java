package orderservice.order_service.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private static final String[] PUBLIC_ENDPOINTS = {
            "/customer-profiles/internal",
            // Internal branch endpoints used by Kafka listeners / other services
            // Must be accessible without authentication to avoid 401 between services
            "/api/branches/internal/**",
            // Note: /api/branches GET is public, but POST/PUT/DELETE (non-internal) require ADMIN role
            // So we don't add generic /api/branches here - let it go through protectedFilterChain
            "/api/cart",
            "/api/cart/**",
            "/api/orders/guest", // Allow guest checkout without authentication
            "/api/email/send-order-confirmation", // Allow public access to email confirmation
            "/api/discounts/validate", // Allow public access to discount validation
            "/api/discounts/apply", // Allow public access to discount application
            "/api/discounts/available",// Allow public access to available discounts
            "/reviews/filter",
            "/api/reservations/public/**", // Allow public access to track reservation status
            "/api/orders/public/**", // Allow public access to track order status
            "/api/analytics/metrics/**", // Allow access for AI service
            "/api/analytics/metrics/revenue/all", // Allow public access to all branches revenue metrics (for admin)
            "/api/analytics/metrics/customers/all", // Allow public access to all branches customer metrics (for admin)
            "/api/analytics/metrics/products/all", // Allow public access to all branches product metrics (for admin)
            "/api/analytics/metrics/reviews/all", // Allow public access to all branches review metrics (for admin)
            "/actuator/**", // Allow actuator endpoints (health checks, metrics, etc.) without authentication
            "/v3/api-docs/**", "/v3/api-docs", // Allow OpenAPI endpoints
            "/swagger-ui/**", "/swagger-ui.html" // Allow Swagger UI endpoints
    };

    private final CustomJwtDecoder customJwtDecoder;

    public SecurityConfig(CustomJwtDecoder customJwtDecoder) {
        this.customJwtDecoder = customJwtDecoder;
    }
    @Bean
    @Order(1)
    public SecurityFilterChain publicFilterChain(HttpSecurity httpSecurity) throws Exception {
        httpSecurity
                .securityMatcher(PUBLIC_ENDPOINTS)
                .authorizeHttpRequests(request -> request
                        .anyRequest()
                        .permitAll())
                .csrf(AbstractHttpConfigurer::disable);

        return httpSecurity.build();
    }
    @Bean
    @Order(2)
    public SecurityFilterChain protectedFilterChain(HttpSecurity httpSecurity) throws Exception {
        httpSecurity
                .authorizeHttpRequests(request -> request
                        // Actuator endpoints are public (handled by publicFilterChain, but add here as fallback)
                        .requestMatchers("/actuator/**")
                        .permitAll()
                        // Branches: GET is public, POST/PUT/DELETE require ADMIN
                        // Exception: POST /api/branches/nearest/** is public for branch selection
                        .requestMatchers(HttpMethod.GET, "/api/branches")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/branches/**")
                        .permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/branches/nearest/**")
                        .permitAll() // Allow public access to branch selection endpoints
                        .requestMatchers(HttpMethod.POST, "/api/branches")
                        .hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/branches/**")
                        .hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/branches/**")
                        .hasRole("ADMIN")
                        // Reservation access rules
                        .requestMatchers(HttpMethod.POST, "/api/reservations")
                        .permitAll() // Allow both authenticated and non-authenticated users
                        .requestMatchers(HttpMethod.GET, "/api/reservations/**")
                        .hasAnyRole("ADMIN", "MANAGER", "CUSTOMER", "STAFF")
                        .requestMatchers(HttpMethod.PUT, "/api/reservations/**")
                        .hasAnyRole("ADMIN", "MANAGER", "CUSTOMER", "STAFF")
                        .requestMatchers(HttpMethod.DELETE, "/api/reservations/**")
                        .hasAnyRole("ADMIN", "MANAGER", "STAFF")
                        // Table management access rules for Manager
                        .requestMatchers("/api/staff/tables/**")
                        .hasAnyRole("ADMIN", "MANAGER", "STAFF")
                        // POS API access rules for Staff
                        .requestMatchers("/api/pos/**")
                        .hasAnyRole("ADMIN", "MANAGER", "STAFF")
                        .anyRequest()
                        .authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwtConfigurer -> jwtConfigurer
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
