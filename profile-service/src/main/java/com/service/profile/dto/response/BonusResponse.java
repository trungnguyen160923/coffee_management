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
public class BonusResponse {
    Integer bonusId;
    Integer userId;
    String userRole;
    Integer branchId;
    String period;
    String bonusType;
    BigDecimal amount;
    String description;
    String criteriaRef;
    String status;
    Integer createdBy;
    Integer approvedBy;
    LocalDateTime approvedAt;
    String rejectionReason;
    Integer sourceTemplateId;
    Integer shiftId;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}

