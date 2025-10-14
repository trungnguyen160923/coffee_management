package orderservice.order_service.repository;

import orderservice.order_service.entity.ReservationTable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReservationTableRepository extends JpaRepository<ReservationTable, Integer> {

    // Find table assignments by reservation
    List<ReservationTable> findByReservationId(Integer reservationId);

    // Find reservations by table
    List<ReservationTable> findByTableId(Integer tableId);

    // Find table assignments by reservation and table
    Optional<ReservationTable> findByReservationIdAndTableId(Integer reservationId, Integer tableId);

    // Check if table is assigned to reservation
    boolean existsByReservationIdAndTableId(Integer reservationId, Integer tableId);

    // Delete assignments by reservation
    void deleteByReservationId(Integer reservationId);

    // Delete assignments by table
    void deleteByTableId(Integer tableId);

    // Find all table assignments for multiple reservations
    @Query("SELECT rt FROM ReservationTable rt WHERE rt.reservationId IN :reservationIds")
    List<ReservationTable> findByReservationIdIn(@Param("reservationIds") List<Integer> reservationIds);

    // Find all table assignments for multiple tables
    @Query("SELECT rt FROM ReservationTable rt WHERE rt.tableId IN :tableIds")
    List<ReservationTable> findByTableIdIn(@Param("tableIds") List<Integer> tableIds);

    // Count assignments by reservation
    long countByReservationId(Integer reservationId);

    // Count assignments by table
    long countByTableId(Integer tableId);
}
