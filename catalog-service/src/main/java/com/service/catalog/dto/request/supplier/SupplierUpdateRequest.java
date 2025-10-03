package com.service.catalog.dto.request.supplier;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SupplierUpdateRequest {
    @Size(max = 50, message = "INVALID_NAME_SUPPLIER")
    String name;
    
    @Size(max = 150, message = "INVALID_CONTACT_NAME")
    String contactName;
    
    @Size(max = 20, message = "INVALID_PHONE")
    String phone;
    
    @Size(max = 100, message = "INVALID_EMAIL")
    String email;
    
    @Size(max = 255, message = "INVALID_ADDRESS")
    String address;

    @Size(max = 255, message = "INVALID_NOTE")
    String note;
}
