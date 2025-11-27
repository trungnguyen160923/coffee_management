package com.service.notification_service.service;

import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.service.notification_service.client.ProfileServiceClient;
import com.service.notification_service.dto.response.StaffProfileResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class StaffDirectoryService {

    private final ProfileServiceClient profileServiceClient;

    public List<Integer> getStaffIdsByBranch(Integer branchId) {
        return fetchStaffIds(branchId, null);
    }

    public List<Integer> getManagerIdsByBranch(Integer branchId) {
        List<Integer> managers = fetchStaffIds(branchId, "MANAGER");
        if (managers.isEmpty()) {
            log.warn("[StaffDirectoryService] ⚠️ No managers found for branch {}. Falling back to all staff", branchId);
            return getStaffIdsByBranch(branchId);
        }
        return managers;
    }

    private List<Integer> fetchStaffIds(Integer branchId, String requiredRole) {
        if (branchId == null) {
            log.warn("[StaffDirectoryService] BranchId is null");
            return Collections.emptyList();
        }
        try {
            var response = profileServiceClient.getStaffByBranchInternal(branchId);
            if (response == null || response.getResult() == null) {
                return Collections.emptyList();
            }

            return response.getResult().stream()
                    .filter(profile -> requiredRole == null
                            || (profile.getPosition() != null 
                                && profile.getPosition().toUpperCase().contains(requiredRole)))
                    .map(StaffProfileResponse::getUserId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        } catch (Exception ex) {
            log.error("[StaffDirectoryService] Failed to fetch staff for branch {}", branchId, ex);
            return Collections.emptyList();
        }
    }
}

