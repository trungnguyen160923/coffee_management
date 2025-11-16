package orderservice.order_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RevenueMetricsResponse {
    BigDecimal totalRevenue;
    Integer orderCount;
    BigDecimal avgOrderValue;
    Integer peakHour;
    java.util.List<HourlyRevenue> revenueByHour;
    Map<String, BigDecimal> revenueByPaymentMethod;
    Integer completedOrders;
    Integer cancelledOrders;
    Integer pendingOrders;

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
}

