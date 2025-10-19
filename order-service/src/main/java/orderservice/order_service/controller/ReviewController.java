package orderservice.order_service.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import orderservice.order_service.dto.ApiResponse;
import orderservice.order_service.dto.request.CreateReviewRequest;
import orderservice.order_service.dto.request.UpdateReviewRequest;
import orderservice.order_service.dto.request.DeleteReviewRequest;
import orderservice.order_service.dto.response.ReviewResponse;
import orderservice.order_service.service.ReviewService;
import orderservice.order_service.util.SecurityUtils;

@RestController
@RequestMapping("/reviews")
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class ReviewController {
    ReviewService reviewService;

    @PostMapping
    public ResponseEntity<ApiResponse<ReviewResponse>> createReview(@Valid @RequestBody CreateReviewRequest request) {
        ReviewResponse response = reviewService.createReview(request);
        ApiResponse<ReviewResponse> apiResponse = ApiResponse.<ReviewResponse>builder()
            .result(response)
            .build();
        return ResponseEntity.ok(apiResponse);
    }

    // Hàm lọc linh hoạt - có thể lọc theo tất cả điều kiện
    @GetMapping("/filter")
    public ResponseEntity<ApiResponse<Page<ReviewResponse>>> getReviewsWithFilters(
            @RequestParam(required = false) Integer productId,
            @RequestParam(required = false) Integer branchId,
            @RequestParam(required = false) Integer customerId,
            @RequestParam(required = false) Byte rating,
            @RequestParam(required = false) String keyword,
            Pageable pageable) {
        Page<ReviewResponse> reviews = reviewService.getReviewsWithFilters(
            productId, branchId, customerId, rating, keyword, pageable);
        ApiResponse<Page<ReviewResponse>> apiResponse = ApiResponse.<Page<ReviewResponse>>builder()
            .result(reviews)
            .build();
        return ResponseEntity.ok(apiResponse);
    }
    
    // Update review - chỉ customer sở hữu
    @PutMapping("/{reviewId}")
    public ResponseEntity<ApiResponse<ReviewResponse>> updateReview(
            @PathVariable Integer reviewId,
            @Valid @RequestBody UpdateReviewRequest request) {
        Integer customerId = SecurityUtils.getCurrentUserId();
        ReviewResponse response = reviewService.updateReview(reviewId, customerId, request);
        ApiResponse<ReviewResponse> apiResponse = ApiResponse.<ReviewResponse>builder()
            .result(response)
            .build();
        return ResponseEntity.ok(apiResponse);
    }
    
    // Delete review - customer xóa review của mình
    @DeleteMapping("/{reviewId}/customer")
    public ResponseEntity<ApiResponse<String>> deleteReviewByCustomer(
            @PathVariable Integer reviewId,
            @Valid @RequestBody DeleteReviewRequest request) {
        Integer customerId = SecurityUtils.getCurrentUserId();
        reviewService.deleteReviewByCustomer(reviewId, customerId, request);
        ApiResponse<String> apiResponse = ApiResponse.<String>builder()
            .result("Review deleted successfully")
            .build();
        return ResponseEntity.ok(apiResponse);
    }
    
    // Delete review - admin xóa review vi phạm
    @DeleteMapping("/{reviewId}/admin")
    public ResponseEntity<ApiResponse<String>> deleteReviewByAdmin(
            @PathVariable Integer reviewId,
            @Valid @RequestBody DeleteReviewRequest request) {
        Integer adminId = SecurityUtils.getCurrentUserId();
        reviewService.deleteReviewByAdmin(reviewId, adminId, request);
        ApiResponse<String> apiResponse = ApiResponse.<String>builder()
            .result("Review deleted by admin")
            .build();
        return ResponseEntity.ok(apiResponse);
    }
    
    // Restore review - admin khôi phục review
    @PutMapping("/{reviewId}/restore")
    public ResponseEntity<ApiResponse<ReviewResponse>> restoreReview(
            @PathVariable Integer reviewId) {
        Integer adminId = SecurityUtils.getCurrentUserId();
        ReviewResponse response = reviewService.restoreReview(reviewId, adminId);
        ApiResponse<ReviewResponse> apiResponse = ApiResponse.<ReviewResponse>builder()
            .result(response)
            .build();
        return ResponseEntity.ok(apiResponse);
    }
    
    // Admin endpoint - lấy tất cả reviews (bao gồm đã xóa)
    @GetMapping("/admin/all")
    public ResponseEntity<ApiResponse<Page<ReviewResponse>>> getAllReviewsForAdmin(
            @RequestParam(required = false) Integer productId,
            @RequestParam(required = false) Integer branchId,
            @RequestParam(required = false) Integer customerId,
            @RequestParam(required = false) Byte rating,
            @RequestParam(required = false) String keyword,
            Pageable pageable) {
        Page<ReviewResponse> reviews = reviewService.getAllReviewsForAdmin(
            productId, branchId, customerId, rating, keyword, pageable);
        ApiResponse<Page<ReviewResponse>> apiResponse = ApiResponse.<Page<ReviewResponse>>builder()
            .result(reviews)
            .build();
        return ResponseEntity.ok(apiResponse);
    }
}
