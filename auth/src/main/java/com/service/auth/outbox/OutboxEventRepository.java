package com.service.auth.outbox;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, String> {
    List<OutboxEvent> findTop100ByStatusOrderByCreatedAtAsc(String status);

    @Modifying
    @Query(value = "DELETE FROM outbox_event WHERE status IN ('PUBLISHED','FAILED') AND created_at < :threshold LIMIT :limit", nativeQuery = true)
    int deleteOldEvents(@Param("threshold") java.time.Instant threshold, @Param("limit") int limit);
}


