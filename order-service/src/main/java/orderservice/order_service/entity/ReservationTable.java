package orderservice.order_service.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "reservation_tables")
public class ReservationTable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @Column(name = "reservation_id", nullable = false)
    @NotNull(message = "Reservation ID is required")
    private Integer reservationId;

    @Column(name = "table_id", nullable = false)
    @NotNull(message = "Table ID is required")
    private Integer tableId;

    // Constructors
    public ReservationTable() {
    }

    public ReservationTable(Integer reservationId, Integer tableId) {
        this.reservationId = reservationId;
        this.tableId = tableId;
    }

    // Getters and Setters
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getReservationId() {
        return reservationId;
    }

    public void setReservationId(Integer reservationId) {
        this.reservationId = reservationId;
    }

    public Integer getTableId() {
        return tableId;
    }

    public void setTableId(Integer tableId) {
        this.tableId = tableId;
    }
}
