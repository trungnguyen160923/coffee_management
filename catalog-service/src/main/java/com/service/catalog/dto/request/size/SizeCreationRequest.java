package com.service.catalog.dto.request.size;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SizeCreationRequest {
    @NotBlank(message = "EMPTY_NAME_SIZE")
    @Size(max = 50, message = "INVALID_NAME_SIZE")
    String name;
    
    @Size(max = 255, message = "INVALID_DESCRIPTION")
    String description;
}
