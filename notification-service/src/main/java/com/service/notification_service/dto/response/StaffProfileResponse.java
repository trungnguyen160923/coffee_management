package com.service.notification_service.dto.response;

import lombok.Data;

@Data
public class StaffProfileResponse {
    private Integer userId;
    private BranchResponse branch;
    private String position;
}

