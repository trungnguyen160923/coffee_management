package com.service.catalog.dto.response;

import java.time.LocalDate;

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
public class UserResponse {
    Integer user_id;
    String email;
    String fullname;
    String phoneNumber;
    LocalDate dob;
    String avatarUrl;
    String bio;
    Object role;  // ← Đổi thành Object để khớp với auth-service
    String identityCard;
    Object branch;  // ← Đổi thành Object để khớp với auth-service
    LocalDate hireDate;
    String position;
    Double salary;
    Byte adminLevel;
    String notes;
}
