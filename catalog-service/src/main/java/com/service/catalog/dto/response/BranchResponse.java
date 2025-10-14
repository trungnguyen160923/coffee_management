package com.service.catalog.dto.response;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.math.BigDecimal;

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
public class BranchResponse {
    Integer branchId;
    String name;
    String address;
    String phone;
    Integer managerUserId;
    LocalTime openHours;
    LocalTime endHours;
    LocalDateTime createAt;
    LocalDateTime updateAt;
    BigDecimal latitude;
    BigDecimal longitude;
}
