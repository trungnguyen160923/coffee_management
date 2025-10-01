package com.service.profile.dto.request;

import java.time.LocalDate;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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
public class ManagerProfileUpdateRequest {
    @Pattern(regexp = "\\d+", message = "IDENTITY_CARD_NUMERIC_ONLY")
    @Size(min = 10, message = "IDENTITY_CARD_SIZE")
    String identityCard;

    LocalDate hireDate;
}
