package orderservice.order_service.client;

import orderservice.order_service.configuration.AuthenticationRequestInterceptor;
import orderservice.order_service.dto.response.ApiResponse;
import orderservice.order_service.dto.response.RoleResponse;
import orderservice.order_service.dto.response.UserResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.List;

@FeignClient(name = "auth-service", url = "${auth.service.url}",
        configuration = {AuthenticationRequestInterceptor.class})
public interface AuthServiceClient {

    @GetMapping("/users/internal/{userId}")
    ApiResponse<UserResponse> getUserById(@PathVariable("userId") Integer userId,
            @RequestHeader(value = "Authorization", required = false) String token);

    /**
     * Get staff business roles (roles ending with "_STAFF")
     * Used for permission validation
     */
    @GetMapping("/roles/staff-business")
    ApiResponse<List<RoleResponse>> getStaffBusinessRoles(
            @RequestHeader(value = "Authorization", required = false) String token);
}
