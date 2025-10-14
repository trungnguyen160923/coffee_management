package orderservice.order_service.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class UpdateTableStatusRequest {

    @NotNull(message = "Table ID is required")
    private Integer tableId;

    @NotBlank(message = "Status is required")
    @Pattern(regexp = "^(AVAILABLE|OCCUPIED|RESERVED|MAINTENANCE)$", message = "Status must be one of: AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE")
    private String status;

    // Constructors
    public UpdateTableStatusRequest() {
    }

    public UpdateTableStatusRequest(Integer tableId, String status) {
        this.tableId = tableId;
        this.status = status;
    }

    // Getters and Setters
    public Integer getTableId() {
        return tableId;
    }

    public void setTableId(Integer tableId) {
        this.tableId = tableId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
