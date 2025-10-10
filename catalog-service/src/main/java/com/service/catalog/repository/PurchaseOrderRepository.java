package com.service.catalog.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.service.catalog.entity.PurchaseOrder;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Integer> {
    boolean existsBySupplier_SupplierId(Integer supplierId);
    List<PurchaseOrder> findByBranchId(Integer branchId);
}
