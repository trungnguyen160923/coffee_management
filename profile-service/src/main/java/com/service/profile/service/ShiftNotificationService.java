package com.service.profile.service;

import com.service.profile.entity.Shift;
import com.service.profile.entity.ShiftAssignment;
import com.service.profile.repository.http_client.NotificationClient;
import com.service.profile.repository.http_client.NotificationClient.SendShiftNotificationRequest;

import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ShiftNotificationService {

    private final NotificationClient notificationClient;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    public void notifyAssignmentCreated(ShiftAssignment assignment, Shift shift, Integer branchId) {
        try {
            Map<String, Object> metadata = buildMetadata(assignment, shift);
            String title = "Ca làm việc mới được tạo";
            String content = String.format("Bạn đã được phân công ca làm việc vào %s từ %s đến %s",
                    shift.getShiftDate().format(DATE_FORMATTER),
                    shift.getStartTime().format(TIME_FORMATTER),
                    shift.getEndTime().format(TIME_FORMATTER));

            SendShiftNotificationRequest request = new SendShiftNotificationRequest(
                    assignment.getStaffUserId(),
                    branchId,
                    "STAFF",
                    "SHIFT_ASSIGNMENT_CREATED",
                    title,
                    content,
                    metadata
            );

            notificationClient.sendShiftNotification(request);
            log.info("[ShiftNotificationService] ✅ Sent SHIFT_ASSIGNMENT_CREATED notification for assignmentId={}", 
                    assignment.getAssignmentId());
        } catch (Exception e) {
            log.error("[ShiftNotificationService] ❌ Failed to send SHIFT_ASSIGNMENT_CREATED notification", e);
        }
    }

    public void notifyAssignmentApproved(ShiftAssignment assignment, Shift shift, Integer branchId) {
        try {
            Map<String, Object> metadata = buildMetadata(assignment, shift);
            String title = "Ca làm việc đã được duyệt";
            String content = String.format("Ca làm việc của bạn vào %s đã được quản lý duyệt",
                    shift.getShiftDate().format(DATE_FORMATTER));

            SendShiftNotificationRequest request = new SendShiftNotificationRequest(
                    assignment.getStaffUserId(),
                    branchId,
                    "STAFF",
                    "SHIFT_ASSIGNMENT_APPROVED",
                    title,
                    content,
                    metadata
            );

            notificationClient.sendShiftNotification(request);
            log.info("[ShiftNotificationService] ✅ Sent SHIFT_ASSIGNMENT_APPROVED notification for assignmentId={}", 
                    assignment.getAssignmentId());
        } catch (Exception e) {
            log.error("[ShiftNotificationService] ❌ Failed to send SHIFT_ASSIGNMENT_APPROVED notification", e);
        }
    }

    public void notifyAssignmentRejected(ShiftAssignment assignment, Shift shift, Integer branchId) {
        try {
            Map<String, Object> metadata = buildMetadata(assignment, shift);
            String title = "Ca làm việc bị từ chối";
            String content = String.format("Ca làm việc của bạn vào %s đã bị quản lý từ chối",
                    shift.getShiftDate().format(DATE_FORMATTER));

            SendShiftNotificationRequest request = new SendShiftNotificationRequest(
                    assignment.getStaffUserId(),
                    branchId,
                    "STAFF",
                    "SHIFT_ASSIGNMENT_REJECTED",
                    title,
                    content,
                    metadata
            );

            notificationClient.sendShiftNotification(request);
            log.info("[ShiftNotificationService] ✅ Sent SHIFT_ASSIGNMENT_REJECTED notification for assignmentId={}", 
                    assignment.getAssignmentId());
        } catch (Exception e) {
            log.error("[ShiftNotificationService] ❌ Failed to send SHIFT_ASSIGNMENT_REJECTED notification", e);
        }
    }

    public void notifyAssignmentDeleted(ShiftAssignment assignment, Shift shift, Integer branchId) {
        try {
            Map<String, Object> metadata = buildMetadata(assignment, shift);
            String title = "Ca làm việc đã bị xóa";
            String content = String.format("Ca làm việc của bạn vào %s đã bị xóa",
                    shift.getShiftDate().format(DATE_FORMATTER));

            SendShiftNotificationRequest request = new SendShiftNotificationRequest(
                    assignment.getStaffUserId(),
                    branchId,
                    "STAFF",
                    "SHIFT_ASSIGNMENT_DELETED",
                    title,
                    content,
                    metadata
            );

            notificationClient.sendShiftNotification(request);
            log.info("[ShiftNotificationService] ✅ Sent SHIFT_ASSIGNMENT_DELETED notification for assignmentId={}", 
                    assignment.getAssignmentId());
        } catch (Exception e) {
            log.error("[ShiftNotificationService] ❌ Failed to send SHIFT_ASSIGNMENT_DELETED notification", e);
        }
    }

    public void notifyAssignmentCheckedIn(ShiftAssignment assignment, Shift shift, Integer branchId) {
        try {
            Map<String, Object> metadata = buildMetadata(assignment, shift);
            String title = "Đã check-in ca làm việc";
            String content = String.format("Bạn đã check-in ca làm việc vào %s",
                    shift.getShiftDate().format(DATE_FORMATTER));

            // Notify both staff and manager
            SendShiftNotificationRequest staffRequest = new SendShiftNotificationRequest(
                    assignment.getStaffUserId(),
                    branchId,
                    "STAFF",
                    "SHIFT_ASSIGNMENT_CHECKED_IN",
                    title,
                    content,
                    metadata
            );
            notificationClient.sendShiftNotification(staffRequest);

            // Also notify managers
            SendShiftNotificationRequest managerRequest = new SendShiftNotificationRequest(
                    null,
                    branchId,
                    "MANAGER",
                    "SHIFT_ASSIGNMENT_CHECKED_IN",
                    "Nhân viên đã check-in",
                    String.format("Nhân viên đã check-in ca làm việc vào %s",
                            shift.getShiftDate().format(DATE_FORMATTER)),
                    metadata
            );
            notificationClient.sendShiftNotification(managerRequest);

            log.info("[ShiftNotificationService] ✅ Sent SHIFT_ASSIGNMENT_CHECKED_IN notification for assignmentId={}", 
                    assignment.getAssignmentId());
        } catch (Exception e) {
            log.error("[ShiftNotificationService] ❌ Failed to send SHIFT_ASSIGNMENT_CHECKED_IN notification", e);
        }
    }

    public void notifyAssignmentCheckedOut(ShiftAssignment assignment, Shift shift, Integer branchId) {
        try {
            Map<String, Object> metadata = buildMetadata(assignment, shift);
            String title = "Đã check-out ca làm việc";
            String content = String.format("Bạn đã check-out ca làm việc vào %s",
                    shift.getShiftDate().format(DATE_FORMATTER));

            // Notify both staff and manager
            SendShiftNotificationRequest staffRequest = new SendShiftNotificationRequest(
                    assignment.getStaffUserId(),
                    branchId,
                    "STAFF",
                    "SHIFT_ASSIGNMENT_CHECKED_OUT",
                    title,
                    content,
                    metadata
            );
            notificationClient.sendShiftNotification(staffRequest);

            // Also notify managers
            SendShiftNotificationRequest managerRequest = new SendShiftNotificationRequest(
                    null,
                    branchId,
                    "MANAGER",
                    "SHIFT_ASSIGNMENT_CHECKED_OUT",
                    "Nhân viên đã check-out",
                    String.format("Nhân viên đã check-out ca làm việc vào %s",
                            shift.getShiftDate().format(DATE_FORMATTER)),
                    metadata
            );
            notificationClient.sendShiftNotification(managerRequest);

            log.info("[ShiftNotificationService] ✅ Sent SHIFT_ASSIGNMENT_CHECKED_OUT notification for assignmentId={}", 
                    assignment.getAssignmentId());
        } catch (Exception e) {
            log.error("[ShiftNotificationService] ❌ Failed to send SHIFT_ASSIGNMENT_CHECKED_OUT notification", e);
        }
    }

    public void notifyManagerNewRegistration(ShiftAssignment assignment, Shift shift, Integer branchId) {
        try {
            Map<String, Object> metadata = buildMetadata(assignment, shift);
            String title = "Đăng ký ca làm việc mới";
            String content = String.format("Có nhân viên đăng ký ca làm việc vào %s cần được duyệt",
                    shift.getShiftDate().format(DATE_FORMATTER));

            SendShiftNotificationRequest request = new SendShiftNotificationRequest(
                    null,
                    branchId,
                    "MANAGER",
                    "SHIFT_ASSIGNMENT_CREATED",
                    title,
                    content,
                    metadata
            );

            notificationClient.sendShiftNotification(request);
            log.info("[ShiftNotificationService] ✅ Sent manager notification for new registration assignmentId={}", 
                    assignment.getAssignmentId());
        } catch (Exception e) {
            log.error("[ShiftNotificationService] ❌ Failed to send manager notification for new registration", e);
        }
    }

    public void notifyShiftPublished(Shift shift, Integer branchId, List<Integer> staffUserIds) {
        try {
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("shiftId", shift.getShiftId());
            metadata.put("shiftDate", shift.getShiftDate().format(DATE_FORMATTER));
            metadata.put("startTime", shift.getStartTime().format(TIME_FORMATTER));
            metadata.put("endTime", shift.getEndTime().format(TIME_FORMATTER));
            metadata.put("branchId", branchId);

            String title = "Ca làm việc mới đã được công bố";
            String content = String.format("Ca làm việc vào %s từ %s đến %s đã sẵn sàng để đăng ký",
                    shift.getShiftDate().format(DATE_FORMATTER),
                    shift.getStartTime().format(TIME_FORMATTER),
                    shift.getEndTime().format(TIME_FORMATTER));

            // Notify all staff with matching role
            for (Integer staffUserId : staffUserIds) {
                SendShiftNotificationRequest request = new SendShiftNotificationRequest(
                        staffUserId,
                        branchId,
                        "STAFF",
                        "SHIFT_PUBLISHED",
                        title,
                        content,
                        metadata
                );
                notificationClient.sendShiftNotification(request);
            }

            log.info("[ShiftNotificationService] ✅ Sent SHIFT_PUBLISHED notification to {} staff", staffUserIds.size());
        } catch (Exception e) {
            log.error("[ShiftNotificationService] ❌ Failed to send SHIFT_PUBLISHED notification", e);
        }
    }

    public void notifyRequestCreated(com.service.profile.entity.ShiftRequest request, Shift shift, Integer branchId) {
        try {
            Map<String, Object> metadata = buildRequestMetadata(request, shift);
            String title;
            String content;

            switch (request.getRequestType()) {
                case "LEAVE":
                    title = "Yêu cầu nghỉ ca";
                    content = String.format("Nhân viên đã yêu cầu nghỉ ca vào %s",
                            shift.getShiftDate().format(DATE_FORMATTER));
                    // Notify manager
                    SendShiftNotificationRequest managerRequest = new SendShiftNotificationRequest(
                            null,
                            branchId,
                            "MANAGER",
                            "SHIFT_REQUEST_LEAVE_CREATED",
                            title,
                            content,
                            metadata
                    );
                    notificationClient.sendShiftNotification(managerRequest);
                    break;
                case "SWAP":
                case "PICK_UP":
                case "TWO_WAY_SWAP":
                    // Notify requesting staff (người tạo request)
                    SendShiftNotificationRequest requestingStaffRequest = new SendShiftNotificationRequest(
                            request.getStaffUserId(),
                            branchId,
                            "STAFF",
                            "SHIFT_REQUEST_SWAP_CREATED",
                            "Yêu cầu đổi ca/nhường ca đã được tạo",
                            String.format("Yêu cầu đổi ca/nhường ca của bạn vào %s đã được tạo",
                                    shift.getShiftDate().format(DATE_FORMATTER)),
                            metadata
                    );
                    notificationClient.sendShiftNotification(requestingStaffRequest);
                    
                    // Notify target staff if exists (người được yêu cầu)
                    if (request.getTargetStaffUserId() != null) {
                        SendShiftNotificationRequest targetRequest = new SendShiftNotificationRequest(
                                request.getTargetStaffUserId(),
                                branchId,
                                "STAFF",
                                "SHIFT_REQUEST_SWAP_CREATED",
                                "Yêu cầu đổi ca/nhường ca",
                                String.format("Bạn có yêu cầu đổi ca/nhường ca vào %s",
                                        shift.getShiftDate().format(DATE_FORMATTER)),
                                metadata
                        );
                        notificationClient.sendShiftNotification(targetRequest);
                    }
                    break;
                case "OVERTIME":
                    title = "Yêu cầu tăng ca";
                    content = String.format("Nhân viên đã yêu cầu tăng ca vào %s",
                            shift.getShiftDate().format(DATE_FORMATTER));
                    // Notify manager
                    SendShiftNotificationRequest overtimeManagerRequest = new SendShiftNotificationRequest(
                            null,
                            branchId,
                            "MANAGER",
                            "SHIFT_REQUEST_OVERTIME_CREATED",
                            title,
                            content,
                            metadata
                    );
                    notificationClient.sendShiftNotification(overtimeManagerRequest);
                    break;
            }

            log.info("[ShiftNotificationService] ✅ Sent request created notification for requestId={}", 
                    request.getRequestId());
        } catch (Exception e) {
            log.error("[ShiftNotificationService] ❌ Failed to send request created notification", e);
        }
    }

    public void notifyRequestApproved(com.service.profile.entity.ShiftRequest request, Shift shift, Integer branchId) {
        try {
            Map<String, Object> metadata = buildRequestMetadata(request, shift);
            String title = "Yêu cầu đã được duyệt";
            String content = String.format("Yêu cầu %s của bạn đã được quản lý duyệt",
                    getRequestTypeLabel(request.getRequestType()));

            SendShiftNotificationRequest staffRequest = new SendShiftNotificationRequest(
                    request.getStaffUserId(),
                    branchId,
                    "STAFF",
                    "SHIFT_REQUEST_APPROVED",
                    title,
                    content,
                    metadata
            );
            notificationClient.sendShiftNotification(staffRequest);

            // Also notify target staff for SWAP/PICK_UP/TWO_WAY_SWAP
            if (request.getTargetStaffUserId() != null && 
                List.of("SWAP", "PICK_UP", "TWO_WAY_SWAP").contains(request.getRequestType())) {
                SendShiftNotificationRequest targetRequest = new SendShiftNotificationRequest(
                        request.getTargetStaffUserId(),
                        branchId,
                        "STAFF",
                        "SHIFT_REQUEST_APPROVED",
                        "Yêu cầu đổi ca đã được duyệt",
                        String.format("Yêu cầu đổi ca liên quan đến bạn đã được duyệt"),
                        metadata
                );
                notificationClient.sendShiftNotification(targetRequest);
            }

            log.info("[ShiftNotificationService] ✅ Sent SHIFT_REQUEST_APPROVED notification for requestId={}", 
                    request.getRequestId());
        } catch (Exception e) {
            log.error("[ShiftNotificationService] ❌ Failed to send SHIFT_REQUEST_APPROVED notification", e);
        }
    }

    public void notifyRequestRejected(com.service.profile.entity.ShiftRequest request, Shift shift, Integer branchId) {
        try {
            Map<String, Object> metadata = buildRequestMetadata(request, shift);
            String title = "Yêu cầu bị từ chối";
            String content = String.format("Yêu cầu %s của bạn đã bị từ chối",
                    getRequestTypeLabel(request.getRequestType()));

            // Notify requesting staff
            SendShiftNotificationRequest staffRequest = new SendShiftNotificationRequest(
                    request.getStaffUserId(),
                    branchId,
                    "STAFF",
                    "SHIFT_REQUEST_REJECTED",
                    title,
                    content,
                    metadata
            );
            notificationClient.sendShiftNotification(staffRequest);

            // Also notify target staff for SWAP/PICK_UP/TWO_WAY_SWAP (nếu có)
            if (request.getTargetStaffUserId() != null && 
                List.of("SWAP", "PICK_UP", "TWO_WAY_SWAP").contains(request.getRequestType())) {
                SendShiftNotificationRequest targetRequest = new SendShiftNotificationRequest(
                        request.getTargetStaffUserId(),
                        branchId,
                        "STAFF",
                        "SHIFT_REQUEST_REJECTED",
                        "Yêu cầu đổi ca đã bị từ chối",
                        String.format("Yêu cầu đổi ca liên quan đến bạn đã bị từ chối"),
                        metadata
                );
                notificationClient.sendShiftNotification(targetRequest);
            }

            log.info("[ShiftNotificationService] ✅ Sent SHIFT_REQUEST_REJECTED notification for requestId={}", 
                    request.getRequestId());
        } catch (Exception e) {
            log.error("[ShiftNotificationService] ❌ Failed to send SHIFT_REQUEST_REJECTED notification", e);
        }
    }

    public void notifyRequestCancelled(com.service.profile.entity.ShiftRequest request, Shift shift, Integer branchId) {
        try {
            Map<String, Object> metadata = buildRequestMetadata(request, shift);

            // Notify manager if it was a pending request
            if (List.of("PENDING", "PENDING_MANAGER_APPROVAL").contains(request.getStatus())) {
                SendShiftNotificationRequest managerRequest = new SendShiftNotificationRequest(
                        null,
                        branchId,
                        "MANAGER",
                        "SHIFT_REQUEST_CANCELLED",
                        "Yêu cầu đã bị hủy",
                        String.format("Nhân viên đã hủy yêu cầu %s",
                                getRequestTypeLabel(request.getRequestType())),
                        metadata
                );
                notificationClient.sendShiftNotification(managerRequest);
            }

            // Notify target staff if exists
            if (request.getTargetStaffUserId() != null) {
                SendShiftNotificationRequest targetRequest = new SendShiftNotificationRequest(
                        request.getTargetStaffUserId(),
                        branchId,
                        "STAFF",
                        "SHIFT_REQUEST_CANCELLED",
                        "Yêu cầu đổi ca đã bị hủy",
                        String.format("Yêu cầu đổi ca liên quan đến bạn đã bị hủy"),
                        metadata
                );
                notificationClient.sendShiftNotification(targetRequest);
            }

            log.info("[ShiftNotificationService] ✅ Sent SHIFT_REQUEST_CANCELLED notification for requestId={}", 
                    request.getRequestId());
        } catch (Exception e) {
            log.error("[ShiftNotificationService] ❌ Failed to send SHIFT_REQUEST_CANCELLED notification", e);
        }
    }

    public void notifyTargetResponded(com.service.profile.entity.ShiftRequest request, Shift shift, Integer branchId, boolean accepted) {
        try {
            Map<String, Object> metadata = buildRequestMetadata(request, shift);
            String title = accepted ? "Yêu cầu đổi ca đã được đồng ý" : "Yêu cầu đổi ca bị từ chối";
            String content = accepted 
                    ? String.format("Nhân viên đã đồng ý yêu cầu đổi ca của bạn")
                    : String.format("Nhân viên đã từ chối yêu cầu đổi ca của bạn");

            // Notify requesting staff
            SendShiftNotificationRequest staffRequest = new SendShiftNotificationRequest(
                    request.getStaffUserId(),
                    branchId,
                    "STAFF",
                    "SHIFT_REQUEST_TARGET_RESPONDED",
                    title,
                    content,
                    metadata
            );
            notificationClient.sendShiftNotification(staffRequest);

            // If accepted, also notify manager
            if (accepted) {
                SendShiftNotificationRequest managerRequest = new SendShiftNotificationRequest(
                        null,
                        branchId,
                        "MANAGER",
                        "SHIFT_REQUEST_TARGET_RESPONDED",
                        "Yêu cầu đổi ca đã được đồng ý",
                        String.format("Yêu cầu đổi ca đã được nhân viên đồng ý, cần quản lý duyệt"),
                        metadata
                );
                notificationClient.sendShiftNotification(managerRequest);
            }

            log.info("[ShiftNotificationService] ✅ Sent target responded notification for requestId={}", 
                    request.getRequestId());
        } catch (Exception e) {
            log.error("[ShiftNotificationService] ❌ Failed to send target responded notification", e);
        }
    }

    public void notifyAssignmentUnregistered(ShiftAssignment assignment, Shift shift, Integer branchId) {
        try {
            Map<String, Object> metadata = buildMetadata(assignment, shift);
            // Only send real-time update, no notification toast needed
            SendShiftNotificationRequest request = new SendShiftNotificationRequest(
                    null,
                    branchId,
                    "MANAGER",
                    "SHIFT_ASSIGNMENT_DELETED", // Reuse existing type for real-time update
                    "",
                    "",
                    metadata
            );
            notificationClient.sendShiftNotification(request);
            log.info("[ShiftNotificationService] ✅ Sent assignment unregistered update for assignmentId={}", 
                    assignment.getAssignmentId());
        } catch (Exception e) {
            log.error("[ShiftNotificationService] ❌ Failed to send assignment unregistered update", e);
        }
    }

    private Map<String, Object> buildRequestMetadata(com.service.profile.entity.ShiftRequest request, Shift shift) {
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("requestId", request.getRequestId());
        metadata.put("assignmentId", request.getAssignment().getAssignmentId());
        metadata.put("shiftId", shift.getShiftId());
        metadata.put("staffUserId", request.getStaffUserId());
        metadata.put("requestType", request.getRequestType());
        metadata.put("status", request.getStatus());
        metadata.put("shiftDate", shift.getShiftDate().format(DATE_FORMATTER));
        metadata.put("startTime", shift.getStartTime().format(TIME_FORMATTER));
        metadata.put("endTime", shift.getEndTime().format(TIME_FORMATTER));
        if (request.getTargetStaffUserId() != null) {
            metadata.put("targetStaffUserId", request.getTargetStaffUserId());
        }
        if (shift.getBranchId() != null) {
            metadata.put("branchId", shift.getBranchId());
        }
        return metadata;
    }

    private String getRequestTypeLabel(String requestType) {
        switch (requestType) {
            case "LEAVE": return "nghỉ ca";
            case "SWAP": return "đổi ca";
            case "PICK_UP": return "nhường ca";
            case "TWO_WAY_SWAP": return "đổi ca hai chiều";
            case "OVERTIME": return "tăng ca";
            default: return requestType;
        }
    }

    /**
     * Notify about draft shift changes (create, update, delete)
     * Simplified approach: notify manager and relevant staff based on employment_type
     */
    public void notifyDraftShiftCreated(Shift shift, Integer branchId) {
        try {
            Map<String, Object> metadata = buildShiftMetadata(shift);
            String title = "Ca làm việc mới được tạo (Draft)";
            String content = String.format("Ca làm việc vào %s từ %s đến %s đã được tạo",
                    shift.getShiftDate().format(DATE_FORMATTER),
                    shift.getStartTime().format(TIME_FORMATTER),
                    shift.getEndTime().format(TIME_FORMATTER));

            // Notify manager
            SendShiftNotificationRequest managerRequest = new SendShiftNotificationRequest(
                    null,
                    branchId,
                    "MANAGER",
                    "SHIFT_DRAFT_CREATED",
                    title,
                    content,
                    metadata
            );
            notificationClient.sendShiftNotification(managerRequest);

            // Notify staff based on employment_type (if shift has specific employment_type)
            String shiftEmploymentType = shift.getEmploymentType();
            if (shiftEmploymentType != null && !"ANY".equals(shiftEmploymentType)) {
                // Will be handled by WebSocket broadcast to branch topic
                // Staff will receive if they match employment_type
                SendShiftNotificationRequest staffRequest = new SendShiftNotificationRequest(
                        null,
                        branchId,
                        "STAFF",
                        "SHIFT_DRAFT_CREATED",
                        "Ca làm việc mới sắp được công bố",
                        String.format("Có ca làm việc mới phù hợp với bạn (%s) vào %s",
                                shiftEmploymentType,
                                shift.getShiftDate().format(DATE_FORMATTER)),
                        metadata
                );
                notificationClient.sendShiftNotification(staffRequest);
            } else {
                // If employment_type is ANY or null, notify all staff
                SendShiftNotificationRequest staffRequest = new SendShiftNotificationRequest(
                        null,
                        branchId,
                        "STAFF",
                        "SHIFT_DRAFT_CREATED",
                        "Ca làm việc mới sắp được công bố",
                        String.format("Có ca làm việc mới vào %s",
                                shift.getShiftDate().format(DATE_FORMATTER)),
                        metadata
                );
                notificationClient.sendShiftNotification(staffRequest);
            }

            log.info("[ShiftNotificationService] ✅ Sent SHIFT_DRAFT_CREATED notification for shiftId={}", 
                    shift.getShiftId());
        } catch (Exception e) {
            log.error("[ShiftNotificationService] ❌ Failed to send SHIFT_DRAFT_CREATED notification", e);
        }
    }

    public void notifyDraftShiftUpdated(Shift shift, Integer branchId) {
        try {
            Map<String, Object> metadata = buildShiftMetadata(shift);
            String title = "Ca làm việc đã được cập nhật (Draft)";
            String content = String.format("Ca làm việc vào %s đã được cập nhật",
                    shift.getShiftDate().format(DATE_FORMATTER));

            // Only notify manager (draft changes are internal, staff don't need to know until published)
            SendShiftNotificationRequest managerRequest = new SendShiftNotificationRequest(
                    null,
                    branchId,
                    "MANAGER",
                    "SHIFT_DRAFT_UPDATED",
                    title,
                    content,
                    metadata
            );
            notificationClient.sendShiftNotification(managerRequest);

            log.info("[ShiftNotificationService] ✅ Sent SHIFT_DRAFT_UPDATED notification for shiftId={}", 
                    shift.getShiftId());
        } catch (Exception e) {
            log.error("[ShiftNotificationService] ❌ Failed to send SHIFT_DRAFT_UPDATED notification", e);
        }
    }

    public void notifyDraftShiftDeleted(Shift shift, Integer branchId) {
        try {
            Map<String, Object> metadata = buildShiftMetadata(shift);
            String title = "Ca làm việc đã bị xóa (Draft)";
            String content = String.format("Ca làm việc vào %s đã bị xóa",
                    shift.getShiftDate().format(DATE_FORMATTER));

            // Only notify manager (draft deletion is internal, staff don't need to know)
            SendShiftNotificationRequest managerRequest = new SendShiftNotificationRequest(
                    null,
                    branchId,
                    "MANAGER",
                    "SHIFT_DRAFT_DELETED",
                    title,
                    content,
                    metadata
            );
            notificationClient.sendShiftNotification(managerRequest);

            log.info("[ShiftNotificationService] ✅ Sent SHIFT_DRAFT_DELETED notification for shiftId={}", 
                    shift.getShiftId());
        } catch (Exception e) {
            log.error("[ShiftNotificationService] ❌ Failed to send SHIFT_DRAFT_DELETED notification", e);
        }
    }

    private Map<String, Object> buildShiftMetadata(Shift shift) {
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("shiftId", shift.getShiftId());
        metadata.put("shiftDate", shift.getShiftDate().format(DATE_FORMATTER));
        metadata.put("startTime", shift.getStartTime().format(TIME_FORMATTER));
        metadata.put("endTime", shift.getEndTime().format(TIME_FORMATTER));
        metadata.put("status", shift.getStatus());
        metadata.put("employmentType", shift.getEmploymentType());
        if (shift.getBranchId() != null) {
            metadata.put("branchId", shift.getBranchId());
        }
        if (shift.getMaxStaffAllowed() != null) {
            metadata.put("maxStaffAllowed", shift.getMaxStaffAllowed());
        }
        return metadata;
    }

    private Map<String, Object> buildMetadata(ShiftAssignment assignment, Shift shift) {
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("assignmentId", assignment.getAssignmentId());
        metadata.put("shiftId", shift.getShiftId());
        metadata.put("staffUserId", assignment.getStaffUserId());
        metadata.put("shiftDate", shift.getShiftDate().format(DATE_FORMATTER));
        metadata.put("startTime", shift.getStartTime().format(TIME_FORMATTER));
        metadata.put("endTime", shift.getEndTime().format(TIME_FORMATTER));
        metadata.put("status", assignment.getStatus());
        metadata.put("assignmentType", assignment.getAssignmentType());
        if (shift.getBranchId() != null) {
            metadata.put("branchId", shift.getBranchId());
        }
        return metadata;
    }
}

