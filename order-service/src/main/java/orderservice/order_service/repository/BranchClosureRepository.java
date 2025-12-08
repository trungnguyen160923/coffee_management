package orderservice.order_service.repository;

import orderservice.order_service.entity.BranchClosure;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BranchClosureRepository extends JpaRepository<BranchClosure, Integer> {

    List<BranchClosure> findByBranchId(Integer branchId);

    List<BranchClosure> findByBranchIdIsNull();

    List<BranchClosure> findByBranchIdAndEndDateBetween(Integer branchId, LocalDate from, LocalDate to);

    List<BranchClosure> findByBranchIdIsNullAndEndDateBetween(LocalDate from, LocalDate to);

    // Query by userId (for admin to see only their closures)
    List<BranchClosure> findByUserIdAndEndDateBetween(Integer userId, LocalDate from, LocalDate to);

    List<BranchClosure> findByUserIdAndBranchIdAndEndDateBetween(Integer userId, Integer branchId, LocalDate from, LocalDate to);

    List<BranchClosure> findByUserIdAndBranchIdIsNullAndEndDateBetween(Integer userId, LocalDate from, LocalDate to);

    // Filter closures that overlap with date range: startDate <= to AND endDate >= from
    @Query("SELECT bc FROM BranchClosure bc WHERE bc.branchId = :branchId AND bc.startDate <= :to AND bc.endDate >= :from")
    List<BranchClosure> findByBranchIdAndDateOverlap(@Param("branchId") Integer branchId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT bc FROM BranchClosure bc WHERE bc.branchId IS NULL AND bc.startDate <= :to AND bc.endDate >= :from")
    List<BranchClosure> findByBranchIdIsNullAndDateOverlap(@Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT bc FROM BranchClosure bc WHERE bc.userId = :userId AND bc.startDate <= :to AND bc.endDate >= :from")
    List<BranchClosure> findByUserIdAndDateOverlap(@Param("userId") Integer userId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT bc FROM BranchClosure bc WHERE bc.userId = :userId AND bc.branchId = :branchId AND bc.startDate <= :to AND bc.endDate >= :from")
    List<BranchClosure> findByUserIdAndBranchIdAndDateOverlap(@Param("userId") Integer userId, @Param("branchId") Integer branchId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT bc FROM BranchClosure bc WHERE bc.userId = :userId AND bc.branchId IS NULL AND bc.startDate <= :to AND bc.endDate >= :from")
    List<BranchClosure> findByUserIdAndBranchIdIsNullAndDateOverlap(@Param("userId") Integer userId, @Param("from") LocalDate from, @Param("to") LocalDate to);
}


