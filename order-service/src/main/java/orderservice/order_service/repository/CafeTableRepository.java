package orderservice.order_service.repository;

import orderservice.order_service.entity.CafeTable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CafeTableRepository extends JpaRepository<CafeTable, Integer> {

    // Find tables by branch
    List<CafeTable> findByBranchIdOrderByLabel(Integer branchId);

    // Find available tables by branch
    List<CafeTable> findByBranchIdAndStatusOrderByLabel(Integer branchId, String status);

    // Find tables by status
    List<CafeTable> findByStatusOrderByLabel(String status);

    // Find tables that can accommodate a party size
    @Query("SELECT t FROM CafeTable t WHERE t.branchId = :branchId AND t.status = 'AVAILABLE' AND t.capacity >= :partySize ORDER BY t.capacity ASC, t.label ASC")
    List<CafeTable> findAvailableTablesForPartySize(@Param("branchId") Integer branchId,
            @Param("partySize") Integer partySize);

    // Find tables that are not available during a specific time period
    @Query("SELECT DISTINCT rt.tableId FROM ReservationTable rt " +
            "JOIN Reservation r ON rt.reservationId = r.reservationId " +
            "WHERE r.branchId = :branchId " +
            "AND r.status IN ('PENDING', 'CONFIRMED') " +
            "AND r.reservedAt BETWEEN :startTime AND :endTime")
    List<Integer> findReservedTableIds(@Param("branchId") Integer branchId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime);

    // Find available tables excluding reserved ones during a time period
    @Query("SELECT t FROM CafeTable t WHERE t.branchId = :branchId " +
            "AND t.status = 'AVAILABLE' " +
            "AND t.capacity >= :partySize " +
            "AND t.tableId NOT IN (" +
            "    SELECT DISTINCT rt.tableId FROM ReservationTable rt " +
            "    JOIN Reservation r ON rt.reservationId = r.reservationId " +
            "    WHERE r.branchId = :branchId " +
            "    AND r.status IN ('PENDING', 'CONFIRMED') " +
            "    AND r.reservedAt BETWEEN :startTime AND :endTime" +
            ") ORDER BY t.capacity ASC, t.label ASC")
    List<CafeTable> findAvailableTablesForReservation(@Param("branchId") Integer branchId,
            @Param("partySize") Integer partySize,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime);

    // Count tables by branch and status
    long countByBranchIdAndStatus(Integer branchId, String status);

    // Find table by branch and label
    Optional<CafeTable> findByBranchIdAndLabel(Integer branchId, String label);

    // Check if table exists in branch
    boolean existsByBranchIdAndTableId(Integer branchId, Integer tableId);
}
