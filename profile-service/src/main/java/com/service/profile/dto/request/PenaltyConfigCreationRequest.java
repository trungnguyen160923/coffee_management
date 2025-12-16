package com.service.profile.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PenaltyConfigCreationRequest {

    @JsonProperty(required = true)
    Integer branchId; // NULL = SYSTEM scope, có giá trị = BRANCH scope

    @JsonProperty(required = true)
    @NotBlank(message = "EMPTY_NAME")
    String name;

    @JsonProperty(required = true)
    @NotBlank(message = "EMPTY_PENALTY_TYPE")
    String penaltyType; // NO_SHOW, LATE_15MIN, LATE_30MIN, etc.

    @JsonProperty(required = true)
    @NotNull(message = "EMPTY_AMOUNT")
    @PositiveOrZero(message = "INVALID_AMOUNT")
    BigDecimal amount;

    String description;
}

