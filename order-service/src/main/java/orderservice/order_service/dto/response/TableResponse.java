package orderservice.order_service.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public class TableResponse {

    private Integer tableId;
    private Integer branchId;
    private String branchName;
    private String label;
    private Integer capacity;
    private String status;
    private LocalDateTime createAt;
    private LocalDateTime updateAt;
    private List<ReservationResponse> currentReservations;

    // Constructors
    public TableResponse() {
    }

    // Getters and Setters
    public Integer getTableId() {
        return tableId;
    }

    public void setTableId(Integer tableId) {
        this.tableId = tableId;
    }

    public Integer getBranchId() {
        return branchId;
    }

    public void setBranchId(Integer branchId) {
        this.branchId = branchId;
    }

    public String getBranchName() {
        return branchName;
    }

    public void setBranchName(String branchName) {
        this.branchName = branchName;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public Integer getCapacity() {
        return capacity;
    }

    public void setCapacity(Integer capacity) {
        this.capacity = capacity;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreateAt() {
        return createAt;
    }

    public void setCreateAt(LocalDateTime createAt) {
        this.createAt = createAt;
    }

    public LocalDateTime getUpdateAt() {
        return updateAt;
    }

    public void setUpdateAt(LocalDateTime updateAt) {
        this.updateAt = updateAt;
    }

    public List<ReservationResponse> getCurrentReservations() {
        return currentReservations;
    }

    public void setCurrentReservations(List<ReservationResponse> currentReservations) {
        this.currentReservations = currentReservations;
    }
}
