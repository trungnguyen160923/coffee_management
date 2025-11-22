"""
Email service for sending AI reports to managers
"""
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional, Dict, Any
from app.config import settings
import logging
import tempfile
import os
import re
from datetime import datetime
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

logger = logging.getLogger(__name__)


class EmailService:
    """Service to send emails"""
    
    # Vietnamese font paths (Windows)
    _vietnamese_font_registered = False
    _vietnamese_font_name = 'Helvetica'  # Default fallback
    
    @classmethod
    def _register_vietnamese_font(cls):
        """Register Vietnamese font if available"""
        if cls._vietnamese_font_registered:
            return cls._vietnamese_font_name
        
        # Try common Windows fonts that support Vietnamese
        font_paths = [
            ('C:/Windows/Fonts/arial.ttf', 'Arial'),
            ('C:/Windows/Fonts/times.ttf', 'Times-Roman'),
            ('C:/Windows/Fonts/tahoma.ttf', 'Tahoma'),
            ('C:/Windows/Fonts/verdana.ttf', 'Verdana'),
            ('C:/Windows/Fonts/calibri.ttf', 'Calibri'),
        ]
        
        for font_path, font_name in font_paths:
            try:
                if os.path.exists(font_path):
                    pdfmetrics.registerFont(TTFont(font_name, font_path))
                    cls._vietnamese_font_name = font_name
                    cls._vietnamese_font_registered = True
                    logger.info(f"Registered Vietnamese font: {font_name}")
                    return font_name
            except Exception as e:
                logger.warning(f"Failed to register font {font_path}: {e}")
                continue
        
        # Fallback: try to use built-in fonts (may not support all Vietnamese chars)
        cls._vietnamese_font_registered = True
        logger.warning("Using default font (may not support all Vietnamese characters)")
        return cls._vietnamese_font_name
    
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
        raw_data: Optional[Dict[str, Any]] = None,
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
            raw_data: Raw data dictionary with all metrics (optional)
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
                raw_data=raw_data,
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
            
            # Generate and attach PDF report file with charts
            try:
                pdf_path = self._generate_report_pdf_file(
                    branch_id=branch_id,
                    report_date=report_date,
                    analysis=analysis,
                    summary=summary,
                    recommendations=recommendations,
                    raw_data=raw_data,
                    report_id=report_id
                )
                
                # Attach PDF file
                with open(pdf_path, 'rb') as f:
                    attachment = MIMEBase('application', 'pdf')
                    attachment.set_payload(f.read())
                    encoders.encode_base64(attachment)
                    attachment.add_header(
                        'Content-Disposition',
                        f'attachment; filename= "Bao_Cao_AI_Chi_Nhanh_{branch_id}_{report_date.replace("-", "_")}.pdf"'
                    )
                    message.attach(attachment)
                
                # Clean up temporary file
                os.unlink(pdf_path)
                logger.info(f"Report PDF file with charts attached successfully")
            except Exception as e:
                logger.warning(f"Failed to attach PDF report file: {e}. Continuing without attachment.", exc_info=True)
            
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
        raw_data: Optional[Dict[str, Any]] = None,
        report_id: Optional[int] = None
    ) -> str:
        """Build HTML email body with improved design"""
        # Format summary metrics nicely
        summary_html = ""
        if summary:
            summary_html = """
                    <div class="summary-box">
                        <h2>📈 Tóm Tắt Metrics Chính</h2>
                        <div class="metrics-grid">
            """
            # Key metrics to highlight (comprehensive list)
            key_metrics = {
                # Revenue metrics
                'total_revenue': ('💰 Doanh Thu', 'VNĐ'),
                'order_count': ('🛒 Số Đơn Hàng', 'đơn'),
                'avg_order_value': ('📊 Giá Trị TB/Đơn', 'VNĐ'),
                # Customer metrics
                'customer_count': ('👥 Tổng Khách Hàng', 'người'),
                'new_customers': ('🆕 Khách Hàng Mới', 'người'),
                'repeat_customers': ('🔄 Khách Hàng Quay Lại', 'người'),
                # Product metrics
                'unique_products_sold': ('📦 Sản Phẩm Đã Bán', 'sản phẩm'),
                # Review metrics
                'avg_review_score': ('⭐ Đánh Giá TB', '/5'),
                'total_reviews': ('💬 Tổng Đánh Giá', 'đánh giá'),
                # Inventory metrics
                'low_stock_products': ('⚠️ Sản Phẩm Sắp Hết', 'sản phẩm'),
                'out_of_stock_products': ('🔴 Sản Phẩm Hết Hàng', 'sản phẩm'),
                'total_inventory_value': ('📊 Giá Trị Tồn Kho', 'VNĐ'),
                'material_cost': ('💵 Chi Phí Nguyên Liệu', 'VNĐ'),
            }
            
            for key, (label, unit) in key_metrics.items():
                if key in summary and summary[key] is not None:
                    value = summary[key]
                    if isinstance(value, (int, float)):
                        if key in ['total_revenue', 'avg_order_value', 'total_inventory_value', 'material_cost']:
                            value = f"{value:,.0f}".replace(',', '.')
                        elif key == 'avg_review_score':
                            value = f"{value:.2f}"
                        elif isinstance(value, float):
                            value = f"{value:.2f}"
                    summary_html += f"""
                            <div class="metric-item">
                                <div class="metric-label">{label}</div>
                                <div class="metric-value">{value} {unit}</div>
                            </div>
                    """
            
            summary_html += """
                        </div>
                    </div>
            """
        
        # Format recommendations
        recommendations_html = ""
        if recommendations:
            recommendations_html = """
                    <div class="recommendations">
                        <h2>💡 Khuyến Nghị Hành Động</h2>
                        <ol class="recommendations-list">
            """
            for i, rec in enumerate(recommendations, 1):
                # Determine priority
                priority_class = "normal"
                if any(word in rec.lower() for word in ['khẩn cấp', 'khẩn', 'ngay lập tức']):
                    priority_class = "urgent"
                elif any(word in rec.lower() for word in ['quan trọng', 'nên', 'cần']):
                    priority_class = "important"
                
                recommendations_html += f"""
                            <li class="recommendation-item {priority_class}">
                                <span class="rec-number">{i}</span>
                                <span class="rec-text">{rec}</span>
                            </li>
                """
            recommendations_html += """
                        </ol>
                    </div>
            """
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * {{ margin: 0; padding: 0; box-sizing: border-box; }}
                body {{ 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    line-height: 1.6; 
                    color: #333; 
                    background-color: #f5f5f5;
                    padding: 20px;
                }}
                .email-container {{ 
                    max-width: 700px; 
                    margin: 0 auto; 
                    background-color: #ffffff;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }}
                .header {{ 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white; 
                    padding: 30px 20px; 
                    text-align: center;
                }}
                .header h1 {{ 
                    font-size: 28px; 
                    margin-bottom: 10px;
                    font-weight: 600;
                }}
                .header p {{ 
                    font-size: 16px; 
                    opacity: 0.95;
                }}
                .content {{ 
                    padding: 30px 20px; 
                }}
                .summary-box {{ 
                    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                    padding: 20px; 
                    margin: 20px 0; 
                    border-radius: 8px;
                    border-left: 5px solid #667eea;
                }}
                .summary-box h2 {{
                    color: #667eea;
                    margin-bottom: 15px;
                    font-size: 20px;
                }}
                .metrics-grid {{
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin-top: 15px;
                }}
                .metric-item {{
                    background: white;
                    padding: 15px;
                    border-radius: 6px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                }}
                .metric-label {{
                    font-size: 13px;
                    color: #666;
                    margin-bottom: 5px;
                }}
                .metric-value {{
                    font-size: 18px;
                    font-weight: bold;
                    color: #333;
                }}
                .analysis-section {{
                    background-color: #f9f9f9;
                    padding: 20px;
                    margin: 20px 0;
                    border-radius: 8px;
                    border-left: 5px solid #4CAF50;
                }}
                .analysis-section h2 {{
                    color: #4CAF50;
                    margin-bottom: 15px;
                    font-size: 20px;
                }}
                .analysis-preview {{
                    white-space: pre-wrap;
                    color: #555;
                    line-height: 1.8;
                    max-height: 300px;
                    overflow: hidden;
                }}
                .recommendations {{
                    background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
                    padding: 20px; 
                    margin: 20px 0; 
                    border-radius: 8px;
                    border-left: 5px solid #f39c12;
                }}
                .recommendations h2 {{
                    color: #d35400;
                    margin-bottom: 15px;
                    font-size: 20px;
                }}
                .recommendations-list {{
                    list-style: none;
                    padding-left: 0;
                }}
                .recommendation-item {{
                    display: flex;
                    align-items: flex-start;
                    margin: 12px 0;
                    padding: 12px;
                    background: white;
                    border-radius: 6px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }}
                .recommendation-item.urgent {{
                    border-left: 4px solid #e74c3c;
                }}
                .recommendation-item.important {{
                    border-left: 4px solid #f39c12;
                }}
                .recommendation-item.normal {{
                    border-left: 4px solid #3498db;
                }}
                .rec-number {{
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 28px;
                    height: 28px;
                    background: #667eea;
                    color: white;
                    border-radius: 50%;
                    font-weight: bold;
                    margin-right: 12px;
                    flex-shrink: 0;
                }}
                .rec-text {{
                    flex: 1;
                    color: #333;
                }}
                .attachment-notice {{
                    background-color: #e8f4f8;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 6px;
                    border-left: 4px solid #3498db;
                    text-align: center;
                }}
                .attachment-notice strong {{
                    color: #2980b9;
                }}
                .footer {{ 
                    margin-top: 30px; 
                    padding-top: 20px; 
                    border-top: 2px solid #eee; 
                    font-size: 12px; 
                    color: #999; 
                    text-align: center;
                }}
                h2 {{ 
                    font-size: 20px;
                    margin-bottom: 15px;
                }}
                @media only screen and (max-width: 600px) {{
                    .metrics-grid {{
                        grid-template-columns: 1fr;
                    }}
                    .header h1 {{
                        font-size: 24px;
                    }}
                }}
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <h1>📊 Báo Cáo Phân Tích AI</h1>
                    <p>Chi Nhánh: {branch_id} | Ngày: {report_date}</p>
                </div>
                <div class="content">
                    {summary_html}
                    
                    {recommendations_html}
                    
                    <div class="attachment-notice">
                        <strong>📎 File Báo Cáo Đầy Đủ (PDF)</strong><br>
                        Vui lòng mở file PDF đính kèm để xem báo cáo chi tiết với đầy đủ dữ liệu, biểu đồ trực quan và phân tích.
                    </div>
                    
                    {f'<div class="footer"><p>Report ID: {report_id} | Tạo tự động bởi AI Analytics Service</p></div>' if report_id else '<div class="footer"><p>Tạo tự động bởi AI Analytics Service</p></div>'}
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
        
        
        if recommendations:
            text += "KHUYẾN NGHỊ:\n"
            for i, rec in enumerate(recommendations, 1):
                text += f"{i}. {rec}\n"
        
        return text
    
    def _format_ai_analysis(
        self,
        analysis_text: str,
        heading_style: ParagraphStyle,
        heading3_style: ParagraphStyle,
        normal_style: ParagraphStyle
    ) -> List:
        """
        Format AI analysis text by removing markdown and organizing into sections:
        1. Tóm Tắt Tình Hình Hoạt Động
        2. Điểm Mạnh Và Điểm Yếu
        3. Các Vấn Đề Cần Chú Ý
        4. Khuyến nghị hành động
        """
        if not analysis_text:
            return []
        
        story = []
        lines = analysis_text.split('\n')
        
        # Sections to extract
        sections = {
            'summary': {'title': 'Tóm Tắt Tình Hình Hoạt Động', 'content': []},
            'strengths': {'title': 'Điểm Mạnh', 'content': []},
            'weaknesses': {'title': 'Điểm Yếu', 'content': []},
            'issues': {'title': 'Các Vấn Đề Cần Chú Ý', 'content': []},
            'recommendations': {'title': 'Khuyến Nghị Hành Động', 'content': []}
        }
        
        current_section = None
        current_content = []
        
        def clean_text(text: str) -> str:
            """Remove markdown formatting characters"""
            # Remove markdown headers
            text = text.strip()
            text = text.replace('###', '').replace('##', '').replace('#', '')
            # Remove bold/italic markers
            text = text.replace('**', '').replace('*', '').replace('__', '').replace('_', '')
            # Remove list markers that might be left
            text = text.strip()
            # Remove numbered list prefixes (1., 2., etc.)
            text = re.sub(r'^\d+\.\s*', '', text)
            return text.strip()
        
        def detect_section(line: str) -> Optional[str]:
            """Detect which section a line belongs to"""
            line_lower = line.lower()
            cleaned = clean_text(line)
            cleaned_lower = cleaned.lower()
            
            # Check for summary section (1. Tóm tắt...)
            if re.match(r'^[#\s]*1[\.\)]\s*', line_lower) or re.match(r'^[#\s]*tóm\s+tắt', line_lower):
                if any(keyword in cleaned_lower for keyword in ['tóm tắt', 'tình hình hoạt động', 'tổng quan']):
                    return 'summary'
            
            # Check for strengths section (2. Điểm mạnh...)
            if re.match(r'^[#\s]*2[\.\)]\s*', line_lower) or 'điểm mạnh' in cleaned_lower:
                if any(keyword in cleaned_lower for keyword in ['điểm mạnh', 'strengths', 'ưu điểm']):
                    return 'strengths'
            
            # Check for weaknesses section (2. Điểm yếu... or separate)
            if 'điểm yếu' in cleaned_lower or 'weaknesses' in cleaned_lower or 'nhược điểm' in cleaned_lower:
                return 'weaknesses'
            
            # Check for issues section (3. Các vấn đề...)
            if re.match(r'^[#\s]*3[\.\)]\s*', line_lower):
                if any(keyword in cleaned_lower for keyword in ['vấn đề', 'chú ý', 'bất thường', 'issues', 'cần chú ý']):
                    return 'issues'
            elif any(keyword in cleaned_lower for keyword in ['vấn đề cần chú ý', 'các vấn đề', 'bất thường']):
                return 'issues'
            
            # Check for recommendations section (4. or 5. Khuyến nghị...)
            if re.match(r'^[#\s]*[45][\.\)]\s*', line_lower):
                if any(keyword in cleaned_lower for keyword in ['khuyến nghị', 'recommendations', 'hành động', 'đề xuất']):
                    return 'recommendations'
            elif any(keyword in cleaned_lower for keyword in ['khuyến nghị hành động', 'khuyến nghị']):
                return 'recommendations'
            
            return None
        
        # Parse the analysis text
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if this line starts a new section
            detected_section = detect_section(line)
            if detected_section:
                # Save previous section content
                if current_section and current_content:
                    sections[current_section]['content'].extend(current_content)
                current_section = detected_section
                current_content = []
                continue
            
            # If we haven't detected a section yet, try to find one
            if current_section is None:
                detected_section = detect_section(line)
                if detected_section:
                    current_section = detected_section
                    current_content = []
                    continue
            
            # Clean and add content
            cleaned = clean_text(line)
            if cleaned and len(cleaned) > 3:
                # Skip lines that are just section headers (but allow if they contain actual content)
                is_header_only = (
                    any(keyword in cleaned.lower() for keyword in ['tóm tắt', 'điểm mạnh', 'điểm yếu', 'vấn đề', 'khuyến nghị', 'tình hình hoạt động']) and
                    len(cleaned) < 50  # Short lines are likely just headers
                )
                if not is_header_only:
                    # Remove bullet points that might remain
                    cleaned = re.sub(r'^[-•*]\s*', '', cleaned)
                    if cleaned and len(cleaned) > 3:
                        current_content.append(cleaned)
        
        # Save last section
        if current_section and current_content:
            sections[current_section]['content'].extend(current_content)
        
        # If no sections were detected, try to parse by common patterns
        if not any(sections[s]['content'] for s in sections):
            # Fallback: parse by bullet points and structure
            current_section = None
            for line in lines:
                cleaned = clean_text(line)
                if not cleaned or len(cleaned) < 5:
                    continue
                
                # Try to detect section from content
                if 'tóm tắt' in cleaned.lower() or 'tình hình' in cleaned.lower():
                    current_section = 'summary'
                    continue
                elif 'điểm mạnh' in cleaned.lower():
                    current_section = 'strengths'
                    continue
                elif 'điểm yếu' in cleaned.lower():
                    current_section = 'weaknesses'
                    continue
                elif 'vấn đề' in cleaned.lower() or 'bất thường' in cleaned.lower() or 'chú ý' in cleaned.lower():
                    current_section = 'issues'
                    continue
                elif 'khuyến nghị' in cleaned.lower() or 'hành động' in cleaned.lower():
                    current_section = 'recommendations'
                    continue
                
                # Add content to current section
                if current_section:
                    sections[current_section]['content'].append(cleaned)
                elif not current_section:
                    # Default to summary if no section detected
                    sections['summary']['content'].append(cleaned)
        
        # Build PDF story from sections
        # 1. Summary section
        if sections['summary']['content']:
            story.append(Paragraph(sections['summary']['title'], heading3_style))
            for item in sections['summary']['content']:
                if item and len(item) > 5:
                    story.append(Paragraph(f"• {item}", normal_style))
                    story.append(Spacer(1, 0.1*inch))
            story.append(Spacer(1, 0.2*inch))
        
        # 2. Strengths and Weaknesses section
        if sections['strengths']['content'] or sections['weaknesses']['content']:
            story.append(Paragraph("Điểm Mạnh Và Điểm Yếu", heading3_style))
            
            if sections['strengths']['content']:
                story.append(Paragraph("Điểm Mạnh:", normal_style))
                for item in sections['strengths']['content']:
                    if item and len(item) > 5:
                        story.append(Paragraph(f"  ✓ {item}", normal_style))
                        story.append(Spacer(1, 0.08*inch))
            
            if sections['weaknesses']['content']:
                story.append(Spacer(1, 0.1*inch))
                story.append(Paragraph("Điểm Yếu:", normal_style))
                for item in sections['weaknesses']['content']:
                    if item and len(item) > 5:
                        story.append(Paragraph(f"  ✗ {item}", normal_style))
                        story.append(Spacer(1, 0.08*inch))
            
            story.append(Spacer(1, 0.2*inch))
        
        # 3. Issues section
        if sections['issues']['content']:
            story.append(Paragraph(sections['issues']['title'], heading3_style))
            for item in sections['issues']['content']:
                if item and len(item) > 5:
                    story.append(Paragraph(f"⚠ {item}", normal_style))
                    story.append(Spacer(1, 0.1*inch))
            story.append(Spacer(1, 0.2*inch))
        
        # 4. Recommendations section (if not already handled separately)
        # Note: Recommendations are usually handled separately in the PDF, but we include them here for completeness
        if sections['recommendations']['content']:
            story.append(Paragraph(sections['recommendations']['title'], heading3_style))
            for i, item in enumerate(sections['recommendations']['content'], 1):
                if item and len(item) > 5:
                    story.append(Paragraph(f"{i}. {item}", normal_style))
                    story.append(Spacer(1, 0.1*inch))
            story.append(Spacer(1, 0.2*inch))
        
        return story
    
    def _generate_report_pdf_file(
        self,
        branch_id: int,
        report_date: str,
        analysis: str,
        summary: Optional[dict] = None,
        recommendations: Optional[List[str]] = None,
        raw_data: Optional[Dict[str, Any]] = None,
        report_id: Optional[int] = None
    ) -> str:
        """Generate comprehensive PDF report file with charts for attachment"""
        # Format currency
        def format_currency(value):
            if isinstance(value, (int, float)):
                return f"{value:,.0f}".replace(',', '.')
            return str(value)
        
        # Format percentage
        def format_percent(value):
            if isinstance(value, (int, float)):
                return f"{value:.2f}%"
            return str(value)
        
        # Create temporary PDF file
        tmp_file = tempfile.NamedTemporaryFile(suffix='.pdf', delete=False)
        pdf_path = tmp_file.name
        tmp_file.close()
        
        # Register Vietnamese font
        vietnamese_font = EmailService._register_vietnamese_font()
        
        # Create PDF document
        doc = SimpleDocTemplate(pdf_path, pagesize=A4)
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles with Vietnamese font
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontName=vietnamese_font,
            fontSize=24,
            textColor=colors.HexColor('#667eea'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontName=vietnamese_font,
            fontSize=18,
            textColor=colors.HexColor('#667eea'),
            spaceAfter=15,
            spaceBefore=20
        )
        
        # Update normal style to use Vietnamese font
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontName=vietnamese_font,
            fontSize=10
        )
        
        heading3_style = ParagraphStyle(
            'CustomHeading3',
            parent=styles['Heading3'],
            fontName=vietnamese_font,
            fontSize=14,
            textColor=colors.HexColor('#555'),
            spaceAfter=10,
            spaceBefore=15
        )
        
        # Table style with Vietnamese font
        table_normal_style = ParagraphStyle(
            'TableNormal',
            fontName=vietnamese_font,
            fontSize=9
        )
        
        # Title
        story.append(Paragraph(f"Báo Cáo Phân Tích AI", title_style))
        story.append(Paragraph(f"Chi Nhánh: {branch_id} | Ngày: {report_date}", normal_style))
        if report_id:
            story.append(Paragraph(f"Report ID: {report_id}", normal_style))
        story.append(Paragraph(f"Thời gian tạo: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}", normal_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Summary section
        if summary:
            story.append(Paragraph("Tóm Tắt Metrics Chính", heading_style))
            
            # Create summary table with comprehensive metrics
            summary_data = [['Chỉ Tiêu', 'Giá Trị']]
            metric_labels = {
                # Revenue metrics
                'total_revenue': ('Doanh Thu', 'VNĐ', format_currency),
                'order_count': ('Số Đơn Hàng', 'đơn', str),
                'avg_order_value': ('Giá Trị TB/Đơn', 'VNĐ', format_currency),
                # Customer metrics
                'customer_count': ('Tổng Khách Hàng', 'người', str),
                'new_customers': ('Khách Hàng Mới', 'người', str),
                'repeat_customers': ('Khách Hàng Quay Lại', 'người', str),
                # Product metrics
                'unique_products_sold': ('Sản Phẩm Đã Bán', 'sản phẩm', str),
                # Review metrics
                'avg_review_score': ('Đánh Giá Trung Bình', '/5', lambda x: f"{x:.2f}" if isinstance(x, float) else str(x)),
                'total_reviews': ('Tổng Đánh Giá', 'đánh giá', str),
                # Inventory metrics
                'low_stock_products': ('Sản Phẩm Sắp Hết', 'sản phẩm', str),
                'out_of_stock_products': ('Sản Phẩm Hết Hàng', 'sản phẩm', str),
                'total_inventory_value': ('Giá Trị Tồn Kho', 'VNĐ', format_currency),
                'material_cost': ('Chi Phí Nguyên Liệu', 'VNĐ', format_currency),
            }
            
            # Group metrics by category for better organization
            revenue_metrics = []
            customer_metrics = []
            product_metrics = []
            review_metrics = []
            inventory_metrics = []
            
            for key, (label, unit, formatter) in metric_labels.items():
                if key in summary and summary[key] is not None:
                    value = summary[key]
                    formatted_value = formatter(value)
                    value_str = f"{formatted_value} {unit}"
                    
                    row = [label, value_str]
                    
                    # Categorize metrics
                    if key in ['total_revenue', 'order_count', 'avg_order_value']:
                        revenue_metrics.append(row)
                    elif key in ['customer_count', 'new_customers', 'repeat_customers']:
                        customer_metrics.append(row)
                    elif key in ['unique_products_sold']:
                        product_metrics.append(row)
                    elif key in ['avg_review_score', 'total_reviews']:
                        review_metrics.append(row)
                    elif key in ['low_stock_products', 'out_of_stock_products', 'total_inventory_value', 'material_cost']:
                        inventory_metrics.append(row)
            
            # Helper function to format table cells with Vietnamese font
            def format_cell(text):
                """Format table cell text with Vietnamese font"""
                if not text:
                    return ''
                return Paragraph(str(text), table_normal_style)
            
            # Convert all data to Paragraph objects for proper font rendering
            formatted_summary_data = [[format_cell('Chỉ Tiêu'), format_cell('Giá Trị')]]
            
            # Add metrics by category with section headers
            if revenue_metrics:
                formatted_summary_data.append([format_cell(''), format_cell('')])  # Empty row
                formatted_summary_data.append([format_cell('DOANH THU & ĐƠN HÀNG'), format_cell('')])
                for row in revenue_metrics:
                    formatted_summary_data.append([format_cell(row[0]), format_cell(row[1])])
            
            if customer_metrics:
                formatted_summary_data.append([format_cell(''), format_cell('')])  # Empty row
                formatted_summary_data.append([format_cell('KHÁCH HÀNG'), format_cell('')])
                for row in customer_metrics:
                    formatted_summary_data.append([format_cell(row[0]), format_cell(row[1])])
            
            if product_metrics:
                formatted_summary_data.append([format_cell(''), format_cell('')])  # Empty row
                formatted_summary_data.append([format_cell('SẢN PHẨM'), format_cell('')])
                for row in product_metrics:
                    formatted_summary_data.append([format_cell(row[0]), format_cell(row[1])])
            
            if review_metrics:
                formatted_summary_data.append([format_cell(''), format_cell('')])  # Empty row
                formatted_summary_data.append([format_cell('ĐÁNH GIÁ'), format_cell('')])
                for row in review_metrics:
                    formatted_summary_data.append([format_cell(row[0]), format_cell(row[1])])
            
            if inventory_metrics:
                formatted_summary_data.append([format_cell(''), format_cell('')])  # Empty row
                formatted_summary_data.append([format_cell('TỒN KHO'), format_cell('')])
                for row in inventory_metrics:
                    formatted_summary_data.append([format_cell(row[0]), format_cell(row[1])])
            
            summary_data = formatted_summary_data
            
            summary_table = Table(summary_data, colWidths=[4*inch, 2*inch])
            table_style = TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            ])
            
            # Style category headers (rows with empty second column)
            # Note: Font styling is handled by Paragraph objects
            for i, row in enumerate(summary_data):
                if isinstance(row[1], Paragraph) and hasattr(row[1], 'text') and row[1].text == '' and i > 0:
                    # Check if this is a category header
                    if isinstance(row[0], Paragraph) and hasattr(row[0], 'text') and row[0].text and row[0].text != 'Chỉ Tiêu':
                        table_style.add('BACKGROUND', (0, i), (-1, i), colors.HexColor('#e8eaf6'))
                        table_style.add('TEXTCOLOR', (0, i), (-1, i), colors.HexColor('#667eea'))
                        table_style.add('TOPPADDING', (0, i), (-1, i), 8)
                        table_style.add('BOTTOMPADDING', (0, i), (-1, i), 8)
            
        summary_table.setStyle(table_style)
        story.append(summary_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Format and add AI Analysis section
        if analysis:
            formatted_analysis = self._format_ai_analysis(analysis, heading_style, heading3_style, normal_style)
            if formatted_analysis:
                story.append(PageBreak())
                story.append(Paragraph("Phân Tích AI", heading_style))
                story.extend(formatted_analysis)
                story.append(Spacer(1, 0.3*inch))
        
        # Generate charts and add to PDF
        chart_images = []
        
        # Revenue by hour chart
        if raw_data and raw_data.get('revenue_metrics') and raw_data['revenue_metrics'].get('revenueByHour'):
            chart_img = self._create_revenue_by_hour_chart(raw_data['revenue_metrics']['revenueByHour'])
            if chart_img:
                chart_images.append(('Doanh Thu Theo Giờ', chart_img))
        
        # Top products chart
        if raw_data and raw_data.get('product_metrics') and raw_data['product_metrics'].get('topProducts'):
            chart_img = self._create_top_products_chart(raw_data['product_metrics']['topProducts'])
            if chart_img:
                chart_images.append(('Sản Phẩm Bán Chạy', chart_img))
        
        # Forecast chart
        if raw_data and raw_data.get('prophet_forecast') and raw_data['prophet_forecast'].get('du_bao_theo_ngay'):
            chart_img = self._create_forecast_chart(raw_data['prophet_forecast']['du_bao_theo_ngay'])
            if chart_img:
                chart_images.append(('Dự Báo Tương Lai', chart_img))
        
        # Add charts to PDF (keep file paths for cleanup after PDF is built)
        chart_files_to_cleanup = []
        for chart_title, chart_path in chart_images:
            story.append(PageBreak())
            story.append(Paragraph(f"{chart_title}", heading_style))
            img = Image(chart_path, width=6*inch, height=4*inch)
            story.append(img)
            story.append(Spacer(1, 0.2*inch))
            # Keep track of files to cleanup after PDF is built
            chart_files_to_cleanup.append(chart_path)
        
        # Recommendations section
        if recommendations:
            story.append(PageBreak())
            story.append(Paragraph("Khuyến Nghị Hành Động", heading_style))
            for i, rec in enumerate(recommendations, 1):
                story.append(Paragraph(f"{i}. {rec}", normal_style))
                story.append(Spacer(1, 0.1*inch))
        
        # Raw data tables
        if raw_data:
            story.append(PageBreak())
            story.append(Paragraph("Dữ Liệu Chi Tiết", heading_style))
            
            # Order Status Summary
            if raw_data.get('revenue_metrics'):
                rev_metrics = raw_data['revenue_metrics']
                if rev_metrics.get('completedOrders') is not None or rev_metrics.get('cancelledOrders') is not None:
                    story.append(Paragraph("Tình Trạng Đơn Hàng", heading3_style))
                    order_status_data = [
                        [format_cell('Tình Trạng'), format_cell('Số Lượng')]
                    ]
                    if rev_metrics.get('completedOrders') is not None:
                        order_status_data.append([format_cell('Hoàn thành'), format_cell(str(rev_metrics.get('completedOrders', 0)))])
                    if rev_metrics.get('pendingOrders') is not None:
                        order_status_data.append([format_cell('Đang chờ'), format_cell(str(rev_metrics.get('pendingOrders', 0)))])
                    if rev_metrics.get('cancelledOrders') is not None:
                        order_status_data.append([format_cell('Đã hủy'), format_cell(str(rev_metrics.get('cancelledOrders', 0)))])
                    
                    order_status_table = Table(order_status_data, colWidths=[3*inch, 1*inch])
                    order_status_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('FONTSIZE', (0, 0), (-1, 0), 10),
                        ('FONTSIZE', (0, 1), (-1, -1), 9),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                    ]))
                    story.append(order_status_table)
                    story.append(Spacer(1, 0.3*inch))
            
            # Top products table
            if raw_data.get('product_metrics') and raw_data['product_metrics'].get('topProducts'):
                story.append(Paragraph("Sản Phẩm Bán Chạy", heading3_style))
                prod_data = [
                    [format_cell('STT'), format_cell('Tên Sản Phẩm'), format_cell('Số Lượng'), format_cell('Doanh Thu (VNĐ)')]
                ]
                for idx, item in enumerate(raw_data['product_metrics']['topProducts'][:10], 1):
                    prod_data.append([
                        format_cell(str(idx)),
                        format_cell(item.get('productName', 'N/A')[:30]),  # Truncate long names
                        format_cell(str(item.get('quantitySold', 0))),
                        format_cell(format_currency(item.get('revenue', 0)))
                    ])
                prod_table = Table(prod_data, colWidths=[0.5*inch, 3*inch, 1*inch, 1.5*inch])
                prod_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('FONTSIZE', (0, 1), (-1, -1), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ]))
                story.append(prod_table)
                story.append(Spacer(1, 0.3*inch))
            
            # Products by Category
            if raw_data.get('product_metrics') and raw_data['product_metrics'].get('productsByCategory'):
                products_by_cat = raw_data['product_metrics']['productsByCategory']
                if products_by_cat and isinstance(products_by_cat, dict) and len(products_by_cat) > 0:
                    story.append(Paragraph("Sản Phẩm Theo Danh Mục", heading3_style))
                    cat_data = [
                        [format_cell('Danh Mục'), format_cell('Số Lượng')]
                    ]
                    for category, count in list(products_by_cat.items())[:10]:
                        cat_data.append([
                            format_cell(str(category)[:40]),
                            format_cell(str(count))
                        ])
                    cat_table = Table(cat_data, colWidths=[4*inch, 1*inch])
                    cat_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('FONTSIZE', (0, 0), (-1, 0), 10),
                        ('FONTSIZE', (0, 1), (-1, -1), 9),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                    ]))
                    story.append(cat_table)
                    story.append(Spacer(1, 0.3*inch))
            
            # Top Customers
            if raw_data.get('customer_metrics') and raw_data['customer_metrics'].get('topCustomers'):
                story.append(Paragraph("Khách Hàng Hàng Đầu", heading3_style))
                customer_data = [
                    [format_cell('STT'), format_cell('Tên Khách Hàng'), format_cell('Số Đơn'), format_cell('Tổng Chi Tiêu (VNĐ)')]
                ]
                for idx, item in enumerate(raw_data['customer_metrics']['topCustomers'][:10], 1):
                    customer_data.append([
                        format_cell(str(idx)),
                        format_cell((item.get('customerName', 'Khách vãng lai') or 'Khách vãng lai')[:30]),
                        format_cell(str(item.get('orderCount', 0))),
                        format_cell(format_currency(item.get('totalSpent', 0)))
                    ])
                customer_table = Table(customer_data, colWidths=[0.5*inch, 3*inch, 1*inch, 1.5*inch])
                customer_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('FONTSIZE', (0, 1), (-1, -1), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ]))
                story.append(customer_table)
                story.append(Spacer(1, 0.3*inch))
            
            # Revenue by Payment Method
            if raw_data.get('revenue_metrics') and raw_data['revenue_metrics'].get('revenueByPaymentMethod'):
                payment_methods = raw_data['revenue_metrics']['revenueByPaymentMethod']
                if payment_methods and isinstance(payment_methods, dict) and len(payment_methods) > 0:
                    story.append(Paragraph("Doanh Thu Theo Phương Thức Thanh Toán", heading3_style))
                    payment_data = [
                        [format_cell('Phương Thức'), format_cell('Doanh Thu (VNĐ)'), format_cell('Tỷ Lệ (%)')]
                    ]
                    total_rev = summary.get('total_revenue', 1) if summary else 1
                    for method, amount in list(payment_methods.items())[:10]:
                        method_name = {
                            'CASH': 'Tiền mặt',
                            'CARD': 'Thẻ',
                            'MOMO': 'MoMo',
                            'ZALOPAY': 'ZaloPay',
                        }.get(method, method)
                        percentage = (float(amount) / total_rev * 100) if total_rev > 0 else 0
                        payment_data.append([
                            format_cell(method_name),
                            format_cell(format_currency(float(amount))),
                            format_cell(f"{percentage:.1f}%")
                        ])
                    payment_table = Table(payment_data, colWidths=[2.5*inch, 2*inch, 1*inch])
                    payment_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
                        ('FONTSIZE', (0, 0), (-1, 0), 10),
                        ('FONTSIZE', (0, 1), (-1, -1), 9),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                    ]))
                    story.append(payment_table)
                    story.append(Spacer(1, 0.3*inch))
            
            # Top Ingredients by Value
            if raw_data.get('inventory_metrics') and raw_data['inventory_metrics'].get('topIngredientsByValue'):
                story.append(Paragraph("Nguyên Liệu Có Giá Trị Cao Nhất", heading3_style))
                ingredient_value_data = [
                    [format_cell('STT'), format_cell('Tên Nguyên Liệu'), format_cell('Số Lượng'), format_cell('Giá Trị (VNĐ)')]
                ]
                for idx, item in enumerate(raw_data['inventory_metrics']['topIngredientsByValue'][:10], 1):
                    ingredient_value_data.append([
                        format_cell(str(idx)),
                        format_cell(item.get('ingredientName', 'N/A')[:30]),
                        format_cell(f"{item.get('quantity', 0)} {item.get('unitCode', '')}"),
                        format_cell(format_currency(item.get('stockValue', 0)))
                    ])
                ingredient_value_table = Table(ingredient_value_data, colWidths=[0.5*inch, 2.5*inch, 1.5*inch, 1.5*inch])
                ingredient_value_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('FONTSIZE', (0, 1), (-1, -1), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ]))
                story.append(ingredient_value_table)
                story.append(Spacer(1, 0.3*inch))
            
            # Top Cost Ingredients
            if raw_data.get('material_cost_metrics') and raw_data['material_cost_metrics'].get('topCostIngredients'):
                story.append(Paragraph("Nguyên Liệu Có Chi Phí Cao Nhất", heading3_style))
                cost_ingredient_data = [
                    [format_cell('STT'), format_cell('Tên Nguyên Liệu'), format_cell('Chi Phí (VNĐ)'), format_cell('Tỷ Lệ (%)')]
                ]
                for idx, item in enumerate(raw_data['material_cost_metrics']['topCostIngredients'][:10], 1):
                    cost_ingredient_data.append([
                        format_cell(str(idx)),
                        format_cell(item.get('ingredientName', 'N/A')[:30]),
                        format_cell(format_currency(item.get('totalCost', 0))),
                        format_cell(f"{item.get('percentage', 0):.1f}%")
                    ])
                cost_ingredient_table = Table(cost_ingredient_data, colWidths=[0.5*inch, 2.5*inch, 1.5*inch, 1*inch])
                cost_ingredient_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('FONTSIZE', (0, 1), (-1, -1), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ]))
                story.append(cost_ingredient_table)
                story.append(Spacer(1, 0.3*inch))
            
            # Recent Reviews
            if raw_data.get('review_metrics') and raw_data['review_metrics'].get('recentReviews'):
                story.append(Paragraph("Đánh Giá Gần Đây", heading3_style))
                for idx, review in enumerate(raw_data['review_metrics']['recentReviews'][:5], 1):
                    rating = review.get('rating', 0)
                    comment = review.get('comment') or review.get('content', '')
                    date = review.get('createdAt') or review.get('date', '')
                    date_str = ''
                    if date:
                        try:
                            from datetime import datetime as dt
                            if isinstance(date, str):
                                date_str = dt.fromisoformat(date.replace('Z', '+00:00')).strftime('%d/%m/%Y')
                            else:
                                date_str = str(date)
                        except:
                            date_str = str(date)
                    
                    story.append(Paragraph(
                        f"{idx}. {int(rating)}/5 sao - {date_str}",
                        normal_style
                    ))
                    if comment:
                        story.append(Paragraph(f"   {comment[:100]}{'...' if len(comment) > 100 else ''}", normal_style))
                    story.append(Spacer(1, 0.1*inch))
                story.append(Spacer(1, 0.2*inch))
            
            # Review Distribution
            if raw_data.get('review_metrics') and raw_data['review_metrics'].get('reviewDistribution'):
                review_dist = raw_data['review_metrics']['reviewDistribution']
                if review_dist and isinstance(review_dist, dict) and len(review_dist) > 0:
                    story.append(Paragraph("Phân Bố Đánh Giá", heading3_style))
                    review_dist_data = [
                        [format_cell('Sao'), format_cell('Số Lượng')]
                    ]
                    for rating in ['5', '4', '3', '2', '1']:
                        count = review_dist.get(rating, 0) or review_dist.get(int(rating), 0) or 0
                        review_dist_data.append([
                            format_cell(f"{rating} sao"),
                            format_cell(str(count))
                        ])
                    review_dist_table = Table(review_dist_data, colWidths=[3*inch, 2*inch])
                    review_dist_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('FONTSIZE', (0, 0), (-1, 0), 10),
                        ('FONTSIZE', (0, 1), (-1, -1), 9),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                    ]))
                    story.append(review_dist_table)
                    story.append(Spacer(1, 0.3*inch))
            
            # Inventory alerts
            if raw_data.get('inventory_metrics'):
                inv_metrics = raw_data['inventory_metrics']
                if inv_metrics.get('lowStockItems') or inv_metrics.get('outOfStockItems'):
                    story.append(Paragraph("Cảnh Báo Tồn Kho", heading3_style))
                    if inv_metrics.get('outOfStockItems'):
                        story.append(Paragraph("Sản phẩm hết hàng:", normal_style))
                        for item in inv_metrics['outOfStockItems'][:10]:
                            story.append(Paragraph(
                                f"• {item.get('ingredientName', 'N/A')} - Còn: {item.get('currentQuantity', 0)} {item.get('unitName', '')}",
                                normal_style
                            ))
                    if inv_metrics.get('lowStockItems'):
                        story.append(Spacer(1, 0.1*inch))
                        story.append(Paragraph("Sản phẩm sắp hết:", normal_style))
                        for item in inv_metrics['lowStockItems'][:10]:
                            story.append(Paragraph(
                                f"• {item.get('ingredientName', 'N/A')} - Còn: {item.get('currentQuantity', 0)}/{item.get('threshold', 0)} {item.get('unitName', '')}",
                                normal_style
                            ))
                    story.append(Spacer(1, 0.3*inch))
        
        # Footer
        story.append(Spacer(1, 0.5*inch))
        story.append(Paragraph("AI Analytics Service - Báo cáo được tạo tự động", normal_style))
        story.append(Paragraph("Hệ thống quản lý cà phê - Coffee Management System", normal_style))
        
        # Build PDF
        doc.build(story)
        
        # Clean up chart files after PDF is built (reportlab reads files during build)
        for chart_path in chart_files_to_cleanup:
            try:
                if os.path.exists(chart_path):
                    os.unlink(chart_path)
            except Exception as e:
                logger.warning(f"Failed to cleanup chart file {chart_path}: {e}")
        
        return pdf_path
    
    def _create_revenue_by_hour_chart(self, revenue_by_hour: List[Dict]) -> Optional[str]:
        """Create revenue by hour line chart"""
        try:
            if not revenue_by_hour:
                return None
            
            # Prepare data
            hours = [item.get('hour', 0) for item in revenue_by_hour[:24]]
            revenues = [item.get('revenue', 0) for item in revenue_by_hour[:24]]
            
            # Create figure
            plt.figure(figsize=(10, 6))
            plt.plot(hours, revenues, marker='o', linewidth=2, markersize=6, color='#667eea')
            plt.fill_between(hours, revenues, alpha=0.3, color='#667eea')
            plt.xlabel('Giờ trong ngày', fontsize=12, fontweight='bold')
            plt.ylabel('Doanh Thu (VNĐ)', fontsize=12, fontweight='bold')
            plt.title('Doanh Thu Theo Giờ', fontsize=14, fontweight='bold', pad=20)
            plt.grid(True, alpha=0.3)
            plt.xticks(rotation=45)
            
            # Format y-axis
            ax = plt.gca()
            ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'{x/1000:.0f}K' if x >= 1000 else f'{x:.0f}'))
            
            # Save to temporary file
            tmp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
            chart_path = tmp_file.name
            tmp_file.close()
            plt.savefig(chart_path, dpi=150, bbox_inches='tight')
            plt.close()
            
            return chart_path
        except Exception as e:
            logger.warning(f"Failed to create revenue chart: {e}")
            plt.close()
            return None
    
    def _create_top_products_chart(self, top_products: List[Dict]) -> Optional[str]:
        """Create top products horizontal bar chart"""
        try:
            if not top_products:
                return None
            
            # Prepare data (top 10)
            products = [item.get('productName', 'N/A')[:20] for item in top_products[:10]]
            quantities = [item.get('quantitySold', 0) for item in top_products[:10]]
            
            # Create figure
            plt.figure(figsize=(10, 6))
            colors_list = plt.cm.Set3(range(len(products)))
            bars = plt.barh(products, quantities, color=colors_list)
            plt.xlabel('Số Lượng Bán', fontsize=12, fontweight='bold')
            plt.ylabel('Sản Phẩm', fontsize=12, fontweight='bold')
            plt.title('Top 10 Sản Phẩm Bán Chạy', fontsize=14, fontweight='bold', pad=20)
            plt.grid(True, alpha=0.3, axis='x')
            
            # Add value labels on bars
            for i, (bar, qty) in enumerate(zip(bars, quantities)):
                plt.text(qty, i, f' {qty}', va='center', fontweight='bold')
            
            # Save to temporary file
            tmp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
            chart_path = tmp_file.name
            tmp_file.close()
            plt.savefig(chart_path, dpi=150, bbox_inches='tight')
            plt.close()
            
            return chart_path
        except Exception as e:
            logger.warning(f"Failed to create products chart: {e}")
            plt.close()
            return None
    
    def _create_forecast_chart(self, forecast_data: List[Dict]) -> Optional[str]:
        """Create forecast line chart with confidence intervals"""
        try:
            if not forecast_data:
                return None
            
            # Prepare data (next 7 days)
            dates = [item.get('ngay', '') for item in forecast_data[:7]]
            forecasts = [item.get('du_bao', 0) for item in forecast_data[:7]]
            
            # Extract confidence intervals
            lower_bounds = []
            upper_bounds = []
            for item in forecast_data[:7]:
                conf = item.get('khoang_tin_cay', {})
                if isinstance(conf, dict):
                    lower_bounds.append(conf.get('min', item.get('du_bao', 0)))
                    upper_bounds.append(conf.get('max', item.get('du_bao', 0)))
                else:
                    forecast_val = item.get('du_bao', 0)
                    lower_bounds.append(forecast_val * 0.9)
                    upper_bounds.append(forecast_val * 1.1)
            
            # Create figure
            plt.figure(figsize=(10, 6))
            x = range(len(dates))
            
            # Plot confidence interval
            plt.fill_between(x, lower_bounds, upper_bounds, alpha=0.3, color='#93c5fd', label='Khoảng tin cậy')
            
            # Plot forecast line
            plt.plot(x, forecasts, marker='o', linewidth=2, markersize=8, color='#667eea', label='Dự báo')
            
            plt.xlabel('Ngày', fontsize=12, fontweight='bold')
            plt.ylabel('Giá Trị Dự Báo', fontsize=12, fontweight='bold')
            plt.title('Dự Báo Tương Lai (7 Ngày Tiếp Theo)', fontsize=14, fontweight='bold', pad=20)
            plt.xticks(x, dates, rotation=45)
            plt.grid(True, alpha=0.3)
            plt.legend()
            
            # Format y-axis
            ax = plt.gca()
            ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'{x/1000:.0f}K' if x >= 1000 else f'{x:.0f}'))
            
            # Save to temporary file
            tmp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
            chart_path = tmp_file.name
            tmp_file.close()
            plt.savefig(chart_path, dpi=150, bbox_inches='tight')
            plt.close()
            
            return chart_path
        except Exception as e:
            logger.warning(f"Failed to create forecast chart: {e}")
            plt.close()
            return None

