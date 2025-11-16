"""
Email service for sending AI reports to managers
"""
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Service to send emails"""
    
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_from = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
        self.use_tls = settings.SMTP_USE_TLS
    
    async def send_report_email(
        self,
        to_emails: List[str],
        branch_id: int,
        report_date: str,
        analysis: str,
        summary: Optional[dict] = None,
        recommendations: Optional[List[str]] = None,
        report_id: Optional[int] = None
    ) -> bool:
        """
        Send AI report via email to managers
        
        Args:
            to_emails: List of recipient email addresses
            branch_id: Branch ID
            report_date: Report date (string)
            analysis: Full AI analysis text
            summary: Summary metrics (optional)
            recommendations: List of recommendations (optional)
            report_id: Report ID in database (optional)
        
        Returns:
            True if sent successfully, False otherwise
        """
        if not settings.ENABLE_EMAIL_DISTRIBUTION:
            logger.info("Email distribution is disabled. Skipping email send.")
            return False
        
        if not self.smtp_user or not self.smtp_password:
            logger.warning("SMTP credentials not configured. Cannot send email.")
            return False
        
        try:
            # Create email message
            message = MIMEMultipart("alternative")
            message["From"] = self.smtp_from
            message["To"] = ", ".join(to_emails)
            message["Subject"] = f"📊 Báo Cáo Phân Tích AI - Chi Nhánh {branch_id} - {report_date}"
            
            # Build HTML email body
            html_body = self._build_report_email_html(
                branch_id=branch_id,
                report_date=report_date,
                analysis=analysis,
                summary=summary,
                recommendations=recommendations,
                report_id=report_id
            )
            
            # Build plain text version
            text_body = self._build_report_email_text(
                branch_id=branch_id,
                report_date=report_date,
                analysis=analysis,
                summary=summary,
                recommendations=recommendations
            )
            
            # Add both versions
            message.attach(MIMEText(text_body, "plain", "utf-8"))
            message.attach(MIMEText(html_body, "html", "utf-8"))
            
            # Send email using SMTPAsync client for better control
            # For Gmail port 587: use STARTTLS (not SSL from start)
            # For port 465: use SSL from the start
            if self.smtp_port == 465:
                # Port 465: SSL from the start
                smtp = aiosmtplib.SMTP(
                    hostname=self.smtp_host,
                    port=self.smtp_port,
                    use_tls=True,  # SSL from start
                )
            else:
                # Port 587: STARTTLS (upgrade after connection)
                smtp = aiosmtplib.SMTP(
                    hostname=self.smtp_host,
                    port=self.smtp_port,
                    use_tls=False,  # No SSL from start
                )
            
            # Connect to server
            await smtp.connect()
            
            # For port 587, start TLS after connection
            # Note: connect() might already handle TLS, so we catch the "already using TLS" error
            if self.smtp_port == 587:
                try:
                    await smtp.starttls()
                except Exception as tls_error:
                    # If already using TLS, that's fine - continue without error
                    error_msg = str(tls_error).lower()
                    if "already using tls" not in error_msg and "connection already" not in error_msg:
                        # Re-raise if it's a different error
                        raise
            
            await smtp.login(self.smtp_user, self.smtp_password)
            await smtp.send_message(message)
            await smtp.quit()
            
            logger.info(f"Report email sent successfully to {to_emails} for branch {branch_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending report email: {e}", exc_info=True)
            return False
    
    def _build_report_email_html(
        self,
        branch_id: int,
        report_date: str,
        analysis: str,
        summary: Optional[dict] = None,
        recommendations: Optional[List[str]] = None,
        report_id: Optional[int] = None
    ) -> str:
        """Build HTML email body"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 800px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #4CAF50; color: white; padding: 20px; border-radius: 5px 5px 0 0; }}
                .content {{ background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }}
                .summary-box {{ background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4CAF50; }}
                .recommendations {{ background-color: #fff3cd; padding: 15px; margin: 15px 0; border-left: 4px solid #ffc107; }}
                .footer {{ margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }}
                h2 {{ color: #4CAF50; }}
                ul {{ padding-left: 20px; }}
                li {{ margin: 5px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 Báo Cáo Phân Tích AI</h1>
                    <p>Chi Nhánh: {branch_id} | Ngày: {report_date}</p>
                </div>
                <div class="content">
        """
        
        if summary:
            html += """
                    <div class="summary-box">
                        <h2>📈 Tóm Tắt Metrics</h2>
                        <ul>
            """
            for key, value in summary.items():
                if value is not None:
                    html += f"<li><strong>{key.replace('_', ' ').title()}:</strong> {value}</li>"
            html += """
                        </ul>
                    </div>
            """
        
        html += f"""
                    <h2>📝 Phân Tích Chi Tiết</h2>
                    <div style="white-space: pre-wrap;">{analysis}</div>
        """
        
        if recommendations:
            html += """
                    <div class="recommendations">
                        <h2>💡 Khuyến Nghị</h2>
                        <ul>
            """
            for rec in recommendations:
                html += f"<li>{rec}</li>"
            html += """
                        </ul>
                    </div>
            """
        
        if report_id:
            html += f"""
                    <div class="footer">
                        <p>Report ID: {report_id}</p>
                        <p>Báo cáo này được tạo tự động bởi AI Analytics Service</p>
                    </div>
            """
        
        html += """
                </div>
            </div>
        </body>
        </html>
        """
        return html
    
    def _build_report_email_text(
        self,
        branch_id: int,
        report_date: str,
        analysis: str,
        summary: Optional[dict] = None,
        recommendations: Optional[List[str]] = None
    ) -> str:
        """Build plain text email body"""
        text = f"""
BÁO CÁO PHÂN TÍCH AI
Chi Nhánh: {branch_id}
Ngày: {report_date}

"""
        if summary:
            text += "TÓM TẮT METRICS:\n"
            for key, value in summary.items():
                if value is not None:
                    text += f"- {key.replace('_', ' ').title()}: {value}\n"
            text += "\n"
        
        text += f"PHÂN TÍCH CHI TIẾT:\n{analysis}\n\n"
        
        if recommendations:
            text += "KHUYẾN NGHỊ:\n"
            for i, rec in enumerate(recommendations, 1):
                text += f"{i}. {rec}\n"
        
        return text

