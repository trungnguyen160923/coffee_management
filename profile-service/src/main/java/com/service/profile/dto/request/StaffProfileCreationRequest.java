package com.service.profile.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StaffProfileCreationRequest {

    @JsonProperty(required = true)
    @NotNull(message = "EMPTY_USER_ID")
    Integer userId;

    @NotNull(message = "EMPTY_BRANCH_ID")
    Integer branchId;

    @NotNull(message = "EMPTY_IDENTITY_CARD")
    String identityCard;

    @NotNull(message = "EMPTY_POSITION")
    String position;

    @NotNull(message = "EMPTY_HIRE_DATE")
    LocalDate hireDate;

    @NotNull(message = "EMPTY_SALARY")
    BigDecimal salary;
}
