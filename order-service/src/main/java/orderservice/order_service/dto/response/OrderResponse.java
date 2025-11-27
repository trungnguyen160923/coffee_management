package orderservice.order_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class OrderResponse {
    Integer orderId;
    Integer customerId;
    String customerName;
    String phone;
    String email;
    String deliveryAddress;
    Integer branchId;
    Integer tableId;
    Integer reservationId;
    Integer staffId;
    String status;
    String paymentMethod;
    String paymentStatus;
    java.math.BigDecimal subtotal;
    java.math.BigDecimal discount;
    java.math.BigDecimal vat;
    BigDecimal totalAmount;
    String discountCode;
    String notes;
    LocalDateTime orderDate;
    LocalDateTime createAt;
    LocalDateTime updateAt;

    List<OrderItemResponse> orderItems;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class OrderItemResponse {
        Integer orderItemId;
        Integer productId;
        Integer productDetailId;
        Integer sizeId;
        ProductResponse product;
        java.math.BigDecimal quantity;
        BigDecimal unitPrice;
        BigDecimal totalPrice;
        String notes;
    }
}
