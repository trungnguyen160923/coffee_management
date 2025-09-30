package com.service.profile.listeners;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;
import com.service.profile.repository.ProcessedEventRepository;

@Component
@Slf4j
public class ProcessedEventCleanupJob {
    private final ProcessedEventRepository repo;

    public ProcessedEventCleanupJob(ProcessedEventRepository repo) {
        this.repo = repo;
    }

    @Scheduled(cron = "0 0 */3 * * *")
    @Transactional
    public void cleanup() {
        Instant threshold = Instant.now().minus(Integer.getInteger("processed.cleanup.days", 30), ChronoUnit.DAYS);
        int total = 0, affected;
        do {
            affected = repo.deleteOldProcessed(threshold, 2000);
            total += affected;
        } while (affected == 2000);
        if (total > 0) log.info("ProcessedEventCleanupJob deleted {} rows", total);
    }
}


