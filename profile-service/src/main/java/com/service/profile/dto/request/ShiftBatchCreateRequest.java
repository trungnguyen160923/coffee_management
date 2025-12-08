package com.service.profile.dto.request;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class ShiftBatchCreateRequest {
    Integer branchId;
    Integer templateId;
    LocalDate startDate;
    LocalDate endDate;
    Integer maxStaffAllowed;
    String notes;
    List<ShiftRoleRequirementRequest> roleRequirements; // optional - nếu có thì dùng thay vì copy từ template
}



