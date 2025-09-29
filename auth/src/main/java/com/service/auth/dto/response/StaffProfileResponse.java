package com.service.auth.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

import com.service.auth.entity.Role;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffProfileResponse {
    private Integer userId;
    private String email;
    private String fullname;
    private String phone_number;
    private Role role;
    private String identityCard;
    private BranchResponse branch;
    private LocalDate hireDate;
    private String position;
    private Double salary;
}
