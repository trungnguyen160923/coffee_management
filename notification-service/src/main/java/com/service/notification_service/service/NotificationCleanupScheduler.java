package com.service.notification_service.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.service.notification_service.repository.NotificationRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Scheduled task to clean up old notifications.
 * Runs every Sunday at 23:00 and deletes notifications from the previous week
 * (notifications created before Monday of the current week).
 * 
 * Example: On Sunday 7/12/2025 at 23:00, it will delete notifications
 * created before Monday 1/12/2025.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationCleanupScheduler {

    private final NotificationRepository notificationRepository;

    /**
     * Scheduled task that runs every Sunday at 23:00.
     * Cron expression: "0 0 23 ? * SUN" means:
     * - 0 seconds
     * - 0 minutes
     * - 23 hours (11 PM)
     * - Any day of month (?)
     * - Any month (*)
     * - Sunday (SUN)
     */
    @Scheduled(cron = "0 0 23 ? * SUN")
    public void cleanupOldNotifications() {
        try {
            log.info("Starting scheduled notification cleanup task...");
            
            // Get current date (which is Sunday when this runs)
            LocalDate today = LocalDate.now();
            
            // Calculate Monday of the current week
            // When running on Sunday, we want to delete notifications before Monday of the current week
            // previousOrSame(DayOfWeek.MONDAY) from Sunday will return Monday of the current week (6 days ago)
            LocalDate mondayOfCurrentWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            
            // Set cutoff time to start of Monday (00:00:00)
            // This means we delete all notifications created before Monday 00:00:00 of the current week
            LocalDateTime cutoffDateTime = mondayOfCurrentWeek.atStartOfDay();
            
            log.info("Deleting notifications created before: {}", cutoffDateTime);
            
            // Delete notifications created before the cutoff date
            notificationRepository.deleteByCreatedAtBefore(cutoffDateTime);
            
            log.info("Notification cleanup completed successfully. Deleted notifications created before {}", cutoffDateTime);
            
        } catch (Exception e) {
            log.error("Error during notification cleanup task", e);
        }
    }
}

