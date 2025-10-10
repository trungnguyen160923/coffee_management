package com.service.catalog.repository;

import com.service.catalog.entity.InventoryCost;
import com.service.catalog.entity.InventoryCostId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryCostRepository extends JpaRepository<InventoryCost, InventoryCostId> {
}


