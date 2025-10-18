package com.service.auth.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.service.auth.dto.response.ApiResponse;
import com.service.auth.service.UserV2Service;
import com.service.auth.saga.SagaCoordinator;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/users-v2")
public class UserV2Controller {
    private final UserV2Service userV2Service;
    private final SagaCoordinator sagaCoordinator;

    public UserV2Controller(UserV2Service userV2Service, SagaCoordinator sagaCoordinator) {
        this.userV2Service = userV2Service;
        this.sagaCoordinator = sagaCoordinator;
    }

    @PostMapping("/create-manager")
    public ResponseEntity<ApiResponse<?>> createManager(@Valid @RequestBody com.service.auth.dto.request.ManagerProfileCreationRequest req) {
        var result = userV2Service.createManagerUser(req);
        String sagaId = String.valueOf(((java.util.Map<?, ?>) result).get("sagaId"));
        var future = sagaCoordinator.register(sagaId);
        try {
            var saga = future.get(15, java.util.concurrent.TimeUnit.SECONDS);
            if (!saga.success()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ApiResponse.builder().code(400).message(saga.reason()).result(null).build());
            }
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.builder().result(result).build());
        } catch (java.util.concurrent.TimeoutException te) {
            return ResponseEntity.status(HttpStatus.ACCEPTED)
                    .body(ApiResponse.builder().code(202).message("Saga in progress").result(result).build());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.builder().code(500).message("Saga wait failed").result(null).build());
        }
    }

    @PostMapping("/create-staff")
    public ResponseEntity<ApiResponse<?>> createStaff(@Valid @RequestBody com.service.auth.dto.request.StaffProfileCreationRequest req) {
        var result = userV2Service.createStaffUser(req);
        String sagaId = String.valueOf(((java.util.Map<?, ?>) result).get("sagaId"));
        var future = sagaCoordinator.register(sagaId);
        try {
            var saga = future.get(15, java.util.concurrent.TimeUnit.SECONDS);
            if (!saga.success()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ApiResponse.builder().code(400).message(saga.reason()).result(null).build());
            }
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.builder().result(result).build());
        } catch (java.util.concurrent.TimeoutException te) {
            return ResponseEntity.status(HttpStatus.ACCEPTED)
                    .body(ApiResponse.builder().code(202).message("Saga in progress").result(result).build());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.builder().code(500).message("Saga wait failed").result(null).build());
        }
    }

    @DeleteMapping("/delete-manager/{userId}")
    public ResponseEntity<ApiResponse<?>> deleteManager(@PathVariable Integer userId) {
        var result = userV2Service.deleteManagerUser(userId);
        String sagaId = String.valueOf(((java.util.Map<?, ?>) result).get("sagaId"));
        var future = sagaCoordinator.register(sagaId);
        try {
            var saga = future.get(15, java.util.concurrent.TimeUnit.SECONDS);
            if (!saga.success()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ApiResponse.builder().code(400).message(saga.reason()).result(null).build());
            }
            return ResponseEntity.status(HttpStatus.OK).body(ApiResponse.builder().result(result).build());
        } catch (java.util.concurrent.TimeoutException te) {
            return ResponseEntity.status(HttpStatus.ACCEPTED)
                    .body(ApiResponse.builder().code(202).message("Saga in progress").result(result).build());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.builder().code(500).message("Saga wait failed").result(null).build());
        }
    }

    @DeleteMapping("/delete-staff/{userId}")
    public ResponseEntity<ApiResponse<?>> deleteStaff(@PathVariable Integer userId) {
        var result = userV2Service.deleteStaffUser(userId);
        String sagaId = String.valueOf(((java.util.Map<?, ?>) result).get("sagaId"));
        var future = sagaCoordinator.register(sagaId);
        try {
            var saga = future.get(15, java.util.concurrent.TimeUnit.SECONDS);
            if (!saga.success()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ApiResponse.builder().code(400).message(saga.reason()).result(null).build());
            }
            return ResponseEntity.status(HttpStatus.OK).body(ApiResponse.builder().result(result).build());
        } catch (java.util.concurrent.TimeoutException te) {
            return ResponseEntity.status(HttpStatus.ACCEPTED)
                    .body(ApiResponse.builder().code(202).message("Saga in progress").result(result).build());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.builder().code(500).message("Saga wait failed").result(null).build());
        }
    }
}


