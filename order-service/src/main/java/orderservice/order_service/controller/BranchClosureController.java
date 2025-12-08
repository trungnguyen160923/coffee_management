package orderservice.order_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import orderservice.order_service.dto.request.CreateBranchClosureRequest;
import orderservice.order_service.dto.request.UpdateBranchClosureRequest;
import orderservice.order_service.dto.request.UpdateBranchClosureGroupRequest;
import orderservice.order_service.dto.request.DeleteBranchClosureGroupRequest;
import orderservice.order_service.dto.response.ApiResponse;
import orderservice.order_service.dto.response.BranchClosureResponse;
import orderservice.order_service.service.BranchClosureService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/branch-closures")
@RequiredArgsConstructor
@Slf4j
public class BranchClosureController {

    private final BranchClosureService branchClosureService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<BranchClosureResponse>> createClosure(
            @Valid @RequestBody CreateBranchClosureRequest request) {
        log.info("API create branch closure: branchId={}, startDate={}, endDate={}", request.getBranchId(),
                request.getStartDate(), request.getEndDate());
        BranchClosureResponse response = branchClosureService.createClosure(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.<BranchClosureResponse>builder()
                        .code(2000)
                        .message("Tạo ngày nghỉ chi nhánh thành công")
                        .result(response)
                        .build());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<BranchClosureResponse>> updateClosure(
            @PathVariable Integer id,
            @Valid @RequestBody UpdateBranchClosureRequest request) {
        log.info("API update branch closure id={}", id);
        BranchClosureResponse response = branchClosureService.updateClosure(id, request);
        return ResponseEntity.ok(ApiResponse.<BranchClosureResponse>builder()
                .code(2000)
                .message("Cập nhật ngày nghỉ chi nhánh thành công")
                .result(response)
                .build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deleteClosure(@PathVariable Integer id) {
        log.info("API delete branch closure id={}", id);
        branchClosureService.deleteClosure(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .code(2000)
                .message("Xóa ngày nghỉ chi nhánh thành công")
                .build());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<BranchClosureResponse>> getClosure(@PathVariable Integer id) {
        log.info("API get branch closure id={}", id);
        BranchClosureResponse response = branchClosureService.getClosure(id);
        return ResponseEntity.ok(ApiResponse.<BranchClosureResponse>builder()
                .code(2000)
                .message("Lấy thông tin ngày nghỉ chi nhánh thành công")
                .result(response)
                .build());
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    public ResponseEntity<ApiResponse<List<BranchClosureResponse>>> listClosures(
            @RequestParam(required = false) Integer branchId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        log.info("API list branch closures (filtered by current user) branchId={}, from={}, to={}", branchId, from, to);
        List<BranchClosureResponse> result = branchClosureService.listClosures(branchId, from, to);
        return ResponseEntity.ok(ApiResponse.<List<BranchClosureResponse>>builder()
                .code(2000)
                .message("Lấy danh sách ngày nghỉ chi nhánh thành công")
                .result(result)
                .build());
    }

    @PutMapping("/group")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<List<BranchClosureResponse>>> updateClosureGroup(
            @Valid @RequestBody UpdateBranchClosureGroupRequest request) {
        log.info("API update branch closure group: {} closures", request.getClosureIds().size());
        List<BranchClosureResponse> result = branchClosureService.updateClosureGroup(request);
        return ResponseEntity.ok(ApiResponse.<List<BranchClosureResponse>>builder()
                .code(2000)
                .message("Cập nhật nhóm ngày nghỉ chi nhánh thành công")
                .result(result)
                .build());
    }

    @DeleteMapping("/group")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deleteClosureGroup(
            @Valid @RequestBody DeleteBranchClosureGroupRequest request) {
        log.info("API delete branch closure group: {} closures", request.getClosureIds().size());
        branchClosureService.deleteClosureGroup(request);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .code(2000)
                .message("Xóa nhóm ngày nghỉ chi nhánh thành công")
                .build());
    }
}


