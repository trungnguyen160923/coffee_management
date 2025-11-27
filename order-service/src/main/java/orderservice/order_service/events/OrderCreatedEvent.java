package orderservice.order_service.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderCreatedEvent {
    private Integer orderId;
    private Integer branchId;
    private Integer customerId;
    private String customerName;
    private String customerEmail;
    private String phone;
    private BigDecimal totalAmount;
    private String paymentMethod;
    private Instant createdAt;
    private List<OrderItemSummary> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderItemSummary {
        private Integer pdId;
        private String productName;
        private Integer quantity;
    }
}

