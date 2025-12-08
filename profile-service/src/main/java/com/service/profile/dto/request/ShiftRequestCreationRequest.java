package com.service.profile.dto.request;

import lombok.Data;

@Data
public class ShiftRequestCreationRequest {
    Integer assignmentId; // for SWAP/PICK_UP/TWO_WAY_SWAP/LEAVE
    Integer shiftId; // for OVERTIME (xin làm ca mới)
    Integer staffUserId;
    String requestType; // SWAP / PICK_UP / TWO_WAY_SWAP / LEAVE / OVERTIME
    Integer targetStaffUserId; // for SWAP/PICK_UP/TWO_WAY_SWAP
    Integer targetAssignmentId; // for TWO_WAY_SWAP (B's assignment to swap)
    java.math.BigDecimal overtimeHours; // for OVERTIME (deprecated, not needed)
    String reason;
}


