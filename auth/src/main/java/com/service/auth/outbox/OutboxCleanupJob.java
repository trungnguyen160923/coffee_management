package com.service.auth.outbox;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class OutboxCleanupJob {
    private final OutboxEventRepository repo;

    public OutboxCleanupJob(OutboxEventRepository repo) {
        this.repo = repo;
    }

    // Chạy mỗi đêm, xoá theo batch 2000
    @Scheduled(cron = "0 0 */3 * * *")
    @Transactional
    public void cleanup() {
        Instant threshold = Instant.now().minus(Integer.getInteger("outbox.cleanup.days", 30), ChronoUnit.DAYS);
        int total = 0, affected;
        do {
            affected = repo.deleteOldEvents(threshold, 2000);
            total += affected;
        } while (affected == 2000);
        if (total > 0) log.info("OutboxCleanupJob deleted {} rows", total);
    }
}


