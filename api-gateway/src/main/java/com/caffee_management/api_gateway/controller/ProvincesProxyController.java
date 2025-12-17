package com.caffee_management.api_gateway.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/provinces")
@RequiredArgsConstructor
@Slf4j
public class ProvincesProxyController {

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String BASE_URL = "https://provinces.open-api.vn/api";
    private static final String FALLBACK_BASE_URL = "https://vapi.vnappmob.com/api/v2";

    @GetMapping({ "/p", "/p/" })
    public Mono<ResponseEntity<?>> getProvinces() {
        log.info("Fetching provinces from external API");

        WebClient primaryClient = webClientBuilder
                .baseUrl(BASE_URL)
                .defaultHeader("User-Agent", "Coffee Management System")
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(1024 * 1024))
                .build();

        return primaryClient
                .get()
                .uri("/") // Use root endpoint for provinces
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
                    log.warn("Primary API failed, trying fallback API: {}", throwable.getMessage());
                    return fetchProvincesFromFallback();
                });
    }

    private Mono<ResponseEntity<?>> fetchProvincesFromFallback() {
        log.info("Fetching provinces from fallback API (vAPI)");
        WebClient fallbackClient = webClientBuilder
                .baseUrl(FALLBACK_BASE_URL)
                .defaultHeader("User-Agent", "Coffee Management System")
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(1024 * 1024))
                .build();

        return fallbackClient
                .get()
                .uri("/province/")
                .header("Accept", "application/json")
                .retrieve()
                .bodyToMono(String.class)
                .map(responseBody -> {
                    try {
                        JsonNode jsonNode = objectMapper.readTree(responseBody);
                        List<Map<String, Object>> normalizedList = new ArrayList<>();
                        
                        // vAPI có thể trả về {results: [...]} hoặc array trực tiếp
                        JsonNode results = jsonNode.isArray() ? jsonNode : jsonNode.get("results");
                        if (results == null) {
                            results = jsonNode;
                        }
                        
                        if (results.isArray()) {
                            for (JsonNode item : results) {
                                Map<String, Object> province = objectMapper.convertValue(item, new TypeReference<Map<String, Object>>() {});
                                // Normalize field names: vAPI dùng "province_id", "province_name" -> chuyển thành "code", "name"
                                Map<String, Object> normalized = new LinkedHashMap<>();
                                normalized.put("code", province.getOrDefault("province_id", province.getOrDefault("code", "")).toString());
                                normalized.put("name", province.getOrDefault("province_name", province.getOrDefault("name", "")).toString());
                                normalizedList.add(normalized);
                            }
                        }
                        
                        return ResponseEntity.ok(normalizedList);
                    } catch (Exception e) {
                        log.error("Failed to parse fallback API response: {}", responseBody, e);
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body(Map.of("error", "Invalid response format from fallback API",
                                        "details", "Failed to normalize response: " + e.getMessage()));
                    }
                })
                .onErrorResume(throwable -> {
                    log.error("Both primary and fallback APIs failed: ", throwable);
                    return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body(Map.of("error", "Failed to fetch provinces", "details",
                                    "Both primary and fallback APIs are unavailable: " + throwable.getMessage())));
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

        WebClient primaryClient = webClientBuilder
                .baseUrl(BASE_URL)
                .defaultHeader("User-Agent", "Coffee Management System")
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(1024 * 1024))
                .build();

        return primaryClient
                .get()
                .uri(uri)
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .retrieve()
                .bodyToMono(String.class)
                .map(responseBody -> {
                    try {
                        JsonNode jsonNode = objectMapper.readTree(responseBody);
                        List<Map<String, Object>> normalizedDistricts = new ArrayList<>();
                        
                        // Primary API có thể trả về object với "districts" field hoặc array trực tiếp
                        JsonNode districtsNode = jsonNode.isArray() ? jsonNode : jsonNode.get("districts");
                        if (districtsNode == null && jsonNode.isObject()) {
                            // Nếu không có "districts", có thể là object chứa districts ở root level
                            districtsNode = jsonNode;
                        }
                        
                        if (districtsNode != null && districtsNode.isArray()) {
                            for (JsonNode item : districtsNode) {
                                Map<String, Object> district = objectMapper.convertValue(item, new TypeReference<Map<String, Object>>() {});
                                Map<String, Object> normalized = new LinkedHashMap<>();
                                normalized.put("code", district.getOrDefault("code", "").toString());
                                normalized.put("name", district.getOrDefault("name", "").toString());
                                normalizedDistricts.add(normalized);
                            }
                        }
                        
                        // Luôn trả về format {districts: [...]}
                        Map<String, Object> response = new HashMap<>();
                        response.put("districts", normalizedDistricts);
                        return ResponseEntity.ok((Object) response);
                    } catch (Exception e) {
                        log.error("Failed to parse JSON response: {}", responseBody, e);
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body(Map.of("error", "Invalid response format from external API",
                                        "details", "Failed to normalize response: " + e.getMessage()));
                    }
                })
                .onErrorResume(throwable -> {
                    log.warn("Primary API failed for province {}, trying fallback: {}", provinceCode, throwable.getMessage());
                    return fetchProvinceWithDistrictsFromFallback(provinceCode);
                });
    }

    private Mono<ResponseEntity<?>> fetchProvinceWithDistrictsFromFallback(String provinceCode) {
        log.info("Fetching province {} districts from fallback API", provinceCode);
        WebClient fallbackClient = webClientBuilder
                .baseUrl(FALLBACK_BASE_URL)
                .defaultHeader("User-Agent", "Coffee Management System")
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(1024 * 1024))
                .build();

        return fallbackClient
                .get()
                .uri("/province/district/" + provinceCode)
                .header("Accept", "application/json")
                .retrieve()
                .bodyToMono(String.class)
                .map(responseBody -> {
                    try {
                        JsonNode jsonNode = objectMapper.readTree(responseBody);
                        List<Map<String, Object>> normalizedDistricts = new ArrayList<>();
                        
                        JsonNode results = jsonNode.isArray() ? jsonNode : jsonNode.get("results");
                        if (results == null) {
                            results = jsonNode;
                        }
                        
                        if (results.isArray()) {
                            for (JsonNode item : results) {
                                Map<String, Object> district = objectMapper.convertValue(item, new TypeReference<Map<String, Object>>() {});
                                Map<String, Object> normalized = new LinkedHashMap<>();
                                normalized.put("code", district.getOrDefault("district_id", district.getOrDefault("code", "")).toString());
                                normalized.put("name", district.getOrDefault("district_name", district.getOrDefault("name", "")).toString());
                                normalizedDistricts.add(normalized);
                            }
                        }
                        
                        // Return format giống API cũ: {districts: [...]}
                        Map<String, Object> response = new HashMap<>();
                        response.put("districts", normalizedDistricts);
                        return ResponseEntity.ok((Object) response);
                    } catch (Exception e) {
                        log.error("Failed to parse fallback API response: {}", responseBody, e);
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body(Map.of("error", "Invalid response format from fallback API",
                                        "details", "Failed to normalize response: " + e.getMessage()));
                    }
                })
                .onErrorResume(throwable -> {
                    log.error("Both primary and fallback APIs failed for province {}: ", provinceCode, throwable);
                    return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body(Map.of("error", "Failed to fetch province", "details",
                                    "Both primary and fallback APIs are unavailable: " + throwable.getMessage())));
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

        WebClient primaryClient = webClientBuilder
                .baseUrl(BASE_URL)
                .defaultHeader("User-Agent", "Coffee Management System")
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(1024 * 1024))
                .build();

        return primaryClient
                .get()
                .uri(uri)
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .retrieve()
                .bodyToMono(String.class)
                .map(responseBody -> {
                    try {
                        JsonNode jsonNode = objectMapper.readTree(responseBody);
                        List<Map<String, Object>> normalizedWards = new ArrayList<>();
                        
                        // Primary API có thể trả về object với "wards" field hoặc array trực tiếp
                        JsonNode wardsNode = jsonNode.isArray() ? jsonNode : jsonNode.get("wards");
                        if (wardsNode == null && jsonNode.isObject()) {
                            wardsNode = jsonNode;
                        }
                        
                        if (wardsNode != null && wardsNode.isArray()) {
                            for (JsonNode item : wardsNode) {
                                Map<String, Object> ward = objectMapper.convertValue(item, new TypeReference<Map<String, Object>>() {});
                                Map<String, Object> normalized = new LinkedHashMap<>();
                                normalized.put("code", ward.getOrDefault("code", "").toString());
                                normalized.put("name", ward.getOrDefault("name", "").toString());
                                normalizedWards.add(normalized);
                            }
                        }
                        
                        // Luôn trả về format {wards: [...]}
                        Map<String, Object> response = new HashMap<>();
                        response.put("wards", normalizedWards);
                        return ResponseEntity.ok((Object) response);
                    } catch (Exception e) {
                        log.error("Failed to parse JSON response: {}", responseBody, e);
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body(Map.of("error", "Invalid response format from external API",
                                        "details", "Failed to normalize response: " + e.getMessage()));
                    }
                })
                .onErrorResume(throwable -> {
                    log.warn("Primary API failed for district {}, trying fallback: {}", districtCode, throwable.getMessage());
                    return fetchDistrictWithWardsFromFallback(districtCode);
                });
    }

    private Mono<ResponseEntity<?>> fetchDistrictWithWardsFromFallback(String districtCode) {
        log.info("Fetching district {} wards from fallback API", districtCode);
        WebClient fallbackClient = webClientBuilder
                .baseUrl(FALLBACK_BASE_URL)
                .defaultHeader("User-Agent", "Coffee Management System")
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(1024 * 1024))
                .build();

        return fallbackClient
                .get()
                .uri("/province/ward/" + districtCode)
                .header("Accept", "application/json")
                .retrieve()
                .bodyToMono(String.class)
                .map(responseBody -> {
                    try {
                        JsonNode jsonNode = objectMapper.readTree(responseBody);
                        List<Map<String, Object>> normalizedWards = new ArrayList<>();
                        
                        JsonNode results = jsonNode.isArray() ? jsonNode : jsonNode.get("results");
                        if (results == null) {
                            results = jsonNode;
                        }
                        
                        if (results.isArray()) {
                            for (JsonNode item : results) {
                                Map<String, Object> ward = objectMapper.convertValue(item, new TypeReference<Map<String, Object>>() {});
                                Map<String, Object> normalized = new LinkedHashMap<>();
                                normalized.put("code", ward.getOrDefault("ward_id", ward.getOrDefault("code", "")).toString());
                                normalized.put("name", ward.getOrDefault("ward_name", ward.getOrDefault("name", "")).toString());
                                normalizedWards.add(normalized);
                            }
                        }
                        
                        // Return format giống API cũ: {wards: [...]}
                        Map<String, Object> response = new HashMap<>();
                        response.put("wards", normalizedWards);
                        return ResponseEntity.ok((Object) response);
                    } catch (Exception e) {
                        log.error("Failed to parse fallback API response: {}", responseBody, e);
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body(Map.of("error", "Invalid response format from fallback API",
                                        "details", "Failed to normalize response: " + e.getMessage()));
                    }
                })
                .onErrorResume(throwable -> {
                    log.error("Both primary and fallback APIs failed for district {}: ", districtCode, throwable);
                    return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body(Map.of("error", "Failed to fetch district", "details",
                                    "Both primary and fallback APIs are unavailable: " + throwable.getMessage())));
                });
    }
}
