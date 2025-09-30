package com.service.profile.dto.request;

import jakarta.validation.constraints.NotNull;

public class AssignManagerRequest {
    @NotNull
    private Integer managerUserId;

    public Integer getManagerUserId() {
        return managerUserId;
    }

    public void setManagerUserId(Integer managerUserId) {
        this.managerUserId = managerUserId;
    }
}


