package com.caffee_management.api_gateway.configuration;

import com.caffee_management.api_gateway.repository.AuthClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.support.WebClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;
import reactor.netty.http.client.HttpClient;

import java.util.List;

@Configuration
public class WebClientConfiguration {
    @Value("${AUTH_SERVICE_URL:http://localhost:8001}")
    private String authServiceUrl;
    
    @Bean
    WebClient webClient() {
        String baseUrl = authServiceUrl + "/auth-service";
        return WebClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    @Bean
    WebClient.Builder webClientBuilder() {
        HttpClient httpClient = HttpClient.create()
                .followRedirect(true);

        return WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient));
    }

    @Bean
    CorsWebFilter corsWebFilter(CorsConfigurationSource corsConfigurationSource) {
        return new CorsWebFilter(corsConfigurationSource);
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration corsConfiguration = new CorsConfiguration();
        corsConfiguration.setAllowedOrigins(List.of(
                // Development
                "http://localhost:5173",
                "http://localhost:8000",
                "http://localhost:3000",
                // Production domains - HTTP (tạm thời, sẽ redirect sang HTTPS)
                "http://coffeemanager.click",
                "http://www.coffeemanager.click",
                "http://admin.coffeemanager.click",
                "http://api.coffeemanager.click",
                // Production domains - HTTPS
                "https://coffeemanager.click",
                "https://www.coffeemanager.click",
                "https://admin.coffeemanager.click",
                "https://api.coffeemanager.click"
                
                ));
        // Allow all headers including custom headers like x-guest-id
        // Note: When allowCredentials is true, "*" doesn't work for custom headers
        // So we explicitly add common headers
        corsConfiguration.addAllowedHeader("*");  // Allow all standard headers
        corsConfiguration.addAllowedHeader("x-guest-id");  // Custom header for guest cart
        corsConfiguration.addAllowedHeader("X-Guest-Id");
        corsConfiguration.addAllowedHeader("Authorization");
        corsConfiguration.addAllowedHeader("Content-Type");
        corsConfiguration.addAllowedHeader("X-Requested-With");
        corsConfiguration.addAllowedHeader("Accept");
        corsConfiguration.addAllowedHeader("Origin");
        corsConfiguration.addAllowedHeader("Access-Control-Request-Method");
        corsConfiguration.addAllowedHeader("Access-Control-Request-Headers");
        corsConfiguration.setAllowedMethods(List.of("*"));
        corsConfiguration.setAllowCredentials(true);
        // Cache preflight requests for 1 hour
        corsConfiguration.setMaxAge(3600L);
        // Expose headers that might be needed by the client
        corsConfiguration.setExposedHeaders(List.of(
                "Content-Disposition",
                "Content-Type",
                "Content-Length",
                "Location",
                "x-guest-id",
                "X-Guest-Id"
        ));

        UrlBasedCorsConfigurationSource urlBasedCorsConfigurationSource = new UrlBasedCorsConfigurationSource();
        urlBasedCorsConfigurationSource.registerCorsConfiguration("/**", corsConfiguration);

        return urlBasedCorsConfigurationSource;
    }

    @Bean
    AuthClient authClient(WebClient webClient) {
        HttpServiceProxyFactory httpServiceProxyFactory = HttpServiceProxyFactory
                .builderFor(WebClientAdapter.create(webClient)).build();

        return httpServiceProxyFactory.createClient(AuthClient.class);
    }

}
