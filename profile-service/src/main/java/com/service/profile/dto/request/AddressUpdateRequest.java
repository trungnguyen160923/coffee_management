package com.service.profile.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AddressUpdateRequest {

    @JsonProperty(required = true)
    @NotBlank(message = "EMPTY_LABEL")
    @Size(max = 50, message = "INVALID_LABEL")
    String label;

    @NotBlank(message = "EMPTY_FULL_ADDRESS")
    @Size(max = 255, message = "INVALID_FULL_ADDRESS")
    String fullAddress;
}
