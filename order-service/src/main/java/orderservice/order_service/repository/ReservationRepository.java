package orderservice.order_service.repository;

import orderservice.order_service.entity.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ReservationRepository extends JpaRepository<Reservation, Integer> {

    List<Reservation> findByCustomerIdOrderByReservedAtDesc(Integer customerId);

    List<Reservation> findByBranchIdOrderByReservedAtDesc(Integer branchId);

    List<Reservation> findByStatusOrderByReservedAtDesc(String status);

    List<Reservation> findByReservedAtBetweenOrderByReservedAtDesc(LocalDateTime startTime, LocalDateTime endTime);

    @Query("SELECT r FROM Reservation r WHERE r.branchId = :branchId AND r.reservedAt BETWEEN :startTime AND :endTime ORDER BY r.reservedAt DESC")
    List<Reservation> findByBranchAndTimeRange(@Param("branchId") Integer branchId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime);

    @Query("SELECT r FROM Reservation r WHERE r.customerId = :customerId AND r.status = :status ORDER BY r.reservedAt DESC")
    List<Reservation> findByCustomerIdAndStatus(@Param("customerId") Integer customerId,
            @Param("status") String status);

    @Query("SELECT COUNT(r) FROM Reservation r WHERE r.branchId = :branchId AND r.reservedAt BETWEEN :startTime AND :endTime AND r.status IN ('PENDING', 'CONFIRMED')")
    Long countActiveReservationsByBranchAndTimeRange(@Param("branchId") Integer branchId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime);

    /**
     * Tìm các đặt bàn đang ở trạng thái PENDING và có thời gian đặt trước một thời điểm cho trước
     * dùng cho auto-cancel các reservation quá hạn.
     */
    List<Reservation> findByStatusAndReservedAtBefore(String status, LocalDateTime cutoffTime);
}
