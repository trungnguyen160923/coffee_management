package com.service.profile.dto.request;

import lombok.Data;

@Data
public class ShiftAssignmentCreateRequest {
    Integer shiftId;
    Integer staffUserId;
    String overrideReason; // Optional: Reason for overriding role requirements
    String capacityOverrideReason; // Optional: Reason for overriding capacity limit
}

