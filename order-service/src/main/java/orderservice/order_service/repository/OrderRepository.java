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

    @Query("SELECT SUM(o.totalAmount) FROM Order o WHERE o.branchId = :branchId AND DATE(o.createAt) = :date AND o.status = 'COMPLETED' AND o.paymentStatus = 'PAID'")
    BigDecimal getTotalRevenueByBranchAndDate(@Param("branchId") Integer branchId, @Param("date") LocalDate date);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.branchId = :branchId AND DATE(o.createAt) = :date")
    Long countOrdersByBranchAndDate(@Param("branchId") Integer branchId, @Param("date") LocalDate date);

    @Query("SELECT COUNT(DISTINCT o.customerId) FROM Order o WHERE o.branchId = :branchId AND DATE(o.createAt) = :date AND o.customerId IS NOT NULL")
    Long countDistinctCustomersByBranchAndDate(@Param("branchId") Integer branchId, @Param("date") LocalDate date);

    // Get hour directly from database to avoid timezone issues
    @Query(value = "SELECT HOUR(o.create_at) as hour, o.total_amount, o.status, o.payment_status FROM orders o WHERE o.branch_id = :branchId AND DATE(o.create_at) = :date", nativeQuery = true)
    List<Object[]> findOrderHoursByBranchAndDate(@Param("branchId") Integer branchId, @Param("date") LocalDate date);
}
