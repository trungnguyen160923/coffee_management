package orderservice.order_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class OrderListResponse {
    List<OrderResponse> orders;
    Integer total;
    Integer page;
    Integer limit;
    Integer totalPages;
}

