package com.service.catalog.controller;

import com.service.catalog.dto.ApiResponse;
import com.service.catalog.dto.request.table.TableCreationRequest;
import com.service.catalog.dto.request.table.TableSearchRequest;
import com.service.catalog.dto.request.table.TableUpdateRequest;
import com.service.catalog.dto.response.TablePageResponse;
import com.service.catalog.dto.response.TableResponse;
import com.service.catalog.service.TableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/tables")
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class TableController {

    TableService tableService;

    @PostMapping
    ApiResponse<TableResponse> createTable(@Valid @RequestBody TableCreationRequest request) {
        TableResponse result = tableService.createTable(request);
        return ApiResponse.<TableResponse>builder().result(result).build();
    }

    @PutMapping("/{tableId}")
    ApiResponse<TableResponse> updateTable(@PathVariable Integer tableId,
            @Valid @RequestBody TableUpdateRequest request) {
        TableResponse result = tableService.updateTable(tableId, request);
        return ApiResponse.<TableResponse>builder().result(result).build();
    }

    @GetMapping("/{tableId}")
    ApiResponse<TableResponse> getTableById(@PathVariable Integer tableId) {
        TableResponse result = tableService.getTableById(tableId);
        return ApiResponse.<TableResponse>builder().result(result).build();
    }

    @GetMapping("/branch/{branchId}")
    ApiResponse<List<TableResponse>> getTablesByBranch(@PathVariable Integer branchId) {
        List<TableResponse> result = tableService.getTablesByBranch(branchId);
        return ApiResponse.<List<TableResponse>>builder().result(result).build();
    }

    @GetMapping("/branch/{branchId}/available")
    ApiResponse<List<TableResponse>> getAvailableTables(@PathVariable Integer branchId) {
        List<TableResponse> result = tableService.getAvailableTables(branchId);
        return ApiResponse.<List<TableResponse>>builder().result(result).build();
    }

    @GetMapping("/search")
    ApiResponse<TablePageResponse> searchTables(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) Integer branchId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDirection) {

        TableSearchRequest request = TableSearchRequest.builder()
                .page(page)
                .size(size)
                .branchId(branchId)
                .search(search)
                .status(status != null ? com.service.catalog.entity.TableEntity.TableStatus.valueOf(status) : null)
                .sortBy(sortBy)
                .sortDirection(sortDirection)
                .build();

        TablePageResponse result = tableService.searchTables(request);
        return ApiResponse.<TablePageResponse>builder().result(result).build();
    }

    @DeleteMapping("/{tableId}")
    ApiResponse<Void> deleteTable(@PathVariable Integer tableId) {
        tableService.deleteTable(tableId);
        return ApiResponse.<Void>builder().build();
    }
}
