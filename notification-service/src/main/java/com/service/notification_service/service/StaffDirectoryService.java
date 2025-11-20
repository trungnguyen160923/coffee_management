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
        if (branchId == null) {
            return Collections.emptyList();
        }
        try {
            var response = profileServiceClient.getStaffByBranch(branchId);
            if (response == null || response.getResult() == null) {
                return Collections.emptyList();
            }
            return response.getResult().stream()
                    .map(StaffProfileResponse::getUserId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        } catch (Exception ex) {
            log.warn("[StaffDirectoryService] Failed to fetch staff for branch {}: {}", branchId, ex.getMessage());
            return Collections.emptyList();
        }
    }
}

