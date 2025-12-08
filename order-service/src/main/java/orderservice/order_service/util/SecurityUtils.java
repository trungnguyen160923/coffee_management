package orderservice.order_service.util;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

public class SecurityUtils {
    
    public static Integer getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() instanceof Jwt) {
            Jwt jwt = (Jwt) authentication.getPrincipal();
            Object userId = jwt.getClaim("user_id");
            
            if (userId instanceof Integer) {
                return (Integer) userId;
            } else if (userId instanceof Long) {
                return ((Long) userId).intValue();
            } else if (userId instanceof String) {
                try {
                    return Integer.parseInt((String) userId);
                } catch (NumberFormatException e) {
                    return null;
                }
            }
        }
        return null;
    }
    
    public static String getCurrentJwtToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt) {
            Jwt jwt = (Jwt) authentication.getPrincipal();
            return "Bearer " + jwt.getTokenValue();
        }
        return null;
    }
    
    public static String getCurrentUserRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt) {
            Jwt jwt = (Jwt) authentication.getPrincipal();
            
            // First, try to get from JWT claims (most reliable)
            Object roleClaim = jwt.getClaim("role");
            if (roleClaim != null) {
                String role = roleClaim.toString().toUpperCase();
                // Remove "ROLE_" prefix if present
                return role.startsWith("ROLE_") ? role.substring(5) : role;
            }
            
            // Fallback: try to get from authorities
            if (authentication.getAuthorities() != null && !authentication.getAuthorities().isEmpty()) {
                String authority = authentication.getAuthorities().iterator().next().getAuthority();
                // Remove "ROLE_" prefix if present
                return authority.startsWith("ROLE_") ? authority.substring(5) : authority;
            }
        }
        return null;
    }
}
