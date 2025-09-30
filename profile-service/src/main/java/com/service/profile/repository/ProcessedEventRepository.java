package com.service.profile.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.service.profile.entity.ProcessedEvent;

@Repository
public interface ProcessedEventRepository extends JpaRepository<ProcessedEvent, String> {
    @Modifying
    @Query(value = "DELETE FROM processed_event WHERE processed_at < :threshold LIMIT :limit", nativeQuery = true)
    int deleteOldProcessed(@Param("threshold") java.time.Instant threshold, @Param("limit") int limit);
}


