package orderservice.order_service.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reservations")
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reservation_id")
    private Integer reservationId;

    @Column(name = "customer_id")
    private Integer customerId;

    @Column(name = "customer_name", length = 50)
    @Size(max = 50, message = "Customer name must not exceed 50 characters")
    private String customerName;

    @Column(name = "phone", length = 20)
    @Size(max = 20, message = "Phone must not exceed 20 characters")
    @Pattern(regexp = "^[0-9+\\-\\s()]*$", message = "Phone number contains invalid characters")
    private String phone;

    @Column(name = "gmail", length = 100)
    @Size(max = 100, message = "Email must not exceed 100 characters")
    @jakarta.validation.constraints.Email(message = "Invalid email format")
    private String email;

    @Column(name = "branch_id", nullable = false)
    @NotNull(message = "Branch ID is required")
    private Integer branchId;

    @Column(name = "reserved_at", nullable = false)
    @NotNull(message = "Reservation time is required")
    private LocalDateTime reservedAt;

    @Column(name = "status", length = 50)
    @Size(max = 50, message = "Status must not exceed 50 characters")
    private String status = "PENDING";

    @Column(name = "party_size", nullable = false)
    @NotNull(message = "Party size is required")
    @Min(value = 1, message = "Party size must be at least 1")
    @Max(value = 20, message = "Party size cannot exceed 20")
    private Integer partySize = 1;

    @Column(name = "notes", length = 255)
    @Size(max = 255, message = "Notes must not exceed 255 characters")
    private String notes;

    @Column(name = "create_at")
    private LocalDateTime createAt;

    @Column(name = "update_at")
    private LocalDateTime updateAt;

    // Constructors
    public Reservation() {
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

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Integer getBranchId() {
        return branchId;
    }

    public void setBranchId(Integer branchId) {
        this.branchId = branchId;
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

    @PrePersist
    protected void onCreate() {
        createAt = LocalDateTime.now();
        updateAt = LocalDateTime.now();
        if (status == null) {
            status = "PENDING";
        }
        if (partySize == null) {
            partySize = 1;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updateAt = LocalDateTime.now();
    }

    // Business validation method
    public boolean isValidCustomerInfo() {
        return customerId != null || (customerName != null && !customerName.trim().isEmpty()
                && phone != null && !phone.trim().isEmpty());
    }
}
