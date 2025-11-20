package com.service.notification_service.dto.response;

import lombok.Data;

@Data
public class BranchResponse {
    private Integer branchId;
    private String name;
    private String address;
    private String phone;
}

