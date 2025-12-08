package orderservice.order_service.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonIgnoreProperties(ignoreUnknown = true)
public class ProductResponse {
    Integer productId;
    String name;
    String imageUrl;
    CategoryResponse category;
    String sku;
    String description;
    Boolean active;
    LocalDateTime createAt;
    LocalDateTime updateAt;

    // Danh sách các size và price của product
    List<ProductDetailResponse> productDetails;
}
