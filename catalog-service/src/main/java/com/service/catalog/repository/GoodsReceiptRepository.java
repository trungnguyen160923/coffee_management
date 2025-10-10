package com.service.catalog.repository;

import com.service.catalog.entity.GoodsReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GoodsReceiptRepository extends JpaRepository<GoodsReceipt, Long> {
    List<GoodsReceipt> findByPurchaseOrderPoId(Integer poId);
    List<GoodsReceipt> findBySupplierSupplierId(Integer supplierId);
    List<GoodsReceipt> findByBranchId(Integer branchId);
}
