package com.service.profile.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PayrollConfigurationUpdateRequest {

    @NotNull(message = "Config value is required")
    @DecimalMin(value = "0.0", message = "Config value must be positive or zero")
    BigDecimal configValue;

    String description;

    BigDecimal minValue;

    BigDecimal maxValue;

    Boolean isActive;
}

