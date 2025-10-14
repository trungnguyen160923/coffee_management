package orderservice.order_service.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "cafe_tables")
public class CafeTable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "table_id")
    private Integer tableId;

    @Column(name = "branch_id", nullable = false)
    @NotNull(message = "Branch ID is required")
    private Integer branchId;

    @Column(name = "label", length = 50, nullable = false)
    @NotBlank(message = "Table label is required")
    @Size(max = 50, message = "Table label must not exceed 50 characters")
    private String label;

    @Column(name = "capacity", nullable = false)
    @NotNull(message = "Capacity is required")
    @Min(value = 1, message = "Capacity must be at least 1")
    @Max(value = 20, message = "Capacity cannot exceed 20")
    private Integer capacity = 1;

    @Column(name = "status", length = 50, nullable = false)
    @NotBlank(message = "Status is required")
    @Size(max = 50, message = "Status must not exceed 50 characters")
    private String status = "AVAILABLE";

    @Column(name = "create_at")
    private LocalDateTime createAt;

    @Column(name = "update_at")
    private LocalDateTime updateAt;

    // Constructors
    public CafeTable() {
    }

    public CafeTable(Integer branchId, String label, Integer capacity) {
        this.branchId = branchId;
        this.label = label;
        this.capacity = capacity;
        this.status = "AVAILABLE";
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

    @PrePersist
    protected void onCreate() {
        createAt = LocalDateTime.now();
        updateAt = LocalDateTime.now();
        if (status == null) {
            status = "AVAILABLE";
        }
        if (capacity == null) {
            capacity = 1;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updateAt = LocalDateTime.now();
    }

    // Business methods
    public boolean isAvailable() {
        return "AVAILABLE".equals(status);
    }

    public boolean isReserved() {
        return "RESERVED".equals(status);
    }

    public boolean isOccupied() {
        return "OCCUPIED".equals(status);
    }

    public boolean isMaintenance() {
        return "MAINTENANCE".equals(status);
    }

    public boolean canAccommodate(Integer partySize) {
        return capacity >= partySize;
    }
}
