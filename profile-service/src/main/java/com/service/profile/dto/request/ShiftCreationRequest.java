package com.service.profile.dto.request;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Data
public class ShiftCreationRequest {
    Integer branchId;
    Integer templateId; // optional
    LocalDate shiftDate;
    LocalTime startTime;
    LocalTime endTime;
    Integer maxStaffAllowed;
    String employmentType; // optional: FULL_TIME, PART_TIME, CASUAL, ANY. NULL = kế thừa từ template
    String notes;
    List<ShiftRoleRequirementRequest> roleRequirements; // optional - nếu có thì tạo role requirements cho shift
}


