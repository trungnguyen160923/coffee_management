package orderservice.order_service.service;

import orderservice.order_service.dto.request.CreateBranchRequest;
import orderservice.order_service.entity.Branch;
import orderservice.order_service.exception.AppException;
import orderservice.order_service.exception.ErrorCode;
import orderservice.order_service.repository.BranchRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class BranchService {

    private final BranchRepository branchRepository;
    private final GeocodingService geocodingService;

    @Value("${geocoding.mandatory:true}")
    private boolean geocodingMandatory;

    @Autowired
    public BranchService(BranchRepository branchRepository, GeocodingService geocodingService) {
        this.branchRepository = branchRepository;
        this.geocodingService = geocodingService;
    }

    public Branch createBranch(CreateBranchRequest request) {
        // Validate branch name uniqueness
        if (branchRepository.existsByName(request.getName())) {
            throw new AppException(ErrorCode.BRANCH_NAME_EXISTS);
        }

        // Set default values if not provided
        LocalTime openHours = request.getOpenHours() != null ? request.getOpenHours() : LocalTime.of(8, 0);
        LocalTime endHours = request.getEndHours() != null ? request.getEndHours() : LocalTime.of(22, 0);

        // Validate business hours
        if (openHours.isAfter(endHours)) {
            throw new AppException(ErrorCode.INVALID_BUSINESS_HOURS);
        }

        Branch branch = new Branch();
        branch.setName(request.getName());
        branch.setAddress(request.getAddress());
        branch.setPhone(request.getPhone());
        branch.setManagerUserId(request.getManagerUserId());
        branch.setOpenHours(openHours);
        branch.setEndHours(endHours);

        // Geocode address to get coordinates - with rollback on failure if mandatory
        if (request.getAddress() != null && !request.getAddress().trim().isEmpty()) {
            try {
                GeocodingService.Coordinates coordinates = geocodingService
                        .geocodeAddressWithFallback(request.getAddress());
                if (coordinates != null) {
                    branch.setLatitude(BigDecimal.valueOf(coordinates.getLatitude()));
                    branch.setLongitude(BigDecimal.valueOf(coordinates.getLongitude()));
                } else if (geocodingMandatory) {
                    // Geocoding failed and it's mandatory - rollback by throwing exception
                    throw new AppException(ErrorCode.GEOCODING_FAILED,
                            "Không thể lấy tọa độ cho địa chỉ: " + request.getAddress() +
                                    ". Vui lòng kiểm tra lại địa chỉ hoặc thử địa chỉ khác.");
                }
                // If geocoding is not mandatory and fails, continue without coordinates
            } catch (AppException e) {
                // Re-throw AppException as is
                throw e;
            } catch (Exception e) {
                if (geocodingMandatory) {
                    // Geocoding failed and it's mandatory - rollback by throwing exception
                    throw new AppException(ErrorCode.GEOCODING_FAILED,
                            "Lỗi khi lấy tọa độ cho địa chỉ: " + request.getAddress() +
                                    ". Chi tiết: " + e.getMessage());
                }
                // If geocoding is not mandatory and fails, continue without coordinates
            }
        }

        return branchRepository.save(branch);
    }

    public List<Branch> getAllBranches() {
        return branchRepository.findAll();
    }

    public Page<Branch> getBranchesPaged(int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? 10 : Math.min(size, 100);
        var pageable = PageRequest.of(safePage, safeSize, org.springframework.data.domain.Sort
                .by(org.springframework.data.domain.Sort.Direction.DESC, "createAt"));
        return branchRepository.findAll(pageable);
    }

    public Optional<Branch> getBranchById(Integer branchId) {
        return branchRepository.findById(branchId);
    }

    public Optional<Branch> getBranchByName(String name) {
        return branchRepository.findByName(name);
    }

    public List<Branch> getBranchesByManager(Integer managerUserId) {
        return branchRepository.findByManagerUserId(managerUserId);
    }

    public List<Branch> searchBranchesByName(String name) {
        return branchRepository.findByNameContainingIgnoreCase(name);
    }

    public Branch assignManager(Integer branchId, Integer managerUserId) {
        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new AppException(ErrorCode.BRANCH_NOT_FOUND));

        // Idempotent: if already assigned to the same manager, just return
        if (managerUserId != null && managerUserId.equals(branch.getManagerUserId())) {
            return branch;
        }

        // Reject if branch already has a different manager
        if (branch.getManagerUserId() != null && !branch.getManagerUserId().equals(managerUserId)) {
            throw new AppException(ErrorCode.BRANCH_ALREADY_HAS_MANAGER);
        }

        branch.setManagerUserId(managerUserId);
        return branchRepository.save(branch);
    }

    public Branch unassignManager(Integer branchId, Integer managerUserId) {
        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new AppException(ErrorCode.BRANCH_NOT_FOUND));

        // Idempotent: only clear if currently assigned to the same manager
        if (branch.getManagerUserId() != null && branch.getManagerUserId().equals(managerUserId)) {
            branch.setManagerUserId(null);
            return branchRepository.save(branch);
        }
        return branch; // No change needed
    }

    public Branch updateBranch(Integer branchId, CreateBranchRequest request) {
        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new AppException(ErrorCode.BRANCH_NOT_FOUND));

        // Check if name is being changed and if new name already exists
        if (!branch.getName().equals(request.getName()) && branchRepository.existsByName(request.getName())) {
            throw new AppException(ErrorCode.BRANCH_NAME_EXISTS);
        }

        // Set default values if not provided
        LocalTime openHours = request.getOpenHours() != null ? request.getOpenHours() : branch.getOpenHours();
        LocalTime endHours = request.getEndHours() != null ? request.getEndHours() : branch.getEndHours();

        // Validate business hours
        if (openHours.isAfter(endHours)) {
            throw new AppException(ErrorCode.INVALID_BUSINESS_HOURS);
        }

        // Store original address to compare later
        String originalAddress = branch.getAddress();

        branch.setName(request.getName());
        branch.setAddress(request.getAddress());
        branch.setPhone(request.getPhone());
        branch.setManagerUserId(request.getManagerUserId());
        branch.setOpenHours(openHours);
        branch.setEndHours(endHours);

        // Geocode address to get coordinates if address has changed - with rollback on
        // failure if mandatory
        if (request.getAddress() != null && !request.getAddress().trim().isEmpty()
                && !request.getAddress().equals(originalAddress)) {
            try {
                GeocodingService.Coordinates coordinates = geocodingService
                        .geocodeAddressWithFallback(request.getAddress());
                if (coordinates != null) {
                    branch.setLatitude(BigDecimal.valueOf(coordinates.getLatitude()));
                    branch.setLongitude(BigDecimal.valueOf(coordinates.getLongitude()));
                } else if (geocodingMandatory) {
                    // Geocoding failed and it's mandatory - rollback by throwing exception
                    throw new AppException(ErrorCode.GEOCODING_FAILED,
                            "Không thể lấy tọa độ cho địa chỉ: " + request.getAddress() +
                                    ". Vui lòng kiểm tra lại địa chỉ hoặc thử địa chỉ khác.");
                }
                // If geocoding is not mandatory and fails, continue without coordinates
            } catch (AppException e) {
                // Re-throw AppException as is
                throw e;
            } catch (Exception e) {
                if (geocodingMandatory) {
                    // Geocoding failed and it's mandatory - rollback by throwing exception
                    throw new AppException(ErrorCode.GEOCODING_FAILED,
                            "Lỗi khi lấy tọa độ cho địa chỉ: " + request.getAddress() +
                                    ". Chi tiết: " + e.getMessage());
                }
                // If geocoding is not mandatory and fails, continue without coordinates
            }
        }

        return branchRepository.save(branch);
    }

    public void deleteBranch(Integer branchId) {
        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new AppException(ErrorCode.BRANCH_NOT_FOUND));

        // Prevent delete if branch is assigned to a manager
        if (branch.getManagerUserId() != null) {
            throw new AppException(ErrorCode.BRANCH_ALREADY_HAS_MANAGER);
        }

        try {
            branchRepository.deleteById(branchId);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            // Foreign key constraints exist in related tables
            throw new AppException(ErrorCode.BRANCH_IN_USE);
        }
    }

    public List<Branch> getBranchesUnassigned() {
        return branchRepository.findByManagerUserIdIsNull();
    }

    /**
     * Geocode lại tọa độ cho một chi nhánh cụ thể
     */
    public Branch geocodeBranch(Integer branchId) {
        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new AppException(ErrorCode.BRANCH_NOT_FOUND));

        if (branch.getAddress() != null && !branch.getAddress().trim().isEmpty()) {
            try {
                GeocodingService.Coordinates coordinates = geocodingService
                        .geocodeAddressWithFallback(branch.getAddress());
                if (coordinates != null) {
                    branch.setLatitude(BigDecimal.valueOf(coordinates.getLatitude()));
                    branch.setLongitude(BigDecimal.valueOf(coordinates.getLongitude()));
                    return branchRepository.save(branch);
                }
            } catch (Exception e) {
                throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
            }
        }

        throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
    }

    /**
     * Geocode lại tọa độ cho tất cả chi nhánh chưa có tọa độ
     */
    public List<Branch> geocodeAllBranchesWithoutCoordinates() {
        List<Branch> branches = branchRepository.findByLatitudeIsNullOrLongitudeIsNull();

        for (Branch branch : branches) {
            if (branch.getAddress() != null && !branch.getAddress().trim().isEmpty()) {
                try {
                    GeocodingService.Coordinates coordinates = geocodingService
                            .geocodeAddressWithFallback(branch.getAddress());
                    if (coordinates != null) {
                        branch.setLatitude(BigDecimal.valueOf(coordinates.getLatitude()));
                        branch.setLongitude(BigDecimal.valueOf(coordinates.getLongitude()));
                    }
                } catch (Exception e) {
                    // Geocoding failed for this branch
                }
            }
        }

        return branchRepository.saveAll(branches);
    }
}
