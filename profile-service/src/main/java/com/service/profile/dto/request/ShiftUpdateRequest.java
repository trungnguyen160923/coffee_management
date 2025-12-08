package com.service.profile.dto.request;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Data
public class ShiftUpdateRequest {
    Integer branchId;
    Integer templateId;
    LocalDate shiftDate;
    LocalTime startTime;
    LocalTime endTime;
    Integer maxStaffAllowed;
    String employmentType; // optional: FULL_TIME, PART_TIME, CASUAL, ANY. NULL = kế thừa từ template
    String status;
    String notes;
    List<ShiftRoleRequirementRequest> roleRequirements; // optional - nếu có thì replace toàn bộ role requirements
}



