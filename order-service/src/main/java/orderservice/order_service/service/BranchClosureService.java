package orderservice.order_service.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import orderservice.order_service.client.AuthServiceClient;
import orderservice.order_service.dto.request.CreateBranchClosureRequest;
import orderservice.order_service.dto.request.UpdateBranchClosureRequest;
import orderservice.order_service.dto.request.UpdateBranchClosureGroupRequest;
import orderservice.order_service.dto.request.DeleteBranchClosureGroupRequest;
import orderservice.order_service.dto.response.BranchClosureResponse;
import orderservice.order_service.dto.response.UserResponse;
import orderservice.order_service.entity.Branch;
import orderservice.order_service.entity.BranchClosure;
import orderservice.order_service.exception.AppException;
import orderservice.order_service.exception.ErrorCode;
import orderservice.order_service.repository.BranchClosureRepository;
import orderservice.order_service.repository.BranchRepository;
import orderservice.order_service.util.SecurityUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BranchClosureService {

    private final BranchClosureRepository branchClosureRepository;
    private final BranchRepository branchRepository;
    private final AuthServiceClient authServiceClient;

    @Transactional
    public BranchClosureResponse createClosure(CreateBranchClosureRequest request) {
        log.info("Creating branch closure for branchId={} from {} to {}", request.getBranchId(),
                request.getStartDate(), request.getEndDate());

        Integer currentUserId = SecurityUtils.getCurrentUserId();
        String currentUserRole = normalizeRole(SecurityUtils.getCurrentUserRole());
        if (currentUserId == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        // Permission rules:
        // - ADMIN can create global (branchId=null) and any branch-specific closures
        // - MANAGER can ONLY create closures for their own branch(es), never global
        List<Branch> managerBranches = branchRepository.findByManagerUserId(currentUserId);
        boolean isManager = !managerBranches.isEmpty() || "MANAGER".equalsIgnoreCase(currentUserRole);
        boolean isAdmin = "ADMIN".equalsIgnoreCase(currentUserRole);

        if (!isAdmin && !isManager) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        if (isManager) {
            if (request.getBranchId() == null) {
                throw new AppException(ErrorCode.UNAUTHORIZED); // manager cannot create global closures
            }
            boolean managesBranch = managerBranches.stream()
                    .anyMatch(b -> Objects.equals(b.getBranchId(), request.getBranchId()));
            if (!managesBranch) {
                throw new AppException(ErrorCode.UNAUTHORIZED);
            }
        }

        // Validate branch if provided
        if (request.getBranchId() != null && !branchRepository.existsById(request.getBranchId())) {
            throw new AppException(ErrorCode.BRANCH_NOT_FOUND);
        }
        LocalDate start = request.getStartDate();
        LocalDate end = request.getEndDate() != null ? request.getEndDate() : request.getStartDate();
        if (end.isBefore(start)) {
            throw new AppException(ErrorCode.BRANCH_CLOSURE_INVALID_DATE);
        }

        BranchClosure closure = BranchClosure.builder()
                .branchId(request.getBranchId())
                .userId(currentUserId)
                .startDate(start)
                .endDate(end)
                .reason(request.getReason())
                .build();

        BranchClosure saved = branchClosureRepository.save(closure);
        return toResponse(saved);
    }

    @Transactional
    public BranchClosureResponse updateClosure(Integer id, UpdateBranchClosureRequest request) {
        log.info("Updating branch closure id={}", id);

        BranchClosure closure = branchClosureRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BRANCH_CLOSURE_NOT_FOUND));

        // Enforce write rules (ADMIN vs MANAGER-created records)
        checkWritePermission(closure);

        if (request.getBranchId() != null) {
            if (!branchRepository.existsById(request.getBranchId())) {
                throw new AppException(ErrorCode.BRANCH_NOT_FOUND);
            }
            // If manager: cannot move a record to another branch, and cannot set global
            Integer currentUserId = SecurityUtils.getCurrentUserId();
            String currentUserRole = normalizeRole(SecurityUtils.getCurrentUserRole());
            List<Branch> managerBranches = branchRepository.findByManagerUserId(currentUserId);
            boolean isManager = !managerBranches.isEmpty() || "MANAGER".equalsIgnoreCase(currentUserRole);
            if (isManager) {
                if (request.getBranchId() == null) {
                    throw new AppException(ErrorCode.UNAUTHORIZED);
                }
                boolean managesBranch = managerBranches.stream()
                        .anyMatch(b -> Objects.equals(b.getBranchId(), request.getBranchId()));
                if (!managesBranch) {
                    throw new AppException(ErrorCode.UNAUTHORIZED);
                }
            }
            closure.setBranchId(request.getBranchId());
        }

        LocalDate newStart = request.getStartDate() != null ? request.getStartDate() : closure.getStartDate();
        LocalDate newEnd = request.getEndDate() != null ? request.getEndDate() : closure.getEndDate();
        if (newEnd.isBefore(newStart)) {
            throw new AppException(ErrorCode.BRANCH_CLOSURE_INVALID_DATE);
        }
        closure.setStartDate(newStart);
        closure.setEndDate(newEnd);

        if (request.getReason() != null) {
            closure.setReason(request.getReason());
        }

        BranchClosure updated = branchClosureRepository.save(closure);
        return toResponse(updated);
    }

    @Transactional
    public void deleteClosure(Integer id) {
        log.info("Deleting branch closure id={}", id);
        BranchClosure closure = branchClosureRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BRANCH_CLOSURE_NOT_FOUND));
        
        // Enforce write rules (ADMIN vs MANAGER-created records)
        checkWritePermission(closure);
        
        // Validate: Only allow delete if start_date is in the future (not past, not today)
        LocalDate today = LocalDate.now();
        if (!closure.getStartDate().isAfter(today)) {
            throw new AppException(ErrorCode.BRANCH_CLOSURE_CANNOT_DELETE);
        }
        
        branchClosureRepository.delete(closure);
    }

    /**
     * Update a group of closures (same startDate, endDate, reason).
     * Logic:
     * - TH1: If branches unchanged -> update all records (dates/reason)
     * - TH2: If branches changed -> delete all old records, create new ones
     */
    @Transactional
    public List<BranchClosureResponse> updateClosureGroup(UpdateBranchClosureGroupRequest request) {
        log.info("Updating branch closure group: {} closures", request.getClosureIds().size());
        
        if (request.getClosureIds().isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_FAILED);
        }
        
        // Load all closures in the group
        List<BranchClosure> closures = branchClosureRepository.findAllById(request.getClosureIds());
        if (closures.size() != request.getClosureIds().size()) {
            throw new AppException(ErrorCode.BRANCH_CLOSURE_NOT_FOUND);
        }
        
        // Validate all closures belong to current user
        Integer currentUserId = SecurityUtils.getCurrentUserId();
        if (currentUserId == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        
        // Check permission for each closure: manager can only update closures for their branch or global
        for (BranchClosure closure : closures) {
            checkWritePermission(closure);
        }
        
        // Get old branch IDs
        Set<Integer> oldBranchIds = closures.stream()
                .map(BranchClosure::getBranchId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());
        boolean oldHasGlobal = closures.stream().anyMatch(c -> c.getBranchId() == null);
        
        // Get new branch IDs
        // If branchIds is null or empty, it means global closure (applies to all branches)
        boolean newHasGlobal = request.getBranchIds() == null || request.getBranchIds().isEmpty();
        Set<Integer> newBranchIds = newHasGlobal 
                ? Set.<Integer>of()
                : request.getBranchIds().stream().collect(Collectors.toSet());
        
        // Check if branches changed
        boolean branchesChanged = (oldHasGlobal != newHasGlobal) ||
                (oldBranchIds.size() != newBranchIds.size()) ||
                !oldBranchIds.equals(newBranchIds);
        
        // Check permission for new branch IDs if manager
        String currentUserRole = normalizeRole(SecurityUtils.getCurrentUserRole());
        List<Branch> managerBranches = branchRepository.findByManagerUserId(currentUserId);
        boolean isManager = !managerBranches.isEmpty() || "MANAGER".equalsIgnoreCase(currentUserRole);
        if (isManager && newHasGlobal) {
            // Manager cannot create/update to global closures
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        if (isManager && !newHasGlobal && !newBranchIds.isEmpty()) {
            // Manager can only set closures for their branch(es)
            for (Integer branchId : newBranchIds) {
                boolean managesBranch = managerBranches.stream()
                        .anyMatch(b -> b.getBranchId().equals(branchId));
                if (!managesBranch) {
                    throw new AppException(ErrorCode.UNAUTHORIZED);
                }
            }
        }
        
        // Validate dates
        LocalDate today = LocalDate.now();
        if (request.getStartDate() != null && request.getStartDate().isBefore(today)) {
            throw new AppException(ErrorCode.VALIDATION_FAILED);
        }
        LocalDate effectiveEndDate = request.getEndDate() != null 
                ? request.getEndDate() 
                : request.getStartDate();
        if (effectiveEndDate != null && effectiveEndDate.isBefore(request.getStartDate())) {
            throw new AppException(ErrorCode.BRANCH_CLOSURE_INVALID_DATE);
        }
        
        if (branchesChanged) {
            // TH2: Branches changed -> delete all, create new
            branchClosureRepository.deleteAll(closures);
            
            List<BranchClosure> newClosures = new java.util.ArrayList<>();
            if (newHasGlobal) {
                BranchClosure global = BranchClosure.builder()
                        .branchId(null)
                        .userId(currentUserId)
                        .startDate(request.getStartDate())
                        .endDate(effectiveEndDate)
                        .reason(request.getReason())
                        .build();
                newClosures.add(global);
            } else {
                // Validate branches exist
                for (Integer branchId : newBranchIds) {
                    if (!branchRepository.existsById(branchId)) {
                        throw new AppException(ErrorCode.BRANCH_NOT_FOUND);
                    }
                    BranchClosure closure = BranchClosure.builder()
                            .branchId(branchId)
                            .userId(currentUserId)
                            .startDate(request.getStartDate())
                            .endDate(effectiveEndDate)
                            .reason(request.getReason())
                            .build();
                    newClosures.add(closure);
                }
            }
            
            List<BranchClosure> saved = branchClosureRepository.saveAll(newClosures);
            return saved.stream().map(this::toResponse).collect(Collectors.toList());
        } else {
            // TH1: Branches unchanged -> update all records
            for (BranchClosure closure : closures) {
                if (request.getStartDate() != null) {
                    closure.setStartDate(request.getStartDate());
                }
                if (effectiveEndDate != null) {
                    closure.setEndDate(effectiveEndDate);
                }
                if (request.getReason() != null) {
                    closure.setReason(request.getReason());
                }
            }
            List<BranchClosure> updated = branchClosureRepository.saveAll(closures);
            return updated.stream().map(this::toResponse).collect(Collectors.toList());
        }
    }

    /**
     * Delete a group of closures.
     * Only allowed if ALL closures have start_date in the future.
     */
    @Transactional
    public void deleteClosureGroup(DeleteBranchClosureGroupRequest request) {
        log.info("Deleting branch closure group: {} closures", request.getClosureIds().size());
        
        if (request.getClosureIds().isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_FAILED);
        }
        
        // Load all closures
        List<BranchClosure> closures = branchClosureRepository.findAllById(request.getClosureIds());
        if (closures.size() != request.getClosureIds().size()) {
            throw new AppException(ErrorCode.BRANCH_CLOSURE_NOT_FOUND);
        }
        
        // Validate all closures belong to current user
        Integer currentUserId = SecurityUtils.getCurrentUserId();
        if (currentUserId == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        
        // Check permission for each closure: manager can only delete closures for their branch or global
        for (BranchClosure closure : closures) {
            checkWritePermission(closure);
        }
        
        // Validate: Only allow delete if ALL closures have start_date in the future
        LocalDate today = LocalDate.now();
        for (BranchClosure closure : closures) {
            if (!closure.getStartDate().isAfter(today)) {
                throw new AppException(ErrorCode.BRANCH_CLOSURE_CANNOT_DELETE);
            }
        }
        
        branchClosureRepository.deleteAll(closures);
    }

    public BranchClosureResponse getClosure(Integer id) {
        BranchClosure closure = branchClosureRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BRANCH_CLOSURE_NOT_FOUND));
        checkReadPermission(closure);
        return toResponse(closure);
    }

    public List<BranchClosureResponse> listClosures(Integer branchId, LocalDate from, LocalDate to) {
        // If from/to are provided, use them; otherwise, don't filter by date (return all)
        LocalDate effectiveFrom = from;
        LocalDate effectiveTo = to;

        // Get current user ID and role from JWT token
        Integer currentUserId = SecurityUtils.getCurrentUserId();
        String currentUserRole = normalizeRole(SecurityUtils.getCurrentUserRole());

        List<BranchClosure> closures;
        if (currentUserId != null) {
            // Check if user is a manager by checking if they manage any branch
            // This is more reliable than checking role from JWT
            List<Branch> managerBranches = branchRepository.findByManagerUserId(currentUserId);
            boolean isManager = !managerBranches.isEmpty() || "MANAGER".equalsIgnoreCase(currentUserRole);
            boolean isStaff = "STAFF".equalsIgnoreCase(currentUserRole);
            boolean isAdmin = "ADMIN".equalsIgnoreCase(currentUserRole);

            // Cache userId -> roleName to avoid repeated calls to auth-service
            final Map<Integer, String> creatorRoleCache = new HashMap<>();
            
            if (isStaff && branchId != null) {
                // STAFF: can view ONLY ADMIN-created closures for their branch + global ADMIN closures
                closures = new java.util.ArrayList<>();
                List<BranchClosure> branchClosures;
                if (effectiveFrom != null && effectiveTo != null) {
                    branchClosures = branchClosureRepository
                            .findByBranchIdAndDateOverlap(branchId, effectiveFrom, effectiveTo);
                } else {
                    branchClosures = branchClosureRepository.findByBranchId(branchId);
                }
                // Keep only ADMIN-created for branch
                closures.addAll(branchClosures.stream()
                        .filter(c -> "ADMIN".equals(roleOfUser(c.getUserId(), creatorRoleCache)))
                        .toList());
                
                // Add global ADMIN closures (branch_id = null)
                List<BranchClosure> global;
                if (effectiveFrom != null && effectiveTo != null) {
                    global = branchClosureRepository.findByBranchIdIsNullAndDateOverlap(effectiveFrom, effectiveTo);
                } else {
                    global = branchClosureRepository.findByBranchIdIsNull();
                }
                closures.addAll(global.stream()
                        .filter(c -> "ADMIN".equals(roleOfUser(c.getUserId(), creatorRoleCache)))
                        .toList());
                
                // Remove duplicates
                closures = closures.stream()
                        .collect(Collectors.toMap(
                                BranchClosure::getId,
                                closure -> closure,
                                (existing, replacement) -> existing
                        ))
                        .values()
                        .stream()
                        .collect(Collectors.toList());
                log.info("Staff {} found {} closures for branch {}", currentUserId, closures.size(), branchId);
            } else if (isManager) {
                // MANAGER view rules:
                // - Can see ADMIN-created global closures (branch_id = null)
                // - Can see ADMIN-created closures for their branch(es)
                // - Can see their own MANAGER-created closures for their branch(es)
                if (managerBranches.isEmpty()) {
                    // Manager has no branch assigned: only show global ADMIN closures
                    if (effectiveFrom != null && effectiveTo != null) {
                        closures = branchClosureRepository.findByBranchIdIsNullAndDateOverlap(effectiveFrom, effectiveTo);
                    } else {
                        closures = branchClosureRepository.findByBranchIdIsNull();
                    }
                    closures = closures.stream()
                            .filter(c -> "ADMIN".equals(roleOfUser(c.getUserId(), creatorRoleCache)))
                            .collect(Collectors.toList());
                    log.debug("Manager {} has no branch assigned, showing {} global closures", currentUserId, closures.size());
                } else {
                    // Get closures for all branches this manager manages + global closures
                    closures = new java.util.ArrayList<>();
                    for (Branch branch : managerBranches) {
                        List<BranchClosure> branchClosures;
                        if (effectiveFrom != null && effectiveTo != null) {
                            branchClosures = branchClosureRepository
                                    .findByBranchIdAndDateOverlap(branch.getBranchId(), effectiveFrom, effectiveTo);
                        } else {
                            branchClosures = branchClosureRepository.findByBranchId(branch.getBranchId());
                        }
                        // Keep only admin-created OR owned by current manager
                        closures.addAll(branchClosures.stream()
                                .filter(c -> Objects.equals(c.getUserId(), currentUserId)
                                        || "ADMIN".equals(roleOfUser(c.getUserId(), creatorRoleCache)))
                                .toList());
                        log.debug("Manager {} manages branch {}, found {} closures", currentUserId, branch.getBranchId(), branchClosures.size());
                    }
                    // Add global closures (branch_id = null)
                    List<BranchClosure> global;
                    if (effectiveFrom != null && effectiveTo != null) {
                        global = branchClosureRepository.findByBranchIdIsNullAndDateOverlap(effectiveFrom, effectiveTo);
                    } else {
                        global = branchClosureRepository.findByBranchIdIsNull();
                    }
                    // Only ADMIN-created global closures should be visible to managers
                    closures.addAll(global.stream()
                            .filter(c -> "ADMIN".equals(roleOfUser(c.getUserId(), creatorRoleCache)))
                            .toList());
                    log.debug("Manager {} found {} global closures", currentUserId, global.size());
                    // Remove duplicates (in case of overlapping date ranges)
                    closures = closures.stream()
                            .collect(Collectors.toMap(
                                    BranchClosure::getId,
                                    closure -> closure,
                                    (existing, replacement) -> existing
                            ))
                            .values()
                            .stream()
                            .collect(Collectors.toList());
                    log.info("Manager {} total closures after deduplication: {}", currentUserId, closures.size());
                }
            } else if (isAdmin) {
                // ADMIN view rules:
                // - Can see ONLY ADMIN-created closures (global + branch-specific)
                if (branchId != null) {
                    closures = new java.util.ArrayList<>();

                    List<BranchClosure> branchClosures;
                    if (effectiveFrom != null && effectiveTo != null) {
                        branchClosures = branchClosureRepository
                                .findByBranchIdAndDateOverlap(branchId, effectiveFrom, effectiveTo);
                    } else {
                        branchClosures = branchClosureRepository.findByBranchId(branchId);
                    }
                    closures.addAll(branchClosures.stream()
                            .filter(c -> "ADMIN".equals(roleOfUser(c.getUserId(), creatorRoleCache)))
                            .toList());

                    // Add global closures (branch_id = null)
                    List<BranchClosure> global;
                    if (effectiveFrom != null && effectiveTo != null) {
                        global = branchClosureRepository.findByBranchIdIsNullAndDateOverlap(effectiveFrom, effectiveTo);
                    } else {
                        global = branchClosureRepository.findByBranchIdIsNull();
                    }
                    closures.addAll(global.stream()
                            .filter(c -> "ADMIN".equals(roleOfUser(c.getUserId(), creatorRoleCache)))
                            .toList());

                    // Dedup by id
                    closures = closures.stream()
                            .collect(Collectors.toMap(
                                    BranchClosure::getId,
                                    closure -> closure,
                                    (existing, replacement) -> existing
                            ))
                            .values()
                            .stream()
                            .collect(Collectors.toList());
                } else {
                    // No branch filter: return all ADMIN-created closures, optionally filtered by overlap.
                    if (effectiveFrom != null && effectiveTo != null) {
                        closures = branchClosureRepository.findAll().stream()
                                .filter(c -> c.getStartDate() != null && c.getEndDate() != null)
                                .filter(c -> !c.getStartDate().isAfter(effectiveTo) && !c.getEndDate().isBefore(effectiveFrom))
                                .filter(c -> "ADMIN".equals(roleOfUser(c.getUserId(), creatorRoleCache)))
                                .collect(Collectors.toList());
                    } else {
                        closures = branchClosureRepository.findAll().stream()
                                .filter(c -> "ADMIN".equals(roleOfUser(c.getUserId(), creatorRoleCache)))
                                .collect(Collectors.toList());
                    }
                }
                log.info("Admin {} found {} closures", currentUserId, closures.size());
            } else {
                // Other roles: no access
                closures = List.of();
            }
        } else {
            // Fallback: if no userId in JWT, return empty list (should not happen with proper auth)
            log.warn("No userId found in JWT token when listing closures");
            closures = List.of();
        }

        // Return closures (already filtered by date range if provided, and by user/branch permissions)
        return closures.stream().map(this::toResponse).collect(Collectors.toList());
    }

    // NOTE: old checkManagerPermission removed in favor of checkReadPermission/checkWritePermission

    /**
     * Read rules (per user request):
     * 1) ADMIN-created + branch_id=null: everyone can view
     * 2) ADMIN-created + branch_id=X: ADMIN and branch X can view
     * 3) MANAGER-created + branch_id=managerBranch: only that manager can CRUD/view
     */
    private void checkReadPermission(BranchClosure closure) {
        Integer currentUserId = SecurityUtils.getCurrentUserId();
        if (currentUserId == null) throw new AppException(ErrorCode.UNAUTHENTICATED);
        String currentUserRole = normalizeRole(SecurityUtils.getCurrentUserRole());

        final Map<Integer, String> roleCache = new HashMap<>();
        String creatorRole = roleOfUser(closure.getUserId(), roleCache);
        if (creatorRole == null) throw new AppException(ErrorCode.UNAUTHORIZED);

        if ("ADMIN".equals(creatorRole)) {
            // Global admin closure is visible to all authenticated roles (controller already restricts to ADMIN/MANAGER here).
            if (closure.getBranchId() == null) return;

            // Branch-specific admin closure: visible to ADMIN and managers of that branch
            if ("ADMIN".equalsIgnoreCase(currentUserRole)) return;

            List<Branch> managerBranches = branchRepository.findByManagerUserId(currentUserId);
            boolean managesBranch = managerBranches.stream().anyMatch(b -> Objects.equals(b.getBranchId(), closure.getBranchId()));
            if (!managesBranch) throw new AppException(ErrorCode.UNAUTHORIZED);
            return;
        }

        if ("MANAGER".equals(creatorRole)) {
            // Only the same manager can view
            if (!Objects.equals(currentUserId, closure.getUserId())) throw new AppException(ErrorCode.UNAUTHORIZED);
            return;
        }

        throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    /**
     * Write rules (update/delete):
     * - If record created by ADMIN: only ADMIN can update/delete.
     * - If record created by MANAGER: only that manager can update/delete, and only for their branch(es).
     */
    private void checkWritePermission(BranchClosure closure) {
        Integer currentUserId = SecurityUtils.getCurrentUserId();
        if (currentUserId == null) throw new AppException(ErrorCode.UNAUTHENTICATED);
        String currentUserRole = normalizeRole(SecurityUtils.getCurrentUserRole());

        final Map<Integer, String> roleCache = new HashMap<>();
        String creatorRole = roleOfUser(closure.getUserId(), roleCache);
        if (creatorRole == null) throw new AppException(ErrorCode.UNAUTHORIZED);

        if ("ADMIN".equals(creatorRole)) {
            if (!"ADMIN".equalsIgnoreCase(currentUserRole)) throw new AppException(ErrorCode.UNAUTHORIZED);
            return;
        }

        if ("MANAGER".equals(creatorRole)) {
            if (!"MANAGER".equalsIgnoreCase(currentUserRole)) throw new AppException(ErrorCode.UNAUTHORIZED);
            if (!Objects.equals(currentUserId, closure.getUserId())) throw new AppException(ErrorCode.UNAUTHORIZED);
            // Must be within manager's branch scope
            if (closure.getBranchId() != null) {
                List<Branch> managerBranches = branchRepository.findByManagerUserId(currentUserId);
                boolean managesBranch = managerBranches.stream().anyMatch(b -> Objects.equals(b.getBranchId(), closure.getBranchId()));
                if (!managesBranch) throw new AppException(ErrorCode.UNAUTHORIZED);
            }
            return;
        }

        throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    private String roleOfUser(Integer userId, Map<Integer, String> cache) {
        if (userId == null) return null;
        if (cache.containsKey(userId)) return cache.get(userId);
        try {
            String token = SecurityUtils.getCurrentJwtToken();
            var resp = authServiceClient.getUserById(userId, token);
            UserResponse user = resp != null ? resp.getResult() : null;
            String roleName = user != null && user.getRole() != null ? user.getRole().getName() : null;
            String normalized = normalizeRole(roleName);
            cache.put(userId, normalized);
            return normalized;
        } catch (Exception e) {
            log.warn("Failed to resolve role for userId={}: {}", userId, e.getMessage());
            cache.put(userId, null);
            return null;
        }
    }

    private String normalizeRole(String role) {
        if (role == null) return null;
        String r = role.trim().toUpperCase();
        return r.startsWith("ROLE_") ? r.substring(5) : r;
    }

    /**
     * Kiểm tra xem chi nhánh có đang nghỉ vào một ngày cụ thể không
     * @param branchId ID của chi nhánh (null nếu muốn kiểm tra global closure)
     * @param date Ngày cần kiểm tra
     * @return true nếu chi nhánh đang nghỉ vào ngày đó, false nếu không
     */
    public boolean isBranchClosedOnDate(Integer branchId, LocalDate date) {
        if (date == null) {
            return false;
        }
        
        // Kiểm tra global closures (branchId = null) - áp dụng cho tất cả chi nhánh
        List<BranchClosure> globalClosures = branchClosureRepository.findByBranchIdIsNullAndDateOverlap(date, date);
        if (!globalClosures.isEmpty()) {
            log.debug("Branch {} is closed on {} due to global closure", branchId, date);
            return true;
        }
        
        // Nếu branchId là null, chỉ cần kiểm tra global closures (đã kiểm tra ở trên)
        if (branchId == null) {
            return false;
        }
        
        // Kiểm tra closures cụ thể cho chi nhánh này
        List<BranchClosure> branchClosures = branchClosureRepository.findByBranchIdAndDateOverlap(branchId, date, date);
        if (!branchClosures.isEmpty()) {
            log.debug("Branch {} is closed on {} due to branch-specific closure", branchId, date);
            return true;
        }
        
        return false;
    }

    /**
     * Kiểm tra xem chi nhánh có hoạt động vào một ngày cụ thể không (dựa trên openDays)
     * @param branch Chi nhánh cần kiểm tra
     * @param date Ngày cần kiểm tra
     * @return true nếu chi nhánh hoạt động vào ngày đó, false nếu không
     */
    public boolean isBranchOperatingOnDate(Branch branch, LocalDate date) {
        if (branch == null || date == null) {
            return false;
        }
        
        String openDays = branch.getOpenDays();
        if (openDays == null || openDays.trim().isEmpty()) {
            // Nếu không có thông tin openDays, mặc định là hoạt động tất cả các ngày
            log.debug("Branch {} has no openDays specified, defaulting to open all days", branch.getBranchId());
            return true;
        }
        
        // Lấy thứ trong tuần: 1=Monday, 7=Sunday
        int dayOfWeek = date.getDayOfWeek().getValue();
        
        // Parse openDays string (ví dụ: "1,2,3,4,5,6,7" hoặc "1,2,3,4,5")
        String[] days = openDays.split(",");
        for (String dayStr : days) {
            try {
                int day = Integer.parseInt(dayStr.trim());
                if (day == dayOfWeek) {
                    log.debug("Branch {} is operating on {} (day of week: {})", branch.getBranchId(), date, dayOfWeek);
                    return true;
                }
            } catch (NumberFormatException e) {
                log.warn("Invalid day format in openDays for branch {}: {}", branch.getBranchId(), dayStr);
            }
        }
        
        log.debug("Branch {} is NOT operating on {} (day of week: {})", branch.getBranchId(), date, dayOfWeek);
        return false;
    }

    private BranchClosureResponse toResponse(BranchClosure closure) {
        return BranchClosureResponse.builder()
                .id(closure.getId())
                .branchId(closure.getBranchId())
                .userId(closure.getUserId())
                .startDate(closure.getStartDate())
                .endDate(closure.getEndDate())
                .reason(closure.getReason())
                .createAt(closure.getCreateAt())
                .updateAt(closure.getUpdateAt())
                .build();
    }
}


