package com.service.catalog.dto.request.category;

import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CategoryUpdateRequest {
    @Size(max = 50, message = "INVALID_NAME_CATEGORY")
    String name;

    @Size(max = 255, message = "INVALID_DESCRIPTION")
    String description;
}
