package orderservice.order_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AllBranchesReviewMetricsResponse {
    BigDecimal overallAvgReviewScore;
    Integer totalReviews;
    Map<Integer, Integer> reviewDistribution; // Distribution across all branches
    Integer totalPositiveReviews;
    Integer totalNegativeReviews;
    BigDecimal overallReviewRate;
    List<RecentReview> recentReviews; // Recent reviews across all branches
    List<BranchReviewStats> branchReviewStats; // Review stats by branch

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class RecentReview {
        Integer reviewId;
        Integer branchId;
        String branchName;
        Integer customerId;
        Byte rating;
        String comment;
        LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class BranchReviewStats {
        Integer branchId;
        String branchName;
        BigDecimal avgReviewScore;
        Integer totalReviews;
        Integer positiveReviews;
        Integer negativeReviews;
    }
}


