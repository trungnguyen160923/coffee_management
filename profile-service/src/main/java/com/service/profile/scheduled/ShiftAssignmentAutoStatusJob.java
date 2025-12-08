package com.service.profile.scheduled;

import com.service.profile.entity.Shift;
import com.service.profile.entity.ShiftAssignment;
import com.service.profile.repository.ShiftAssignmentRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled job to automatically update assignment status for completed shifts:
 * 1. CONFIRMED assignments that ended without check-in → NO_SHOW
 * 2. CHECKED_IN assignments that ended more than 5 minutes ago → auto checkout
 * Runs every 5 minutes
 */
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ShiftAssignmentAutoStatusJob {

    ShiftAssignmentRepository assignmentRepository;

    /**
     * Process assignments for completed shifts
     * Runs every 5 minutes
     */
    @Scheduled(cron = "0 */5 * * * *") // Every 5 minutes
    @Transactional
    public void processCompletedShiftAssignments() {
        try {
            LocalDateTime now = LocalDateTime.now();
            
            // Find assignments that need processing
            List<ShiftAssignment> assignmentsToProcess = assignmentRepository.findByStatusIn(
                    java.util.List.of("CONFIRMED", "CHECKED_IN"));

            int noShowCount = 0;
            int autoCheckoutCount = 0;

            for (ShiftAssignment assignment : assignmentsToProcess) {
                try {
                    Shift shift = assignment.getShift();
                    if (shift == null) {
                        continue;
                    }

                    // Calculate shift end time
                    LocalDateTime shiftEnd = shift.getShiftDate().atTime(shift.getEndTime());
                    // Handle shifts that span midnight
                    if (shift.getEndTime().isBefore(shift.getStartTime())) {
                        shiftEnd = shiftEnd.plusDays(1);
                    }

                    // Case 1: CONFIRMED assignment, shift ended, no check-in → NO_SHOW
                    if ("CONFIRMED".equals(assignment.getStatus()) && now.isAfter(shiftEnd)) {
                        assignment.setStatus("NO_SHOW");
                        String existingNotes = assignment.getNotes() != null ? assignment.getNotes() : "";
                        assignment.setNotes(existingNotes + (existingNotes.isEmpty() ? "" : "\n") +
                                "Auto-updated to NO_SHOW: Shift ended without check-in (shift ended at " + shiftEnd + ")");
                        assignmentRepository.save(assignment);
                        noShowCount++;
                    }
                    // Case 2: CHECKED_IN assignment, shift ended more than 5 minutes ago → auto checkout
                    else if ("CHECKED_IN".equals(assignment.getStatus())) {
                        LocalDateTime fiveMinutesAfterShiftEnd = shiftEnd.plusMinutes(5);
                        if (now.isAfter(fiveMinutesAfterShiftEnd)) {
                            // Auto checkout
                            LocalDateTime checkedInAt = assignment.getCheckedInAt();
                            if (checkedInAt == null) {
                                continue;
                            }

                            // Calculate actual hours
                            long minutesBetween = java.time.Duration.between(checkedInAt, now).toMinutes();
                            java.math.BigDecimal actualHours = java.math.BigDecimal.valueOf(minutesBetween)
                                    .divide(java.math.BigDecimal.valueOf(60), 2, java.math.RoundingMode.HALF_UP);

                            // Update assignment
                            assignment.setStatus("CHECKED_OUT");
                            assignment.setCheckedOutAt(now);
                            assignment.setActualHours(actualHours);
                            String existingNotes = assignment.getNotes() != null ? assignment.getNotes() : "";
                            assignment.setNotes(existingNotes + (existingNotes.isEmpty() ? "" : "\n") +
                                    "Auto-checked out: Shift ended more than 5 minutes ago (shift ended at " + shiftEnd + ")");
                            assignmentRepository.save(assignment);
                            autoCheckoutCount++;
                        }
                    }
                } catch (Exception e) {
                    // Continue processing other assignments
                }
            }

            log.info("Auto status update job completed successfully. NO_SHOW: {}, Auto checkout: {}", 
                    noShowCount, autoCheckoutCount);
        } catch (Exception e) {
            log.error("Auto status update job failed: {}", e.getMessage(), e);
        }
    }
}

