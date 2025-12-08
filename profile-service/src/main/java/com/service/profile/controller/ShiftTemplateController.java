package com.service.profile.controller;

import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.request.ShiftTemplateCreationRequest;
import com.service.profile.dto.request.ShiftTemplateUpdateRequest;
import com.service.profile.dto.response.ShiftTemplateResponse;
import com.service.profile.service.ShiftTemplateService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/shift-templates")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ShiftTemplateController {

    ShiftTemplateService shiftTemplateService;

    @GetMapping("/branch/{branchId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<List<ShiftTemplateResponse>> getTemplatesByBranch(
            @PathVariable Integer branchId
    ) {
        List<ShiftTemplateResponse> result = shiftTemplateService.getActiveTemplatesByBranch(branchId);
        return ApiResponse.<List<ShiftTemplateResponse>>builder()
                .result(result)
                .build();
    }

    @GetMapping("/branch/{branchId}/inactive")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<List<ShiftTemplateResponse>> getInactiveTemplatesByBranch(
            @PathVariable Integer branchId
    ) {
        List<ShiftTemplateResponse> result = shiftTemplateService.getInactiveTemplatesByBranch(branchId);
        return ApiResponse.<List<ShiftTemplateResponse>>builder()
                .result(result)
                .build();
    }

    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<ShiftTemplateResponse> createTemplate(
            @Valid @RequestBody ShiftTemplateCreationRequest request
    ) {
        ShiftTemplateResponse result = shiftTemplateService.createTemplate(request);
        return ApiResponse.<ShiftTemplateResponse>builder()
                .result(result)
                .build();
    }

    @PutMapping("/{templateId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<ShiftTemplateResponse> updateTemplate(
            @PathVariable Integer templateId,
            @Valid @RequestBody ShiftTemplateUpdateRequest request
    ) {
        ShiftTemplateResponse result = shiftTemplateService.updateTemplate(templateId, request);
        return ApiResponse.<ShiftTemplateResponse>builder()
                .result(result)
                .build();
    }

    @DeleteMapping("/{templateId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<Void> deleteTemplate(
            @PathVariable Integer templateId
    ) {
        shiftTemplateService.deleteTemplate(templateId);
        return ApiResponse.<Void>builder()
                .message("Shift template deleted successfully")
                .build();
    }
}



