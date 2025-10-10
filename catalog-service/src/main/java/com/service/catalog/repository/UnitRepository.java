package com.service.catalog.repository;

import com.service.catalog.entity.Unit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UnitRepository extends JpaRepository<Unit, String> {
    
    /**
     * Find unit by code
     */
    Optional<Unit> findByCode(String code);
    
    /**
     * Find all units by dimension
     */
    List<Unit> findByDimension(String dimension);
    
    /**
     * Find all units by base unit code
     */
    List<Unit> findByBaseUnitCode(String baseUnitCode);

    boolean existsByNameAndCodeNot(String name, String code);
    boolean existsByBaseUnitCode(String baseUnitCode);
    
    @Modifying
    @Query(value = "DELETE FROM units WHERE code = :code", nativeQuery = true)
    void deleteByCodeNative(@Param("code") String code);
}