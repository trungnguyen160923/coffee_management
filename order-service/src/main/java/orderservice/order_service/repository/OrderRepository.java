package orderservice.order_service.repository;

import orderservice.order_service.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Integer> {

    List<Order> findByCustomerIdOrderByOrderDateDesc(Integer customerId);

    List<Order> findByBranchIdOrderByOrderDateDesc(Integer branchId);

    List<Order> findByStatusOrderByOrderDateDesc(String status);

    @Query("SELECT o FROM Order o WHERE o.customerId = :customerId AND o.status = :status ORDER BY o.orderDate DESC")
    List<Order> findByCustomerIdAndStatusOrderByOrderDateDesc(@Param("customerId") Integer customerId,
            @Param("status") String status);

    List<Order> findByStaffIdOrderByOrderDateDesc(Integer staffId);

    @Query("SELECT o FROM Order o WHERE o.staffId = :staffId AND o.status = :status ORDER BY o.orderDate DESC")
    List<Order> findByStaffIdAndStatusOrderByOrderDateDesc(@Param("staffId") Integer staffId,
            @Param("status") String status);

    // Analytics queries
    @Query("SELECT o FROM Order o WHERE o.branchId = :branchId AND DATE(o.createAt) = :date")
    List<Order> findByBranchIdAndDate(@Param("branchId") Integer branchId, @Param("date") LocalDate date);

    @Query("SELECT o FROM Order o WHERE o.branchId = :branchId AND o.createAt >= :startDate AND o.createAt < :endDate")
    List<Order> findByBranchIdAndDateRange(@Param("branchId") Integer branchId,
            @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    /**
     * Tính tổng doanh thu theo ngày (convert sang giờ Việt Nam UTC+7)
     */
    @Query(value = "SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o WHERE o.branch_id = :branchId AND DATE(DATE_ADD(o.create_at, INTERVAL 7 HOUR)) = :date AND o.status = 'COMPLETED'", nativeQuery = true)
    BigDecimal getTotalRevenueByBranchAndDate(@Param("branchId") Integer branchId, @Param("date") LocalDate date);

    /**
     * Đếm số đơn hàng theo ngày (convert sang giờ Việt Nam UTC+7)
     */
    @Query(value = "SELECT COUNT(*) FROM orders o WHERE o.branch_id = :branchId AND DATE(DATE_ADD(o.create_at, INTERVAL 7 HOUR)) = :date AND o.status = 'COMPLETED'", nativeQuery = true)
    Long countOrdersByBranchAndDate(@Param("branchId") Integer branchId, @Param("date") LocalDate date);

    @Query("SELECT COUNT(DISTINCT o.customerId) FROM Order o WHERE o.branchId = :branchId AND DATE(o.createAt) = :date AND o.customerId IS NOT NULL")
    Long countDistinctCustomersByBranchAndDate(@Param("branchId") Integer branchId, @Param("date") LocalDate date);

    // Get hour directly from database - convert to Vietnam timezone (UTC+7)
    @Query(value = "SELECT HOUR(DATE_ADD(o.create_at, INTERVAL 7 HOUR)) as hour, o.total_amount, o.status, o.payment_status FROM orders o WHERE DATE(DATE_ADD(o.create_at, INTERVAL 7 HOUR)) = :date AND o.branch_id = :branchId", nativeQuery = true)
    List<Object[]> findOrderHoursByBranchAndDate(@Param("branchId") Integer branchId, @Param("date") LocalDate date);
    
    /**
     * Đếm số đơn hàng theo giờ trong ngày (chỉ tính các đơn có status = 'COMPLETED')
     * Convert sang giờ Việt Nam (UTC+7)
     */
    @Query(value = "SELECT HOUR(DATE_ADD(o.create_at, INTERVAL 7 HOUR)) as hour, COUNT(*) as order_count FROM orders o WHERE DATE(DATE_ADD(o.create_at, INTERVAL 7 HOUR)) = :date AND o.branch_id = :branchId AND o.status = 'COMPLETED' GROUP BY HOUR(DATE_ADD(o.create_at, INTERVAL 7 HOUR)) ORDER BY hour", nativeQuery = true)
    List<Object[]> countOrdersByHourAndBranchAndDate(@Param("branchId") Integer branchId, @Param("date") LocalDate date);
    
    /**
     * Lấy doanh thu theo ngày trong khoảng thời gian
     * Tính tổng các total_amount của các đơn hàng có status = 'COMPLETED' trong ngày
     * Convert sang giờ Việt Nam (UTC+7)
     */
    @Query(value = "SELECT DATE(DATE_ADD(o.create_at, INTERVAL 7 HOUR)) as date, SUM(o.total_amount) as revenue, COUNT(*) as order_count FROM orders o WHERE o.branch_id = :branchId AND DATE_ADD(o.create_at, INTERVAL 7 HOUR) >= :startDate AND DATE_ADD(o.create_at, INTERVAL 7 HOUR) < :endDate AND o.status = 'COMPLETED' GROUP BY DATE(DATE_ADD(o.create_at, INTERVAL 7 HOUR)) ORDER BY date", nativeQuery = true)
    List<Object[]> getDailyRevenueByBranchAndDateRange(@Param("branchId") Integer branchId, 
            @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    /**
     * Đếm tổng số đơn hàng trong khoảng thời gian
     */
    @Query("SELECT COUNT(o) FROM Order o WHERE o.branchId = :branchId AND o.createAt >= :startDate AND o.createAt < :endDate")
    Long countOrdersByBranchAndDateRange(@Param("branchId") Integer branchId,
            @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
}
