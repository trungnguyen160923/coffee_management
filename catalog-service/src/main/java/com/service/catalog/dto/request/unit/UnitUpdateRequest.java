package com.service.catalog.dto.request.unit;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.AccessLevel;
import java.math.BigDecimal;

import jakarta.validation.constraints.Size;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UnitUpdateRequest {

    @Size(max = 50, message = "INVALID_NAME")
    String name;

    @Size(max = 20, message = "INVALID_DIMENSION")
    String dimension;
    
    BigDecimal factorToBase;
    String baseUnitCode;
}
