package com.service.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChangePasswordRequest {
    @NotBlank(message = "EMPTY_OLD_PASSWORD")
    String oldPassword;

    @NotBlank(message = "EMPTY_PASSWORD")
    @Size(min = 8, message = "INVALID_PASSWORD")
    String newPassword;
}
