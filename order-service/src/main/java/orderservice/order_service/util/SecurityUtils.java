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
}
