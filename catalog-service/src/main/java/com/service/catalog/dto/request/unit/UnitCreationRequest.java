package com.service.catalog.dto.request.unit;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.AccessLevel;
import java.math.BigDecimal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UnitCreationRequest {
    @NotBlank(message = "EMPTY_CODE")
    @Size(max = 20, message = "INVALID_CODE")
    String code;

    @NotBlank(message = "EMPTY_NAME")
    @Size(max = 50, message = "INVALID_NAME")
    String name;

    @NotBlank(message = "EMPTY_DIMENSION")
    @Size(max = 20, message = "INVALID_DIMENSION")
    String dimension;

    @NotNull(message = "EMPTY_FACTOR_TO_BASE")
    BigDecimal factorToBase;
    
    @NotBlank(message = "EMPTY_BASE_UNIT_CODE")
    @Size(max = 20, message = "INVALID_BASE_UNIT_CODE")
    String baseUnitCode;
}
