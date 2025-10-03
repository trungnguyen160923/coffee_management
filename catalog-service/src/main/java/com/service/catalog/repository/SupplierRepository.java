package com.service.catalog.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.service.catalog.entity.Supplier;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Integer> {
    
    @Query("SELECT s FROM Supplier s WHERE " +
           "(:search IS NULL OR :search = '' OR " +
           "LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(s.contactName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(s.phone) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(s.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(s.address) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Supplier> findSuppliersWithFilters(
            @Param("search") String search,
            Pageable pageable
    );
}
