package orderservice.order_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiscountApplicationResponse {

    private String discountCode;
    private String discountName;
    private String discountType;
    private BigDecimal discountValue;
    private BigDecimal originalAmount;
    private BigDecimal discountAmount;
    private BigDecimal finalAmount;
    private Boolean isValid;
    private String message;
}
