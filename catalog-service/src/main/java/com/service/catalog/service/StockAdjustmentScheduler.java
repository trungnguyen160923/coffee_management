package com.service.catalog.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(value = "app.stock-adjustment.scheduler.enabled", havingValue = "true", matchIfMissing = true)
public class StockAdjustmentScheduler {

    private final StockAdjustmentService stockAdjustmentService;
    private LocalDateTime lastRunTime;
    private int lastCommittedCount;
    private boolean isRunning = false;

    @Scheduled(cron = "${app.stock-adjustment.scheduler.cron:0 */5 * * * ?}")
    public void autoCommitPendingAdjustments() {
        if (isRunning) {
            log.warn("[StockAdjustmentScheduler] Previous run still in progress, skipping this execution");
            return;
        }

        try {
            isRunning = true;
            LocalDateTime startTime = LocalDateTime.now();
            log.info("[StockAdjustmentScheduler] Starting auto-commit check at {}", 
                    startTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
            
            int committed = stockAdjustmentService.autoCommitPendingAdjustments();
            
            lastRunTime = startTime;
            lastCommittedCount = committed;
            
            if (committed > 0) {
                log.info("[StockAdjustmentScheduler] ✓ Auto committed {} pending adjustments", committed);
            } else {
                log.debug("[StockAdjustmentScheduler] ✓ Checked for pending adjustments, none found to commit");
            }
        } catch (Exception ex) {
            log.error("[StockAdjustmentScheduler] ✗ Error during auto-commit execution", ex);
        } finally {
            isRunning = false;
        }
    }

    public LocalDateTime getLastRunTime() {
        return lastRunTime;
    }

    public int getLastCommittedCount() {
        return lastCommittedCount;
    }

    public boolean isRunning() {
        return isRunning;
    }
}

