package orderservice.order_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TopSellingProductsResponse {
    Integer branchId;
    LocalDate startDate;
    LocalDate endDate;
    Integer totalProducts;
    List<TopSellingProduct> topProducts;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class TopSellingProduct {
        Integer productId;
        String productName;
        String categoryName;
        BigDecimal totalQuantitySold;
        BigDecimal totalRevenue;
        Integer orderCount; // Số đơn hàng có chứa sản phẩm này
        BigDecimal avgOrderValue; // Giá trị trung bình mỗi đơn hàng
        Integer rank;
    }
}

