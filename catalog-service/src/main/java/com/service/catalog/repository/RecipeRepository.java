package com.service.catalog.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.service.catalog.entity.Recipe;

@Repository
public interface RecipeRepository extends JpaRepository<Recipe, Integer>, JpaSpecificationExecutor<Recipe> {
    boolean existsByNameAndProductDetailPdIdAndVersion(String name, Integer pdId, Integer version);

    @EntityGraph(attributePaths = {
            "productDetail.product.category",
            "items",
            "items.ingredient",
            "items.unit"
    })
    Optional<Recipe> findWithAllByRecipeId(Integer recipeId);
    
    /**
     * Tìm version cao nhất của recipe với tên và product detail cụ thể (kể cả đã xóa)
     */
    @Query("SELECT COALESCE(MAX(r.version), 0) FROM Recipe r WHERE r.name = :name AND r.productDetail.pdId = :pdId")
    Integer findMaxVersionByNameAndPdId(@Param("name") String name, @Param("pdId") Integer pdId);
}
