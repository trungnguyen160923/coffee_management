package com.service.auth.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuthenticationRequest {
    @NotBlank(message = "EMPTY_EMAIL")
    @Email(message = "EMAIL_INVALID")
    String email;

    @Size(min = 6, message = "INVALID_PASSWORD")
    @NotBlank(message = "EMPTY_PASSWORD")
    String password;
}
