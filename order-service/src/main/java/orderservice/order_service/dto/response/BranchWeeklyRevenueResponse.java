package orderservice.order_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

/**
 * Response DTO cho doanh thu theo tuần của chi nhánh
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BranchWeeklyRevenueResponse {
    Integer branchId;
    String weekStartDate; // Ngày bắt đầu tuần (format: yyyy-MM-dd)
    String weekEndDate; // Ngày kết thúc tuần (format: yyyy-MM-dd)
    
    // Tổng doanh thu trong tuần
    BigDecimal totalRevenue;
    
    // Tổng số đơn hàng trong tuần
    Long totalOrders;
    
    // Danh sách doanh thu theo từng ngày trong tuần (tổng total_amount của tất cả đơn hàng trong ngày)
    List<DailyRevenue> dailyRevenues;
    
    /**
     * Inner class cho doanh thu theo ngày
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class DailyRevenue {
        String date; // Format: yyyy-MM-dd
        String dayOfWeek; // Tên thứ trong tuần (Monday, Tuesday, ...)
        BigDecimal revenue; // Tổng doanh thu trong ngày (tổng các total_amount của các đơn hàng có status = 'COMPLETED' trong ngày)
        Long orderCount; // Số đơn hàng có status = 'COMPLETED' trong ngày
    }
}

