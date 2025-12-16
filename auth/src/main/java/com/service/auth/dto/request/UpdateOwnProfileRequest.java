package com.service.auth.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateOwnProfileRequest {
    String fullname;

    @Pattern(regexp = "^[0-9]+$", message = "INVALID_PHONE_NUMBER")
    @Size(min = 10, message = "PHONE_NUMBER_SIZE")
    String phone_number;
}
