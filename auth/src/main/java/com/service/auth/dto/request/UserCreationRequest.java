package com.service.auth.dto.request;

import java.time.LocalDate;

import com.service.auth.validator.RoleConstraint;

import jakarta.validation.constraints.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserCreationRequest {
    @Email(message = "EMAIL_INVALID")
    @NotBlank(message = "EMPTY_EMAIL")
    String email;

    @Size(min = 6, message = "INVALID_PASSWORD")
    @NotBlank(message = "EMPTY_PASSWORD")
    String password;

    @NotBlank(message = "EMPTY_FULLNAME")
    String fullname;

    @NotBlank(message = "EMPTY_PHONE_NUMBER")
    String phone_number;

    String avatarUrl;
    String bio;

    @NotNull(message = "EMPTY_DOB")
    LocalDate dob;

    @NotBlank(message = "EMPTY_ROLE")
    @RoleConstraint(message = "INVALID_ROLE")
    String role;
}
