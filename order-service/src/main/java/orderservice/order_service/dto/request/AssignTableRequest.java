package orderservice.order_service.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public class AssignTableRequest {

    @NotNull(message = "Reservation ID is required")
    private Integer reservationId;

    @NotEmpty(message = "Table IDs are required")
    @Size(min = 1, message = "At least one table must be assigned")
    private List<Integer> tableIds;

    // Constructors
    public AssignTableRequest() {
    }

    public AssignTableRequest(Integer reservationId, List<Integer> tableIds) {
        this.reservationId = reservationId;
        this.tableIds = tableIds;
    }

    // Getters and Setters
    public Integer getReservationId() {
        return reservationId;
    }

    public void setReservationId(Integer reservationId) {
        this.reservationId = reservationId;
    }

    public List<Integer> getTableIds() {
        return tableIds;
    }

    public void setTableIds(List<Integer> tableIds) {
        this.tableIds = tableIds;
    }
}
