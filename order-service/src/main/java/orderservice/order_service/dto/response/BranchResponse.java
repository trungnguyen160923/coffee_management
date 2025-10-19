package orderservice.order_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.math.BigDecimal;
import lombok.AccessLevel;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BranchResponse {
    private Integer branchId;
    private String name;
    private String address;
    private String phone;
    private Integer managerUserId;
    private LocalTime openHours;
    private LocalTime endHours;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private LocalDateTime createAt;
    private LocalDateTime updateAt;
}
