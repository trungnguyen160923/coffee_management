package orderservice.order_service.dto.response;

import lombok.*;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class POSOrderResponse {

    Integer orderId;
    Integer staffId;
    Integer branchId;
    Integer customerId;
    String customerName;
    String phone;
    String email;
    List<Integer> tableIds;
    String status;
    String paymentMethod;
    String paymentStatus;
    BigDecimal subtotal;
    BigDecimal discount;
    BigDecimal vat;
    BigDecimal totalAmount;
    String discountCode;
    String notes;
    LocalDateTime orderDate;
    LocalDateTime createAt;
    LocalDateTime updateAt;
    List<OrderItemResponse> orderItems;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class OrderItemResponse {
        Integer orderItemId;
        Integer productId;
        Integer productDetailId;
        Integer sizeId;
        ProductResponse product;
        BigDecimal quantity;
        BigDecimal unitPrice;
        BigDecimal totalPrice;
        String notes;
    }
}
