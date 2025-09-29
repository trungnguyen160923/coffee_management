package com.service.auth.dto.response;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminProfileResponse {
    Integer userId;
    Byte adminLevel;
    String notes;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}
