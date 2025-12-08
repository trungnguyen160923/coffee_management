package orderservice.order_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateBranchRequest {

    @NotBlank(message = "Branch name is required")
    @Size(max = 150, message = "Branch name must not exceed 150 characters")
    private String name;

    @Size(max = 255, message = "Address must not exceed 255 characters")
    private String address;

    @Size(max = 20, message = "Phone must not exceed 20 characters")
    private String phone;

    private Integer managerUserId;

    private LocalTime openHours;

    private LocalTime endHours;

    // Days of week the branch is normally open (1=Monday..7=Sunday), stored as comma-separated list.
    // Example: "1,2,3,4,5,6,7" = open all week, "1,2,3,4,5" = Mon–Fri only.
    @Size(max = 20, message = "Open days must not exceed 20 characters")
    private String openDays;

    private BigDecimal latitude;
    private BigDecimal longitude;

}
