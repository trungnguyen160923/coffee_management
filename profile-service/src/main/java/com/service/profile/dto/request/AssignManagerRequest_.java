package com.service.profile.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AssignManagerRequest_ {
    @NotNull(message = "EMPTY_MANAGER_USER_ID")
    Integer managerUserId;

    @NotNull(message = "EMPTY_BRANCH_ID")
    Integer branchId;

}


