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
public class ReviewMetricsResponse {
    BigDecimal avgReviewScore;
    Integer totalReviews;
    Map<Integer, Integer> reviewDistribution;
    Integer positiveReviews;
    Integer negativeReviews;
    BigDecimal reviewRate;
    List<RecentReview> recentReviews;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class RecentReview {
        Integer reviewId;
        Integer customerId;
        Byte rating;
        String comment;
        LocalDateTime createdAt;
    }
}

