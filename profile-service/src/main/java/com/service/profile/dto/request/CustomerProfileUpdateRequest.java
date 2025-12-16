package com.service.profile.dto.request;

import jakarta.validation.constraints.Past;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CustomerProfileUpdateRequest {
    @Past(message = "Date of birth must be in the past")
    LocalDate dob;

    String avatarUrl;

    String bio;
}
