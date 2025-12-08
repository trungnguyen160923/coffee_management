package com.service.auth.controller;

import com.service.auth.dto.response.ApiResponse;
import com.service.auth.dto.response.RoleResponse;
import com.service.auth.service.RoleService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/roles")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class RoleController {
    RoleService roleService;

    @GetMapping
    ApiResponse<List<RoleResponse>> getAll() {
        return ApiResponse.<List<RoleResponse>>builder()
                .result(roleService.getAllRoles())
                .build();
    }

    /**
     * API lấy danh sách role nghiệp vụ dành cho STAFF,
     * là các role trong bảng roles có name kết thúc bằng "_STAFF"
     * (ví dụ: BARISTA_STAFF, CASHIER_STAFF, SERVER_STAFF, ...).
     *
     * ADMIN, MANAGER, và STAFF đều có thể xem danh sách này.
     * - ADMIN/MANAGER: dùng để cấu hình / tạo nhân viên
     * - STAFF: dùng để map roleIds -> roleNames cho permission checking
     */
    @GetMapping("/staff-business")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    public ApiResponse<List<RoleResponse>> getStaffBusinessRoles() {
        return ApiResponse.<List<RoleResponse>>builder()
                .result(roleService.getStaffBusinessRoles())
                .build();
    }
}
