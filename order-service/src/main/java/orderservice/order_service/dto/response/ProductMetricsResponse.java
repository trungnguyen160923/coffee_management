package orderservice.order_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductMetricsResponse {
    Integer uniqueProductsSold;
    Integer topSellingProductId;
    String topSellingProductName;
    BigDecimal productDiversityScore;
    List<TopProduct> topProducts;
    Map<String, Integer> productsByCategory;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class TopProduct {
        Integer productId;
        String productName;
        BigDecimal quantitySold;
        BigDecimal revenue;
    }
}

