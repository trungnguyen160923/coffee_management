package com.service.profile.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BonusCreationRequest {

    @JsonProperty(required = true)
    @NotNull(message = "EMPTY_USER_ID")
    Integer userId;

    @JsonProperty(required = true)
    @NotBlank(message = "EMPTY_PERIOD")
    @Pattern(regexp = "^\\d{4}-\\d{2}$", message = "INVALID_PERIOD_FORMAT")
    String period; // Format: YYYY-MM

    @JsonProperty(required = true)
    @NotBlank(message = "EMPTY_BONUS_TYPE")
    String bonusType; // PERFORMANCE, STORE_TARGET, HOLIDAY, REFERRAL, SPECIAL

    @JsonProperty(required = true)
    @NotNull(message = "EMPTY_AMOUNT")
    @Positive(message = "INVALID_AMOUNT")
    BigDecimal amount;

    String description;
    String criteriaRef;
    Integer shiftId;
}

