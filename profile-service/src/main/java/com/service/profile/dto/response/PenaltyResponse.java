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
public class PenaltyResponse {
    Integer penaltyId;
    Integer userId;
    String userRole;
    Integer branchId;
    String period;
    String penaltyType;
    BigDecimal amount;
    String reasonCode;
    String description;
    LocalDate incidentDate;
    Integer shiftId;
    String status;
    Integer createdBy;
    Integer approvedBy;
    LocalDateTime approvedAt;
    String rejectionReason;
    Integer sourceTemplateId;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}

