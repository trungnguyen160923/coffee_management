package com.service.auth.service;

import com.service.auth.dto.response.RoleResponse;
import com.service.auth.mapper.RoleMapper;
import com.service.auth.repository.RoleRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RoleService {
    RoleRepository roleRepository;
    RoleMapper roleMapper;

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public List<RoleResponse> getAllRoles() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUserRole = auth.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");

        List<String> allowedRoles;
        if ("ADMIN".equals(currentUserRole)) {
            allowedRoles = List.of("MANAGER", "STAFF");
        } else if ("MANAGER".equals(currentUserRole)) {
            allowedRoles = List.of("STAFF");
        } else {
            return List.of();
        }

        return roleRepository.findAll().stream()
                .filter(role -> allowedRoles.contains(role.getName()))
                .map(roleMapper::toRoleResponse)
                .toList();
    }

}
