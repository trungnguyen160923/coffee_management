package com.service.catalog.dto.request.table;

import com.service.catalog.entity.TableEntity;
import jakarta.validation.constraints.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TableUpdateRequest {

    @Size(max = 50, message = "Table label must not exceed 50 characters")
    String label;

    @Min(value = 1, message = "Capacity must be at least 1")
    @Max(value = 20, message = "Capacity must not exceed 20")
    Integer capacity;

    TableEntity.TableStatus status;
}
