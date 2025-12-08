package com.service.profile.dto.response;

import lombok.Data;

@Data
public class TemplateRoleRequirementResponse {
    Integer id;
    Integer roleId;
    Integer quantity;
    Boolean required;
    String notes;
}

