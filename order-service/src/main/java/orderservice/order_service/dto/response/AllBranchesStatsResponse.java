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
public class AllBranchesStatsResponse {
    Integer totalBranches;
    Integer activeBranches;
    BigDecimal totalRevenue;
    BigDecimal averageRevenuePerBranch;
    Integer totalOrders;
    BigDecimal averageOrdersPerBranch;
    List<TopPerformingBranch> topPerformingBranches;
    List<BranchSummary> branchSummaries; // Summary for each branch

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class TopPerformingBranch {
        Integer branchId;
        String branchName;
        BigDecimal revenue;
        Integer orderCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class BranchSummary {
        Integer branchId;
        String branchName;
        BigDecimal revenue;
        Integer orderCount;
        Integer completedOrders;
        Integer cancelledOrders;
        Integer pendingOrders;
    }
}


