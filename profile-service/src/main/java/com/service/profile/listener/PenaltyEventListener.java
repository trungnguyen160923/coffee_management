package com.service.profile.listener;

import com.service.profile.event.StaffAbsentEvent;
import com.service.profile.service.PenaltyService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Event Listener để tự động tạo penalty khi Staff vắng mặt (NO_SHOW)
 */
@Component
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PenaltyEventListener {

    PenaltyService penaltyService;

    /**
     * Lắng nghe StaffAbsentEvent và tự động tạo penalty
     */
    @EventListener
    @Async
    public void handleStaffAbsentEvent(StaffAbsentEvent event) {
        try {
            log.info("Received StaffAbsentEvent: userId={}, shiftId={}, branchId={}, period={}", 
                event.getUserId(), event.getShiftId(), event.getBranchId(), event.getPeriod());
            
            // Tự động tạo penalty cho NO_SHOW
            penaltyService.createAutoPenalty(
                event.getUserId(),
                event.getShiftId(),
                event.getPeriod(),
                event.getBranchId()
            );
            
            log.info("Auto-created penalty for NO_SHOW: userId={}, shiftId={}", 
                event.getUserId(), event.getShiftId());
        } catch (Exception e) {
            log.error("Failed to create auto penalty for StaffAbsentEvent: userId={}, shiftId={}", 
                event.getUserId(), event.getShiftId(), e);
            // Không throw exception để không ảnh hưởng đến flow chính
        }
    }
}

