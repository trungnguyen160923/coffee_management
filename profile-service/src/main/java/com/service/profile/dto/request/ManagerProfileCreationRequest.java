package com.service.profile.dto.request;

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
public class ManagerProfileCreationRequest {

    @JsonProperty(required = true)
    @NotNull(message = "EMPTY_USER_ID")
    Integer userId;

    @JsonProperty(required = true)
    @NotNull(message = "EMPTY_BRANCH_ID")
    Integer branchId;

    @JsonProperty(required = true)
    @NotNull(message = "EMPTY_HIRE_DATE")
    LocalDate hireDate;

    @JsonProperty(required = true)
    @NotNull(message = "EMPTY_IDENTITY_CARD")
    String identityCard;
}
