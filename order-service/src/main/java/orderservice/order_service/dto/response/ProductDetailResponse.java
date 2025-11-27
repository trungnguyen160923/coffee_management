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
public class ProductDetailResponse {
    Integer pdId;
    SizeResponse size;
    BigDecimal price;
    Boolean active;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}
