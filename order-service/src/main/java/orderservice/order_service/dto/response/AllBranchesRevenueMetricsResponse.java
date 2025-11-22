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
public class AllBranchesRevenueMetricsResponse {
    BigDecimal totalRevenue;
    Integer totalOrderCount;
    BigDecimal avgOrderValue;
    Integer peakHour;
    List<HourlyRevenue> revenueByHour;
    Map<String, BigDecimal> revenueByPaymentMethod;
    Integer completedOrders;
    Integer cancelledOrders;
    Integer pendingOrders;
    List<BranchRevenue> branchRevenues; // Revenue breakdown by branch

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class HourlyRevenue {
        Integer hour;
        BigDecimal revenue;
        Integer orderCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class BranchRevenue {
        Integer branchId;
        String branchName;
        BigDecimal revenue;
        Integer orderCount;
    }
}


