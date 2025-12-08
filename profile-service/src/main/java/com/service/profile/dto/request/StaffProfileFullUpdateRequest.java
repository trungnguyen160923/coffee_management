package com.service.profile.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StaffProfileFullUpdateRequest {

    String identityCard;
    LocalDate hireDate;

    String employmentType; // FULL_TIME / PART_TIME / CASUAL
    String payType;        // MONTHLY / HOURLY

    BigDecimal baseSalary;
    BigDecimal hourlyRate;
    BigDecimal overtimeRate;

    List<Integer> staffBusinessRoleIds;
    String proficiencyLevel; // BEGINNER / INTERMEDIATE / ADVANCED / EXPERT
}


