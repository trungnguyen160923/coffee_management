package com.service.catalog.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SupplierCreationRequest {
    @NotBlank(message = "EMPTY_NAME_SUPPLIER")
    @Size(max = 50, message = "INVALID_NAME_SUPPLIER")
    String name;
    
    @NotBlank(message = "EMPTY_CONTACT_NAME")
    @Size(max = 150, message = "INVALID_CONTACT_NAME")
    String contactName;
    
    @NotBlank(message = "EMPTY_PHONE")
    @Size(max = 20, message = "INVALID_PHONE")
    String phone;
    
    @NotBlank(message = "EMPTY_EMAIL")
    @Size(max = 100, message = "INVALID_EMAIL")
    String email;
    
    @NotBlank(message = "EMPTY_ADDRESS")
    @Size(max = 255, message = "INVALID_ADDRESS")
    String address;

    @Size(max = 255, message = "INVALID_NOTE")
    String note;
}
