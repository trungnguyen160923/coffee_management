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
public class CustomerProfileResponse {
    Integer userId;
    LocalDate dob;
    String avatarUrl;
    String bio;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}
