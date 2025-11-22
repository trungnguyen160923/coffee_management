package orderservice.order_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BranchRevenueResponse {
    BigDecimal totalRevenue;
    List<DailyRevenue> dailyRevenue;
    List<MonthlyRevenue> monthlyRevenue;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class DailyRevenue {
        String date;
        BigDecimal revenue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class MonthlyRevenue {
        String month;
        BigDecimal revenue;
    }
}


