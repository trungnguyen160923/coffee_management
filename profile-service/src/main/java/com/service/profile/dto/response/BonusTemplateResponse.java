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
public class BonusTemplateResponse {
    Integer templateId;
    Integer branchId;
    String scope; // SYSTEM hoặc BRANCH (tính từ branch_id)
    String name;
    String bonusType;
    BigDecimal amount;
    String description;
    String criteriaRef;
    Boolean isActive;
    Integer createdBy;
    LocalDateTime createAt;
    LocalDateTime updateAt;
    Long usageCount; // Số lần template đã được sử dụng (optional, chỉ set khi cần)
}

