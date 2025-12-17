package com.service.profile.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalTime;
import java.util.List;

@Data
public class ShiftTemplateCreationRequest {

    @NotNull(message = "Branch id is required")
    Integer branchId;

    @NotBlank(message = "Name is required")
    @Size(max = 100, message = "Name must be at most {max} characters")
    String name;

    @NotNull(message = "startTime is required")
    LocalTime startTime;

    @NotNull(message = "endTime is required")
    LocalTime endTime;

    @NotNull(message = "maxStaffAllowed is required")
    @Positive(message = "maxStaffAllowed must be greater than 0")
    Integer maxStaffAllowed;

    // optional: FULL_TIME, PART_TIME, CASUAL, ANY. Default = ANY
    @Pattern(
            regexp = "FULL_TIME|PART_TIME|CASUAL|ANY",
            message = "employmentType must be one of FULL_TIME, PART_TIME, CASUAL, ANY"
    )
    @Size(max = 20, message = "employmentType must be at most {max} characters")
    String employmentType;

    @Size(max = 255, message = "description must be at most {max} characters")
    String description;

    // optional
    @Valid
    List<TemplateRoleRequirementRequest> roleRequirements;
}


