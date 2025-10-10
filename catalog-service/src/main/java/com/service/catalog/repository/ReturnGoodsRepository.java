package com.service.catalog.repository;

import com.service.catalog.entity.ReturnGoods;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReturnGoodsRepository extends JpaRepository<ReturnGoods, Integer> {
    List<ReturnGoods> findByPurchaseOrderPoId(Integer poId);
    List<ReturnGoods> findBySupplierSupplierId(Integer supplierId);
    List<ReturnGoods> findByBranchId(Integer branchId);
    List<ReturnGoods> findByStatus(String status);
}
