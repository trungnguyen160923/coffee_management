package orderservice.order_service.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserResponse {
    private Integer user_id;
    private String email;
    private String fullname;
    private String phoneNumber;
    private String dob;
    private String avatarUrl;
    private String bio;
    private Role role;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Role {
        private Integer roleId;
        private String name;
    }
}
