package orderservice.order_service.client;

import orderservice.order_service.configuration.AuthenticationRequestInterceptor;
import orderservice.order_service.dto.response.ApiResponse;
import orderservice.order_service.dto.response.ManagerProfileResponse;
import orderservice.order_service.dto.response.ShiftAssignmentResponse;
import orderservice.order_service.dto.response.StaffProfileResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "profile-service", url = "${profile.service.url}",
        configuration = {AuthenticationRequestInterceptor.class})
public interface ProfileServiceClient {

    /**
     * Get staff profile by user ID
     * Used to get staff business role IDs for permission validation
     */
    @GetMapping("/staff-profiles/{userId}")
    ApiResponse<StaffProfileResponse> getStaffProfile(
            @PathVariable("userId") Integer userId,
            @RequestHeader(value = "Authorization", required = false) String token);

    /**
     * Get manager profile by user ID
     * Used to get manager branch information for branch access validation
     */
    @GetMapping("/manager-profiles/{userId}")
    ApiResponse<ManagerProfileResponse> getManagerProfile(
            @PathVariable("userId") Integer userId,
            @RequestHeader(value = "Authorization", required = false) String token);

    /**
     * Get active shift assignment for current staff
     * Returns the shift assignment if staff is currently checked in and within shift time window
     */
    @GetMapping("/shift-assignments/my-active-shift")
    ApiResponse<ShiftAssignmentResponse> getMyActiveShift(
            @RequestHeader(value = "Authorization", required = false) String token);
}

