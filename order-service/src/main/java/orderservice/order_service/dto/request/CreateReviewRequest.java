package orderservice.order_service.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import lombok.AccessLevel;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateReviewRequest {
    
    @NotNull(message = "PRODUCT_ID_REQUIRED")
    private Integer productId;

    @NotNull(message = "ORDER_ID_REQUIRED")
    private Integer orderId;

    @NotNull(message = "BRANCH_ID_REQUIRED")
    private Integer branchId;

    @NotNull(message = "RATING_REQUIRED")
    @Min(value = 1, message = "RATING_MIN_1")
    @Max(value = 5, message = "RATING_MAX_5")
    private Byte rating = 5; // 1..5, default 5
    
    @Size(max = 255, message = "COMMENT_MAX_LENGTH_255")
    private String comment;
}
