package com.service.profile.dto.response;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.math.BigDecimal;
import java.util.List;

@Data
public class ShiftResponse {
    Integer shiftId;
    Integer branchId;
    Integer templateId;
    LocalDate shiftDate;
    LocalTime startTime;
    LocalTime endTime;
    BigDecimal durationHours;
    Integer maxStaffAllowed;
    String employmentType; // FULL_TIME, PART_TIME, CASUAL, ANY. NULL = kế thừa từ template
    String status;
    String notes;
    List<ShiftRoleRequirementResponse> roleRequirements;
    // Availability info for staff self-service
    Boolean isExpired; // Shift date has passed
    Boolean isFull; // Max staff reached
    Boolean isRegistered; // Staff has already registered
    Boolean isAvailable; // Can be registered (not expired, not full, not registered)
    Integer assignmentId; // Assignment ID if already registered (for unregister)
}


