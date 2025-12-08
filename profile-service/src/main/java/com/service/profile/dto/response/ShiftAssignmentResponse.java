package com.service.profile.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class ShiftAssignmentResponse {
    Integer assignmentId;
    Integer shiftId;
    Integer staffUserId;
    String assignmentType;
    String status;
    Boolean borrowedStaff;
    Integer staffBaseBranchId;
    LocalDateTime checkedInAt;
    LocalDateTime checkedOutAt;
    BigDecimal actualHours;
    String notes;
    LocalDateTime createAt;
}


