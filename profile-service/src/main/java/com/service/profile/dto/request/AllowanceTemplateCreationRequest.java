package com.service.profile.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AllowanceTemplateCreationRequest {

    @JsonProperty(required = true)
    Integer branchId; // NULL = SYSTEM scope, có giá trị = BRANCH scope

    @JsonProperty(required = true)
    @NotBlank(message = "EMPTY_NAME")
    String name;

    @JsonProperty(required = true)
    @NotBlank(message = "EMPTY_ALLOWANCE_TYPE")
    String allowanceType; // MEAL, TRANSPORT, PHONE, ROLE, OTHER

    @JsonProperty(required = true)
    @NotNull(message = "EMPTY_AMOUNT")
    @Positive(message = "INVALID_AMOUNT")
    BigDecimal amount;

    String description;
}

