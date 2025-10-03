package com.service.catalog.dto.response;

import java.time.LocalDateTime;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SupplierResponse {
    Integer supplierId;
    String name;
    String contactName;
    String phone;
    String email;
    String address;
    String note;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}
