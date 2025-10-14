package orderservice.order_service.repository;

import orderservice.order_service.entity.Discount;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DiscountRepository extends JpaRepository<Discount, Integer> {

    Optional<Discount> findByCode(String code);

    List<Discount> findByActiveTrue();

    List<Discount> findByBranchIdAndActiveTrue(Integer branchId);

    @Query("SELECT d FROM Discount d WHERE d.active = true AND d.startDate <= :currentTime AND d.endDate >= :currentTime")
    List<Discount> findActiveDiscounts(@Param("currentTime") LocalDateTime currentTime);

    @Query("SELECT d FROM Discount d WHERE d.active = true AND d.startDate <= :currentTime AND d.endDate >= :currentTime AND (d.branchId = :branchId OR d.branchId IS NULL)")
    List<Discount> findActiveDiscountsForBranch(@Param("currentTime") LocalDateTime currentTime,
            @Param("branchId") Integer branchId);

    @Query("SELECT d FROM Discount d WHERE d.active = true AND d.startDate <= :currentTime AND d.endDate >= :currentTime AND (d.branchId = :branchId OR d.branchId IS NULL) AND d.minOrderAmount <= :orderAmount")
    List<Discount> findApplicableDiscounts(@Param("currentTime") LocalDateTime currentTime,
            @Param("branchId") Integer branchId, @Param("orderAmount") java.math.BigDecimal orderAmount);

    @Query("SELECT d FROM Discount d WHERE d.active = true AND d.startDate <= :currentTime AND d.endDate >= :currentTime AND (d.branchId = :branchId OR d.branchId IS NULL) AND d.minOrderAmount <= :orderAmount AND (d.usageLimit = 0 OR d.usedCount < d.usageLimit)")
    List<Discount> findAvailableDiscounts(@Param("currentTime") LocalDateTime currentTime,
            @Param("branchId") Integer branchId, @Param("orderAmount") java.math.BigDecimal orderAmount);

    Page<Discount> findByBranchId(Integer branchId, Pageable pageable);

    @Query("SELECT d FROM Discount d WHERE d.branchId = :branchId OR d.branchId IS NULL")
    Page<Discount> findByBranchIdOrGlobal(@Param("branchId") Integer branchId, Pageable pageable);

    @Query("SELECT d FROM Discount d WHERE d.name LIKE %:keyword% OR d.code LIKE %:keyword% OR d.description LIKE %:keyword%")
    Page<Discount> searchDiscounts(@Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT d FROM Discount d WHERE (d.branchId = :branchId OR d.branchId IS NULL) AND (d.name LIKE %:keyword% OR d.code LIKE %:keyword% OR d.description LIKE %:keyword%)")
    Page<Discount> searchDiscountsByBranch(@Param("branchId") Integer branchId, @Param("keyword") String keyword,
            Pageable pageable);
}
