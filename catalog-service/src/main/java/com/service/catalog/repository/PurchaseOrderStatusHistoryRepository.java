package com.service.catalog.repository;

import com.service.catalog.entity.PurchaseOrderStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PurchaseOrderStatusHistoryRepository extends JpaRepository<PurchaseOrderStatusHistory, Long> {
    List<PurchaseOrderStatusHistory> findByPurchaseOrderPoIdOrderByChangedAtDesc(Integer poId);
}
