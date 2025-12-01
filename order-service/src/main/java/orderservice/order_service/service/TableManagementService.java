package orderservice.order_service.service;

import lombok.extern.slf4j.Slf4j;
import orderservice.order_service.dto.request.AssignTableRequest;
import orderservice.order_service.dto.request.CreateTableRequest;
import orderservice.order_service.dto.request.UpdateTableRequest;
import orderservice.order_service.dto.request.UpdateTableStatusRequest;
import orderservice.order_service.dto.response.TableAssignmentResponse;
import orderservice.order_service.dto.response.TableResponse;
import orderservice.order_service.entity.Branch;
import orderservice.order_service.entity.CafeTable;
import orderservice.order_service.entity.Reservation;
import orderservice.order_service.entity.ReservationTable;
import orderservice.order_service.events.ReservationCreatedEvent;
import orderservice.order_service.exception.AppException;
import orderservice.order_service.exception.ErrorCode;
import orderservice.order_service.repository.BranchRepository;
import orderservice.order_service.repository.CafeTableRepository;
import orderservice.order_service.repository.ReservationRepository;
import orderservice.order_service.repository.ReservationTableRepository;
import orderservice.order_service.service.OrderEventProducer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
public class TableManagementService {

    private final CafeTableRepository cafeTableRepository;
    private final ReservationTableRepository reservationTableRepository;
    private final ReservationRepository reservationRepository;
    private final BranchRepository branchRepository;
    private final OrderEventProducer orderEventProducer;

    @Autowired
    public TableManagementService(CafeTableRepository cafeTableRepository,
            ReservationTableRepository reservationTableRepository,
            ReservationRepository reservationRepository,
            BranchRepository branchRepository,
            OrderEventProducer orderEventProducer) {
        this.cafeTableRepository = cafeTableRepository;
        this.reservationTableRepository = reservationTableRepository;
        this.reservationRepository = reservationRepository;
        this.branchRepository = branchRepository;
        this.orderEventProducer = orderEventProducer;
    }

    // Create new table
    public TableResponse createTable(CreateTableRequest request) {
        // Validate branch exists
        Branch branch = branchRepository.findById(request.getBranchId())
                .orElseThrow(() -> new AppException(ErrorCode.BRANCH_NOT_FOUND));

        // Check if table label already exists in branch
        if (cafeTableRepository.findByBranchIdAndLabel(request.getBranchId(), request.getLabel()).isPresent()) {
            throw new AppException(ErrorCode.TABLE_LABEL_EXISTS);
        }

        CafeTable table = new CafeTable();
        table.setBranchId(request.getBranchId());
        table.setLabel(request.getLabel());
        table.setCapacity(request.getCapacity());
        table.setStatus("AVAILABLE");

        CafeTable savedTable = cafeTableRepository.save(table);
        return convertToTableResponse(savedTable, branch);
    }

    // Get all tables by branch
    public List<TableResponse> getTablesByBranch(Integer branchId) {
        List<CafeTable> tables = cafeTableRepository.findByBranchIdOrderByLabel(branchId);
        Branch branch = branchRepository.findById(branchId).orElse(null);

        return tables.stream()
                .map(table -> convertToTableResponse(table, branch))
                .collect(Collectors.toList());
    }

    // Get available tables for reservation
    public List<TableResponse> getAvailableTablesForReservation(Integer branchId, Integer partySize,
            LocalDateTime reservedAt) {
        // Calculate time window (2 hours before and after reservation time)
        LocalDateTime startTime = reservedAt.minusHours(2);
        LocalDateTime endTime = reservedAt.plusHours(2);

        List<CafeTable> availableTables = cafeTableRepository.findAvailableTablesForReservation(
                branchId, partySize, startTime, endTime);

        Branch branch = branchRepository.findById(branchId).orElse(null);

        return availableTables.stream()
                .map(table -> convertToTableResponse(table, branch))
                .collect(Collectors.toList());
    }

    // Assign tables to reservation
    public TableAssignmentResponse assignTablesToReservation(AssignTableRequest request) {
        // Validate reservation exists
        Reservation reservation = reservationRepository.findById(request.getReservationId())
                .orElseThrow(() -> new AppException(ErrorCode.RESERVATION_NOT_FOUND));

        // Check if reservation is in valid state for table assignment
        if (!"PENDING".equals(reservation.getStatus()) && !"CONFIRMED".equals(reservation.getStatus())) {
            throw new AppException(ErrorCode.RESERVATION_CANNOT_BE_ASSIGNED);
        }

        // Validate all tables exist and are available
        List<CafeTable> tables = new ArrayList<>();
        for (Integer tableId : request.getTableIds()) {
            CafeTable table = cafeTableRepository.findById(tableId)
                    .orElseThrow(() -> new AppException(ErrorCode.TABLE_NOT_FOUND));

            if (!table.getBranchId().equals(reservation.getBranchId())) {
                throw new AppException(ErrorCode.TABLE_BRANCH_MISMATCH);
            }

            if (!table.isAvailable()) {
                throw new AppException(ErrorCode.TABLE_NOT_AVAILABLE);
            }

            tables.add(table);
        }

        // Check if total capacity is sufficient
        int totalCapacity = tables.stream().mapToInt(CafeTable::getCapacity).sum();
        if (totalCapacity < reservation.getPartySize()) {
            throw new AppException(ErrorCode.INSUFFICIENT_TABLE_CAPACITY);
        }

        // Remove existing table assignments
        reservationTableRepository.deleteByReservationId(request.getReservationId());

        // Create new table assignments
        List<ReservationTable> assignments = new ArrayList<>();
        for (Integer tableId : request.getTableIds()) {
            ReservationTable assignment = new ReservationTable(request.getReservationId(), tableId);
            assignments.add(reservationTableRepository.save(assignment));
        }

        // Update table statuses to RESERVED
        for (CafeTable table : tables) {
            table.setStatus("RESERVED");
            cafeTableRepository.save(table);
        }

        // Update reservation status to CONFIRMED if it was PENDING
        if ("PENDING".equals(reservation.getStatus())) {
            reservation.setStatus("CONFIRMED");
            Reservation updatedReservation = reservationRepository.save(reservation);

            // Publish event when reservation is confirmed (if customerId exists)
            if (updatedReservation.getCustomerId() != null) {
                try {
                    Branch branch = branchRepository.findById(updatedReservation.getBranchId()).orElse(null);
                    String branchName = branch != null ? branch.getName() : null;
                    ReservationCreatedEvent event = ReservationCreatedEvent.builder()
                            .reservationId(updatedReservation.getReservationId())
                            .branchId(updatedReservation.getBranchId())
                            .branchName(branchName)
                            .customerId(updatedReservation.getCustomerId())
                            .customerName(updatedReservation.getCustomerName())
                            .phone(updatedReservation.getPhone())
                            .email(updatedReservation.getEmail())
                            .reservedAt(updatedReservation.getReservedAt())
                            .partySize(updatedReservation.getPartySize())
                            .notes(updatedReservation.getNotes())
                            .createdAt(java.time.Instant.now())
                            .build();
                    orderEventProducer.publishReservationConfirmed(event);
                    log.info("[TableManagementService] ✅ Successfully triggered event publishing for confirmed reservationId: {}", 
                            updatedReservation.getReservationId());
                } catch (Exception e) {
                    log.error("[TableManagementService] ❌ Failed to publish reservation confirmed event for reservationId: {}", 
                            updatedReservation.getReservationId(), e);
                    // Don't fail table assignment if event publishing fails
                }
            }
        }

        // Create response
        TableAssignmentResponse response = new TableAssignmentResponse();
        response.setReservationId(reservation.getReservationId());
        response.setCustomerName(reservation.getCustomerName());
        response.setPhone(reservation.getPhone());
        response.setPartySize(reservation.getPartySize());
        response.setReservedAt(reservation.getReservedAt());
        response.setStatus(reservation.getStatus());
        response.setAssignedTables(tables.stream()
                .map(table -> convertToTableResponse(table, null))
                .collect(Collectors.toList()));
        response.setMessage("Tables assigned successfully");

        return response;
    }

    // Update table status
    public TableResponse updateTableStatus(UpdateTableStatusRequest request) {
        CafeTable table = cafeTableRepository.findById(request.getTableId())
                .orElseThrow(() -> new AppException(ErrorCode.TABLE_NOT_FOUND));

        String oldStatus = table.getStatus();
        table.setStatus(request.getStatus());
        CafeTable updatedTable = cafeTableRepository.save(table);

        log.info("Table {} status changed from {} to {}",
                table.getLabel(), oldStatus, request.getStatus());

        Branch branch = branchRepository.findById(table.getBranchId()).orElse(null);
        return convertToTableResponse(updatedTable, branch);
    }

    // Get table assignments for reservation
    public List<TableResponse> getTableAssignments(Integer reservationId) {
        List<ReservationTable> assignments = reservationTableRepository.findByReservationId(reservationId);

        if (assignments.isEmpty()) {
            return new ArrayList<>();
        }

        List<Integer> tableIds = assignments.stream()
                .map(ReservationTable::getTableId)
                .collect(Collectors.toList());

        List<CafeTable> tables = cafeTableRepository.findAllById(tableIds);
        return tables.stream()
                .map(table -> convertToTableResponse(table, null))
                .collect(Collectors.toList());
    }

    // Remove table assignments
    public void removeTableAssignments(Integer reservationId) {
        // Get current assignments
        List<ReservationTable> assignments = reservationTableRepository.findByReservationId(reservationId);

        if (assignments.isEmpty()) {
            return;
        }

        // Get table IDs
        List<Integer> tableIds = assignments.stream()
                .map(ReservationTable::getTableId)
                .collect(Collectors.toList());

        // Update table statuses back to AVAILABLE
        List<CafeTable> tables = cafeTableRepository.findAllById(tableIds);
        for (CafeTable table : tables) {
            table.setStatus("AVAILABLE");
            cafeTableRepository.save(table);
        }

        // Remove assignments
        reservationTableRepository.deleteByReservationId(reservationId);

        log.info("Removed table assignments for reservation {}", reservationId);
    }

    // Update table information
    public TableResponse updateTable(UpdateTableRequest request) {
        CafeTable table = cafeTableRepository.findById(request.getTableId())
                .orElseThrow(() -> new AppException(ErrorCode.TABLE_NOT_FOUND));

        // Update table information
        table.setLabel(request.getLabel());
        table.setCapacity(request.getCapacity());
        CafeTable updatedTable = cafeTableRepository.save(table);

        log.info("Table {} updated: label={}, capacity={}",
                table.getTableId(), request.getLabel(), request.getCapacity());

        Branch branch = branchRepository.findById(table.getBranchId()).orElse(null);
        return convertToTableResponse(updatedTable, branch);
    }

    // Delete table
    public void deleteTable(Integer tableId) {
        CafeTable table = cafeTableRepository.findById(tableId)
                .orElseThrow(() -> new AppException(ErrorCode.TABLE_NOT_FOUND));

        // Check if table is currently occupied or reserved
        if ("OCCUPIED".equals(table.getStatus()) || "RESERVED".equals(table.getStatus())) {
            throw new AppException(ErrorCode.TABLE_CANNOT_BE_DELETED);
        }

        // Remove any table assignments first
        reservationTableRepository.deleteByTableId(tableId);

        // Delete the table
        cafeTableRepository.delete(table);

        log.info("Table {} deleted successfully", tableId);
    }

    // Get table status summary
    public List<TableResponse> getTableStatusSummary(Integer branchId) {
        List<CafeTable> tables = cafeTableRepository.findByBranchIdOrderByLabel(branchId);
        Branch branch = branchRepository.findById(branchId).orElse(null);

        return tables.stream()
                .map(table -> convertToTableResponse(table, branch))
                .collect(Collectors.toList());
    }

    // Helper method to convert entity to response
    private TableResponse convertToTableResponse(CafeTable table, Branch branch) {
        TableResponse response = new TableResponse();
        response.setTableId(table.getTableId());
        response.setBranchId(table.getBranchId());
        response.setBranchName(branch != null ? branch.getName() : null);
        response.setLabel(table.getLabel());
        response.setCapacity(table.getCapacity());
        response.setStatus(table.getStatus());
        response.setCreateAt(table.getCreateAt());
        response.setUpdateAt(table.getUpdateAt());
        return response;
    }
}
