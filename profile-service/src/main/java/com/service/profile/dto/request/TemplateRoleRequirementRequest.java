package com.service.profile.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TemplateRoleRequirementRequest {

    @NotNull(message = "roleId is required")
    Integer roleId;

    @NotNull(message = "quantity is required")
    @Min(value = 1, message = "quantity must be at least {value}")
    Integer quantity;

    // true = bắt buộc, false = tùy chọn
    Boolean required;

    @Size(max = 255, message = "notes must be at most {max} characters")
    String notes;
}

