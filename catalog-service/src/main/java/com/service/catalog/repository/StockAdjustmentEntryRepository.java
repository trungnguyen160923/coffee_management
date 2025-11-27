package com.service.catalog.repository;

import com.service.catalog.entity.StockAdjustmentEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockAdjustmentEntryRepository extends JpaRepository<StockAdjustmentEntry, Long> {

    List<StockAdjustmentEntry> findByAdjustmentAdjustmentId(Long adjustmentId);
}

