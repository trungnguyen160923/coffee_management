package com.service.notification_service.configuration;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    public static final String APPLICATION_DESTINATION_PREFIX = "/app";
    public static final String USER_DESTINATION_PREFIX = "/user";
    public static final String[] BROKER_DESTINATIONS = { "/topic", "/queue" };
    public static final String ENDPOINT = "/ws";

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker(BROKER_DESTINATIONS);
        registry.setApplicationDestinationPrefixes(APPLICATION_DESTINATION_PREFIX);
        registry.setUserDestinationPrefix(USER_DESTINATION_PREFIX);
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint(ENDPOINT)
                .setAllowedOriginPatterns("*") // Use patterns instead of origins to allow all origins
                .withSockJS(); // Gateway handles CORS, avoids duplicate headers
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Placeholder for authentication interceptors in future steps
    }

    @Override
    public void configureClientOutboundChannel(ChannelRegistration registration) {
        // Placeholder for monitoring/interceptors in future steps
    }
}

