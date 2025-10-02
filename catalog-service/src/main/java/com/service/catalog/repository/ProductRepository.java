package com.service.catalog.repository;

import com.service.catalog.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer> {
    
    @Query("SELECT p FROM Product p WHERE " +
           "(:search IS NULL OR :search = '' OR " +
           "LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.description) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.sku) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
           "(:categoryId IS NULL OR p.category.categoryId = :categoryId) AND " +
           "(:active IS NULL OR p.active = :active)")
    Page<Product> findProductsWithFilters(
            @Param("search") String search,
            @Param("categoryId") Integer categoryId,
            @Param("active") Boolean active,
            Pageable pageable
    );

    boolean existsByCategoryCategoryId(Integer categoryId);
}