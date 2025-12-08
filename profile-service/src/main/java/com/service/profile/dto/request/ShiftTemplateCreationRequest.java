package com.service.profile.dto.request;

import lombok.Data;

import java.time.LocalTime;
import java.util.List;

@Data
public class ShiftTemplateCreationRequest {
    Integer branchId;
    String name;
    LocalTime startTime;
    LocalTime endTime;
    Integer maxStaffAllowed;
    String employmentType; // optional: FULL_TIME, PART_TIME, CASUAL, ANY. Default = ANY
    String description;
    List<TemplateRoleRequirementRequest> roleRequirements; // optional
}


