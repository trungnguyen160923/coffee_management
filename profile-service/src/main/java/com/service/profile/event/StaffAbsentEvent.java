package com.service.profile.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Event được publish khi Manager đánh dấu Staff vắng mặt (NO_SHOW)
 * Có thể được publish từ Shift Service hoặc từ Profile Service
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffAbsentEvent {
    private Integer userId;
    private Integer shiftId;
    private Integer branchId;
    private LocalDate shiftDate;
    private String period; // Format: YYYY-MM
    private Integer managerUserId; // Manager đánh dấu NO_SHOW
}

