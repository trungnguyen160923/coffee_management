package com.service.catalog.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.service.catalog.entity.Unit;

public interface UnitRepository extends JpaRepository<Unit, String> {
    boolean existsByNameAndCodeNot(String name, String code);
    boolean existsByBaseUnitCode(String baseUnitCode);
    List<Unit> findByBaseUnitCode(String baseUnitCode);
    
    @Modifying
    @Query(value = "DELETE FROM units WHERE code = :code", nativeQuery = true)
    void deleteByCodeNative(@Param("code") String code);
}
