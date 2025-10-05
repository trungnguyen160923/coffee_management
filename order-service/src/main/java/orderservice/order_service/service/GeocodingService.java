package orderservice.order_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import orderservice.order_service.util.VietnameseNormalizer;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import jakarta.annotation.PostConstruct;

@Service
@Slf4j
public class GeocodingService {

    @Value("${geocoding.api.key}")
    private String apiKey;

    private static final String OPENCAGE_URL = "https://api.opencagedata.com/geocode/v1/json";
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public GeocodingService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(10000);
        this.restTemplate = new RestTemplate(factory);
        this.objectMapper = new ObjectMapper();
    }

    @PostConstruct
    private void configureInterceptors() {
        List<ClientHttpRequestInterceptor> interceptors = new ArrayList<>();
        interceptors.add((request, body, execution) -> {
            request.getHeaders().set("User-Agent", "coffee-order-service/1.0");
            request.getHeaders().set("Accept-Language", "vi");
            return execution.execute(request, body);
        });
        this.restTemplate.setInterceptors(interceptors);
        log.info("✅ Geocoding RestTemplate configured for OpenCage Data API (Accept-Language=vi)");
    }

    /**
     * Geocoding địa chỉ thành tọa độ sử dụng OpenCage Data API
     * Tự động chuẩn hóa địa chỉ tiếng Việt để cải thiện khả năng tìm kiếm
     */
    public Coordinates geocodeAddress(String address) {
        log.info("📍 Đang geocoding địa chỉ: {}", address);

        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new RuntimeException("❌ OpenCage API key chưa được cấu hình!");
        }

        // Chuẩn hóa địa chỉ tiếng Việt để cải thiện khả năng geocoding
        String normalizedAddress = address;
        if (VietnameseNormalizer.containsVietnameseAccents(address)) {
            normalizedAddress = VietnameseNormalizer.normalizeVietnameseAddress(address);
            log.info("🔄 Địa chỉ đã chuẩn hóa: {} → {}", address, normalizedAddress);
        }

        String encodedAddress = URLEncoder.encode(normalizedAddress, StandardCharsets.UTF_8);
        log.info("🔍 Encoded address: {}", encodedAddress);
        String url = String.format(
                "%s?q=%s&key=%s&limit=1&countrycode=vn&language=vi",
                OPENCAGE_URL, encodedAddress, apiKey);
        log.info("🌐 Geocoding URL: {}", url);

        int maxAttempts = 3;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                String response = restTemplate.getForObject(url, String.class);
                if (response == null || response.isBlank()) {
                    throw new RuntimeException("Phản hồi rỗng từ OpenCage API");
                }

                log.info("🔍 Raw API response: {}", response);

                JsonNode jsonNode = objectMapper.readTree(response);
                JsonNode results = jsonNode.path("results");

                log.info("🔍 Results node: {}", results);

                if (results.isArray() && results.size() > 0) {
                    JsonNode geometry = results.get(0).path("geometry");
                    log.info("🔍 Geometry node: {}", geometry);

                    if (geometry.has("lat") && geometry.has("lng")) {
                        double lat = geometry.get("lat").asDouble();
                        double lng = geometry.get("lng").asDouble();
                        log.info("🔍 Parsed coordinates: lat={}, lng={}", lat, lng);
                        log.info("✅ Geocoding thành công: {} → ({}, {})", address, lat, lng);
                        return new Coordinates(lat, lng);
                    }
                }

                log.warn("⚠️ Không tìm thấy kết quả hợp lệ trong phản hồi: {}", response);
                throw new RuntimeException("Không tìm thấy tọa độ hợp lệ cho địa chỉ: " + address);

            } catch (HttpStatusCodeException httpEx) {
                HttpStatusCode status = httpEx.getStatusCode();
                boolean retryable = status.value() == 429 || status.is5xxServerError();

                if (status.value() == 401) {
                    log.error("❌ API key không hợp lệ: {}", httpEx.getResponseBodyAsString());
                    throw new RuntimeException("OpenCage API key không hợp lệ!");
                }

                log.warn("🌐 Lỗi HTTP (status={}): {}", status.value(), httpEx.getMessage());
                if (retryable && attempt < maxAttempts) {
                    sleepBackoff(attempt);
                    continue;
                }
                throw new RuntimeException("Geocoding thất bại (" + status.value() + ")");
            } catch (Exception e) {
                log.warn("❌ Lần thử {} thất bại: {}", attempt, e.getMessage());
                if (attempt < maxAttempts) {
                    sleepBackoff(attempt);
                    continue;
                }
                throw new RuntimeException("Geocoding thất bại: " + e.getMessage());
            }
        }

        // Nếu không có kết quả sau 3 lần thử → trả null (để bên gọi xử lý fallback)
        log.error("❌ Geocoding thất bại sau {} lần thử cho địa chỉ: {}", maxAttempts, address);
        return null;
    }

    /**
     * Geocoding với fallback strategy: thử cả địa chỉ gốc và địa chỉ đã chuẩn hóa
     * 
     * @param address Địa chỉ cần geocoding
     * @return Tọa độ nếu thành công, null nếu thất bại
     */
    public Coordinates geocodeAddressWithFallback(String address) {
        log.info("🔄 Geocoding với fallback strategy cho địa chỉ: {}", address);

        // Thử với địa chỉ gốc trước
        try {
            Coordinates result = geocodeAddressOriginal(address);
            if (result != null) {
                log.info("✅ Geocoding thành công với địa chỉ gốc: {}", address);
                return result;
            }
        } catch (Exception e) {
            log.warn("⚠️ Geocoding với địa chỉ gốc thất bại: {}", e.getMessage());
        }

        // Nếu thất bại, thử với địa chỉ đã chuẩn hóa
        if (VietnameseNormalizer.containsVietnameseAccents(address)) {
            String normalizedAddress = VietnameseNormalizer.normalizeVietnameseAddress(address);
            log.info("🔄 Thử geocoding với địa chỉ đã chuẩn hóa: {}", normalizedAddress);

            try {
                Coordinates result = geocodeAddressOriginal(normalizedAddress);
                if (result != null) {
                    log.info("✅ Geocoding thành công với địa chỉ đã chuẩn hóa: {} → {}", address, normalizedAddress);
                    return result;
                }
            } catch (Exception e) {
                log.warn("⚠️ Geocoding với địa chỉ đã chuẩn hóa thất bại: {}", e.getMessage());
            }
        }

        log.error("❌ Geocoding thất bại hoàn toàn cho địa chỉ: {}", address);
        return null;
    }

    /**
     * Phương thức geocoding gốc (không chuẩn hóa)
     */
    private Coordinates geocodeAddressOriginal(String address) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new RuntimeException("❌ OpenCage API key chưa được cấu hình!");
        }

        String encodedAddress = URLEncoder.encode(address, StandardCharsets.UTF_8);
        String url = String.format(
                "%s?q=%s&key=%s&limit=1&countrycode=vn&language=vi",
                OPENCAGE_URL, encodedAddress, apiKey);

        int maxAttempts = 3;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                String response = restTemplate.getForObject(url, String.class);
                if (response == null || response.isBlank()) {
                    throw new RuntimeException("Phản hồi rỗng từ OpenCage API");
                }

                JsonNode jsonNode = objectMapper.readTree(response);
                JsonNode results = jsonNode.path("results");

                if (results.isArray() && results.size() > 0) {
                    JsonNode geometry = results.get(0).path("geometry");

                    if (geometry.has("lat") && geometry.has("lng")) {
                        double lat = geometry.get("lat").asDouble();
                        double lng = geometry.get("lng").asDouble();
                        return new Coordinates(lat, lng);
                    }
                }

                throw new RuntimeException("Không tìm thấy tọa độ hợp lệ cho địa chỉ: " + address);

            } catch (HttpStatusCodeException httpEx) {
                HttpStatusCode status = httpEx.getStatusCode();
                boolean retryable = status.value() == 429 || status.is5xxServerError();

                if (status.value() == 401) {
                    throw new RuntimeException("OpenCage API key không hợp lệ!");
                }

                if (retryable && attempt < maxAttempts) {
                    sleepBackoff(attempt);
                    continue;
                }
                throw new RuntimeException("Geocoding thất bại (" + status.value() + ")");
            } catch (Exception e) {
                if (attempt < maxAttempts) {
                    sleepBackoff(attempt);
                    continue;
                }
                throw new RuntimeException("Geocoding thất bại: " + e.getMessage());
            }
        }

        return null;
    }

    private void sleepBackoff(int attempt) {
        try {
            long backoffMs = 500L * attempt;
            Thread.sleep(backoffMs);
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
    }

    /**
     * Tính khoảng cách giữa hai điểm sử dụng công thức Haversine
     */
    public double calculateDistance(Coordinates point1, Coordinates point2) {
        final int R = 6371; // bán kính Trái Đất (km)
        double latDistance = Math.toRadians(point2.getLatitude() - point1.getLatitude());
        double lngDistance = Math.toRadians(point2.getLongitude() - point1.getLongitude());
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(point1.getLatitude()))
                        * Math.cos(Math.toRadians(point2.getLatitude()))
                        * Math.sin(lngDistance / 2) * Math.sin(lngDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Lớp lưu trữ tọa độ
     */
    public static class Coordinates {
        private final double latitude;
        private final double longitude;

        public Coordinates(double latitude, double longitude) {
            this.latitude = latitude;
            this.longitude = longitude;
        }

        public double getLatitude() {
            return latitude;
        }

        public double getLongitude() {
            return longitude;
        }

        @Override
        public String toString() {
            return String.format("(%.6f, %.6f)", latitude, longitude);
        }
    }
}
