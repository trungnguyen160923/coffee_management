package orderservice.order_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

/**
 * Response DTO cho thống kê đơn hàng và doanh thu theo ngày của chi nhánh
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BranchDailyStatsResponse {
    Integer branchId;
    String date; // Format: yyyy-MM-dd
    
    // Tổng số đơn hàng trong ngày (chỉ tính các đơn có status = 'COMPLETED')
    Long totalOrders;
    
    // Tổng doanh thu trong ngày (chỉ tính các đơn có status = 'COMPLETED')
    BigDecimal totalRevenue;
    
    // Danh sách số đơn hàng theo giờ (0-23) - chỉ tính các đơn có status = 'COMPLETED'
    List<HourlyOrderCount> hourlyOrderCounts;
    
    /**
     * Inner class cho số đơn hàng theo giờ
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class HourlyOrderCount {
        Integer hour; // 0-23
        Long orderCount; // Số đơn hàng có status = 'COMPLETED' trong giờ đó
    }
}

