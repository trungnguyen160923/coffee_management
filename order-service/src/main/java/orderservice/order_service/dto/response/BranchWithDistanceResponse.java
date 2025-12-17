package orderservice.order_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BranchWithDistanceResponse {
    private BranchResponse branch;
    private Double distance; // Khoảng cách tính bằng km
    private Integer estimatedDeliveryTime; // Thời gian giao hàng ước tính (phút)
}

