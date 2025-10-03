package com.service.catalog.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.service.catalog.mapper.SupplierMapper;
import com.service.catalog.repository.SupplierRepository;
import com.service.catalog.repository.PurchaseOrderRepository;
import com.service.catalog.dto.request.SupplierCreationRequest;
import com.service.catalog.dto.request.SupplierUpdateRequest;
import com.service.catalog.dto.request.SupplierSearchRequest;
import com.service.catalog.dto.response.SupplierResponse;
import com.service.catalog.dto.response.SupplierPageResponse;
import com.service.catalog.entity.Supplier;
import com.service.catalog.exception.AppException;
import com.service.catalog.exception.ErrorCode;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SupplierService {

    SupplierRepository supplierRepository;
    SupplierMapper supplierMapper;
    PurchaseOrderRepository purchaseOrderRepository;

    public List<SupplierResponse> getAllSuppliers() {
        return supplierRepository.findAll()
                .stream()
                .map(supplierMapper::toSupplierResponse)
                .toList();
    }

    public SupplierResponse createSupplier(SupplierCreationRequest request) {
        Supplier supplier = supplierMapper.toSupplier(request);
        supplier.setCreateAt(LocalDateTime.now());
        supplier.setUpdateAt(LocalDateTime.now());
        supplierRepository.save(supplier);
        return supplierMapper.toSupplierResponse(supplier);
    }

    public SupplierResponse updateSupplier(Integer supplierId, SupplierUpdateRequest request) {
        Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new AppException(ErrorCode.SUPPLIER_NOT_FOUND));
        
        // Update supplier fields
        if(request.getName() != null) {
            supplier.setName(request.getName());
        }
        if(request.getContactName() != null) {
            supplier.setContactName(request.getContactName());
        }
        if(request.getPhone() != null) {
            supplier.setPhone(request.getPhone());
        }
        if(request.getEmail() != null) {
            supplier.setEmail(request.getEmail());
        }
        if(request.getAddress() != null) {
            supplier.setAddress(request.getAddress());
        }
        if(request.getNote() != null) {
            supplier.setNote(request.getNote());
        }
        supplier.setUpdateAt(LocalDateTime.now());
        
        supplierRepository.save(supplier);
        return supplierMapper.toSupplierResponse(supplier);
    }

    public SupplierPageResponse searchSuppliers(SupplierSearchRequest request) {
        // Tạo Pageable với sorting
        Sort sort = createSort(request.getSortBy(), request.getSortDirection());
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize(), sort);
        
        // Gọi repository với filters
        Page<Supplier> supplierPage = supplierRepository.findSuppliersWithFilters(
                request.getSearch(),
                pageable
        );
        
        // Convert sang SupplierResponse
        List<SupplierResponse> supplierResponses = supplierPage.getContent()
                .stream()
                .map(supplierMapper::toSupplierResponse)
                .toList();
        
        // Tạo response
        return SupplierPageResponse.builder()
                .content(supplierResponses)
                .page(supplierPage.getNumber())
                .size(supplierPage.getSize())
                .totalElements(supplierPage.getTotalElements())
                .totalPages(supplierPage.getTotalPages())
                .first(supplierPage.isFirst())
                .last(supplierPage.isLast())
                .hasNext(supplierPage.hasNext())
                .hasPrevious(supplierPage.hasPrevious())
                .build();
    }
    
    private Sort createSort(String sortBy, String sortDirection) {
        if (sortBy == null || sortBy.isEmpty()) {
            sortBy = "createAt";
        }
        
        Sort.Direction direction = Sort.Direction.ASC;
        if (sortDirection != null && sortDirection.equalsIgnoreCase("DESC")) {
            direction = Sort.Direction.DESC;
        }
        
        return Sort.by(direction, sortBy);
    }

    public void deleteSupplier(Integer supplierId) {
        Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new AppException(ErrorCode.SUPPLIER_NOT_FOUND));
        
        // Kiểm tra xem supplier có đang được sử dụng trong purchase orders không
        // (purchase_orders có ràng buộc ON DELETE RESTRICT)
        boolean hasPurchaseOrders = purchaseOrderRepository.existsBySupplier_SupplierId(supplierId);
        if (hasPurchaseOrders) {
            throw new AppException(ErrorCode.SUPPLIER_IN_USE);
        }
        
        // Ingredients có ràng buộc ON DELETE SET NULL nên có thể xóa
        // (supplier_id sẽ được set thành NULL)
        supplierRepository.delete(supplier);
    }
}
