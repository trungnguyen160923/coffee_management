package com.service.profile.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PenaltyConfigResponse {
    Integer configId;
    String name;
    String penaltyType;
    BigDecimal amount;
    String description;
    Integer branchId;
    String scope; // SYSTEM hoặc BRANCH (tính từ branch_id)
    Integer createdBy;
    Boolean isActive;
    LocalDateTime createAt;
    LocalDateTime updateAt;
    Long usageCount; // Số lần config đã được sử dụng (optional, chỉ set khi cần)
}

