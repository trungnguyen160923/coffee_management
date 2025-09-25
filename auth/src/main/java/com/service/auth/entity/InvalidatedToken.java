package com.service.auth.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import java.util.Date;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "invalidated_tokens")
public class InvalidatedToken {
    @Id
    @Column(length = 255)
    String id; // JWT ID (jti) hoặc token string hash

    @Column(name = "expiry_time", nullable = false)
    Date expiryTime;
}
