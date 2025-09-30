package com.service.auth.saga;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

@Component
public class SagaCoordinator {
    private final Map<String, CompletableFuture<SagaResult>> sagaMap = new ConcurrentHashMap<>();

    public CompletableFuture<SagaResult> register(String sagaId) {
        CompletableFuture<SagaResult> future = new CompletableFuture<>();
        sagaMap.put(sagaId, future);
        return future;
    }

    public void complete(String sagaId) {
        CompletableFuture<SagaResult> f = sagaMap.remove(sagaId);
        if (f != null) f.complete(new SagaResult(true, null));
    }

    public void fail(String sagaId, String reason) {
        CompletableFuture<SagaResult> f = sagaMap.remove(sagaId);
        if (f != null) f.complete(new SagaResult(false, reason));
    }

    public static record SagaResult(boolean success, String reason) {}
}


