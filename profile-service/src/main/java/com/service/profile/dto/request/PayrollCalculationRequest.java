package com.service.profile.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PayrollCalculationRequest {

    @JsonProperty(required = true)
    @NotNull(message = "EMPTY_USER_ID")
    Integer userId;

    @JsonProperty(required = true)
    @NotBlank(message = "EMPTY_PERIOD")
    @Pattern(regexp = "^\\d{4}-\\d{2}$", message = "INVALID_PERIOD_FORMAT")
    String period; // Format: YYYY-MM

    String notes;
}

