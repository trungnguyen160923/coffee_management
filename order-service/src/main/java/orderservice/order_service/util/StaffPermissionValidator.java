package orderservice.order_service.util;

import feign.FeignException;
import orderservice.order_service.client.AuthServiceClient;
import orderservice.order_service.client.ProfileServiceClient;
import orderservice.order_service.dto.response.ApiResponse;
import orderservice.order_service.dto.response.RoleResponse;
import orderservice.order_service.dto.response.StaffProfileResponse;
import orderservice.order_service.exception.AppException;
import orderservice.order_service.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Utility class to validate staff business role permissions
 * 
 * This class provides methods to check if a staff member has the required
 * business roles (e.g., CASHIER_STAFF, BARISTA_STAFF, SERVER_STAFF) to access
 * specific features or APIs.
 * 
 * Usage example:
 * <pre>
 * // Check if user can access POS
 * StaffPermissionValidator.requireStaffRole("CASHIER_STAFF");
 * 
 * // Check if user has any of the specified roles
 * StaffPermissionValidator.requireAnyStaffRole("CASHIER_STAFF", "SERVER_STAFF");
 * </pre>
 */
@Slf4j
public class StaffPermissionValidator {
    
    // Cache for role ID to role name mapping
    private static final Map<Integer, String> roleIdToNameCache = new HashMap<>();
    private static final Object cacheLock = new Object();
    
    // Staff business role names constants
    public static final String CASHIER_STAFF = "CASHIER_STAFF";
    public static final String BARISTA_STAFF = "BARISTA_STAFF";
    public static final String SERVER_STAFF = "SERVER_STAFF";
    public static final String SECURITY_STAFF = "SECURITY_STAFF";
    
    /**
     * Get staff business role IDs from profile service
     * Since JWT token only contains user_id, we need to fetch staff profile
     * from profile service to get business role IDs
     * 
     * @param profileServiceClient Profile service client to fetch staff profile
     * @return List of role IDs, or empty list if not found or not a staff user
     */
    public static List<Integer> getStaffBusinessRoleIds(ProfileServiceClient profileServiceClient) {
        // First, check if user is STAFF
        String userRole = SecurityUtils.getCurrentUserRole();
        if (userRole == null || !"STAFF".equals(userRole)) {
            return Collections.emptyList();
        }
        
        // Get user ID from JWT
        Integer userId = SecurityUtils.getCurrentUserId();
        if (userId == null || profileServiceClient == null) {
            return Collections.emptyList();
        }
        
        // Fetch staff profile from profile service
        try {
            String token = SecurityUtils.getCurrentJwtToken();
            // Fallback: try to get token from request context if SecurityUtils returns null
            if (token == null) {
                try {
                    ServletRequestAttributes attributes = (ServletRequestAttributes) 
                            org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
                    if (attributes != null) {
                        String authHeader = attributes.getRequest().getHeader("Authorization");
                        if (authHeader != null && !authHeader.trim().isEmpty()) {
                            token = authHeader;
                        }
                    }
                } catch (Exception e) {
                    // Silent fallback
                }
            }
            
            if (token == null) {
                return Collections.emptyList();
            }
            
            ApiResponse<StaffProfileResponse> profileResponse = null;
            try {
                profileResponse = profileServiceClient.getStaffProfile(userId, token);
            } catch (FeignException e) {
                log.error("[StaffPermissionValidator] Failed to fetch staff profile: status={}", e.status());
                return Collections.emptyList();
            }
            
            if (profileResponse != null && profileResponse.getResult() != null) {
                StaffProfileResponse staffProfile = profileResponse.getResult();
                return staffProfile.getStaffBusinessRoleIds() != null 
                    ? staffProfile.getStaffBusinessRoleIds() 
                    : Collections.emptyList();
            }
        } catch (Exception e) {
            log.error("[StaffPermissionValidator] Exception when fetching staff profile: {}", e.getMessage());
            return Collections.emptyList();
        }
        
        return Collections.emptyList();
    }
    
    /**
     * Get staff business role IDs from JWT token (if available)
     * This is a fallback method in case JWT contains role IDs
     * 
     * @return List of role IDs, or empty list if not found
     */
    private static List<Integer> getStaffBusinessRoleIdsFromJWT() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt)) {
            return Collections.emptyList();
        }
        
        Jwt jwt = (Jwt) authentication.getPrincipal();
        Object roleIdsClaim = jwt.getClaim("staffBusinessRoleIds");
        
        if (roleIdsClaim == null) {
            return Collections.emptyList();
        }
        
        // Handle different types of role IDs claim
        if (roleIdsClaim instanceof List) {
            @SuppressWarnings("unchecked")
            List<Object> roleIdsList = (List<Object>) roleIdsClaim;
            return roleIdsList.stream()
                    .map(id -> {
                        if (id instanceof Integer) {
                            return (Integer) id;
                        } else if (id instanceof Long) {
                            return ((Long) id).intValue();
                        } else if (id instanceof String) {
                            try {
                                return Integer.parseInt((String) id);
                            } catch (NumberFormatException e) {
                                return null;
                            }
                        }
                        return null;
                    })
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        }
        
        return Collections.emptyList();
    }
    
    /**
     * Get staff business role names
     * This method:
     * 1. First tries to get role IDs from JWT (if available)
     * 2. If not in JWT, fetches staff profile from profile service to get role IDs
     * 3. Maps role IDs to role names using auth service
     * 
     * @param profileServiceClient Profile service client to fetch staff profile
     * @param authServiceClient Auth service client to map role IDs to names
     * @return List of role names (e.g., ["CASHIER_STAFF", "BARISTA_STAFF"])
     */
    public static List<String> getStaffBusinessRoleNames(
            ProfileServiceClient profileServiceClient, 
            AuthServiceClient authServiceClient) {
        
        // First, check if user is STAFF
        String userRole = SecurityUtils.getCurrentUserRole();
        if (userRole == null || !"STAFF".equals(userRole)) {
            return Collections.emptyList();
        }
        
        // Try to get role IDs from JWT first (if available in future)
        List<Integer> roleIds = getStaffBusinessRoleIdsFromJWT();
        
        // If not in JWT, fetch from profile service
        if (roleIds.isEmpty() && profileServiceClient != null) {
            roleIds = getStaffBusinessRoleIds(profileServiceClient);
        }
        
        if (roleIds.isEmpty()) {
            return Collections.emptyList();
        }
        
        // Map role IDs to role names using auth service
        if (authServiceClient != null) {
            try {
                return mapRoleIdsToNames(roleIds, authServiceClient);
            } catch (Exception e) {
                log.error("[StaffPermissionValidator] Failed to map roleIds to role names: {}", e.getMessage());
                return Collections.emptyList();
            }
        }
        
        // If no auth service client provided, return empty list
        return Collections.emptyList();
    }
    
    /**
     * Map role IDs to role names using auth service
     */
    private static List<String> mapRoleIdsToNames(List<Integer> roleIds, AuthServiceClient authServiceClient) {
        List<String> roleNames = new ArrayList<>();
        
        // Check cache first
        synchronized (cacheLock) {
            for (Integer roleId : roleIds) {
                String cachedName = roleIdToNameCache.get(roleId);
                if (cachedName != null) {
                    roleNames.add(cachedName);
                }
            }
        }
        
        // If we have all names from cache, return
        if (roleNames.size() == roleIds.size()) {
            return roleNames;
        }
        
        // Fetch missing role names from auth service
        try {
            String token = SecurityUtils.getCurrentJwtToken();
            // Fallback: try to get token from request context if SecurityUtils returns null
            if (token == null) {
                try {
                    ServletRequestAttributes attributes = (ServletRequestAttributes) 
                            RequestContextHolder.getRequestAttributes();
                    if (attributes != null) {
                        String authHeader = attributes.getRequest().getHeader("Authorization");
                        if (authHeader != null && !authHeader.trim().isEmpty()) {
                            token = authHeader;
                        }
                    }
                } catch (Exception e) {
                    // Silent fallback
                }
            }
            
            if (token == null) {
                return roleNames;
            }
            
            ApiResponse<List<RoleResponse>> rolesResponse = null;
            try {
                rolesResponse = authServiceClient.getStaffBusinessRoles(token);
            } catch (FeignException e) {
                log.error("[StaffPermissionValidator] Failed to fetch role names: status={}", e.status());
                return roleNames;
            }
            
            if (rolesResponse != null && rolesResponse.getResult() != null) {
                // Update cache
                synchronized (cacheLock) {
                    for (RoleResponse role : rolesResponse.getResult()) {
                        roleIdToNameCache.put(role.getRoleId(), role.getName());
                    }
                }
                
                // Build final list - match roleIds with cached names
                roleNames.clear();
                for (Integer roleId : roleIds) {
                    String roleName = roleIdToNameCache.get(roleId);
                    if (roleName != null && roleName.endsWith("_STAFF")) {
                        roleNames.add(roleName);
                    }
                }
            }
        } catch (Exception e) {
            log.error("[StaffPermissionValidator] Exception when fetching role names: {}", e.getMessage());
        }
        
        return roleNames;
    }
    
    /**
     * Check if current user has a specific staff business role
     * 
     * @param requiredRole The required role name (e.g., "CASHIER_STAFF")
     * @param profileServiceClient Profile service client to fetch staff profile
     * @param authServiceClient Auth service client to map role IDs to names
     * @return true if user has the role, false otherwise
     */
    public static boolean hasStaffRole(
            String requiredRole, 
            ProfileServiceClient profileServiceClient,
            AuthServiceClient authServiceClient) {
        List<String> userRoles = getStaffBusinessRoleNames(profileServiceClient, authServiceClient);
        return userRoles.contains(requiredRole);
    }
    
    /**
     * Check if current user has any of the specified staff business roles
     * 
     * @param profileServiceClient Profile service client to fetch staff profile
     * @param authServiceClient Auth service client to map role IDs to names
     * @param requiredRoles The required role names
     * @return true if user has at least one of the roles, false otherwise
     */
    public static boolean hasAnyStaffRole(
            ProfileServiceClient profileServiceClient,
            AuthServiceClient authServiceClient, 
            String... requiredRoles) {
        List<String> userRoles = getStaffBusinessRoleNames(profileServiceClient, authServiceClient);
        return Arrays.stream(requiredRoles)
                .anyMatch(userRoles::contains);
    }
    
    /**
     * Require that the current user has a specific staff business role.
     * Throws AppException with ACCESS_DENIED if the user doesn't have the role.
     * 
     * @param requiredRole The required role name (e.g., "CASHIER_STAFF")
     * @param profileServiceClient Profile service client to fetch staff profile
     * @param authServiceClient Auth service client to map role IDs to names
     * @throws AppException if user doesn't have the required role
     */
    public static void requireStaffRole(
            String requiredRole, 
            ProfileServiceClient profileServiceClient,
            AuthServiceClient authServiceClient) {
        List<String> userRoles = getStaffBusinessRoleNames(profileServiceClient, authServiceClient);
        
        if (!userRoles.contains(requiredRole)) {
            throw new AppException(
                    ErrorCode.ACCESS_DENIED,
                    String.format("Access denied. Required role: %s", requiredRole)
            );
        }
    }
    
    /**
     * Require that the current user has at least one of the specified staff business roles.
     * Throws AppException with ACCESS_DENIED if the user doesn't have any of the roles.
     * 
     * @param profileServiceClient Profile service client to fetch staff profile
     * @param authServiceClient Auth service client to map role IDs to names
     * @param requiredRoles The required role names
     * @throws AppException if user doesn't have any of the required roles
     */
    public static void requireAnyStaffRole(
            ProfileServiceClient profileServiceClient,
            AuthServiceClient authServiceClient, 
            String... requiredRoles) {
        if (!hasAnyStaffRole(profileServiceClient, authServiceClient, requiredRoles)) {
            String rolesStr = String.join(", ", requiredRoles);
            throw new AppException(
                    ErrorCode.ACCESS_DENIED,
                    String.format("Access denied. Required one of the following roles: %s", rolesStr)
            );
        }
    }
    
    /**
     * Check if user can access POS (only CASHIER_STAFF)
     */
    public static void requirePOSAccess(ProfileServiceClient profileServiceClient, AuthServiceClient authServiceClient) {
        requireStaffRole(CASHIER_STAFF, profileServiceClient, authServiceClient);
    }
    
    /**
     * Check if user can view recipes (only BARISTA_STAFF)
     */
    public static void requireRecipeAccess(ProfileServiceClient profileServiceClient, AuthServiceClient authServiceClient) {
        requireStaffRole(BARISTA_STAFF, profileServiceClient, authServiceClient);
    }
    
    /**
     * Check if user can access stock usage (only BARISTA_STAFF)
     */
    public static void requireStockUsageAccess(ProfileServiceClient profileServiceClient, AuthServiceClient authServiceClient) {
        requireStaffRole(BARISTA_STAFF, profileServiceClient, authServiceClient);
    }
    
    /**
     * Check if user can access reservations (CASHIER_STAFF or SERVER_STAFF)
     */
    public static void requireReservationAccess(ProfileServiceClient profileServiceClient, AuthServiceClient authServiceClient) {
        requireAnyStaffRole(profileServiceClient, authServiceClient, CASHIER_STAFF, SERVER_STAFF);
    }
    
    /**
     * Check if user can access table management (CASHIER_STAFF or SERVER_STAFF)
     */
    public static void requireTableManagementAccess(ProfileServiceClient profileServiceClient, AuthServiceClient authServiceClient) {
        requireAnyStaffRole(profileServiceClient, authServiceClient, CASHIER_STAFF, SERVER_STAFF);
    }
    
    /**
     * Check if user can view orders (CASHIER_STAFF, SERVER_STAFF, or BARISTA_STAFF)
     */
    public static void requireOrderAccess(ProfileServiceClient profileServiceClient, AuthServiceClient authServiceClient) {
        requireAnyStaffRole(profileServiceClient, authServiceClient, CASHIER_STAFF, SERVER_STAFF, BARISTA_STAFF);
    }
    
    /**
     * Clear the role ID to name cache (useful for testing or cache invalidation)
     */
    public static void clearCache() {
        synchronized (cacheLock) {
            roleIdToNameCache.clear();
        }
    }
}

