package com.service.profile.dto.response;

import com.service.profile.entity.PayrollConfiguration;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PayrollConfigurationResponse {
    Integer configId;
    String configKey;
    BigDecimal configValue;
    PayrollConfiguration.ConfigType configType;
    String displayName;
    String description;
    String unit;
    BigDecimal minValue;
    BigDecimal maxValue;
    Boolean isActive;
    Integer updatedBy;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}

