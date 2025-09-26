package com.service.profile.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StaffProfileResponse {
    Integer userId;
    Integer branchId;
    String identityCard;
    String position;
    LocalDate hireDate;
    BigDecimal salary;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}
