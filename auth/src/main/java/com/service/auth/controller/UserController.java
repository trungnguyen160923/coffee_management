package com.service.auth.controller;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.service.auth.dto.request.UserCreationRequest;
import com.service.auth.dto.request.UserUpdateRequest;
import com.service.auth.dto.response.ApiResponse;
import com.service.auth.dto.response.UserResponse;
import com.service.auth.service.UserService;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class UserController {
    UserService userService;

    @PostMapping("/registration")
    ApiResponse<UserResponse> createCustomer(@Valid @RequestBody UserCreationRequest request) {
        var result = userService.createCustomer(request);
        return ApiResponse.<UserResponse>builder().result(result).build();
    }

    @PostMapping("/create-user")
    ApiResponse<UserResponse> createUser(@Valid @RequestBody UserCreationRequest request) {
        var result = userService.createUser(request);
        return ApiResponse.<UserResponse>builder().result(result).build();
    }

    @GetMapping("/staffs")
    ApiResponse<List<UserResponse>> getAllStaffs() {
        var result = userService.getAllStaffs();
        return ApiResponse.<List<UserResponse>>builder().result(result).build();
    }

    @GetMapping("/customers")
    ApiResponse<List<UserResponse>> getAllCustomers() {
        var result = userService.getAllCustomers();
        return ApiResponse.<List<UserResponse>>builder().result(result).build();
    }

    @PutMapping("/{userId}")
    ApiResponse<UserResponse> updateUser(@PathVariable Integer userId, 
                                        @Valid @RequestBody UserUpdateRequest request) {
        var result = userService.updateUser(userId, request);
        return ApiResponse.<UserResponse>builder().result(result).build();
    }
}
