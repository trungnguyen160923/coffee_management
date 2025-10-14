package orderservice.order_service.service;

import orderservice.order_service.dto.request.ApplyDiscountRequest;
import orderservice.order_service.dto.request.CreateDiscountRequest;
import orderservice.order_service.dto.request.UpdateDiscountRequest;
import orderservice.order_service.dto.response.DiscountApplicationResponse;
import orderservice.order_service.dto.response.DiscountPageResponse;
import orderservice.order_service.dto.response.DiscountResponse;
import orderservice.order_service.entity.Discount;
import orderservice.order_service.repository.DiscountRepository;
import orderservice.order_service.exception.ErrorCode;
import orderservice.order_service.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DiscountService {

    private final DiscountRepository discountRepository;

    @Transactional
    public DiscountResponse createDiscount(CreateDiscountRequest request) {
        log.info("Creating discount with code: {}", request.getCode());

        // Kiểm tra mã giảm giá đã tồn tại
        if (discountRepository.findByCode(request.getCode()).isPresent()) {
            throw new AppException(ErrorCode.DISCOUNT_CODE_EXISTED);
        }

        // Kiểm tra ngày bắt đầu và kết thúc
        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw new AppException(ErrorCode.INVALID_DISCOUNT_DATE);
        }

        // Kiểm tra giá trị giảm giá
        if (request.getDiscountType().equals("PERCENT")
                && request.getDiscountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new AppException(ErrorCode.INVALID_DISCOUNT_VALUE);
        }

        Discount discount = Discount.builder()
                .code(request.getCode())
                .name(request.getName())
                .description(request.getDescription())
                .discountType(Discount.DiscountType.valueOf(request.getDiscountType()))
                .discountValue(request.getDiscountValue())
                .minOrderAmount(request.getMinOrderAmount() != null ? request.getMinOrderAmount() : BigDecimal.ZERO)
                .maxDiscountAmount(request.getMaxDiscountAmount())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .usageLimit(request.getUsageLimit() != null ? request.getUsageLimit() : 0)
                .usedCount(0)
                .branchId(request.getBranchId())
                .active(request.getActive())
                .build();

        Discount savedDiscount = discountRepository.save(discount);
        log.info("Created discount with ID: {}", savedDiscount.getDiscountId());

        return convertToResponse(savedDiscount);
    }

    @Transactional
    public DiscountResponse updateDiscount(Integer discountId, UpdateDiscountRequest request) {
        log.info("Updating discount with ID: {}", discountId);

        Discount discount = discountRepository.findById(discountId)
                .orElseThrow(() -> new AppException(ErrorCode.DISCOUNT_NOT_FOUND));

        // Kiểm tra ngày bắt đầu và kết thúc nếu được cập nhật
        if (request.getStartDate() != null && request.getEndDate() != null) {
            if (request.getStartDate().isAfter(request.getEndDate())) {
                throw new AppException(ErrorCode.INVALID_DISCOUNT_DATE);
            }
        }

        // Kiểm tra giá trị giảm giá
        if (request.getDiscountType() != null && request.getDiscountValue() != null) {
            if (request.getDiscountType().equals("PERCENT")
                    && request.getDiscountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new AppException(ErrorCode.INVALID_DISCOUNT_VALUE);
            }
        }

        // Cập nhật các trường
        if (request.getName() != null) {
            discount.setName(request.getName());
        }
        if (request.getDescription() != null) {
            discount.setDescription(request.getDescription());
        }
        if (request.getDiscountType() != null) {
            discount.setDiscountType(Discount.DiscountType.valueOf(request.getDiscountType()));
        }
        if (request.getDiscountValue() != null) {
            discount.setDiscountValue(request.getDiscountValue());
        }
        if (request.getMinOrderAmount() != null) {
            discount.setMinOrderAmount(request.getMinOrderAmount());
        }
        if (request.getMaxDiscountAmount() != null) {
            discount.setMaxDiscountAmount(request.getMaxDiscountAmount());
        }
        if (request.getStartDate() != null) {
            discount.setStartDate(request.getStartDate());
        }
        if (request.getEndDate() != null) {
            discount.setEndDate(request.getEndDate());
        }
        if (request.getUsageLimit() != null) {
            discount.setUsageLimit(request.getUsageLimit());
        }
        // Branch update logic: allow explicit clear to null
        if (request.getClearBranch() != null && request.getClearBranch()) {
            discount.setBranchId(null);
        } else if (request.getBranchId() != null) {
            // If branchId present (even 0 not used), set it
            discount.setBranchId(request.getBranchId());
        }
        if (request.getActive() != null) {
            discount.setActive(request.getActive());
        }

        Discount updatedDiscount = discountRepository.save(discount);
        log.info("Updated discount with ID: {}", updatedDiscount.getDiscountId());

        return convertToResponse(updatedDiscount);
    }

    @Transactional
    public void deleteDiscount(Integer discountId) {
        log.info("Deleting discount with ID: {}", discountId);

        Discount discount = discountRepository.findById(discountId)
                .orElseThrow(() -> new AppException(ErrorCode.DISCOUNT_NOT_FOUND));

        discountRepository.delete(discount);
        log.info("Deleted discount with ID: {}", discountId);
    }

    public DiscountResponse getDiscountById(Integer discountId) {
        log.info("Getting discount by ID: {}", discountId);

        Discount discount = discountRepository.findById(discountId)
                .orElseThrow(() -> new AppException(ErrorCode.DISCOUNT_NOT_FOUND));

        return convertToResponse(discount);
    }

    public DiscountResponse getDiscountByCode(String code) {
        log.info("Getting discount by code: {}", code);

        Discount discount = discountRepository.findByCode(code)
                .orElseThrow(() -> new AppException(ErrorCode.DISCOUNT_NOT_FOUND));

        return convertToResponse(discount);
    }

    public DiscountPageResponse getAllDiscounts(Integer branchId, String keyword, int page, int size, String sortBy,
            String sortDir) {
        log.info("Getting all discounts for branch: {}, keyword: {}, page: {}, size: {}", branchId, keyword, page,
                size);

        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Discount> discountPage;

        if (keyword != null && !keyword.trim().isEmpty()) {
            if (branchId != null) {
                discountPage = discountRepository.searchDiscountsByBranch(branchId, keyword, pageable);
            } else {
                discountPage = discountRepository.searchDiscounts(keyword, pageable);
            }
        } else {
            if (branchId != null) {
                discountPage = discountRepository.findByBranchIdOrGlobal(branchId, pageable);
            } else {
                discountPage = discountRepository.findAll(pageable);
            }
        }

        List<DiscountResponse> content = discountPage.getContent().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());

        return DiscountPageResponse.builder()
                .content(content)
                .page(discountPage.getNumber())
                .size(discountPage.getSize())
                .totalElements(discountPage.getTotalElements())
                .totalPages(discountPage.getTotalPages())
                .first(discountPage.isFirst())
                .last(discountPage.isLast())
                .build();
    }

    public List<DiscountResponse> getActiveDiscounts(Integer branchId) {
        log.info("Getting active discounts for branch: {}", branchId);

        List<Discount> discounts;
        if (branchId != null) {
            discounts = discountRepository.findActiveDiscountsForBranch(LocalDateTime.now(), branchId);
        } else {
            discounts = discountRepository.findActiveDiscounts(LocalDateTime.now());
        }

        return discounts.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public DiscountApplicationResponse applyDiscount(ApplyDiscountRequest request) {
        log.info("Applying discount with code: {} for order amount: {}", request.getDiscountCode(),
                request.getOrderAmount());

        Discount discount = discountRepository.findByCode(request.getDiscountCode())
                .orElseThrow(() -> new AppException(ErrorCode.DISCOUNT_NOT_FOUND));

        // Check if discount is active
        if (!discount.getActive()) {
            return DiscountApplicationResponse.builder()
                    .discountCode(request.getDiscountCode())
                    .isValid(false)
                    .message("Discount code is inactive")
                    .build();
        }

        // Check validity period
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(discount.getStartDate()) || now.isAfter(discount.getEndDate())) {
            return DiscountApplicationResponse.builder()
                    .discountCode(request.getDiscountCode())
                    .isValid(false)
                    .message("Discount code is expired or not yet valid")
                    .build();
        }

        // Check branch applicability
        if (discount.getBranchId() != null && !discount.getBranchId().equals(request.getBranchId())) {
            return DiscountApplicationResponse.builder()
                    .discountCode(request.getDiscountCode())
                    .isValid(false)
                    .message("Discount code is not applicable to this branch")
                    .build();
        }

        // Check minimum order amount
        if (request.getOrderAmount().compareTo(discount.getMinOrderAmount()) < 0) {
            return DiscountApplicationResponse.builder()
                    .discountCode(request.getDiscountCode())
                    .isValid(false)
                    .message("Order total does not meet the minimum amount")
                    .build();
        }

        // Check usage limit
        if (discount.getUsageLimit() > 0 && discount.getUsedCount() >= discount.getUsageLimit()) {
            return DiscountApplicationResponse.builder()
                    .discountCode(request.getDiscountCode())
                    .isValid(false)
                    .message("Discount code usage limit reached")
                    .build();
        }

        // Calculate discount amount
        BigDecimal discountAmount = calculateDiscountAmount(discount, request.getOrderAmount());

        // Apply max discount cap if set
        if (discount.getMaxDiscountAmount() != null && discountAmount.compareTo(discount.getMaxDiscountAmount()) > 0) {
            discountAmount = discount.getMaxDiscountAmount();
        }

        BigDecimal finalAmount = request.getOrderAmount().subtract(discountAmount);

        return DiscountApplicationResponse.builder()
                .discountCode(discount.getCode())
                .discountName(discount.getName())
                .discountType(discount.getDiscountType().name())
                .discountValue(discount.getDiscountValue())
                .originalAmount(request.getOrderAmount())
                .discountAmount(discountAmount)
                .finalAmount(finalAmount)
                .isValid(true)
                .message("Discount applied successfully")
                .build();
    }

    @Transactional
    public void useDiscount(String discountCode) {
        log.info("Using discount with code: {}", discountCode);

        Discount discount = discountRepository.findByCode(discountCode)
                .orElseThrow(() -> new AppException(ErrorCode.DISCOUNT_NOT_FOUND));

        discount.setUsedCount(discount.getUsedCount() + 1);
        discountRepository.save(discount);

        log.info("Incremented usage count for discount: {}", discountCode);
    }

    private BigDecimal calculateDiscountAmount(Discount discount, BigDecimal orderAmount) {
        if (discount.getDiscountType() == Discount.DiscountType.PERCENT) {
            return orderAmount.multiply(discount.getDiscountValue()).divide(BigDecimal.valueOf(100));
        } else {
            return discount.getDiscountValue();
        }
    }

    private DiscountResponse convertToResponse(Discount discount) {
        return DiscountResponse.builder()
                .discountId(discount.getDiscountId())
                .code(discount.getCode())
                .name(discount.getName())
                .description(discount.getDescription())
                .discountType(discount.getDiscountType().name())
                .discountValue(discount.getDiscountValue())
                .minOrderAmount(discount.getMinOrderAmount())
                .maxDiscountAmount(discount.getMaxDiscountAmount())
                .startDate(discount.getStartDate())
                .endDate(discount.getEndDate())
                .usageLimit(discount.getUsageLimit())
                .usedCount(discount.getUsedCount())
                .branchId(discount.getBranchId())
                .active(discount.getActive())
                .createAt(discount.getCreateAt())
                .updateAt(discount.getUpdateAt())
                .build();
    }
}
