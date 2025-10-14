package com.service.catalog.dto.request.table;

import jakarta.validation.constraints.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TableCreationRequest {

    @NotNull(message = "Branch ID is required")
    @Positive(message = "Branch ID must be positive")
    Integer branchId;

    @NotBlank(message = "Table label is required")
    @Size(max = 50, message = "Table label must not exceed 50 characters")
    String label;

    @NotNull(message = "Capacity is required")
    @Min(value = 1, message = "Capacity must be at least 1")
    @Max(value = 20, message = "Capacity must not exceed 20")
    Integer capacity;
}
