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
public class AllowanceTemplateUpdateRequest {

    String name;

    String allowanceType; // MEAL, TRANSPORT, PHONE, ROLE, OTHER

    @Positive(message = "INVALID_AMOUNT")
    BigDecimal amount;

    String description;

    Boolean isActive;
}

