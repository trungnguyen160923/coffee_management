package com.service.profile.repository.http_client;

import com.service.profile.configuration.AuthenticationRequestInterceptor;
import com.service.profile.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDate;
import java.util.List;

@FeignClient(
        name = "order-service-branch-closures",
        url = "${app.services.order}",
        configuration = {AuthenticationRequestInterceptor.class})
public interface BranchClosureClient {
    
    @GetMapping(value = "/branch-closures", produces = MediaType.APPLICATION_JSON_VALUE)
    ApiResponse<List<BranchClosureResponse>> listClosures(
            @RequestParam(required = false) Integer branchId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    );
    
    // Inner class for response
    class BranchClosureResponse {
        private Integer id;
        private Integer branchId;
        private Integer userId;
        private LocalDate startDate;
        private LocalDate endDate;
        private String reason;
        
        // Getters and setters
        public Integer getId() { return id; }
        public void setId(Integer id) { this.id = id; }
        
        public Integer getBranchId() { return branchId; }
        public void setBranchId(Integer branchId) { this.branchId = branchId; }
        
        public Integer getUserId() { return userId; }
        public void setUserId(Integer userId) { this.userId = userId; }
        
        public LocalDate getStartDate() { return startDate; }
        public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
        
        public LocalDate getEndDate() { return endDate; }
        public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
        
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }
}

