package com.service.catalog.repository;

import com.service.catalog.entity.GoodsReceiptDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GoodsReceiptDetailRepository extends JpaRepository<GoodsReceiptDetail, Long> {
    List<GoodsReceiptDetail> findByGoodsReceiptGrnId(Long grnId);
    
    @Query("SELECT grd FROM GoodsReceiptDetail grd WHERE grd.purchaseOrder.poId = :poId")
    List<GoodsReceiptDetail> findByPurchaseOrderPoId(@Param("poId") Integer poId);
    
    @Query("SELECT COUNT(grd) FROM GoodsReceiptDetail grd WHERE grd.purchaseOrder.poId = :poId")
    Long countByPurchaseOrderPoId(@Param("poId") Integer poId);
    
    List<GoodsReceiptDetail> findByIngredientIngredientId(Integer ingredientId);
    List<GoodsReceiptDetail> findByPurchaseOrderDetailId(Integer poDetailId);
}
