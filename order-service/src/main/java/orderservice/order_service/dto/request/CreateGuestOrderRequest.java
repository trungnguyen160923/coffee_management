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
public class CreateGuestOrderRequest {

    // Thông tin khách hàng (bắt buộc cho guest)
    @NotNull(message = "Customer name is required")
    String customerName;

    @NotNull(message = "Phone is required")
    String phone;

    String email; // Optional

    // Địa chỉ giao hàng (không bắt buộc nếu orderType = "takeaway")
    String deliveryAddress;

    // Địa chỉ để tìm chi nhánh (chỉ district + province)
    String branchSelectionAddress;

    // Branch ID sẽ được tự động chọn dựa trên địa chỉ giao hàng
    Integer branchId;

    // Thông tin để liên kết với reservations
    Integer cartId;
    String guestId;

    // Tuỳ chọn: holdId nếu đã check & reserve trước (ví dụ từ POS takeaway)
    String holdId;

    Integer tableId;
    Integer reservationId;

    String paymentMethod;
    String paymentStatus;

    java.math.BigDecimal subtotal;
    java.math.BigDecimal discount;
    java.math.BigDecimal vat;
    String discountCode;

    // Order type: "dine-in", "takeaway", "online"
    // Nếu không cung cấp, sẽ được suy luận từ các field khác
    String orderType;

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
