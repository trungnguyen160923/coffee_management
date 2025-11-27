package com.service.catalog.service;

import com.service.catalog.dto.ApiResponse;
import com.service.catalog.dto.response.BranchResponse;
import com.service.catalog.repository.http_client.BranchClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class BranchScheduleService {

    private final BranchClient branchClient;
    private final Map<Integer, BranchResponse> cache = new ConcurrentHashMap<>();

    public LocalTime getClosingTime(Integer branchId) {
        BranchResponse branch = resolveBranch(branchId);
        return branch != null ? branch.getEndHours() : null;
    }

    public LocalTime getOpeningTime(Integer branchId) {
        BranchResponse branch = resolveBranch(branchId);
        return branch != null ? branch.getOpenHours() : null;
    }

    private BranchResponse resolveBranch(Integer branchId) {
        if (branchId == null) {
            return null;
        }
        BranchResponse cached = cache.get(branchId);
        if (cached != null) {
            return cached;
        }
        try {
            ApiResponse<BranchResponse> response = branchClient.getBranchById(branchId);
            if (response != null && response.getResult() != null) {
                cache.put(branchId, response.getResult());
                return response.getResult();
            }
        } catch (Exception ex) {
            log.warn("Failed to fetch branch {} info: {}", branchId, ex.getMessage());
        }
        return null;
    }
}

