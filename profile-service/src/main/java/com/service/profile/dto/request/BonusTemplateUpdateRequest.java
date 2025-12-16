package com.service.profile.dto.request;

import jakarta.validation.constraints.Positive;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BonusTemplateUpdateRequest {

    String name;

    String bonusType; // PERFORMANCE, STORE_TARGET, HOLIDAY, REFERRAL, SPECIAL

    @Positive(message = "INVALID_AMOUNT")
    BigDecimal amount;

    String description;
    String criteriaRef;
    Boolean isActive;
}

