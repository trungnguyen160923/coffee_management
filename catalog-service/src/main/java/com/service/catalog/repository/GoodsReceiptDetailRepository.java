package com.service.catalog.repository;

import com.service.catalog.entity.GoodsReceiptDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GoodsReceiptDetailRepository extends JpaRepository<GoodsReceiptDetail, Long> {
    List<GoodsReceiptDetail> findByGoodsReceiptGrnId(Long grnId);
    List<GoodsReceiptDetail> findByPurchaseOrderPoId(Integer poId);
    List<GoodsReceiptDetail> findByIngredientIngredientId(Integer ingredientId);
}
