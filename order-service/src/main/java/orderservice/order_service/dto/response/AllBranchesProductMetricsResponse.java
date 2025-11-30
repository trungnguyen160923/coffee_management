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
public class AllBranchesProductMetricsResponse {
    Integer totalUniqueProductsSold;
    Integer topSellingProductId;
    String topSellingProductName;
    BigDecimal overallProductDiversityScore;
    List<TopProduct> topProducts; // Top products across all branches
    Map<String, Integer> productsByCategory; // Products by category across all branches
    List<BranchProductStats> branchProductStats; // Product stats by branch

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

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class BranchProductStats {
        Integer branchId;
        String branchName;
        Integer uniqueProductsSold;
        Integer topSellingProductId;
        String topSellingProductName;
    }
}


