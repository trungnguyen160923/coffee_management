package com.service.profile.scheduled;

import com.service.profile.entity.ShiftAssignment;
import com.service.profile.repository.ShiftAssignmentRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Scheduled job to automatically cancel assignments for expired shifts
 * Runs daily at 2:00 AM to cancel assignments for shifts that have passed
 */
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ExpiredShiftAssignmentCleanupJob {

    ShiftAssignmentRepository assignmentRepository;

    /**
     * Cancel assignments for shifts that have passed (shift date < today)
     * Only cancel assignments that are still PENDING or CONFIRMED (not already checked in/out)
     * Runs daily at 2:00 AM
     */
    @Scheduled(cron = "0 0 2 * * *") // Daily at 2:00 AM
    @Transactional
    public void cancelExpiredAssignments() {
        LocalDate today = LocalDate.now();
        log.info("Starting expired shift assignment cleanup job for date: {}", today);

        // Find all assignments with status PENDING or CONFIRMED
        List<ShiftAssignment> activeAssignments = assignmentRepository.findByStatusIn(
                java.util.List.of("PENDING", "CONFIRMED"));
        
        int cancelledCount = 0;
        for (ShiftAssignment assignment : activeAssignments) {
            // Check if shift date is today or has passed (cancel if shift date <= today)
            if (assignment.getShift() != null) {
                LocalDate shiftDate = assignment.getShift().getShiftDate();
                if (shiftDate.isBefore(today) || shiftDate.isEqual(today)) {
                    assignment.setStatus("CANCELLED");
                    String existingNotes = assignment.getNotes() != null ? assignment.getNotes() : "";
                    assignment.setNotes(existingNotes + (existingNotes.isEmpty() ? "" : "\n") +
                            "Auto-cancelled: Shift date has passed or is today (" + shiftDate + ")");
                    assignmentRepository.save(assignment);
                    cancelledCount++;
                    log.debug("Cancelled assignment {} for expired shift {} (date: {})", 
                            assignment.getAssignmentId(), assignment.getShift().getShiftId(), shiftDate);
                }
            }
        }

        log.info("Expired shift assignment cleanup completed. Cancelled {} assignments", cancelledCount);
    }
}

