package com.service.catalog.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UnitResponse {
    String code;
    String name;
    String dimension;
    BigDecimal factorToBase;
    
    // Chỉ lưu code của base unit để tránh vòng lặp vô hạn
    String baseUnitCode;
    
    LocalDateTime createAt;
    LocalDateTime updateAt;
}
