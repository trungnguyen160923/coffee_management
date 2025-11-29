package com.service.auth.controller;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.service.auth.dto.request.ManagerProfileCreationRequest;
import com.service.auth.dto.request.StaffProfileCreationRequest;
import com.service.auth.dto.request.UserCreationRequest;
import com.service.auth.dto.request.UserUpdateRequest;
import com.service.auth.dto.response.ApiResponse;
import com.service.auth.dto.response.ManagerProfileResponse;
import com.service.auth.dto.response.StaffProfileResponse;
import com.service.auth.dto.response.PagedResponse;
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

    @GetMapping("/managers")
    ApiResponse<List<UserResponse>> getAllManagers() {
        var result = userService.getAllManagers();
        return ApiResponse.<List<UserResponse>>builder().result(result).build();
    }

    @GetMapping("/managers/{userId}")
    ApiResponse<UserResponse> getManagerById(@PathVariable Integer userId) {
        var result = userService.getManagerById(userId);
        return ApiResponse.<UserResponse>builder().result(result).build();
    }

    @GetMapping("/staffs/{userId}")
    ApiResponse<UserResponse> getStaffById(@PathVariable Integer userId) {
        var result = userService.getStaffById(userId);
        return ApiResponse.<UserResponse>builder().result(result).build();
    }

    @GetMapping("/staffs/branch/{branchId}")
    ApiResponse<List<UserResponse>> getStaffsByBranch(@PathVariable Integer branchId) {
        var result = userService.getStaffsByBranch(branchId);
        return ApiResponse.<List<UserResponse>>builder().result(result).build();
    }

    @GetMapping("/managers/paged")
    ApiResponse<PagedResponse<UserResponse>> getManagersPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        var result = userService.getManagersPaged(page, size);
        return ApiResponse.<PagedResponse<UserResponse>>builder().result(result).build();
    }

    @GetMapping("/staffs/paged")
    ApiResponse<PagedResponse<UserResponse>> getStaffsPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        var result = userService.getStaffsPaged(page, size);
        return ApiResponse.<PagedResponse<UserResponse>>builder().result(result).build();
    }

    @GetMapping("/{userId}")
    ApiResponse<UserResponse> getUserById(@PathVariable Integer userId) {
        var result = userService.getUserById(userId);
        return ApiResponse.<UserResponse>builder().result(result).build();
    }

    @PutMapping("/{userId}")
    ApiResponse<UserResponse> updateUser(@PathVariable Integer userId,
            @Valid @RequestBody UserUpdateRequest request) {
        var result = userService.updateUser(userId, request);
        return ApiResponse.<UserResponse>builder().result(result).build();
    }

    @PostMapping("/create-manager")
    ApiResponse<ManagerProfileResponse> createManager(@Valid @RequestBody ManagerProfileCreationRequest request) {

        // Call Profile Service to create manager profile
        ApiResponse<ManagerProfileResponse> response = userService.createManagerProfile(request);

        log.info("Manager profile created successfully: {}", response.getResult());
        return response;
    }

    @PostMapping("/create-staff")
    ApiResponse<StaffProfileResponse> createStaff(@Valid @RequestBody StaffProfileCreationRequest request) {

        // Call Profile Service to create staff profile
        ApiResponse<StaffProfileResponse> response = userService.createStaffProfile(request);

        log.info("Staff profile created successfully: {}", response.getResult());
        return response;
    }

    @GetMapping("/internal/{userId}")
    ApiResponse<UserResponse> getUserByIdInternal(@PathVariable Integer userId) {
        var result = userService.getUserById(userId);
        return ApiResponse.<UserResponse>builder().result(result).build();
    }

    @GetMapping("/me")
    ApiResponse<UserResponse> getMe(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        var result = userService.getMe();
        return ApiResponse.<UserResponse>builder().result(result).build();
    }

    @GetMapping("/customers/{userId}")
    ApiResponse<UserResponse> getCustomerById(@PathVariable Integer userId) {
        var result = userService.getCustomerById(userId);
        return ApiResponse.<UserResponse>builder().result(result).build();
    }
}
