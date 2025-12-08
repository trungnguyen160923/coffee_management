package com.service.profile.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
public class ShiftRequestResponse {
    Integer requestId;
    Integer assignmentId;
    Integer staffUserId;
    String requestType;
    Integer targetStaffUserId;
    Integer targetAssignmentId; // for TWO_WAY_SWAP
    BigDecimal overtimeHours;
    String reason;
    String status;
    LocalDateTime requestedAt;
    Integer reviewedBy;
    LocalDateTime reviewedAt;
    String reviewNotes;
    
    // Shift information
    Integer shiftId;
    LocalDate shiftDate;
    LocalTime startTime;
    LocalTime endTime;
    BigDecimal durationHours;
}


