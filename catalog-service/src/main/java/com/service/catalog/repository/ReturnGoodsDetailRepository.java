package com.service.catalog.repository;

import com.service.catalog.entity.ReturnGoodsDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReturnGoodsDetailRepository extends JpaRepository<ReturnGoodsDetail, Integer> {
    List<ReturnGoodsDetail> findByReturnGoodsReturnId(Integer returnId);
    List<ReturnGoodsDetail> findByIngredientIngredientId(Integer ingredientId);
}
