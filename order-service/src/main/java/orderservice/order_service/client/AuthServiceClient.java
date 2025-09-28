package orderservice.order_service.client;

import orderservice.order_service.dto.response.ApiResponse;
import orderservice.order_service.dto.response.UserResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "auth-service", url = "${auth.service.url}")
public interface AuthServiceClient {

    @GetMapping("/users/internal/{userId}")
    ApiResponse<UserResponse> getUserById(@PathVariable("userId") Integer userId,
            @RequestHeader(value = "Authorization", required = false) String token);
}
