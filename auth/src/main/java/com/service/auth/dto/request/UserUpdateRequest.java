package com.service.auth.dto.request;

import com.service.auth.validator.RoleConstraint;

import jakarta.validation.constraints.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserUpdateRequest {
    @Email(message = "EMAIL_INVALID")
    String email;

    String fullname;

    @Pattern(regexp = "^[0-9]+$", message = "INVALID_PHONE_NUMBER")
    @Size(min = 10, message = "PHONE_NUMBER_SIZE")
    String phone_number;
    
    // @RoleConstraint(message = "INVALID_ROLE")
    // String role;
}
