package com.service.profile.dto.request;

import jakarta.validation.constraints.PositiveOrZero;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PenaltyConfigUpdateRequest {

    String name;

    String penaltyType; // NO_SHOW, LATE_15MIN, LATE_30MIN, etc.

    @PositiveOrZero(message = "INVALID_AMOUNT")
    BigDecimal amount;

    String description;
    Boolean isActive;
}

