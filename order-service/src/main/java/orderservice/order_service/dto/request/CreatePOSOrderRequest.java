package orderservice.order_service.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreatePOSOrderRequest {

    @NotNull(message = "Staff ID is required")
    Integer staffId;

    @NotNull(message = "Branch ID is required")
    Integer branchId;

    // Customer information (optional for POS)
    Integer customerId;
    String customerName;
    String phone;
    String email;

    // Table information
    @NotEmpty(message = "At least one table must be selected")
    List<Integer> tableIds;

    // Order items
    @NotEmpty(message = "Order items cannot be empty")
    @Valid
    List<OrderItemRequest> orderItems;

    // Payment information
    String paymentMethod;
    String paymentStatus;

    // Discount
    BigDecimal discount;
    String discountCode;

    // Notes
    String notes;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class OrderItemRequest {
        @NotNull(message = "Product ID is required")
        Integer productId;

        @NotNull(message = "Product detail ID is required")
        Integer productDetailId;

        @NotNull(message = "Quantity is required")
        @DecimalMin(value = "0.01", message = "Quantity must be greater than 0")
        BigDecimal quantity;

        String notes;
    }
}
