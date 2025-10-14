package orderservice.order_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateTableRequest {
    @NotNull(message = "Table ID is required")
    private Integer tableId;

    @NotBlank(message = "Table label is required")
    private String label;

    @NotNull(message = "Table capacity is required")
    @Positive(message = "Table capacity must be positive")
    private Integer capacity;
}
