package com.service.profile.dto.response;

import lombok.Data;

@Data
public class ShiftRoleRequirementResponse {
    Integer id;
    Integer roleId;
    Integer quantity;
    Boolean required;
    String notes;
}

