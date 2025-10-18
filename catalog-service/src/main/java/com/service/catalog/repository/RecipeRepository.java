package com.service.catalog.repository;

import com.service.catalog.entity.Recipe;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

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
     * Tìm recipe theo product detail ID và status
     */
    Optional<Recipe> findByProductDetailPdIdAndStatus(Integer productDetailId, String status);
    
    /**
     * Tìm tất cả recipes theo product detail ID
     */
    List<Recipe> findByProductDetailPdId(Integer productDetailId);
    
    /**
     * Tìm recipes theo status
     */
    List<Recipe> findByStatus(String status);
    
    /**
     * Tìm recipe active theo product detail ID (latest version)
     */
    @Query("SELECT r FROM Recipe r WHERE r.productDetail.pdId = :productDetailId AND r.status = 'ACTIVE' ORDER BY r.version DESC")
    Optional<Recipe> findActiveRecipeByProductDetailId(@Param("productDetailId") Integer productDetailId);
    
    /**
     * Tìm recipe theo product detail ID và version
     */
    Optional<Recipe> findByProductDetailPdIdAndVersion(Integer productDetailId, Integer version);
    
    /**
     * Kiểm tra xem có recipe active cho product detail không
     */
    boolean existsByProductDetailPdIdAndStatus(Integer productDetailId, String status);
    
    /**
     * Tìm tất cả recipes theo category
     */
    @Query("SELECT COALESCE(MAX(r.version), 0) FROM Recipe r WHERE r.name = :name AND r.productDetail.pdId = :pdId")
    Integer findMaxVersionByNameAndPdId(@Param("name") String name, @Param("pdId") Integer pdId);
    
    @Query("SELECT r FROM Recipe r WHERE r.productDetail.product.category.categoryId = :categoryId AND r.status = 'ACTIVE'")
    List<Recipe> findActiveRecipesByCategory(@Param("categoryId") Integer categoryId);
}