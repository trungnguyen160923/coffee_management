package orderservice.order_service.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateDiscountRequest {

    @NotBlank(message = "Mã giảm giá không được để trống")
    @Size(max = 50, message = "Mã giảm giá không được quá 50 ký tự")
    private String code;

    @NotBlank(message = "Tên giảm giá không được để trống")
    @Size(max = 100, message = "Tên giảm giá không được quá 100 ký tự")
    private String name;

    @Size(max = 255, message = "Mô tả không được quá 255 ký tự")
    private String description;

    @NotNull(message = "Loại giảm giá không được để trống")
    private String discountType; // PERCENT hoặc AMOUNT

    @NotNull(message = "Giá trị giảm giá không được để trống")
    @DecimalMin(value = "0.01", message = "Giá trị giảm giá phải lớn hơn 0")
    private BigDecimal discountValue;

    @DecimalMin(value = "0.00", message = "Số tiền đơn hàng tối thiểu không được âm")
    private BigDecimal minOrderAmount;

    @DecimalMin(value = "0.00", message = "Số tiền giảm tối đa không được âm")
    private BigDecimal maxDiscountAmount;

    @NotNull(message = "Ngày bắt đầu không được để trống")
    @Future(message = "Ngày bắt đầu phải trong tương lai")
    private LocalDateTime startDate;

    @NotNull(message = "Ngày kết thúc không được để trống")
    @Future(message = "Ngày kết thúc phải trong tương lai")
    private LocalDateTime endDate;

    @Min(value = 0, message = "Giới hạn sử dụng không được âm")
    private Integer usageLimit;

    private Integer branchId;

    @Builder.Default
    private Boolean active = true;
}
