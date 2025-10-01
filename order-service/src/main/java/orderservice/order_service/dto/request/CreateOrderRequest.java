package orderservice.order_service.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateOrderRequest {

    @NotNull(message = "Customer ID is required")
    Integer customerId;

    String customerName;
    String phone;
    String deliveryAddress;

    @NotNull(message = "Branch ID is required")
    Integer branchId;

    Integer tableId;
    Integer reservationId;

    String paymentMethod;
    String paymentStatus;

    java.math.BigDecimal subtotal;
    java.math.BigDecimal discount;

    @NotEmpty(message = "Order items cannot be empty")
    @Valid
    List<OrderItemRequest> orderItems;

    String notes;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class OrderItemRequest {

        @NotNull(message = "Product ID is required")
        Integer productId;

        // In DB this maps to size_id
        @NotNull(message = "Product Detail ID is required")
        Integer productDetailId;

        @NotNull(message = "Quantity is required")
        java.math.BigDecimal quantity;

        String notes;
    }
}
