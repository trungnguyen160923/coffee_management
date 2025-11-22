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
public class BranchStatsResponse {
    Integer totalBranches;
    Integer activeBranches;
    BigDecimal totalRevenue;
    BigDecimal averageRevenue;
    List<TopPerformingBranch> topPerformingBranches;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class TopPerformingBranch {
        orderservice.order_service.entity.Branch branch;
        BigDecimal revenue;
        Integer orderCount;
    }
}


