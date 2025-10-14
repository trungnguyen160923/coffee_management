package com.service.catalog.service;

import com.service.catalog.dto.request.table.TableCreationRequest;
import com.service.catalog.dto.request.table.TableSearchRequest;
import com.service.catalog.dto.request.table.TableUpdateRequest;
import com.service.catalog.dto.response.TablePageResponse;
import com.service.catalog.dto.response.TableResponse;
import com.service.catalog.entity.TableEntity;
import com.service.catalog.exception.AppException;
import com.service.catalog.exception.ErrorCode;
import com.service.catalog.mapper.TableMapper;
import com.service.catalog.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class TableService {

    TableRepository tableRepository;
    TableMapper tableMapper;

    @Transactional
    public TableResponse createTable(TableCreationRequest request) {
        // Check if table with same label already exists in the branch
        if (tableRepository.findByBranchIdAndLabel(request.getBranchId(), request.getLabel()).isPresent()) {
            throw new AppException(ErrorCode.TABLE_LABEL_EXISTS);
        }

        TableEntity table = tableMapper.toEntity(request);
        TableEntity savedTable = tableRepository.save(table);
        return tableMapper.toResponse(savedTable);
    }

    @Transactional
    public TableResponse updateTable(Integer tableId, TableUpdateRequest request) {
        TableEntity table = tableRepository.findById(tableId)
                .orElseThrow(() -> new AppException(ErrorCode.TABLE_NOT_FOUND));

        // Check if new label conflicts with existing table in the same branch
        if (request.getLabel() != null && !request.getLabel().equals(table.getLabel())) {
            if (tableRepository.findByBranchIdAndLabel(table.getBranchId(), request.getLabel()).isPresent()) {
                throw new AppException(ErrorCode.TABLE_LABEL_EXISTS);
            }
        }

        tableMapper.updateEntity(request, table);
        TableEntity updatedTable = tableRepository.save(table);
        return tableMapper.toResponse(updatedTable);
    }

    @Transactional(readOnly = true)
    public TableResponse getTableById(Integer tableId) {
        TableEntity table = tableRepository.findById(tableId)
                .orElseThrow(() -> new AppException(ErrorCode.TABLE_NOT_FOUND));
        return tableMapper.toResponse(table);
    }

    @Transactional(readOnly = true)
    public List<TableResponse> getTablesByBranch(Integer branchId) {
        List<TableEntity> tables = tableRepository.findByBranchId(branchId);
        return tables.stream()
                .map(tableMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TablePageResponse searchTables(TableSearchRequest request) {
        Pageable pageable = createPageable(request);
        Page<TableEntity> tablePage;

        if (request.getBranchId() != null) {
            tablePage = tableRepository.findByBranchIdAndFilters(
                    request.getBranchId(),
                    request.getSearch(),
                    request.getStatus(),
                    pageable);
        } else {
            tablePage = tableRepository.findByFilters(
                    request.getSearch(),
                    request.getStatus(),
                    pageable);
        }

        List<TableResponse> content = tablePage.getContent().stream()
                .map(tableMapper::toResponse)
                .toList();

        return TablePageResponse.builder()
                .content(content)
                .page(tablePage.getNumber())
                .size(tablePage.getSize())
                .totalElements(tablePage.getTotalElements())
                .totalPages(tablePage.getTotalPages())
                .first(tablePage.isFirst())
                .last(tablePage.isLast())
                .build();
    }

    @Transactional
    public void deleteTable(Integer tableId) {
        if (!tableRepository.existsById(tableId)) {
            throw new AppException(ErrorCode.TABLE_NOT_FOUND);
        }
        tableRepository.deleteById(tableId);
    }

    @Transactional(readOnly = true)
    public List<TableResponse> getAvailableTables(Integer branchId) {
        List<TableEntity> tables = tableRepository.findByBranchIdAndStatus(branchId, TableEntity.TableStatus.AVAILABLE);
        return tables.stream()
                .map(tableMapper::toResponse)
                .toList();
    }

    private Pageable createPageable(TableSearchRequest request) {
        Sort sort = Sort.unsorted();
        if (request.getSortBy() != null && !request.getSortBy().isEmpty()) {
            Sort.Direction direction = Sort.Direction.ASC;
            if (request.getSortDirection() != null && request.getSortDirection().equalsIgnoreCase("desc")) {
                direction = Sort.Direction.DESC;
            }
            sort = Sort.by(direction, request.getSortBy());
        }

        return PageRequest.of(request.getPage(), request.getSize(), sort);
    }
}
