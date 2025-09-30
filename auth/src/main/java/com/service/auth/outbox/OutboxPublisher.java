package com.service.auth.outbox;

import java.util.List;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class OutboxPublisher {
    private final OutboxEventRepository repo;
    private final KafkaTemplate<String, String> kafka;
    private volatile int emptyPolls = 0;

    public OutboxPublisher(OutboxEventRepository repo, KafkaTemplate<String, String> kafka) {
        this.repo = repo; this.kafka = kafka;
    }

    // Configurable delay with default 1000ms; avoids hot-looping
    @Scheduled(fixedDelayString = "${outbox.publisher.fixedDelay:1000}")
    public void publish() {
        List<com.service.auth.outbox.OutboxEvent> batch = repo.findTop100ByStatusOrderByCreatedAtAsc("NEW");
        if (batch.isEmpty()) {
            int polls = ++emptyPolls;
            if (polls % 20 == 0) {
                log.debug("OutboxPublisher idle polls: {}", polls);
            }
            long sleepMs = Math.min(200L * polls, 5000L);
            try {
                Thread.sleep(sleepMs);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
            }
            return;
        }

        emptyPolls = 0;
        log.info("OutboxPublisher: publishing {} events", batch.size());

        for (com.service.auth.outbox.OutboxEvent e : batch) {
            try {
                kafka.send("user.created.v2", e.getPayload())
                    .whenComplete((result, ex) -> {
                        if (ex == null) {
                            e.setStatus("PUBLISHED");
                            e.setAttempts(e.getAttempts() == null ? 1 : e.getAttempts() + 1);
                            repo.save(e);
                        } else {
                            log.warn("Outbox publish failed: {}", ex.getMessage());
                            e.setAttempts(e.getAttempts() == null ? 1 : e.getAttempts() + 1);
                            if (e.getAttempts() > 10) e.setStatus("FAILED");
                            repo.save(e);
                        }
                    });
            } catch (Exception ex) {
                log.warn("Outbox send error: {}", ex.getMessage());
                e.setAttempts(e.getAttempts() == null ? 1 : e.getAttempts() + 1);
                if (e.getAttempts() > 10) e.setStatus("FAILED");
                repo.save(e);
            }
        }
    }
}


