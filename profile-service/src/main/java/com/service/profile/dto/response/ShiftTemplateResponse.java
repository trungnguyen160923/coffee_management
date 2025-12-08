package com.service.profile.dto.response;

import lombok.Data;

import java.time.LocalTime;
import java.math.BigDecimal;
import java.util.List;

@Data
public class ShiftTemplateResponse {
    Integer templateId;
    Integer branchId;
    String name;
    LocalTime startTime;
    LocalTime endTime;
    BigDecimal durationHours;
    Integer maxStaffAllowed;
    String employmentType; // FULL_TIME, PART_TIME, CASUAL, ANY
    Boolean isActive;
    String description;
    List<TemplateRoleRequirementResponse> roleRequirements;
}


