package orderservice.order_service.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FindBranchesWithDistanceRequest {
    @NotBlank(message = "Address is required")
    private String address;
    
    @Min(value = 1, message = "Limit must be at least 1")
    private Integer limit = 10;
}
