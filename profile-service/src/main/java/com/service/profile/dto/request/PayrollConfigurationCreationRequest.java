package com.service.profile.dto.request;

import com.service.profile.entity.PayrollConfiguration;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PayrollConfigurationCreationRequest {

    @NotBlank(message = "Config key is required")
    String configKey;

    @NotNull(message = "Config value is required")
    @DecimalMin(value = "0.0", message = "Config value must be positive or zero")
    BigDecimal configValue;

    @NotNull(message = "Config type is required")
    PayrollConfiguration.ConfigType configType;

    @NotBlank(message = "Display name is required")
    String displayName;

    String description;

    String unit;

    BigDecimal minValue;

    BigDecimal maxValue;

    @Builder.Default
    Boolean isActive = true;
}

