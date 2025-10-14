package com.service.catalog.repository;

import com.service.catalog.entity.TableEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TableRepository extends JpaRepository<TableEntity, Integer> {

    List<TableEntity> findByBranchId(Integer branchId);

    Page<TableEntity> findByBranchId(Integer branchId, Pageable pageable);

    Optional<TableEntity> findByBranchIdAndLabel(Integer branchId, String label);

    @Query("SELECT t FROM TableEntity t WHERE t.branchId = :branchId AND " +
            "(:search IS NULL OR LOWER(t.label) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
            "(:status IS NULL OR t.status = :status)")
    Page<TableEntity> findByBranchIdAndFilters(@Param("branchId") Integer branchId,
            @Param("search") String search,
            @Param("status") TableEntity.TableStatus status,
            Pageable pageable);

    @Query("SELECT t FROM TableEntity t WHERE " +
            "(:search IS NULL OR LOWER(t.label) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
            "(:status IS NULL OR t.status = :status)")
    Page<TableEntity> findByFilters(@Param("search") String search,
            @Param("status") TableEntity.TableStatus status,
            Pageable pageable);

    List<TableEntity> findByBranchIdAndStatus(Integer branchId, TableEntity.TableStatus status);

    @Query("SELECT COUNT(t) FROM TableEntity t WHERE t.branchId = :branchId")
    Long countByBranchId(@Param("branchId") Integer branchId);

    @Query("SELECT COUNT(t) FROM TableEntity t WHERE t.branchId = :branchId AND t.status = :status")
    Long countByBranchIdAndStatus(@Param("branchId") Integer branchId, @Param("status") TableEntity.TableStatus status);
}
