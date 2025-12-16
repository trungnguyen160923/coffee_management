package com.service.profile.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PenaltyCreationRequest {

    @JsonProperty(required = true)
    @NotNull(message = "EMPTY_USER_ID")
    Integer userId;

    @JsonProperty(required = true)
    @NotBlank(message = "EMPTY_PERIOD")
    @Pattern(regexp = "^\\d{4}-\\d{2}$", message = "INVALID_PERIOD_FORMAT")
    String period; // Format: YYYY-MM

    @JsonProperty(required = true)
    @NotBlank(message = "EMPTY_PENALTY_TYPE")
    String penaltyType; // LATE, NO_SHOW, EARLY_LEAVE, VIOLATION, UNPAID_LEAVE, OTHER

    @JsonProperty(required = true)
    @NotNull(message = "EMPTY_AMOUNT")
    @PositiveOrZero(message = "INVALID_AMOUNT")
    BigDecimal amount;

    String reasonCode;
    String description;
    LocalDate incidentDate;
    Integer shiftId; // Tham chiếu đến shift nếu liên quan
}

