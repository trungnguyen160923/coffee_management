package com.service.auth.dto.response;

import com.service.auth.entity.Role;
import lombok.*;
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
    String phone_number;
    Role role;
}
