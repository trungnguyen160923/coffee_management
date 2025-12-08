package com.service.profile.dto.request;

import lombok.Data;

@Data
public class ShiftRoleRequirementRequest {
    Integer roleId;
    Integer quantity;
    Boolean required; // true = bắt buộc, false = tùy chọn
    String notes;
}

