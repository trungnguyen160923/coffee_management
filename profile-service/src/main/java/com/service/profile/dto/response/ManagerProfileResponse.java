package com.service.profile.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ManagerProfileResponse {
    Integer userId;
    Integer branchId;
    LocalDate hireDate;
    String identityCard;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}
