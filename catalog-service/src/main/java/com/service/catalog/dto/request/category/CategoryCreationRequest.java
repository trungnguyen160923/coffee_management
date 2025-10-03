package com.service.catalog.dto.request.category;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CategoryCreationRequest {
    @NotBlank(message = "EMPTY_NAME_CATEGORY")
    @Size(max = 50, message = "INVALID_NAME_CATEGORY")
    String name;

    @Size(max = 255, message = "INVALID_DESCRIPTION")
    @NotBlank(message = "EMPTY_DESCRIPTION")
    String description;
}
