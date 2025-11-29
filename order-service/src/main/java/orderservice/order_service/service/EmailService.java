package orderservice.order_service.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Service
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.frontend.customer-url:http://localhost:3000}")
    private String customerFrontendUrl;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendOrderConfirmationEmail(String toEmail, String customerName, Integer orderId,
            List<OrderItemInfo> orderItems, BigDecimal totalAmount,
            String deliveryAddress, String paymentMethod, LocalDateTime orderDate) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Order Confirmation - Coffee Shop #" + orderId);

            String trackingUrl = customerFrontendUrl + "/track-order/" + orderId;
            String htmlContent = buildOrderConfirmationHtml(customerName, orderId, orderItems,
                    totalAmount, deliveryAddress, paymentMethod, orderDate, trackingUrl);
            helper.setText(htmlContent, true);

            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Failed to send email", e);
        }
    }

    public void sendReservationConfirmationEmail(String toEmail, String customerName,
            String branchName, LocalDateTime reservedAt, Integer partySize, String notes, Integer reservationId) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Reservation Confirmation - Coffee Shop");

            String formattedDate = reservedAt.format(DateTimeFormatter.ofPattern("MM/dd/yyyy HH:mm"));
            String trackingUrl = customerFrontendUrl + "/track-reservation/" + reservationId;
            String htmlContent = String.format(
                    """
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <meta charset=\"UTF-8\">
                                <style>
                                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                    .header { background-color: #8B4513; color: white; padding: 20px; text-align: center; }
                                    .content { padding: 20px; background-color: #f9f9f9; }
                                    .info { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
                                    .tracking-link { background-color: #8B4513 !important; color: #ffffff !important; padding: 12px 24px; text-decoration: none !important; border-radius: 5px; display: inline-block; margin: 10px 0; font-weight: bold !important; }
                                    .tracking-link:hover { background-color: #6B3410; }
                                    .footer { text-align: center; margin-top: 20px; color: #666; }
                                </style>
                            </head>
                            <body>
                                <div class=\"container\">
                                    <div class=\"header\">
                                        <h1>☕ Coffee Shop</h1>
                                        <h2>Reservation Confirmed</h2>
                                    </div>
                                    <div class=\"content\">
                                        <p>Hello <strong>%s</strong>,</p>
                                        <p>Your table reservation has been confirmed. We look forward to serving you!</p>
                                        <div class=\"info\">
                                            <p><strong>Reservation ID:</strong> #%d</p>
                                            <p><strong>Branch:</strong> %s</p>
                                            <p><strong>Date & Time:</strong> %s</p>
                                            <p><strong>Party Size:</strong> %d</p>
                                            %s
                                        </div>
                                        <div class=\"info\">
                                            <h3>📊 Track Your Reservation</h3>
                                            <p>Click the button below to track your reservation status:</p>
                                            <a href=\"%s\" class=\"tracking-link\" style=\"color: #ffffff !important; text-decoration: none !important;\">🔍 Track Reservation Status</a>
                                        </div>
                                        <div class=\"info\">
                                            <h3>📞 Customer Support</h3>
                                            <p>📧 Email: support@coffeeshop.com</p>
                                            <p>📞 Hotline: 1900-1234</p>
                                        </div>
                                    </div>
                                    <div class=\"footer\">
                                        <p>Thank you for choosing Coffee Shop!</p>
                                        <p>© 2025 Coffee Shop. All rights reserved.</p>
                                    </div>
                                </div>
                            </body>
                            </html>
                            """,
                    customerName,
                    reservationId,
                    branchName,
                    formattedDate,
                    partySize,
                    (notes != null && !notes.isBlank()) ? ("<p><strong>Notes:</strong> " + notes + "</p>") : "",
                    trackingUrl);

            helper.setText(htmlContent, true);

            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Failed to send reservation email", e);
        }
    }

    private String buildOrderConfirmationHtml(String customerName, Integer orderId,
            List<OrderItemInfo> orderItems, BigDecimal totalAmount,
            String deliveryAddress, String paymentMethod, LocalDateTime orderDate, String trackingUrl) {

        NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(Locale.US);
        String formattedTotal = currencyFormat.format(totalAmount.doubleValue());
        String formattedDate = orderDate.format(DateTimeFormatter.ofPattern("MM/dd/yyyy HH:mm"));

        StringBuilder itemsHtml = new StringBuilder();
        for (OrderItemInfo item : orderItems) {
            String itemTotal = currencyFormat.format(item.getTotalPrice().doubleValue());
            itemsHtml.append("<tr>")
                    .append("<td style='padding: 10px; border: 1px solid #ddd;'>").append(item.getProductName())
                    .append("</td>")
                    .append("<td style='padding: 10px; border: 1px solid #ddd; text-align: center;'>")
                    .append(item.getQuantity()).append("</td>")
                    .append("<td style='padding: 10px; border: 1px solid #ddd; text-align: right;'>").append(itemTotal)
                    .append("</td>")
                    .append("</tr>");
        }

        return String.format(
                """
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <style>
                                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                .header { background-color: #8B4513; color: white; padding: 20px; text-align: center; }
                                .content { padding: 20px; background-color: #f9f9f9; }
                                .order-info { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
                                table { width: 100%%; border-collapse: collapse; margin: 10px 0; }
                                th { background-color: #8B4513; color: white; padding: 10px; text-align: left; }
                                .total { font-size: 18px; font-weight: bold; color: #8B4513; }
                                .tracking-link { background-color: #8B4513 !important; color: #ffffff !important; padding: 12px 24px; text-decoration: none !important; border-radius: 5px; display: inline-block; margin: 10px 0; font-weight: bold !important; }
                                .tracking-link:hover { background-color: #6B3410; }
                                .footer { text-align: center; margin-top: 20px; color: #666; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h1>☕ Coffee Shop</h1>
                                    <h2>Order Confirmation Successful!</h2>
                                </div>

                                <div class="content">
                                    <p>Hello <strong>%s</strong>,</p>
                                    <p>Thank you for your order at Coffee Shop! Your order has been confirmed and is being processed.</p>

                                    <div class="order-info">
                                        <h3>📋 Order Information</h3>
                                        <p><strong>Order ID:</strong> #%d</p>
                                        <p><strong>Order Date:</strong> %s</p>
                                        <p><strong>Delivery Address:</strong> %s</p>
                                        <p><strong>Payment Method:</strong> %s</p>
                                    </div>

                                    <div class="order-info">
                                        <h3>🛒 Order Details</h3>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Product</th>
                                                    <th style="text-align: center;">Quantity</th>
                                                    <th style="text-align: right;">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                %s
                                            </tbody>
                                        </table>
                                        <div style="text-align: right; margin-top: 10px;">
                                            <span class="total">Total: %s</span>
                                        </div>
                                    </div>

                                    <div class="order-info">
                                        <h3>📊 Track Your Order</h3>
                                        <p>Click the button below to track your order status:</p>
                                        <a href="%s" class="tracking-link" style="color: #ffffff !important; text-decoration: none !important;">🔍 Track Order Status</a>
                                    </div>

                                    <div class="order-info">
                                        <h3>📞 Customer Support</h3>
                                        <p>If you have any questions about your order, please contact us:</p>
                                        <p>📧 Email: support@coffeeshop.com</p>
                                        <p>📞 Hotline: 1900-1234</p>
                                    </div>
                                </div>

                                <div class="footer">
                                    <p>Thank you for trusting Coffee Shop!</p>
                                    <p>© 2025 Coffee Shop. All rights reserved.</p>
                                </div>
                            </div>
                        </body>
                        </html>
                        """,
                customerName, orderId, formattedDate, deliveryAddress, paymentMethod,
                itemsHtml.toString(), formattedTotal, trackingUrl);
    }

    public static class OrderItemInfo {
        private String productName;
        private Integer quantity;
        private BigDecimal totalPrice;

        public OrderItemInfo(String productName, Integer quantity, BigDecimal totalPrice) {
            this.productName = productName;
            this.quantity = quantity;
            this.totalPrice = totalPrice;
        }

        // Getters and setters
        public String getProductName() {
            return productName;
        }

        public void setProductName(String productName) {
            this.productName = productName;
        }

        public Integer getQuantity() {
            return quantity;
        }

        public void setQuantity(Integer quantity) {
            this.quantity = quantity;
        }

        public BigDecimal getTotalPrice() {
            return totalPrice;
        }

        public void setTotalPrice(BigDecimal totalPrice) {
            this.totalPrice = totalPrice;
        }
    }
}
