package com.service.profile.dto.request;

import lombok.Data;

@Data
public class ShiftAssignmentRequest {
    Integer shiftId;
    Integer staffUserId;
    Integer roleId;
    String assignmentType; // AUTO / MANUAL / SELF_REGISTERED / BORROWED
}


