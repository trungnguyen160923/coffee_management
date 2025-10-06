package com.caffee_management.api_gateway.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/provinces")
@RequiredArgsConstructor
@Slf4j
public class ProvincesProxyController {

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String BASE_URL = "https://provinces.open-api.vn/api";

    @GetMapping({ "/p", "/p/" })
    public Mono<ResponseEntity<?>> getProvinces() {
        log.info("Fetching provinces from external API");

        return webClientBuilder
                .baseUrl(BASE_URL)
                .defaultHeader("User-Agent", "Coffee Management System")
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(1024 * 1024))
                .build()
                .get()
                .uri("/") // Use root endpoint for provinces
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .retrieve()
                .bodyToMono(String.class)
                .map(responseBody -> {
                    try {
                        // Try to parse as JSON
                        Object jsonResponse = objectMapper.readValue(responseBody, Object.class);
                        return ResponseEntity.ok(jsonResponse);
                    } catch (Exception e) {
                        log.error("Failed to parse JSON response: {}", responseBody);
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body(Map.of("error", "Invalid response format from external API",
                                        "details", "Expected JSON but received: "
                                                + responseBody.substring(0, Math.min(200, responseBody.length()))));
                    }
                })
                .onErrorResume(throwable -> {
                    log.error("Error fetching provinces: ", throwable);
                    return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body(Map.of("error", "Failed to fetch provinces", "details",
                                    throwable.getMessage())));
                });
    }

    @GetMapping("/p/{provinceCode}")
    public Mono<ResponseEntity<?>> getProvinceWithDistricts(
            @PathVariable String provinceCode,
            @RequestParam(required = false) Integer depth) {
        log.info("Fetching province {} with depth {}", provinceCode, depth);

        String uri = "/p/" + provinceCode;
        if (depth != null) {
            uri += "?depth=" + depth;
        }

        return webClientBuilder
                .baseUrl(BASE_URL)
                .defaultHeader("User-Agent", "Coffee Management System")
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(1024 * 1024))
                .build()
                .get()
                .uri(uri)
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .retrieve()
                .bodyToMono(String.class)
                .map(responseBody -> {
                    try {
                        Object jsonResponse = objectMapper.readValue(responseBody, Object.class);
                        return ResponseEntity.ok(jsonResponse);
                    } catch (Exception e) {
                        log.error("Failed to parse JSON response: {}", responseBody);
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body(Map.of("error", "Invalid response format from external API",
                                        "details", "Expected JSON but received: "
                                                + responseBody.substring(0, Math.min(200, responseBody.length()))));
                    }
                })
                .onErrorResume(throwable -> {
                    log.error("Error fetching province {}: ", provinceCode, throwable);
                    return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body(Map.of("error", "Failed to fetch province", "details",
                                    throwable.getMessage())));
                });
    }

    @GetMapping("/d/{districtCode}")
    public Mono<ResponseEntity<?>> getDistrictWithWards(
            @PathVariable String districtCode,
            @RequestParam(required = false) Integer depth) {
        log.info("Fetching district {} with depth {}", districtCode, depth);

        String uri = "/d/" + districtCode;
        if (depth != null) {
            uri += "?depth=" + depth;
        }

        return webClientBuilder
                .baseUrl(BASE_URL)
                .defaultHeader("User-Agent", "Coffee Management System")
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(1024 * 1024))
                .build()
                .get()
                .uri(uri)
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .retrieve()
                .bodyToMono(String.class)
                .map(responseBody -> {
                    try {
                        Object jsonResponse = objectMapper.readValue(responseBody, Object.class);
                        return ResponseEntity.ok(jsonResponse);
                    } catch (Exception e) {
                        log.error("Failed to parse JSON response: {}", responseBody);
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body(Map.of("error", "Invalid response format from external API",
                                        "details", "Expected JSON but received: "
                                                + responseBody.substring(0, Math.min(200, responseBody.length()))));
                    }
                })
                .onErrorResume(throwable -> {
                    log.error("Error fetching district {}: ", districtCode, throwable);
                    return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body(Map.of("error", "Failed to fetch district", "details",
                                    throwable.getMessage())));
                });
    }
}
