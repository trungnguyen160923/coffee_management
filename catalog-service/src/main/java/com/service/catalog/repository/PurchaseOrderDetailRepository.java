package com.service.catalog.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.service.catalog.entity.PurchaseOrderDetail;

import java.util.List;

@Repository
public interface PurchaseOrderDetailRepository extends JpaRepository<PurchaseOrderDetail, Integer> {
    List<PurchaseOrderDetail> findByPurchaseOrderPoId(Integer poId);
}
