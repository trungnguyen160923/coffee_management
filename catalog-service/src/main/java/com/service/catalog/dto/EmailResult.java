package com.service.catalog.dto;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = lombok.AccessLevel.PRIVATE)
public class EmailResult {
    boolean success;
    String messageId;
    String error;

    public static EmailResult success(String messageId) {
        return EmailResult.builder()
                .success(true)
                .messageId(messageId)
                .build();
    }

    public static EmailResult failure(String error) {
        return EmailResult.builder()
                .success(false)
                .error(error)
                .build();
    }
}
