package com.service.catalog.service;

import com.service.catalog.dto.EmailResult;
import com.service.catalog.entity.PurchaseOrder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.io.File;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final PDFService pdfService;

    public EmailResult sendPOToSupplier(PurchaseOrder po, String toEmail, String cc, String subject, String message) {
        try {
            // Generate PDF
            String pdfPath = pdfService.generatePOPDF(po);
            File pdfFile = new File(pdfPath);
            
            // Build email content
            String emailBody = buildEmailBody(po, message);
            
            // Create MIME message for attachment support
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true);
            
            helper.setTo("nguyenthanht632@gmail.com"); // For testing, send to your email
            if (cc != null && !cc.trim().isEmpty()) {
                helper.setCc(cc);
            }
            helper.setSubject(subject);
            helper.setText(emailBody, true); // HTML content
            helper.setFrom("nguyenthanht632@gmail.com");
            
            // Attach PDF
            helper.addAttachment("PO-" + po.getPoNumber() + ".pdf", pdfFile);
            
            // Send email
            mailSender.send(mimeMessage);
            
            // Keep PDF file in uploads directory for record keeping
            // Note: PDF files are kept in uploads/ directory for audit purposes
            
            String messageId = "MSG_" + System.currentTimeMillis();
            log.info("Email with PDF sent successfully to: {}, Message ID: {}", toEmail, messageId);
            
            return EmailResult.success(messageId);
        } catch (Exception e) {
            log.error("Failed to send email: {}", e.getMessage());
            return EmailResult.failure(e.getMessage());
        }
    }

    private String buildEmailBody(PurchaseOrder po, String customMessage) {
        StringBuilder body = new StringBuilder();
        body.append("<html><body>");
        body.append("<h2>Purchase Order</h2>");
        body.append("<p>Dear Supplier,</p>");
        body.append("<p>Please find attached our Purchase Order details:</p>");
        body.append("<table border='1' style='border-collapse: collapse; width: 100%;'>");
        body.append("<tr><td><strong>PO Number:</strong></td><td>").append(po.getPoNumber()).append("</td></tr>");
        body.append("<tr><td><strong>Supplier:</strong></td><td>").append(po.getSupplier().getName()).append("</td></tr>");
        body.append("<tr><td><strong>Total Amount:</strong></td><td>").append(formatCurrency(po.getTotalAmount())).append("</td></tr>");
        body.append("<tr><td><strong>Expected Delivery:</strong></td><td>").append(po.getExpectedDeliveryAt() != null ? 
            po.getExpectedDeliveryAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) : "TBD").append("</td></tr>");
        body.append("</table>");
        
        if (customMessage != null && !customMessage.trim().isEmpty()) {
            body.append("<p><strong>Additional Message:</strong></p>");
            body.append("<p>").append(customMessage).append("</p>");
        }
        
        // Add action buttons
        body.append("<div style='margin: 20px 0; text-align: center;'>");
        body.append("<h3>Please respond to this Purchase Order:</h3>");
        
        // Generate secure token for this PO
        String secureToken = generateSecureToken(po.getPoId(), po.getSupplier().getSupplierId());
        log.info("Secure token: {}", secureToken);
        
        // Confirm button
        body.append("<a href='http://localhost:5173/supplier/po/").append(po.getPoId()).append("/confirm?token=").append(secureToken).append("' ");
        body.append("style='display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; ");
        body.append("text-decoration: none; border-radius: 5px; margin: 10px; font-weight: bold;'>");
        body.append("✓ CONFIRM ORDER</a>");
        
        // Cancel button
        body.append("<a href='http://localhost:5173/supplier/po/").append(po.getPoId()).append("/cancel?token=").append(secureToken).append("' ");
        body.append("style='display: inline-block; background-color: #dc3545; color: white; padding: 12px 24px; ");
        body.append("text-decoration: none; border-radius: 5px; margin: 10px; font-weight: bold;'>");
        body.append("✗ CANCEL ORDER</a>");
        
        body.append("</div>");
        
        body.append("<p><strong>Note:</strong> Clicking 'CONFIRM' will take you to a form to provide delivery details. ");
        body.append("Clicking 'CANCEL' will immediately cancel this order.</p>");
        
        body.append("<p>Best regards,<br/>Procurement Team</p>");
        body.append("</body></html>");
        
        return body.toString();
    }
    
    private String formatCurrency(BigDecimal amount) {
        return String.format("%,.2f VND", amount);
    }
    
    private String generateSecureToken(Integer poId, Integer supplierId) {
        try {
            // Create a unique string combining PO ID, Supplier ID, and current timestamp
            String data = poId + ":" + supplierId + ":" + System.currentTimeMillis();
            
            // Create SHA-256 hash
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data.getBytes(StandardCharsets.UTF_8));
            
            // Encode to Base64 for URL safety
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception e) {
            log.error("Failed to generate secure token: {}", e.getMessage());
            // Fallback to simple hash
            return String.valueOf(Long.valueOf(poId + supplierId + System.currentTimeMillis()).hashCode());
        }
    }
}
