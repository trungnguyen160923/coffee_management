package orderservice.order_service.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplyDiscountRequest {

    @NotBlank(message = "Mã giảm giá không được để trống")
    private String discountCode;

    @NotNull(message = "Tổng tiền đơn hàng không được để trống")
    @DecimalMin(value = "0.00", message = "Tổng tiền đơn hàng không được âm")
    private BigDecimal orderAmount;

    @NotNull(message = "ID chi nhánh không được để trống")
    private Integer branchId;
}
