package orderservice.order_service.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;

public class CreateTableRequest {

    @NotNull(message = "Branch ID is required")
    private Integer branchId;

    @NotBlank(message = "Table label is required")
    @Size(max = 50, message = "Table label must not exceed 50 characters")
    private String label;

    @NotNull(message = "Capacity is required")
    @Min(value = 1, message = "Capacity must be at least 1")
    @Max(value = 20, message = "Capacity cannot exceed 20")
    private Integer capacity;

    // Constructors
    public CreateTableRequest() {
    }

    public CreateTableRequest(Integer branchId, String label, Integer capacity) {
        this.branchId = branchId;
        this.label = label;
        this.capacity = capacity;
    }

    // Getters and Setters
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
}
