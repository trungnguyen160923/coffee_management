package orderservice.order_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CartItemResponse {
    Integer cartItemId;
    Integer productId;
    Integer productDetailId;
    ProductResponse product;
    ProductDetailResponse productDetail;
    Integer quantity;
    BigDecimal unitPrice;
    BigDecimal totalPrice;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}
