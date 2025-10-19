package orderservice.order_service.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import orderservice.order_service.entity.Review;

public interface ReviewRepository extends JpaRepository<Review, Integer> {
    
    // Hàm lọc tất cả các điều kiện - linh hoạt (chỉ lấy review chưa bị xóa)
    @Query("SELECT r FROM Review r WHERE " +
           "r.isDeleted = false AND " +
           "(:productId IS NULL OR r.productId = :productId) AND " +
           "(:branchId IS NULL OR r.branchId = :branchId) AND " +
           "(:customerId IS NULL OR r.customerId = :customerId) AND " +
           "(:rating IS NULL OR r.rating = :rating) AND " +
           "(:keyword IS NULL OR LOWER(r.comment) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Review> findReviewsWithFilters(
            @Param("productId") Integer productId,
            @Param("branchId") Integer branchId, 
            @Param("customerId") Integer customerId,
            @Param("rating") Byte rating,
            @Param("keyword") String keyword,
            Pageable pageable);
    
    // Tìm review theo ID và customer ID (để kiểm tra quyền sở hữu)
    @Query("SELECT r FROM Review r WHERE r.reviewId = :reviewId AND r.customerId = :customerId AND r.isDeleted = false")
    Review findByReviewIdAndCustomerId(@Param("reviewId") Integer reviewId, @Param("customerId") Integer customerId);
    
    // Tìm review theo ID (cho admin)
    @Query("SELECT r FROM Review r WHERE r.reviewId = :reviewId AND r.isDeleted = false")
    Review findByReviewId(@Param("reviewId") Integer reviewId);
    
    // Tìm tất cả reviews (bao gồm đã xóa) - chỉ cho admin
    @Query("SELECT r FROM Review r WHERE " +
           "(:productId IS NULL OR r.productId = :productId) AND " +
           "(:branchId IS NULL OR r.branchId = :branchId) AND " +
           "(:customerId IS NULL OR r.customerId = :customerId) AND " +
           "(:rating IS NULL OR r.rating = :rating) AND " +
           "(:keyword IS NULL OR LOWER(r.comment) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Review> findAllReviewsWithFilters(
            @Param("productId") Integer productId,
            @Param("branchId") Integer branchId, 
            @Param("customerId") Integer customerId,
            @Param("rating") Byte rating,
            @Param("keyword") String keyword,
            Pageable pageable);
    
    // Kiểm tra duplicate review theo (customerId, productId, orderId)
    boolean existsByCustomerIdAndProductIdAndOrderIdAndIsDeletedFalse(Integer customerId, Integer productId, Integer orderId);
}
