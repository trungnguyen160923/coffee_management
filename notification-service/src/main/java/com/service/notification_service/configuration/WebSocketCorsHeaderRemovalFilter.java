package com.service.notification_service.configuration;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filter to remove CORS headers from WebSocket responses
 * API Gateway already handles CORS, so we don't want duplicate headers
 */
@Component
@Order(1) // Run early, but after WebSocketSecurityBypassFilter
public class WebSocketCorsHeaderRemovalFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String servletPath = request.getServletPath();
        String requestURI = request.getRequestURI();
        // Check both servletPath and requestURI for WebSocket paths (after API Gateway stripping)
        boolean isWebSocketPath = (servletPath.startsWith("/ws") || servletPath.equals("/ws")) ||
                                  (requestURI != null && (requestURI.contains("/ws") || requestURI.contains("/notification-service/ws")));
        
        if (isWebSocketPath) {
            // Wrap response to intercept and remove CORS headers
            HttpServletResponse wrappedResponse = new jakarta.servlet.http.HttpServletResponseWrapper(response) {
                @Override
                public void setHeader(String name, String value) {
                    // Remove CORS headers before they are set
                    if (isCorsHeader(name)) {
                        return; // Don't set the header
                    }
                    super.setHeader(name, value);
                }

                @Override
                public void addHeader(String name, String value) {
                    // Remove CORS headers before they are added
                    if (isCorsHeader(name)) {
                        return; // Don't add the header
                    }
                    super.addHeader(name, value);
                }

                @Override
                public void setIntHeader(String name, int value) {
                    if (isCorsHeader(name)) {
                        return;
                    }
                    super.setIntHeader(name, value);
                }

                @Override
                public void addIntHeader(String name, int value) {
                    if (isCorsHeader(name)) {
                        return;
                    }
                    super.addIntHeader(name, value);
                }

                private boolean isCorsHeader(String name) {
                    return name != null && (
                            name.equalsIgnoreCase("Access-Control-Allow-Origin") ||
                            name.equalsIgnoreCase("Access-Control-Allow-Credentials") ||
                            name.equalsIgnoreCase("Access-Control-Allow-Methods") ||
                            name.equalsIgnoreCase("Access-Control-Allow-Headers") ||
                            name.equalsIgnoreCase("Access-Control-Expose-Headers") ||
                            name.equalsIgnoreCase("Access-Control-Max-Age")
                    );
                }
            };
            
            filterChain.doFilter(request, wrappedResponse);
            
            // Also remove CORS headers after filter chain (in case they were added)
            removeCorsHeaders(response);
        } else {
            filterChain.doFilter(request, response);
        }
    }
    
    private void removeCorsHeaders(HttpServletResponse response) {
        String[] corsHeaders = {
            "Access-Control-Allow-Origin",
            "Access-Control-Allow-Credentials",
            "Access-Control-Allow-Methods",
            "Access-Control-Allow-Headers",
            "Access-Control-Expose-Headers",
            "Access-Control-Max-Age"
        };
        
        for (String header : corsHeaders) {
            if (response.containsHeader(header)) {
                response.setHeader(header, null); // Remove header
            }
        }
    }
}

