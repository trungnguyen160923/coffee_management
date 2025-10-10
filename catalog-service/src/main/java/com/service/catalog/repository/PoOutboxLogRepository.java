package com.service.catalog.repository;

import com.service.catalog.entity.PoOutboxLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PoOutboxLogRepository extends JpaRepository<PoOutboxLog, Long> {
    List<PoOutboxLog> findByPurchaseOrderPoIdOrderBySentAtDesc(Integer poId);
}
