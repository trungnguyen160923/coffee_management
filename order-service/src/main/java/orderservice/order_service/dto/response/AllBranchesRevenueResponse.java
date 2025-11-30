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
public class AllBranchesRevenueResponse {
    BigDecimal totalRevenue;
    List<DailyRevenue> dailyRevenue; // Daily revenue across all branches
    List<MonthlyRevenue> monthlyRevenue; // Monthly revenue across all branches
    List<BranchRevenueDetail> branchRevenueDetails; // Revenue breakdown by branch

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

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class BranchRevenueDetail {
        Integer branchId;
        String branchName;
        BigDecimal totalRevenue;
        List<DailyRevenue> dailyRevenue;
        List<MonthlyRevenue> monthlyRevenue;
    }
}


