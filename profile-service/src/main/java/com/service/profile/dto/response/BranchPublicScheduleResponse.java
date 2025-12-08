package com.service.profile.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Public schedule response - chỉ hiển thị tên nhân viên và giờ ca làm việc
 * Tuân thủ business rules: không hiển thị thông tin nhạy cảm
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BranchPublicScheduleResponse {
    /**
     * Shift date (yyyy-MM-dd)
     */
    String shiftDate;
    
    /**
     * Shift start time (HH:mm)
     */
    String startTime;
    
    /**
     * Shift end time (HH:mm)
     */
    String endTime;
    
    /**
     * Staff name (chỉ tên, không có thông tin khác)
     */
    String staffName;
    
    /**
     * Staff user ID (để frontend có thể identify nếu cần)
     */
    Integer staffUserId;
    
    /**
     * Shift ID (để frontend có thể tạo request)
     */
    Integer shiftId;
    
    /**
     * Assignment ID (để frontend có thể tạo PICK_UP request)
     */
    Integer assignmentId;
}

