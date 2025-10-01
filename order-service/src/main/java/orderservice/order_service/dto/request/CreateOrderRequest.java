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

    Integer customerId;

    String customerName;

    String phone;

    @NotNull(message = "Delivery address is required")
    String deliveryAddress;

    @NotNull(message = "Branch ID is required")
    Integer branchId;

    @NotEmpty(message = "Order items cannot be empty")
    @Valid
    List<OrderItemRequest> orderItems;

    String notes;

    String paymentMethod;

    String paymentStatus;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class OrderItemRequest {

        @NotNull(message = "Product ID is required")
        Integer productId;

        @NotNull(message = "Product Detail ID is required")
        Integer productDetailId;

        @NotNull(message = "Quantity is required")
        java.math.BigDecimal quantity;

        String notes;
    }
}
