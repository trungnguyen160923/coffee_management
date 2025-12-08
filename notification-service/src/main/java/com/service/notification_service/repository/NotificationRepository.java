package com.service.notification_service.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.service.notification_service.entity.Notification;

public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findTop100ByBranchIdOrderByCreatedAtDesc(Integer branchId);
    List<Notification> findTop100ByUserIdOrderByCreatedAtDesc(Long userId);
    
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.createdAt < :cutoffDate")
    void deleteByCreatedAtBefore(@Param("cutoffDate") LocalDateTime cutoffDate);
    
    @Query("SELECT n FROM Notification n WHERE n.branchId = :branchId " +
           "AND n.templateCode IN ('LOW_STOCK_ALERT_WS', 'OUT_OF_STOCK_ALERT_WS') " +
           "AND n.createdAt >= :since " +
           "AND n.metadata LIKE CONCAT('%\"ingredientId\":', :ingredientId, '%') " +
           "ORDER BY n.createdAt DESC")
    List<Notification> findRecentInventoryNotifications(
        @Param("branchId") Integer branchId,
        @Param("ingredientId") Integer ingredientId,
        @Param("since") LocalDateTime since
    );
}

