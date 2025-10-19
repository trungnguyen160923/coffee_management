package orderservice.order_service.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import orderservice.order_service.dto.request.CreateReviewRequest;
import orderservice.order_service.dto.request.UpdateReviewRequest;
import orderservice.order_service.dto.response.ReviewResponse;
import orderservice.order_service.dto.response.BranchResponse;
import orderservice.order_service.dto.response.ProductResponse;
import orderservice.order_service.dto.response.CustomerResponse;
import orderservice.order_service.entity.Review;

@Mapper(componentModel = "spring")
public interface ReviewMapper {
    @Mapping(target = "reviewId", ignore = true)
    @Mapping(target = "createAt", ignore = true)
    @Mapping(target = "updateAt", ignore = true)
    Review toReview(CreateReviewRequest request);
    
    @Mapping(target = "branch", ignore = true)
    @Mapping(target = "customer", ignore = true)
    ReviewResponse toReviewResponse(Review review);
    
    // Map UpdateReviewRequest to Review (chỉ update comment)
    @Mapping(target = "reviewId", ignore = true)
    @Mapping(target = "productId", ignore = true)
    @Mapping(target = "customerId", ignore = true)
    @Mapping(target = "branchId", ignore = true)
    @Mapping(target = "rating", ignore = true)
    @Mapping(target = "createAt", ignore = true)
    @Mapping(target = "updateAt", ignore = true)
    @Mapping(target = "isDeleted", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "deletedBy", ignore = true)
    Review toReview(UpdateReviewRequest request);
}
