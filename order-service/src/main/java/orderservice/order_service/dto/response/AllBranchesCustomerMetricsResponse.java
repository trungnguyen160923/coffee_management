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
public class AllBranchesCustomerMetricsResponse {
    Integer totalCustomerCount;
    Integer totalRepeatCustomers;
    Integer totalNewCustomers;
    Integer totalUniqueCustomers;
    BigDecimal overallCustomerRetentionRate;
    List<TopCustomer> topCustomers; // Top customers across all branches
    List<BranchCustomerStats> branchCustomerStats; // Customer stats by branch

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class TopCustomer {
        Integer customerId;
        String customerName;
        Integer orderCount;
        BigDecimal totalSpent;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class BranchCustomerStats {
        Integer branchId;
        String branchName;
        Integer customerCount;
        Integer repeatCustomers;
        Integer newCustomers;
    }
}


