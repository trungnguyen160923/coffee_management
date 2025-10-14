package orderservice.order_service.dto.request;

import jakarta.validation.constraints.*;
import java.time.LocalDateTime;

public class CreateReservationRequest {

    // For authenticated users
    private Integer customerId;

    // For non-authenticated users
    @Size(max = 50, message = "Customer name must not exceed 50 characters")
    private String customerName;

    @Size(max = 20, message = "Phone must not exceed 20 characters")
    @Pattern(regexp = "^[0-9+\\-\\s()]*$", message = "Phone number contains invalid characters")
    private String phone;

    @Size(max = 100, message = "Email must not exceed 100 characters")
    @Email(message = "Invalid email format")
    private String email;

    @NotNull(message = "Branch ID is required")
    private Integer branchId;

    @NotNull(message = "Reservation time is required")
    private LocalDateTime reservedAt;

    @NotNull(message = "Party size is required")
    @Min(value = 1, message = "Party size must be at least 1")
    @Max(value = 20, message = "Party size cannot exceed 20")
    private Integer partySize = 1;

    @Size(max = 255, message = "Notes must not exceed 255 characters")
    private String notes;

    // Constructors
    public CreateReservationRequest() {
    }

    public CreateReservationRequest(Integer customerId, String customerName, String phone,
            Integer branchId, LocalDateTime reservedAt, Integer partySize, String notes) {
        this.customerId = customerId;
        this.customerName = customerName;
        this.phone = phone;
        this.branchId = branchId;
        this.reservedAt = reservedAt;
        this.partySize = partySize;
        this.notes = notes;
    }

    // Getters and Setters
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

    // Business validation method
    public boolean isValidCustomerInfo() {
        return customerId != null || (customerName != null && !customerName.trim().isEmpty()
                && phone != null && !phone.trim().isEmpty()
                && email != null && !email.trim().isEmpty());
    }
}