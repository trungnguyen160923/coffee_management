package com.service.catalog.repository;

import com.service.catalog.entity.StockReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface StockReservationRepository extends JpaRepository<StockReservation, Long> {
    
    /**
     * Tìm reservations theo group ID
     */
    List<StockReservation> findByReservationGroupId(String reservationGroupId);
    
    /**
     * Tìm reservations theo group ID và status
     */
    List<StockReservation> findByReservationGroupIdAndStatus(String reservationGroupId, StockReservation.ReservationStatus status);
    
    /**
     * Tìm reservations theo cart ID
     */
    List<StockReservation> findByCartId(Integer cartId);
    
    /**
     * Tìm reservations theo guest ID
     */
    List<StockReservation> findByGuestId(String guestId);
    
    /**
     * Tìm reservations theo order ID
     */
    List<StockReservation> findByOrderId(Integer orderId);
    
    /**
     * Tìm reservations hết hạn
     */
    @Query("SELECT sr FROM StockReservation sr WHERE sr.status = 'ACTIVE' AND sr.expiresAt < :now")
    List<StockReservation> findExpiredReservations(@Param("now") LocalDateTime now);
    
    /**
     * Tìm reservations theo branch và ingredient
     */
    @Query("SELECT sr FROM StockReservation sr WHERE sr.branchId = :branchId AND sr.ingredientId = :ingredientId AND sr.status = 'ACTIVE'")
    List<StockReservation> findActiveReservationsByBranchAndIngredient(@Param("branchId") Integer branchId, @Param("ingredientId") Integer ingredientId);
    
    /**
     * Tính tổng quantity reserved cho một ingredient tại branch
     */
    @Query("SELECT COALESCE(SUM(sr.quantityReserved), 0) FROM StockReservation sr WHERE sr.branchId = :branchId AND sr.ingredientId = :ingredientId AND sr.status = 'ACTIVE'")
    Double getTotalReservedQuantity(@Param("branchId") Integer branchId, @Param("ingredientId") Integer ingredientId);
    
    /**
     * Tìm reservations theo group ID và ingredient
     */
    @Query("SELECT sr FROM StockReservation sr WHERE sr.reservationGroupId = :groupId AND sr.ingredientId = :ingredientId AND sr.status = 'ACTIVE'")
    Optional<StockReservation> findActiveReservationByGroupAndIngredient(@Param("groupId") String groupId, @Param("ingredientId") Integer ingredientId);
    
    /**
     * Cập nhật status của reservations theo group ID
     */
    @Modifying
    @Query("UPDATE StockReservation sr SET sr.status = :status, sr.updatedAt = :updatedAt WHERE sr.reservationGroupId = :groupId AND sr.status = 'ACTIVE'")
    int updateStatusByGroupId(@Param("groupId") String groupId, @Param("status") StockReservation.ReservationStatus status, @Param("updatedAt") LocalDateTime updatedAt);
    
    /**
     * Cập nhật order ID cho reservations theo group ID
     */
    @Modifying
    @Query("UPDATE StockReservation sr SET sr.orderId = :orderId, sr.updatedAt = :updatedAt WHERE sr.reservationGroupId = :groupId AND sr.status = 'ACTIVE'")
    int updateOrderIdByGroupId(@Param("groupId") String groupId, @Param("orderId") Integer orderId, @Param("updatedAt") LocalDateTime updatedAt);
    
    /**
     * Xóa reservations hết hạn
     */
    @Modifying
    @Query("DELETE FROM StockReservation sr WHERE sr.status = 'ACTIVE' AND sr.expiresAt < :now")
    int deleteExpiredReservations(@Param("now") LocalDateTime now);
    
    /**
     * Đếm số reservations active theo group
     */
    @Query("SELECT COUNT(sr) FROM StockReservation sr WHERE sr.reservationGroupId = :groupId AND sr.status = 'ACTIVE'")
    long countActiveReservationsByGroup(@Param("groupId") String groupId);
    
    /**
     * Tìm reservations theo branch, ingredient và status
     */
    @Query("SELECT sr FROM StockReservation sr WHERE sr.branchId = :branchId AND sr.ingredientId = :ingredientId AND sr.status = :status")
    List<StockReservation> findByBranchAndIngredientAndStatus(@Param("branchId") Integer branchId, @Param("ingredientId") Integer ingredientId, @Param("status") StockReservation.ReservationStatus status);
    
    /**
     * Tìm reservations sắp hết hạn (trong vòng X phút)
     */
    @Query("SELECT sr FROM StockReservation sr WHERE sr.status = 'ACTIVE' AND sr.expiresAt BETWEEN :now AND :expiryThreshold")
    List<StockReservation> findReservationsExpiringSoon(@Param("now") LocalDateTime now, @Param("expiryThreshold") LocalDateTime expiryThreshold);
    
    /**
     * Xoá records đã RELEASED quá 1 giờ
     */
    @Modifying
    @Query("DELETE FROM StockReservation sr WHERE sr.status = 'RELEASED' AND sr.updatedAt < :cutoffTime")
    int deleteOldReleasedReservations(@Param("cutoffTime") LocalDateTime cutoffTime);
    
    /**
     * Xoá records đã RELEASED quá 1 giờ (default method)
     */
    default int deleteOldReleasedReservations() {
        LocalDateTime cutoffTime = LocalDateTime.now().minusHours(1);
        return deleteOldReleasedReservations(cutoffTime);
    }
    
    /**
     * Xóa reservations theo cart ID
     */
    @Modifying
    @Query("DELETE FROM StockReservation sr WHERE sr.cartId = :cartId")
    int deleteByCartId(@Param("cartId") Integer cartId);
    
    /**
     * Xóa reservations theo guest ID
     */
    @Modifying
    @Query("DELETE FROM StockReservation sr WHERE sr.guestId = :guestId")
    int deleteByGuestId(@Param("guestId") String guestId);
}
