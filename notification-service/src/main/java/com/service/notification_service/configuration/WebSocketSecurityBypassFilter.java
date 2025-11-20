package com.service.notification_service.configuration;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filter to completely bypass Spring Security for WebSocket endpoints
 * This filter runs BEFORE all Spring Security filters and sets anonymous authentication
 * to allow WebSocket requests to proceed without authentication
 * 
 * CRITICAL: This filter must run BEFORE FilterSecurityInterceptor to prevent 403 errors
 */
@Component
@Order(-200) // Run BEFORE all Spring Security filters (even before Order(-100))
public class WebSocketSecurityBypassFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String servletPath = request.getServletPath();
        boolean isWebSocketPath = servletPath.startsWith("/ws") || servletPath.equals("/ws");
        
        if (isWebSocketPath) {
            // Set anonymous authentication BEFORE any Spring Security filter runs
            AnonymousAuthenticationToken anonymousAuth = new AnonymousAuthenticationToken(
                    "websocket-bypass-key",
                    "anonymous",
                    AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS", "ROLE_USER", "ROLE_ADMIN")
            );
            SecurityContextHolder.getContext().setAuthentication(anonymousAuth);
        }
        
        try {
            filterChain.doFilter(request, response);
        } finally {
            if (isWebSocketPath && response.getStatus() == 403) {
                SecurityContextHolder.clearContext();
            }
        }
    }
}

