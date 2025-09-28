package orderservice.order_service.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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
            "/api/branches", // Allow public access to get branches list
            "/api/branches/**" // Allow public access to all branch endpoints
    };

    private final CustomJwtDecoder customJwtDecoder;

    public SecurityConfig(CustomJwtDecoder customJwtDecoder) {
        this.customJwtDecoder = customJwtDecoder;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity httpSecurity) throws Exception {
        httpSecurity.authorizeHttpRequests(request -> request
                // Public endpoints - allow all methods
                .requestMatchers(PUBLIC_ENDPOINTS)
                .permitAll()
                // Specific role-based rules for branches (only for non-GET methods)
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
                .hasAnyRole("ADMIN", "MANAGER", "CUSTOMER")
                .requestMatchers(HttpMethod.PUT, "/api/reservations/**")
                .hasAnyRole("ADMIN", "MANAGER")
                .anyRequest()
                .authenticated());

        httpSecurity.oauth2ResourceServer(oauth2 -> oauth2.jwt(jwtConfigurer -> jwtConfigurer
                .decoder(customJwtDecoder)
                .jwtAuthenticationConverter(jwtAuthenticationConverter()))
                .authenticationEntryPoint(new JwtAuthenticationEntryPoint()));
        // CORS disabled - handled by API Gateway to prevent duplicate headers
        httpSecurity.csrf(AbstractHttpConfigurer::disable);

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
