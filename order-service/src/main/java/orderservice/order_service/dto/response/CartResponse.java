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
public class CartResponse {
    Integer cartId;
    Integer userId;
    List<CartItemResponse> cartItems;
    BigDecimal totalAmount;
    Integer totalItems;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}
