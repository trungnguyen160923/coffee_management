package com.service.profile.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Response DTO for staff availability when assigning to a shift
 * Includes staff info and availability status with conflict reason if unavailable
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AvailableStaffForShiftResponse {
    StaffWithUserResponse staff;
    Boolean isAvailable;
    String conflictReason; // Reason why staff is not available (null if available)
    Integer remainingSlots; // Number of remaining slots in the shift
}

