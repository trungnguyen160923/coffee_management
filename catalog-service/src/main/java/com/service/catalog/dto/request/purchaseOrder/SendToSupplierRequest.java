package com.service.catalog.dto.request.purchaseOrder;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = lombok.AccessLevel.PRIVATE)
public class SendToSupplierRequest {
    String toEmail;
    String cc;
    String subject;
    String message;
}
