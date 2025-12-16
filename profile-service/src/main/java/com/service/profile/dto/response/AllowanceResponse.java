package com.service.profile.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AllowanceResponse {
    Integer allowanceId;
    Integer userId;
    String userRole;
    Integer branchId;
    String period;
    String allowanceType;
    BigDecimal amount;
    String description;
    String status;
    Integer sourceTemplateId;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}

