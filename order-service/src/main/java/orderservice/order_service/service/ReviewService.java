package orderservice.order_service.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import orderservice.order_service.dto.request.CreateReviewRequest;
import orderservice.order_service.dto.request.UpdateReviewRequest;
import orderservice.order_service.dto.request.DeleteReviewRequest;
import orderservice.order_service.dto.response.ReviewResponse;
import orderservice.order_service.dto.response.BranchResponse;
import orderservice.order_service.dto.response.UserResponse;
import orderservice.order_service.dto.response.ApiResponse;
import orderservice.order_service.entity.Review;
import orderservice.order_service.entity.Branch;
import orderservice.order_service.mapper.ReviewMapper;
import orderservice.order_service.mapper.BranchMapper;
import orderservice.order_service.repository.ReviewRepository;
import orderservice.order_service.client.AuthServiceClient;
import orderservice.order_service.util.SecurityUtils;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ReviewService {
    ReviewRepository reviewRepository;
    ReviewMapper reviewMapper;
    BranchService branchService;
    BranchMapper branchMapper;
    AuthServiceClient authServiceClient;

    @Transactional
    @PreAuthorize("hasRole('CUSTOMER')")
    public ReviewResponse createReview(CreateReviewRequest request) {
        Integer currentUserId = SecurityUtils.getCurrentUserId();
        
        if (currentUserId == null) {
            throw new RuntimeException("User ID not found in JWT token");
        }
        
        // Kiểm tra duplicate review theo (customerId, productId, orderId)
        if (request.getProductId() != null && request.getOrderId() != null) {
            boolean exists = reviewRepository.existsByCustomerIdAndProductIdAndOrderIdAndIsDeletedFalse(
                currentUserId, request.getProductId(), request.getOrderId());
            if (exists) {
                throw new RuntimeException("You have already reviewed this product in this order");
            }
        }
        
        // Set customer ID từ JWT token
        Review review = reviewMapper.toReview(request);
        review.setCustomerId(currentUserId);
        review = reviewRepository.save(review);
        return populateReviewResponse(review);
    }

    // Hàm lọc linh hoạt - có thể lọc theo tất cả điều kiện hoặc bỏ trống
    public Page<ReviewResponse> getReviewsWithFilters(
            Integer productId, 
            Integer branchId, 
            Integer customerId, 
            Byte rating, 
            String keyword, 
            Pageable pageable) {
        Page<Review> reviews = reviewRepository.findReviewsWithFilters(
            productId, branchId, customerId, rating, keyword, pageable);
        return reviews.map(this::populateReviewResponse);
    }
    
    // Update review - chỉ customer sở hữu, trong vòng 24h
    @Transactional
    @PreAuthorize("hasRole('CUSTOMER')")
    public ReviewResponse updateReview(Integer reviewId, Integer customerId, UpdateReviewRequest request) {
        // Kiểm tra review tồn tại và thuộc về customer
        Review review = reviewRepository.findByReviewIdAndCustomerId(reviewId, customerId);
        if (review == null) {
            throw new RuntimeException("Review not found or you don't have permission to update");
        }
        
        // Kiểm tra thời hạn update (24h)
        LocalDateTime now = LocalDateTime.now();
        long hoursSinceCreation = ChronoUnit.HOURS.between(review.getCreateAt(), now);
        if (hoursSinceCreation > 24) {
            throw new RuntimeException("Cannot update review after 24 hours");
        }
        
        // Chỉ update comment, không được update rating
        review.setComment(request.getComment());
        review = reviewRepository.save(review);
        
        log.info("Review {} updated by customer {}", reviewId, customerId);
        return populateReviewResponse(review);
    }
    
    // Soft delete review - customer xóa review của mình
    @Transactional
    @PreAuthorize("hasRole('CUSTOMER')")
    public void deleteReviewByCustomer(Integer reviewId, Integer customerId, DeleteReviewRequest request) {
        Review review = reviewRepository.findByReviewIdAndCustomerId(reviewId, customerId);
        if (review == null) {
            throw new RuntimeException("Review not found or you don't have permission to delete");
        }
        
        // Soft delete
        review.setIsDeleted(true);
        review.setDeletedAt(LocalDateTime.now());
        review.setDeletedBy(customerId);
        reviewRepository.save(review);
        
        log.info("Review {} soft deleted by customer {} with reason: {}", reviewId, customerId, request.getReason());
    }
    
    // Soft delete review - admin xóa review vi phạm
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteReviewByAdmin(Integer reviewId, Integer adminId, DeleteReviewRequest request) {
        Review review = reviewRepository.findByReviewId(reviewId);
        if (review == null) {
            throw new RuntimeException("Review not found");
        }
        
        // Soft delete
        review.setIsDeleted(true);
        review.setDeletedAt(LocalDateTime.now());
        review.setDeletedBy(adminId);
        reviewRepository.save(review);
        
        log.info("Review {} soft deleted by admin {} with reason: {}", reviewId, adminId, request.getReason());
    }
    
    // Restore review - admin có thể khôi phục
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public ReviewResponse restoreReview(Integer reviewId, Integer adminId) {
        Review review = reviewRepository.findById(reviewId)
            .orElseThrow(() -> new RuntimeException("Review not found"));
        
        if (!review.getIsDeleted()) {
            throw new RuntimeException("Review is not deleted");
        }
        
        // Restore
        review.setIsDeleted(false);
        review.setDeletedAt(null);
        review.setDeletedBy(null);
        review = reviewRepository.save(review);
        
        log.info("Review {} restored by admin {}", reviewId, adminId);
        return populateReviewResponse(review);
    }
    
    // Lấy tất cả reviews (bao gồm đã xóa) - chỉ cho admin
    @PreAuthorize("hasRole('ADMIN')")
    public Page<ReviewResponse> getAllReviewsForAdmin(
            Integer productId, 
            Integer branchId, 
            Integer customerId, 
            Byte rating, 
            String keyword, 
            Pageable pageable) {
        Page<Review> reviews = reviewRepository.findAllReviewsWithFilters(
            productId, branchId, customerId, rating, keyword, pageable);
        return reviews.map(this::populateReviewResponse);
    }
    
    // Populate thông tin chi nhánh và customer cho ReviewResponse
    private ReviewResponse populateReviewResponse(Review review) {
        ReviewResponse response = reviewMapper.toReviewResponse(review);
        
        // Lấy thông tin chi nhánh từ BranchService có sẵn
        if (review.getBranchId() != null) {
            Branch branch = branchService.getBranchById(review.getBranchId()).orElse(null);
            if (branch != null) {
                BranchResponse branchResponse = branchMapper.toBranchResponse(branch);
                response.setBranch(branchResponse);
            }
        }
        
        // Lấy thông tin customer từ AuthServiceClient
        if (review.getCustomerId() != null) {
            try {
                // Lấy JWT token từ SecurityContext
                String token = SecurityUtils.getCurrentJwtToken();
                
                ApiResponse<UserResponse> apiResponse = authServiceClient.getUserById(review.getCustomerId(), token);
                if (apiResponse != null && apiResponse.getResult() != null) {
                    response.setCustomer(apiResponse.getResult());
                }
            } catch (Exception e) {
                log.warn("Failed to fetch user info for customerId {}: {}", review.getCustomerId(), e.getMessage());
            }
        }
        
        return response;
    }
}
