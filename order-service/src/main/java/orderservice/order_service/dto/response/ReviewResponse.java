package orderservice.order_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

import lombok.AccessLevel;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReviewResponse {
    private Integer reviewId;
    
    // Core review fields
    private Integer productId;
    private Integer customerId;
    private Integer orderId;
    private Integer branchId;
    private Byte rating;
    private String comment;
    private LocalDateTime createAt;
    private LocalDateTime updateAt;
    
    // Related entities information
    private BranchResponse branch;
    private UserResponse customer;
    
    // Soft delete fields (only for admin)
    private Boolean isDeleted;
    private LocalDateTime deletedAt;
    private Integer deletedBy;
}
