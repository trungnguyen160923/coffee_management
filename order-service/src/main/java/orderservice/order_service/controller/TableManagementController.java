package orderservice.order_service.controller;

import jakarta.validation.Valid;
import orderservice.order_service.client.AuthServiceClient;
import orderservice.order_service.client.ProfileServiceClient;
import orderservice.order_service.dto.ApiResponse;
import orderservice.order_service.dto.request.AssignTableRequest;
import orderservice.order_service.dto.request.CreateTableRequest;
import orderservice.order_service.dto.request.UpdateTableRequest;
import orderservice.order_service.dto.request.UpdateTableStatusRequest;
import orderservice.order_service.dto.response.TableAssignmentResponse;
import orderservice.order_service.dto.response.TableResponse;
import orderservice.order_service.exception.AppException;
import orderservice.order_service.service.TableManagementService;
import orderservice.order_service.util.StaffPermissionValidator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/staff/tables")
public class TableManagementController {

    private final TableManagementService tableManagementService;
    private final ProfileServiceClient profileServiceClient;
    private final AuthServiceClient authServiceClient;

    @Autowired
    public TableManagementController(
            TableManagementService tableManagementService,
            ProfileServiceClient profileServiceClient,
            AuthServiceClient authServiceClient) {
        this.tableManagementService = tableManagementService;
        this.profileServiceClient = profileServiceClient;
        this.authServiceClient = authServiceClient;
    }

    // Create new table
    @PostMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<TableResponse>> createTable(@Valid @RequestBody CreateTableRequest request) {
        try {
            TableResponse table = tableManagementService.createTable(request);
            ApiResponse<TableResponse> response = ApiResponse.<TableResponse>builder()
                    .code(200)
                    .message("Table created successfully")
                    .result(table)
                    .build();
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            ApiResponse<TableResponse> response = ApiResponse.<TableResponse>builder()
                    .code(500)
                    .message("Failed to create table: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Get all tables by branch
    @GetMapping("/branch/{branchId}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN') or hasRole('STAFF')")
    public ResponseEntity<ApiResponse<List<TableResponse>>> getTablesByBranch(@PathVariable Integer branchId) {
        // Validate staff business role if user is STAFF (MANAGER/ADMIN bypass)
        String userRole = orderservice.order_service.util.SecurityUtils.getCurrentUserRole();
        if (userRole != null && "STAFF".equals(userRole)) {
            StaffPermissionValidator.requireTableManagementAccess(profileServiceClient, authServiceClient);
            // Validate that staff is in an active shift
            StaffPermissionValidator.requireActiveShift(profileServiceClient);
        }
        
        try {
            List<TableResponse> tables = tableManagementService.getTablesByBranch(branchId);
            ApiResponse<List<TableResponse>> response = ApiResponse.<List<TableResponse>>builder()
                    .code(200)
                    .message("Tables retrieved successfully")
                    .result(tables)
                    .build();
            return ResponseEntity.ok(response);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            ApiResponse<List<TableResponse>> response = ApiResponse.<List<TableResponse>>builder()
                    .code(500)
                    .message("Failed to retrieve tables: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Get available tables for reservation
    @GetMapping("/branch/{branchId}/available")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN') or hasRole('STAFF')")
    public ResponseEntity<ApiResponse<List<TableResponse>>> getAvailableTables(
            @PathVariable Integer branchId,
            @RequestParam Integer partySize,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime reservedAt) {
        // Validate staff business role if user is STAFF (MANAGER/ADMIN bypass)
        String userRole = orderservice.order_service.util.SecurityUtils.getCurrentUserRole();
        if (userRole != null && "STAFF".equals(userRole)) {
            StaffPermissionValidator.requireTableManagementAccess(profileServiceClient, authServiceClient);
            // Validate that staff is in an active shift
            StaffPermissionValidator.requireActiveShift(profileServiceClient);
        }
        
        try {
            List<TableResponse> tables = tableManagementService.getAvailableTablesForReservation(branchId, partySize,
                    reservedAt);
            ApiResponse<List<TableResponse>> response = ApiResponse.<List<TableResponse>>builder()
                    .code(200)
                    .message("Available tables retrieved successfully")
                    .result(tables)
                    .build();
            return ResponseEntity.ok(response);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            ApiResponse<List<TableResponse>> response = ApiResponse.<List<TableResponse>>builder()
                    .code(500)
                    .message("Failed to retrieve available tables: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Assign tables to reservation
    @PostMapping("/assign")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN') or hasRole('STAFF')")
    public ResponseEntity<ApiResponse<TableAssignmentResponse>> assignTablesToReservation(
            @Valid @RequestBody AssignTableRequest request) {
        // Validate staff business role if user is STAFF (MANAGER/ADMIN bypass)
        String userRole = orderservice.order_service.util.SecurityUtils.getCurrentUserRole();
        if (userRole != null && "STAFF".equals(userRole)) {
            StaffPermissionValidator.requireTableManagementAccess(profileServiceClient, authServiceClient);
            // Validate that staff is in an active shift
            StaffPermissionValidator.requireActiveShift(profileServiceClient);
        }
        
        try {
            TableAssignmentResponse assignment = tableManagementService.assignTablesToReservation(request);
            ApiResponse<TableAssignmentResponse> response = ApiResponse.<TableAssignmentResponse>builder()
                    .code(200)
                    .message("Tables assigned successfully")
                    .result(assignment)
                    .build();
            return ResponseEntity.ok(response);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            ApiResponse<TableAssignmentResponse> response = ApiResponse.<TableAssignmentResponse>builder()
                    .code(500)
                    .message("Failed to assign tables: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Get table assignments for reservation
    @GetMapping("/reservation/{reservationId}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN') or hasRole('STAFF')")
    public ResponseEntity<ApiResponse<List<TableResponse>>> getTableAssignments(@PathVariable Integer reservationId) {
        // Validate staff business role if user is STAFF (MANAGER/ADMIN bypass)
        String userRole = orderservice.order_service.util.SecurityUtils.getCurrentUserRole();
        if (userRole != null && "STAFF".equals(userRole)) {
            StaffPermissionValidator.requireTableManagementAccess(profileServiceClient, authServiceClient);
            // Validate that staff is in an active shift
            StaffPermissionValidator.requireActiveShift(profileServiceClient);
        }
        
        try {
            List<TableResponse> tables = tableManagementService.getTableAssignments(reservationId);
            ApiResponse<List<TableResponse>> response = ApiResponse.<List<TableResponse>>builder()
                    .code(200)
                    .message("Table assignments retrieved successfully")
                    .result(tables)
                    .build();
            return ResponseEntity.ok(response);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            ApiResponse<List<TableResponse>> response = ApiResponse.<List<TableResponse>>builder()
                    .code(500)
                    .message("Failed to retrieve table assignments: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Update table status
    @PutMapping("/status")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN') or hasRole('STAFF')")
    public ResponseEntity<ApiResponse<TableResponse>> updateTableStatus(
            @Valid @RequestBody UpdateTableStatusRequest request) {
        // Validate staff business role if user is STAFF (MANAGER/ADMIN bypass)
        String userRole = orderservice.order_service.util.SecurityUtils.getCurrentUserRole();
        if (userRole != null && "STAFF".equals(userRole)) {
            StaffPermissionValidator.requireTableManagementAccess(profileServiceClient, authServiceClient);
            // Validate that staff is in an active shift
            StaffPermissionValidator.requireActiveShift(profileServiceClient);
        }
        
        try {
            TableResponse table = tableManagementService.updateTableStatus(request);
            ApiResponse<TableResponse> response = ApiResponse.<TableResponse>builder()
                    .code(200)
                    .message("Table status updated successfully")
                    .result(table)
                    .build();
            return ResponseEntity.ok(response);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            ApiResponse<TableResponse> response = ApiResponse.<TableResponse>builder()
                    .code(500)
                    .message("Failed to update table status: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Remove table assignments
    @DeleteMapping("/reservation/{reservationId}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN') or hasRole('STAFF')")
    public ResponseEntity<ApiResponse<Void>> removeTableAssignments(@PathVariable Integer reservationId) {
        // Validate staff business role if user is STAFF (MANAGER/ADMIN bypass)
        String userRole = orderservice.order_service.util.SecurityUtils.getCurrentUserRole();
        if (userRole != null && "STAFF".equals(userRole)) {
            StaffPermissionValidator.requireTableManagementAccess(profileServiceClient, authServiceClient);
            // Validate that staff is in an active shift
            StaffPermissionValidator.requireActiveShift(profileServiceClient);
        }
        
        try {
            tableManagementService.removeTableAssignments(reservationId);
            ApiResponse<Void> response = ApiResponse.<Void>builder()
                    .code(200)
                    .message("Table assignments removed successfully")
                    .result(null)
                    .build();
            return ResponseEntity.ok(response);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            ApiResponse<Void> response = ApiResponse.<Void>builder()
                    .code(500)
                    .message("Failed to remove table assignments: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Update table information
    @PutMapping("/{tableId}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<TableResponse>> updateTable(
            @PathVariable Integer tableId,
            @Valid @RequestBody UpdateTableRequest request) {
        try {
            // Set the tableId from path variable
            request.setTableId(tableId);
            TableResponse table = tableManagementService.updateTable(request);
            ApiResponse<TableResponse> response = ApiResponse.<TableResponse>builder()
                    .code(200)
                    .message("Table updated successfully")
                    .result(table)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<TableResponse> response = ApiResponse.<TableResponse>builder()
                    .code(500)
                    .message("Failed to update table: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Delete table
    @DeleteMapping("/{tableId}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteTable(@PathVariable Integer tableId) {
        try {
            tableManagementService.deleteTable(tableId);
            ApiResponse<Void> response = ApiResponse.<Void>builder()
                    .code(200)
                    .message("Table deleted successfully")
                    .result(null)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<Void> response = ApiResponse.<Void>builder()
                    .code(500)
                    .message("Failed to delete table: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Get table status summary
    @GetMapping("/branch/{branchId}/status")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN') or hasRole('STAFF')")
    public ResponseEntity<ApiResponse<List<TableResponse>>> getTableStatusSummary(@PathVariable Integer branchId) {
        // Validate staff business role if user is STAFF (MANAGER/ADMIN bypass)
        String userRole = orderservice.order_service.util.SecurityUtils.getCurrentUserRole();
        if (userRole != null && "STAFF".equals(userRole)) {
            StaffPermissionValidator.requireTableManagementAccess(profileServiceClient, authServiceClient);
            // Validate that staff is in an active shift
            StaffPermissionValidator.requireActiveShift(profileServiceClient);
        }
        
        try {
            List<TableResponse> tables = tableManagementService.getTableStatusSummary(branchId);
            ApiResponse<List<TableResponse>> response = ApiResponse.<List<TableResponse>>builder()
                    .code(200)
                    .message("Table status summary retrieved successfully")
                    .result(tables)
                    .build();
            return ResponseEntity.ok(response);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            ApiResponse<List<TableResponse>> response = ApiResponse.<List<TableResponse>>builder()
                    .code(500)
                    .message("Failed to retrieve table status summary: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
