package orderservice.order_service.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public class TableAssignmentResponse {

    private Integer reservationId;
    private String customerName;
    private String phone;
    private Integer partySize;
    private LocalDateTime reservedAt;
    private String status;
    private List<TableResponse> assignedTables;
    private String message;

    // Constructors
    public TableAssignmentResponse() {
    }

    // Getters and Setters
    public Integer getReservationId() {
        return reservationId;
    }

    public void setReservationId(Integer reservationId) {
        this.reservationId = reservationId;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public Integer getPartySize() {
        return partySize;
    }

    public void setPartySize(Integer partySize) {
        this.partySize = partySize;
    }

    public LocalDateTime getReservedAt() {
        return reservedAt;
    }

    public void setReservedAt(LocalDateTime reservedAt) {
        this.reservedAt = reservedAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public List<TableResponse> getAssignedTables() {
        return assignedTables;
    }

    public void setAssignedTables(List<TableResponse> assignedTables) {
        this.assignedTables = assignedTables;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
