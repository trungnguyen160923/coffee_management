# Kế Hoạch Triển Khai Notification Service

## 📋 Tổng Quan

Notification Service sẽ xử lý tất cả các loại thông báo trong hệ thống, bao gồm:
- Order Management Notifications
- Inventory Management Notifications  
- Business Operations Notifications

---

## 🎯 Phase 1: Cấu Trúc Cơ Bản

### 1.1 Entities & Database
- ✅ `Notification` - Lưu trữ thông báo đã gửi
- ✅ `NotificationTemplate` - Template cho các loại thông báo
- ✅ `NotificationPreference` - Tùy chọn nhận thông báo của user

### 1.2 Event DTOs
Cần tạo các event classes để consume từ Kafka:

```
events/
├── OrderCreatedEvent.java
├── OrderStatusChangedEvent.java
├── OrderCancelledEvent.java
├── ReservationCreatedEvent.java
├── LowStockEvent.java
├── OutOfStockEvent.java
├── StockReceivedEvent.java
├── RevenueReportEvent.java
└── SystemAlertEvent.java
```

---

## 📨 Phase 2: Kafka Events & Topics

### 2.1 Order Management Events

#### Topic: `order.created`
**Publisher**: `order-service` (khi tạo order thành công)
```json
{
  "orderId": 123,
  "customerId": 456,
  "customerName": "Nguyễn Văn A",
  "customerEmail": "customer@example.com",
  "phone": "0123456789",
  "branchId": 1,
  "totalAmount": 150000,
  "orderDate": "2024-01-15T10:30:00",
  "orderItems": [...],
  "deliveryAddress": "...",
  "paymentMethod": "CASH"
}
```

#### Topic: `order.status.changed`
**Publisher**: `order-service` (khi update status)
```json
{
  "orderId": 123,
  "customerId": 456,
  "customerEmail": "customer@example.com",
  "oldStatus": "PENDING",
  "newStatus": "CONFIRMED",
  "branchId": 1,
  "changedAt": "2024-01-15T11:00:00"
}
```

#### Topic: `order.cancelled`
**Publisher**: `order-service` (khi hủy order)
```json
{
  "orderId": 123,
  "customerId": 456,
  "customerEmail": "customer@example.com",
  "branchId": 1,
  "cancellationReason": "Customer request",
  "cancelledAt": "2024-01-15T12:00:00"
}
```

#### Topic: `reservation.created`
**Publisher**: `order-service` (khi đặt bàn thành công)
```json
{
  "reservationId": 789,
  "customerId": 456,
  "customerName": "Nguyễn Văn A",
  "customerEmail": "customer@example.com",
  "phone": "0123456789",
  "branchId": 1,
  "reservedAt": "2024-01-20T18:00:00",
  "partySize": 4,
  "status": "PENDING"
}
```

---

### 2.2 Inventory Management Events

#### Topic: `inventory.low.stock`
**Publisher**: `catalog-service` (khi stock <= threshold)
```json
{
  "branchId": 1,
  "ingredientId": 10,
  "ingredientName": "Cà phê Arabica",
  "currentQuantity": 5.0,
  "threshold": 10.0,
  "unitCode": "KG",
  "detectedAt": "2024-01-15T09:00:00"
}
```

#### Topic: `inventory.out.of.stock`
**Publisher**: `catalog-service` (khi stock = 0)
```json
{
  "branchId": 1,
  "ingredientId": 10,
  "ingredientName": "Cà phê Arabica",
  "currentQuantity": 0.0,
  "threshold": 10.0,
  "unitCode": "KG",
  "detectedAt": "2024-01-15T09:00:00"
}
```

#### Topic: `inventory.stock.received`
**Publisher**: `catalog-service` (khi nhập kho mới)
```json
{
  "branchId": 1,
  "ingredientId": 10,
  "ingredientName": "Cà phê Arabica",
  "receivedQuantity": 50.0,
  "newTotalQuantity": 55.0,
  "unitCode": "KG",
  "receivedAt": "2024-01-15T14:00:00",
  "receivedBy": "Manager Name"
}
```

---

### 2.3 Business Operations Events

#### Topic: `revenue.report.generated`
**Publisher**: `analytics-service` hoặc `order-service` (báo cáo định kỳ)
```json
{
  "branchId": 1,
  "reportDate": "2024-01-15",
  "reportType": "DAILY",
  "totalRevenue": 5000000,
  "totalOrders": 50,
  "averageOrderValue": 100000,
  "generatedAt": "2024-01-16T00:00:00",
  "managerEmail": "manager@example.com"
}
```

#### Topic: `system.alert`
**Publisher**: Bất kỳ service nào (cảnh báo hệ thống)
```json
{
  "alertType": "ERROR|WARNING|INFO",
  "serviceName": "order-service",
  "message": "High error rate detected",
  "severity": "HIGH|MEDIUM|LOW",
  "targetEmails": ["admin@example.com", "manager@example.com"],
  "occurredAt": "2024-01-15T10:00:00"
}
```

---

## 🏗️ Phase 3: Code Structure

### 3.1 Package Structure
```
com.service.notification_service/
├── NotificationServiceApplication.java
├── config/
│   ├── KafkaConfig.java
│   ├── MailConfig.java
│   └── SecurityConfig.java
├── entity/
│   ├── Notification.java
│   ├── NotificationTemplate.java
│   └── NotificationPreference.java
├── repository/
│   ├── NotificationRepository.java
│   ├── NotificationTemplateRepository.java
│   └── NotificationPreferenceRepository.java
├── dto/
│   ├── request/
│   │   └── SendNotificationRequest.java
│   └── response/
│       └── NotificationResponse.java
├── events/
│   ├── OrderCreatedEvent.java
│   ├── OrderStatusChangedEvent.java
│   ├── OrderCancelledEvent.java
│   ├── ReservationCreatedEvent.java
│   ├── LowStockEvent.java
│   ├── OutOfStockEvent.java
│   ├── StockReceivedEvent.java
│   ├── RevenueReportEvent.java
│   └── SystemAlertEvent.java
├── listener/
│   ├── OrderEventListener.java
│   ├── InventoryEventListener.java
│   └── BusinessEventListener.java
├── service/
│   ├── NotificationService.java
│   ├── EmailNotificationService.java
│   ├── TemplateService.java
│   └── NotificationPreferenceService.java
├── template/
│   ├── OrderConfirmationTemplate.java
│   ├── OrderStatusUpdateTemplate.java
│   ├── OrderCancellationTemplate.java
│   ├── ReservationConfirmationTemplate.java
│   ├── LowStockTemplate.java
│   ├── OutOfStockTemplate.java
│   ├── StockReceivedTemplate.java
│   ├── RevenueReportTemplate.java
│   └── SystemAlertTemplate.java
└── controller/
    ├── NotificationController.java
    └── NotificationPreferenceController.java
```

---

## 📧 Phase 4: Email Templates

### 4.1 Order Templates

#### Order Confirmation Email
- **Template Name**: `ORDER_CONFIRMATION_EMAIL`
- **Variables**: `customerName`, `orderId`, `orderDate`, `totalAmount`, `orderItems`, `deliveryAddress`, `paymentMethod`, `trackingUrl`
- **Subject**: "Xác nhận đơn hàng #{{orderId}} - Coffee Shop"

#### Order Status Update Email
- **Template Name**: `ORDER_STATUS_UPDATE_EMAIL`
- **Variables**: `customerName`, `orderId`, `oldStatus`, `newStatus`, `statusDescription`, `estimatedDeliveryTime`
- **Subject**: "Cập nhật trạng thái đơn hàng #{{orderId}}"

#### Order Cancellation Email
- **Template Name**: `ORDER_CANCELLATION_EMAIL`
- **Variables**: `customerName`, `orderId`, `cancellationReason`, `refundInfo`
- **Subject**: "Hủy đơn hàng #{{orderId}}"

### 4.2 Reservation Templates

#### Reservation Confirmation Email
- **Template Name**: `RESERVATION_CONFIRMATION_EMAIL`
- **Variables**: `customerName`, `reservationId`, `branchName`, `reservedAt`, `partySize`, `branchAddress`, `branchPhone`
- **Subject**: "Xác nhận đặt bàn #{{reservationId}}"

### 4.3 Inventory Templates

#### Low Stock Alert Email
- **Template Name**: `LOW_STOCK_ALERT_EMAIL`
- **Recipients**: Manager của branch
- **Variables**: `branchName`, `ingredientName`, `currentQuantity`, `threshold`, `unitCode`, `urgent`
- **Subject**: "⚠️ Cảnh báo: Tồn kho thấp - {{ingredientName}}"

#### Out of Stock Alert Email
- **Template Name**: `OUT_OF_STOCK_ALERT_EMAIL`
- **Recipients**: Manager của branch
- **Variables**: `branchName`, `ingredientName`, `unitCode`, `lastStockDate`
- **Subject**: "🚨 Cảnh báo: Hết hàng - {{ingredientName}}"

#### Stock Received Email
- **Template Name**: `STOCK_RECEIVED_EMAIL`
- **Recipients**: Manager của branch
- **Variables**: `branchName`, `ingredientName`, `receivedQuantity`, `newTotalQuantity`, `unitCode`, `receivedBy`, `receivedAt`
- **Subject**: "✅ Nhập kho mới - {{ingredientName}}"

### 4.4 Business Operations Templates

#### Revenue Report Email
- **Template Name**: `REVENUE_REPORT_EMAIL`
- **Recipients**: Manager của branch
- **Variables**: `branchName`, `reportDate`, `reportType`, `totalRevenue`, `totalOrders`, `averageOrderValue`, `chartUrl`
- **Subject**: "📊 Báo cáo doanh thu {{reportDate}} - {{branchName}}"

#### System Alert Email
- **Template Name**: `SYSTEM_ALERT_EMAIL`
- **Recipients**: Admin, Manager
- **Variables**: `alertType`, `serviceName`, `message`, `severity`, `occurredAt`, `details`
- **Subject**: "{{severity}} Alert: {{serviceName}} - {{message}}"

---

## 🔄 Phase 5: Implementation Steps

### Step 1: Tạo Entities & Repositories ✅
- [x] Notification entity
- [x] NotificationTemplate entity
- [x] NotificationPreference entity
- [ ] Repositories

### Step 2: Tạo Event DTOs
- [ ] OrderCreatedEvent
- [ ] OrderStatusChangedEvent
- [ ] OrderCancelledEvent
- [ ] ReservationCreatedEvent
- [ ] LowStockEvent
- [ ] OutOfStockEvent
- [ ] StockReceivedEvent
- [ ] RevenueReportEvent
- [ ] SystemAlertEvent

### Step 3: Tạo Kafka Listeners
- [ ] OrderEventListener
  - [ ] handleOrderCreated()
  - [ ] handleOrderStatusChanged()
  - [ ] handleOrderCancelled()
  - [ ] handleReservationCreated()
- [ ] InventoryEventListener
  - [ ] handleLowStock()
  - [ ] handleOutOfStock()
  - [ ] handleStockReceived()
- [ ] BusinessEventListener
  - [ ] handleRevenueReport()
  - [ ] handleSystemAlert()

### Step 4: Tạo Services
- [ ] NotificationService (main service)
- [ ] EmailNotificationService
- [ ] TemplateService
- [ ] NotificationPreferenceService

### Step 5: Tạo Email Templates
- [ ] Order confirmation template
- [ ] Order status update template
- [ ] Order cancellation template
- [ ] Reservation confirmation template
- [ ] Low stock alert template
- [ ] Out of stock alert template
- [ ] Stock received template
- [ ] Revenue report template
- [ ] System alert template

### Step 6: Tạo Controllers
- [ ] NotificationController (GET notifications, mark as read)
- [ ] NotificationPreferenceController (manage preferences)

### Step 7: Cập nhật Other Services
- [ ] **order-service**: Publish events khi tạo/update/cancel order
- [ ] **order-service**: Publish event khi tạo reservation
- [ ] **catalog-service**: Publish events khi stock thay đổi
- [ ] **analytics-service** hoặc **order-service**: Publish revenue report events

---

## 🎯 Priority Implementation Order

### High Priority (Phase 1)
1. ✅ Database schema
2. ✅ Basic entities
3. Email service setup
4. Order confirmation notification
5. Order status change notification

### Medium Priority (Phase 2)
6. Reservation confirmation
7. Low stock alerts
8. Out of stock alerts

### Low Priority (Phase 3)
9. Stock received notifications
10. Revenue reports
11. System alerts

---

## 📝 Notes

### Email Provider
- **Development**: Gmail SMTP (đã cấu hình)
- **Production**: Brevo (recommended) - cần cấu hình thêm

### Notification Channels
- **Phase 1**: Email only
- **Phase 2**: Email + In-app notifications (database) + WebSocket (real-time)
- **Phase 3**: Email + In-app + WebSocket + Web Push (browser notifications)
- **Future**: SMS, Mobile Push (FCM/APNs)

### Error Handling
- Retry mechanism cho failed emails
- Dead letter queue cho Kafka events
- Logging và monitoring

### Testing
- Unit tests cho services
- Integration tests cho Kafka listeners
- Email template testing

---

## 🔗 Integration Points

### Feign Clients Needed
- `AuthServiceClient` - Lấy user info (email, name)
- `OrderServiceClient` - Lấy order details (nếu cần)
- `CatalogServiceClient` - Lấy product/ingredient info
- `ProfileServiceClient` - Lấy branch/manager info

---

## 📊 Metrics & Monitoring

### Key Metrics
- Total notifications sent
- Email delivery rate
- Failed notification rate
- Average processing time
- Kafka lag

### Alerts
- High failure rate (>5%)
- Kafka consumer lag
- Email service down

---

## 📱 Phase 6: Push Notifications Implementation

### 6.1 Push Notification Channels

#### A. WebSocket (Real-time In-App Notifications)
**Mục đích**: Hiển thị thông báo real-time trong ứng dụng web khi user đang online

**Technology Stack**:
- **Backend**: Spring WebSocket (STOMP protocol)
- **Frontend**: SockJS + STOMP.js hoặc native WebSocket API
- **Protocol**: STOMP over WebSocket

**Use Cases**:
- Order status updates (real-time)
- New order notifications (for staff/manager)
- Low stock alerts (for manager)
- System alerts

**Architecture**:
```
Notification Service
    ↓ (Kafka Event)
NotificationService
    ↓
WebSocketService
    ↓ (STOMP message)
Frontend (React)
    ↓
Display notification toast/badge
```

#### B. Web Push API (Browser Push Notifications)
**Mục đích**: Gửi thông báo ngay cả khi user không mở website

**Technology Stack**:
- **Backend**: Spring Boot + Web Push library
- **Frontend**: Service Worker + Push API
- **Push Service**: Browser's native push service (FCM for Chrome, Apple Push for Safari)

**Use Cases**:
- Order confirmation (khi user đã rời website)
- Order ready for pickup
- Reservation reminders
- Important alerts

**Architecture**:
```
Notification Service
    ↓ (Kafka Event)
NotificationService
    ↓
WebPushService
    ↓ (HTTP POST to browser push service)
Browser Push Service
    ↓
User's Device
    ↓
Browser Notification
```

#### C. Mobile Push (Future - Optional)
**Mục đích**: Push notifications cho mobile app (nếu có)

**Technology Stack**:
- **Android**: Firebase Cloud Messaging (FCM)
- **iOS**: Apple Push Notification Service (APNs)
- **Backend**: Spring Boot + FCM/APNs SDK

---

### 6.2 Implementation Plan for Push Notifications

#### Step 1: WebSocket Setup (Priority: High)

**Backend (Notification Service)**:
1. Add WebSocket dependencies:
   ```xml
   <dependency>
       <groupId>org.springframework.boot</groupId>
       <artifactId>spring-boot-starter-websocket</artifactId>
   </dependency>
   ```

2. Create WebSocket configuration:
   - `WebSocketConfig.java` - Enable STOMP messaging
   - `WebSocketController.java` - Handle connections
   - `NotificationWebSocketService.java` - Send messages

3. Create WebSocket message DTOs:
   - `NotificationMessage.java` - Message format
   - `NotificationType.java` - Enum for notification types

**Frontend (React)**:
1. Install dependencies:
   ```bash
   npm install sockjs-client @stomp/stompjs
   # or
   npm install socket.io-client
   ```

2. Create WebSocket hook:
   - `useWebSocket.ts` - Custom hook for WebSocket connection
   - `useNotifications.ts` - Hook for managing notifications

3. Create notification components:
   - `NotificationToast.tsx` - Toast notification component
   - `NotificationBadge.tsx` - Badge for unread count
   - `NotificationCenter.tsx` - Notification center/drawer

**Database Updates**:
- Add `is_read` field to `notifications` table
- Add `read_at` timestamp
- Add index for querying unread notifications

#### Step 2: Web Push API Setup (Priority: Medium)

**Backend**:
1. Add Web Push dependencies:
   ```xml
   <dependency>
       <groupId>nl.martijndwars</groupId>
       <artifactId>web-push</artifactId>
       <version>5.1.1</version>
   </dependency>
   ```

2. Create Web Push service:
   - `WebPushService.java` - Handle push subscriptions and sending
   - `PushSubscriptionRepository.java` - Store user subscriptions

3. Create REST endpoints:
   - `POST /api/notifications/push/subscribe` - Subscribe user
   - `POST /api/notifications/push/unsubscribe` - Unsubscribe user
   - `GET /api/notifications/push/public-key` - Get VAPID public key

**Database Updates**:
- Create `push_subscriptions` table:
  ```sql
  CREATE TABLE push_subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      endpoint VARCHAR(500) NOT NULL,
      p256dh_key VARCHAR(255) NOT NULL,
      auth_key VARCHAR(255) NOT NULL,
      user_agent VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_endpoint (user_id, endpoint)
  );
  ```

**Frontend**:
1. Create Service Worker:
   - `service-worker.js` - Handle push events
   - Register service worker in main app

2. Create push subscription hook:
   - `usePushSubscription.ts` - Request permission and subscribe
   - `usePushNotifications.ts` - Handle incoming push notifications

3. Update notification service:
   - Add push subscription on user login
   - Remove subscription on logout

---

### 6.3 Code Structure for Push Notifications

```
notification-service/
├── config/
│   └── WebSocketConfig.java
├── websocket/
│   ├── WebSocketController.java
│   ├── NotificationWebSocketService.java
│   └── dto/
│       ├── NotificationMessage.java
│       └── NotificationType.java
├── push/
│   ├── WebPushService.java
│   ├── PushSubscriptionRepository.java
│   └── entity/
│       └── PushSubscription.java
└── service/
    └── PushNotificationService.java (orchestrator)
```

**Frontend Structure**:
```
fe_coffee_manager/src/
├── hooks/
│   ├── useWebSocket.ts
│   ├── useNotifications.ts
│   └── usePushSubscription.ts
├── components/
│   ├── notifications/
│   │   ├── NotificationToast.tsx
│   │   ├── NotificationBadge.tsx
│   │   ├── NotificationCenter.tsx
│   │   └── NotificationItem.tsx
└── services/
    └── notificationService.ts
```

---

### 6.4 Notification Flow with Push

#### Flow 1: Real-time In-App Notification (WebSocket)
```
1. Order Service publishes event → Kafka topic: "order.status.changed"
2. Notification Service consumes event
3. NotificationService processes event
4. WebSocketService sends STOMP message to connected clients
5. Frontend receives message via WebSocket
6. Display toast notification + update badge count
7. Save notification to database (for history)
```

#### Flow 2: Browser Push Notification (Web Push)
```
1. Order Service publishes event → Kafka topic: "order.created"
2. Notification Service consumes event
3. NotificationService processes event
4. Check user's push subscription
5. WebPushService sends push notification via browser push service
6. User's browser receives push (even if tab is closed)
7. Display browser notification
8. Save notification to database
```

---

### 6.5 User Notification Preferences

**Database Schema** (update `user_notification_preferences`):
```sql
ALTER TABLE user_notification_preferences
ADD COLUMN websocket_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN push_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN push_sound_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN push_vibration_enabled BOOLEAN DEFAULT TRUE;
```

**Notification Rules**:
- Email: Always sent (for record keeping)
- WebSocket: Only if user is online and websocket_enabled = true
- Web Push: Only if user subscribed and push_enabled = true

---

### 6.6 Security Considerations

#### WebSocket Security:
- Authenticate connection using JWT token
- Validate user permissions before sending notifications
- Rate limiting to prevent abuse

#### Web Push Security:
- Use VAPID keys for authentication
- Validate subscription endpoints
- Encrypt payload data
- Rate limiting per user

---

### 6.7 Implementation Priority

**Phase 6.1: WebSocket (Week 1-2)**
- ✅ Setup WebSocket infrastructure
- ✅ Real-time order status updates
- ✅ In-app notification display
- ✅ Notification badge/count

**Phase 6.2: Web Push (Week 3-4)**
- ✅ Setup Web Push infrastructure
- ✅ Subscription management
- ✅ Browser push notifications
- ✅ User preferences

**Phase 6.3: Mobile Push (Future)**
- ⏳ FCM/APNs integration
- ⏳ Mobile app integration

---

### 6.8 Testing Strategy

**WebSocket Testing**:
- Unit tests for WebSocket service
- Integration tests with WebSocket client
- Load testing for concurrent connections

**Web Push Testing**:
- Test subscription flow
- Test notification delivery
- Test on different browsers (Chrome, Firefox, Safari)
- Test notification permissions

---

### 6.9 Monitoring & Metrics

**WebSocket Metrics**:
- Active connections count
- Messages sent per second
- Connection errors
- Average message delivery time

**Web Push Metrics**:
- Subscription count
- Push delivery rate
- Push open rate
- Failed push notifications

---

### 6.10 Dependencies to Add

**Backend (pom.xml)**:
```xml
<!-- WebSocket -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
</dependency>

<!-- Web Push -->
<dependency>
    <groupId>nl.martijndwars</groupId>
    <artifactId>web-push</artifactId>
    <version>5.1.1</version>
</dependency>
```

**Frontend (package.json)**:
```json
{
  "dependencies": {
    "sockjs-client": "^1.6.1",
    "@stomp/stompjs": "^7.0.0",
    "react-hot-toast": "^2.6.0" // Already installed
  }
}
```

