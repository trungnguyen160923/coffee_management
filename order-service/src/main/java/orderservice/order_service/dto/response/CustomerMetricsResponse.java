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
public class CustomerMetricsResponse {
    Integer customerCount;
    Integer repeatCustomers;
    Integer newCustomers;
    Integer uniqueCustomers;
    BigDecimal customerRetentionRate;
    List<TopCustomer> topCustomers;

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
}

