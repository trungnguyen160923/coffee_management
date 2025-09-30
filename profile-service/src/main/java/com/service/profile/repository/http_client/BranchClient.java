package com.service.profile.repository.http_client;

import com.service.profile.configuration.AuthenticationRequestInterceptor;
import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.response.BranchResponse;

import java.util.List;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;


@FeignClient(
        name = "order-service",
        url = "${app.services.order}",
        configuration = {AuthenticationRequestInterceptor.class})
public interface BranchClient {
    @GetMapping(value = "/api/branches", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<List<BranchResponse>> getBranches();

    @GetMapping(value = "/api/branches/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<BranchResponse> getBranchById(@PathVariable Integer id);

    @PutMapping(value = "/api/branches/internal/{id}/assign-manager", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<BranchResponse> assignManager(@PathVariable Integer id, @RequestBody com.service.profile.dto.request.AssignManagerRequest request);

    @PutMapping(value = "/api/branches/internal/{id}/unassign-manager", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<BranchResponse> unassignManager(@PathVariable Integer id, @RequestBody com.service.profile.dto.request.AssignManagerRequest request);
}
