package orderservice.order_service.dto.response;

import java.time.LocalDateTime;

public class ReservationResponse {

    private Integer reservationId;
    private Integer customerId;
    private String customerName;
    private String phone;
    private Integer branchId;
    private String branchName;
    private LocalDateTime reservedAt;
    private String status;
    private Integer partySize;
    private String notes;
    private LocalDateTime createAt;
    private LocalDateTime updateAt;

    // Constructors
    public ReservationResponse() {
    }

    public ReservationResponse(Integer reservationId, Integer customerId, String customerName,
            String phone, Integer branchId, String branchName, LocalDateTime reservedAt,
            String status, Integer partySize, String notes, LocalDateTime createAt,
            LocalDateTime updateAt) {
        this.reservationId = reservationId;
        this.customerId = customerId;
        this.customerName = customerName;
        this.phone = phone;
        this.branchId = branchId;
        this.branchName = branchName;
        this.reservedAt = reservedAt;
        this.status = status;
        this.partySize = partySize;
        this.notes = notes;
        this.createAt = createAt;
        this.updateAt = updateAt;
    }

    // Getters and Setters
    public Integer getReservationId() {
        return reservationId;
    }

    public void setReservationId(Integer reservationId) {
        this.reservationId = reservationId;
    }

    public Integer getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Integer customerId) {
        this.customerId = customerId;
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

    public Integer getPartySize() {
        return partySize;
    }

    public void setPartySize(Integer partySize) {
        this.partySize = partySize;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
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
}
