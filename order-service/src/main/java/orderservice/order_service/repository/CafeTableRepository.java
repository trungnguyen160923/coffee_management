package orderservice.order_service.repository;

import orderservice.order_service.entity.CafeTable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CafeTableRepository extends JpaRepository<CafeTable, Integer> {

        List<CafeTable> findByBranchId(Integer branchId);

        List<CafeTable> findByBranchIdAndStatus(Integer branchId, String status);

        List<CafeTable> findByBranchIdOrderByLabel(Integer branchId);

        Optional<CafeTable> findByBranchIdAndLabel(Integer branchId, String label);

        @Query("SELECT t FROM CafeTable t WHERE t.branchId = :branchId AND t.capacity >= :partySize AND t.status = 'AVAILABLE' AND t.tableId NOT IN (SELECT rt.tableId FROM ReservationTable rt JOIN Reservation r ON rt.reservationId = r.reservationId WHERE r.branchId = :branchId AND r.status IN ('CONFIRMED', 'CHECKED_IN') AND r.reservedAt BETWEEN :startTime AND :endTime)")
        List<CafeTable> findAvailableTablesForReservation(@Param("branchId") Integer branchId,
                        @Param("partySize") Integer partySize, @Param("startTime") java.time.LocalDateTime startTime,
                        @Param("endTime") java.time.LocalDateTime endTime);
}