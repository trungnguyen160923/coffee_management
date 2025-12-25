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
import html as html_lib
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
                recommendations=recommendations,
                raw_data=raw_data
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
        # daily_branch_metrics + ML preview (from raw_data)
        data_source_html = ""
        daily_metrics_html = ""
        anomaly_html = ""
        forecast_html = ""
        analysis_html = ""

        try:
            if raw_data and isinstance(raw_data, dict):
                source = raw_data.get("source")
                if not source and "daily_branch_metrics" in raw_data:
                    source = "daily_branch_metrics"
                if source:
                    data_source_html = f"""
                    <div class="analysis-section" style="border-left-color:#3498db;">
                        <h2 style="color:#3498db;">🗄️ Nguồn Dữ Liệu</h2>
                        <div class="analysis-preview">Nguồn: <strong>{html_lib.escape(str(source))}</strong></div>
                    </div>
                    """

                dm = raw_data.get("daily_branch_metrics") or {}
                dk = raw_data.get("derived_kpis") or {}
                if isinstance(dm, dict) and dm:
                    def _fmt_money(v):
                        if isinstance(v, (int, float)):
                            return f"{v:,.0f}".replace(",", ".")
                        return "N/A" if v is None else str(v)

                    def _fmt_float(v, digits=2):
                        if isinstance(v, (int, float)):
                            return f"{float(v):.{digits}f}"
                        return "N/A" if v is None else str(v)

                    def _fmt_pct(v):
                        if isinstance(v, (int, float)):
                            x = float(v)
                            if x <= 1:
                                x *= 100
                            return f"{x:.2f}%"
                        return "N/A" if v is None else str(v)

                    rows = [
                        ("Doanh thu", _fmt_money(dm.get("total_revenue")), "VNĐ"),
                        ("Số đơn", dm.get("order_count"), "đơn"),
                        ("Giá trị TB/đơn", _fmt_money(dm.get("avg_order_value")), "VNĐ"),
                        ("Giờ cao điểm", dm.get("peak_hour"), "giờ"),
                        ("Khách hàng", dm.get("customer_count"), "người"),
                        ("Khách mới", dm.get("new_customers"), "người"),
                        ("Khách quay lại", dm.get("repeat_customers"), "người"),
                        ("Tỷ lệ giữ chân", _fmt_pct(dk.get("customer_retention_rate")), ""),
                        ("Sản phẩm đã bán", dm.get("unique_products_sold"), "sản phẩm"),
                        ("Độ đa dạng sản phẩm", _fmt_float(dm.get("product_diversity_score"), 4), ""),
                        ("Điểm đánh giá TB", _fmt_float(dm.get("avg_review_score")), "/5"),
                        ("Sản phẩm sắp hết", dm.get("low_stock_products"), "sản phẩm"),
                        ("Sản phẩm hết hàng", dm.get("out_of_stock_products"), "sản phẩm"),
                        ("Chi phí nguyên liệu", _fmt_money(dm.get("material_cost")), "VNĐ"),
                        ("Lợi nhuận (ước tính)", _fmt_money(dk.get("profit")), "VNĐ"),
                        ("Biên lợi nhuận", _fmt_pct(dk.get("profit_margin")), ""),
                    ]

                    rows_html = ""
                    for label, value, unit in rows:
                        label_safe = html_lib.escape(str(label))
                        value_safe = html_lib.escape(str(value))
                        unit_safe = html_lib.escape(str(unit))
                        rows_html += f"""
                            <tr>
                                <td style="padding:10px;border-bottom:1px solid #eee;color:#666;width:45%;">{label_safe}</td>
                                <td style="padding:10px;border-bottom:1px solid #eee;font-weight:600;color:#333;">{value_safe} {unit_safe}</td>
                            </tr>
                        """

                    daily_metrics_html = f"""
                    <div class="analysis-section" style="border-left-color:#2ecc71;">
                        <h2 style="color:#2ecc71;">📋 Chỉ Số Theo Ngày (daily_branch_metrics)</h2>
                        <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                            <table style="width:100%;border-collapse:collapse;">
                                {rows_html}
                            </table>
                        </div>
                    </div>
                    """

                iso = raw_data.get("isolation_forest_anomaly") or {}
                if isinstance(iso, dict) and iso:
                    is_anomaly = bool(
                        iso.get("co_bat_thuong")
                        or iso.get("is_anomaly")
                        or iso.get("is_anomaly_iforest")
                    )
                    conf = iso.get("adjusted_confidence") or iso.get("confidence") or iso.get("do_tin_cay")
                    anomaly_lines = []
                    chi_tieu = iso.get("chi_tieu_bat_thuong") or iso.get("anomalous_features") or []
                    if isinstance(chi_tieu, list) and chi_tieu:
                        # show ALL anomalous metrics (no limit)
                        for item in chi_tieu:
                            if isinstance(item, dict):
                                metric = item.get("metric") or item.get("name") or item.get("chi_tieu")
                                change = item.get("change_percent") or item.get("phan_tram_thay_doi") or item.get("delta_percent")
                                sev = item.get("severity") or item.get("muc_do") or item.get("level")
                                parts = [p for p in [metric, f"{change}%" if change is not None else None, sev] if p]
                                if parts:
                                    anomaly_lines.append(" - " + " | ".join([html_lib.escape(str(p)) for p in parts]))
                    anomaly_html = f"""
                    <div class="analysis-section" style="border-left-color:#e74c3c;">
                        <h2 style="color:#e74c3c;">🔍 Phát Hiện Bất Thường</h2>
                        <div class="analysis-preview">
                            Trạng thái: <strong>{'CÓ BẤT THƯỜNG' if is_anomaly else 'Không có bất thường'}</strong><br>
                            Độ tin cậy: <strong>{html_lib.escape(str(conf)) if conf is not None else 'N/A'}</strong><br>
                            {'<br>'.join(anomaly_lines) if anomaly_lines else 'Chi tiết: (không có danh sách chỉ tiêu bất thường)'}
                        </div>
                    </div>
                    """

                fc = raw_data.get("prophet_forecast") or {}
                if isinstance(fc, dict) and fc:
                    do_tin_cay = fc.get("do_tin_cay")
                    conf_pct = None
                    if isinstance(do_tin_cay, dict):
                        conf_pct = do_tin_cay.get("phan_tram") or do_tin_cay.get("percent")
                    elif do_tin_cay is not None:
                        conf_pct = do_tin_cay
                    if conf_pct is None:
                        conf_pct = fc.get("confidence")

                    target_metric = fc.get("chi_tieu_code") or fc.get("target_metric") or "order_count"
                    forecast_values = fc.get("forecast_values") or {}
                    preview_pairs = []
                    if isinstance(forecast_values, dict):
                        for k in list(forecast_values.keys())[:3]:
                            preview_pairs.append(f"{html_lib.escape(str(k))}: {html_lib.escape(str(forecast_values.get(k)))}")
                    forecast_preview = "<br>".join(preview_pairs) if preview_pairs else "(không có forecast_values)"

                    forecast_html = f"""
                    <div class="analysis-section" style="border-left-color:#667eea;">
                        <h2 style="color:#667eea;">🔮 Dự Báo Tương Lai</h2>
                        <div class="analysis-preview">
                            Chỉ tiêu: <strong>{html_lib.escape(str(target_metric))}</strong><br>
                            Độ tin cậy: <strong>{html_lib.escape(str(conf_pct)) if conf_pct is not None else 'N/A'}</strong><br>
                            {forecast_preview}
                        </div>
                    </div>
                    """

            if analysis:
                preview = analysis.strip()
                if len(preview) > 1600:
                    preview = preview[:1600] + "\n...\n(đã rút gọn, xem PDF để đầy đủ)"
                preview = html_lib.escape(preview)
                analysis_html = f"""
                <div class="analysis-section">
                    <h2>🧾 Nhận Định & Phân Tích</h2>
                    <div class="analysis-preview">{preview}</div>
                </div>
                """
        except Exception:
            # never fail email due to preview blocks
            pass

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
                'peak_hour': ('⏰ Giờ Cao Điểm', 'giờ'),
                # Customer metrics
                'customer_count': ('👥 Tổng Khách Hàng', 'người'),
                'new_customers': ('🆕 Khách Hàng Mới', 'người'),
                'repeat_customers': ('🔄 Khách Hàng Quay Lại', 'người'),
                'customer_retention_rate': ('📈 Tỷ Lệ Giữ Chân', '%'),
                # Product metrics
                'unique_products_sold': ('📦 Sản Phẩm Đã Bán', 'sản phẩm'),
                'product_diversity_score': ('🧩 Độ Đa Dạng Sản Phẩm', ''),
                # Review metrics
                'avg_review_score': ('⭐ Đánh Giá TB', '/5'),
                'total_reviews': ('💬 Tổng Đánh Giá', 'đánh giá'),
                # Inventory metrics
                'low_stock_products': ('⚠️ Sản Phẩm Sắp Hết', 'sản phẩm'),
                'out_of_stock_products': ('🔴 Sản Phẩm Hết Hàng', 'sản phẩm'),
                'total_inventory_value': ('📊 Giá Trị Tồn Kho', 'VNĐ'),
                'material_cost': ('💵 Chi Phí Nguyên Liệu', 'VNĐ'),
                'total_material_cost': ('💵 Tổng Chi Phí Nguyên Liệu', 'VNĐ'),
                'profit': ('📌 Lợi Nhuận (Ước Tính)', 'VNĐ'),
                'profit_margin': ('📊 Biên Lợi Nhuận', '%'),
            }
            currency_keys = {
                'total_revenue',
                'avg_order_value',
                'total_inventory_value',
                'material_cost',
                'total_material_cost',
                'profit',
            }
            percent_keys = {'customer_retention_rate', 'profit_margin'}
            float4_keys = {'product_diversity_score'}
            
            for key, (label, unit) in key_metrics.items():
                if key in summary and summary[key] is not None:
                    value = summary[key]
                    if isinstance(value, (int, float)):
                        if key in currency_keys:
                            value = f"{value:,.0f}".replace(',', '.')
                        elif key in percent_keys:
                            pct = float(value)
                            if pct <= 1:
                                pct *= 100
                            value = f"{pct:.2f}"
                        elif key in float4_keys:
                            value = f"{float(value):.4f}"
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

                    {anomaly_html}
                    {forecast_html}
                    
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
        recommendations: Optional[List[str]] = None,
        raw_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """Build plain text email body"""
        text = f"""
BÁO CÁO PHÂN TÍCH AI
Chi Nhánh: {branch_id}
Ngày: {report_date}

"""
        # Manager email: keep body short. Details (data source / daily metrics / analysis) are in the PDF attachment.
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
    
    def _format_all_branches_ai_analysis(
        self,
        analysis_text: str,
        heading_style: ParagraphStyle,
        heading3_style: ParagraphStyle,
        normal_style: ParagraphStyle
    ) -> List:
        """
        Format AI analysis text for ALL BRANCHES by organizing into sections:
        1. TỔNG QUAN TẤT CẢ CHI NHÁNH
        2. ĐÁNH GIÁ TỪNG CHI NHÁNH
        3. SO SÁNH VÀ PHÂN TÍCH
        4. KHUYẾN NGHỊ CHO TỪNG CHI NHÁNH
        5. KẾT LUẬN
        """
        if not analysis_text:
            return []
        
        story = []
        lines = analysis_text.split('\n')
        
        # Sections to extract
        sections = {
            'overview': {'title': '1. TỔNG QUAN TẤT CẢ CHI NHÁNH', 'content': []},
            'branch_evaluation': {'title': '2. ĐÁNH GIÁ TỪNG CHI NHÁNH', 'content': []},
            'comparison': {'title': '3. SO SÁNH VÀ PHÂN TÍCH', 'content': []},
            'recommendations': {'title': '4. KHUYẾN NGHỊ CHO TỪNG CHI NHÁNH', 'content': []},
            'conclusion': {'title': '5. KẾT LUẬN', 'content': []}
        }
        
        current_section = None
        current_content = []
        
        def clean_text(text: str) -> str:
            """Remove markdown formatting characters"""
            text = text.strip()
            text = text.replace('###', '').replace('##', '').replace('#', '')
            text = text.replace('**', '').replace('*', '').replace('__', '').replace('_', '')
            text = text.strip()
            text = re.sub(r'^\d+\.\s*', '', text)
            return text.strip()
        
        def detect_section(line: str) -> Optional[str]:
            """Detect which section a line belongs to"""
            line_lower = line.lower()
            cleaned = clean_text(line)
            cleaned_lower = cleaned.lower()
            
            # Check for overview section (1. TỔNG QUAN...)
            if (re.match(r'^[#\s]*1[\.\)]\s*', line_lower) or 
                'tổng quan' in cleaned_lower or 
                'tổng quan tất cả chi nhánh' in cleaned_lower):
                return 'overview'
            
            # Check for branch evaluation section (2. ĐÁNH GIÁ...)
            if (re.match(r'^[#\s]*2[\.\)]\s*', line_lower) or 
                ('đánh giá' in cleaned_lower and 'từng chi nhánh' in cleaned_lower)):
                return 'branch_evaluation'
            
            # Check for comparison section (3. SO SÁNH...)
            if (re.match(r'^[#\s]*3[\.\)]\s*', line_lower) or 
                ('so sánh' in cleaned_lower and 'phân tích' in cleaned_lower)):
                return 'comparison'
            
            # Check for recommendations section (4. KHUYẾN NGHỊ...)
            if (re.match(r'^[#\s]*4[\.\)]\s*', line_lower) or 
                ('khuyến nghị' in cleaned_lower and 'từng chi nhánh' in cleaned_lower)):
                return 'recommendations'
            
            # Check for conclusion section (5. KẾT LUẬN...)
            if (re.match(r'^[#\s]*5[\.\)]\s*', line_lower) or 
                'kết luận' in cleaned_lower):
                return 'conclusion'
            
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
                # Skip lines that are just section headers
                is_header_only = (
                    any(keyword in cleaned.lower() for keyword in [
                        'tổng quan', 'đánh giá từng chi nhánh', 'so sánh và phân tích',
                        'khuyến nghị cho từng chi nhánh', 'kết luận', 'tình hình hoạt động'
                    ]) and len(cleaned) < 50
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
            # Fallback: parse by detecting section keywords in content
            current_section = None
            for line in lines:
                cleaned = clean_text(line)
                if not cleaned or len(cleaned) < 5:
                    continue
                
                # Try to detect section from content
                if 'tổng quan' in cleaned.lower() or 'tổng doanh thu' in cleaned.lower():
                    current_section = 'overview'
                    continue
                elif 'đánh giá từng chi nhánh' in cleaned.lower() or 'chi nhánh 1:' in cleaned.lower() or 'chi nhánh 2:' in cleaned.lower():
                    current_section = 'branch_evaluation'
                    continue
                elif 'so sánh' in cleaned.lower() and 'phân tích' in cleaned.lower():
                    current_section = 'comparison'
                    continue
                elif 'khuyến nghị' in cleaned.lower() and 'từng chi nhánh' in cleaned.lower():
                    current_section = 'recommendations'
                    continue
                elif 'kết luận' in cleaned.lower() or 'tóm tắt tình hình tổng thể' in cleaned.lower():
                    current_section = 'conclusion'
                    continue
                
                # Add content to current section
                if current_section:
                    sections[current_section]['content'].append(cleaned)
                elif not current_section:
                    # Default to overview if no section detected
                    sections['overview']['content'].append(cleaned)
        
        # Build PDF story from sections
        # 1. Overview section
        if sections['overview']['content']:
            story.append(Paragraph(sections['overview']['title'], heading3_style))
            story.append(Spacer(1, 0.15*inch))
            for item in sections['overview']['content']:
                if item and len(item) > 5:
                    # Check if it's a sub-section header
                    if any(keyword in item.lower() for keyword in ['tổng doanh thu', 'số đơn hàng', 'số khách hàng', 'chi nhánh hoạt động']):
                        story.append(Paragraph(f"• {item}", normal_style))
                    else:
                        story.append(Paragraph(f"  {item}", normal_style))
                    story.append(Spacer(1, 0.1*inch))
            story.append(Spacer(1, 0.2*inch))
        
        # 2. Branch Evaluation section
        if sections['branch_evaluation']['content']:
            story.append(Paragraph(sections['branch_evaluation']['title'], heading3_style))
            story.append(Spacer(1, 0.15*inch))
            for item in sections['branch_evaluation']['content']:
                if item and len(item) > 5:
                    # Check if it's a branch header (Chi nhánh X:)
                    if re.match(r'^chi nhánh \d+:', item.lower()):
                        story.append(Paragraph(f"• {item}", normal_style))
                    elif any(keyword in item.lower() for keyword in ['id:', 'điểm mạnh:', 'điểm yếu:', 'đánh giá tổng thể:', 'xếp hạng:']):
                        story.append(Paragraph(f"  • {item}", normal_style))
                    else:
                        story.append(Paragraph(f"    {item}", normal_style))
                    story.append(Spacer(1, 0.08*inch))
            story.append(Spacer(1, 0.2*inch))
        
        # 3. Comparison section
        if sections['comparison']['content']:
            story.append(Paragraph(sections['comparison']['title'], heading3_style))
            story.append(Spacer(1, 0.15*inch))
            for item in sections['comparison']['content']:
                if item and len(item) > 5:
                    # Check if it's a sub-section header
                    if any(keyword in item.lower() for keyword in ['chi nhánh nào đang dẫn đầu', 'chi nhánh nào cần hỗ trợ', 'xu hướng chung']):
                        story.append(Paragraph(f"• {item}", normal_style))
                    else:
                        story.append(Paragraph(f"  {item}", normal_style))
                    story.append(Spacer(1, 0.1*inch))
            story.append(Spacer(1, 0.2*inch))
        
        # 4. Recommendations section
        if sections['recommendations']['content']:
            story.append(Paragraph(sections['recommendations']['title'], heading3_style))
            story.append(Spacer(1, 0.15*inch))
            for item in sections['recommendations']['content']:
                if item and len(item) > 5:
                    # Check if it's a branch recommendation header
                    if re.match(r'^(main branch|sunshine|riverside|laza|chi nhánh \d+):', item.lower()):
                        story.append(Paragraph(f"• {item}", normal_style))
                    elif re.match(r'^\d+\.', item):
                        story.append(Paragraph(f"  {item}", normal_style))
                    else:
                        story.append(Paragraph(f"    {item}", normal_style))
                    story.append(Spacer(1, 0.1*inch))
            story.append(Spacer(1, 0.2*inch))
        
        # 5. Conclusion section (IMPORTANT - ensure it's always included)
        if sections['conclusion']['content']:
            story.append(Paragraph(sections['conclusion']['title'], heading3_style))
            story.append(Spacer(1, 0.15*inch))
            for item in sections['conclusion']['content']:
                if item and len(item) > 5:
                    # Check if it's a sub-section header
                    if any(keyword in item.lower() for keyword in ['tóm tắt tình hình tổng thể', 'đề xuất hành động ưu tiên']):
                        story.append(Paragraph(f"• {item}", normal_style))
                    else:
                        story.append(Paragraph(f"  {item}", normal_style))
                    story.append(Spacer(1, 0.1*inch))
            story.append(Spacer(1, 0.2*inch))
        else:
            # If conclusion section is missing, add a placeholder
            story.append(Paragraph(sections['conclusion']['title'], heading3_style))
            story.append(Spacer(1, 0.15*inch))
            story.append(Paragraph("  Phần kết luận sẽ được cập nhật trong báo cáo tiếp theo.", normal_style))
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
                'peak_hour': ('Giờ cao điểm', 'giờ', str),
                # Customer metrics
                'customer_count': ('Tổng Khách Hàng', 'người', str),
                'new_customers': ('Khách Hàng Mới', 'người', str),
                'repeat_customers': ('Khách Hàng Quay Lại', 'người', str),
                'customer_retention_rate': ('Tỷ lệ giữ chân', '%', lambda x: format_percent((float(x) * 100) if isinstance(x, (int, float)) and float(x) <= 1 else float(x))),
                # Product metrics
                'unique_products_sold': ('Sản Phẩm Đã Bán', 'sản phẩm', str),
                'product_diversity_score': ('Độ đa dạng sản phẩm', '', lambda x: f"{float(x):.4f}" if isinstance(x, (int, float)) else str(x)),
                # Review metrics
                'avg_review_score': ('Đánh Giá Trung Bình', '/5', lambda x: f"{x:.2f}" if isinstance(x, float) else str(x)),
                'total_reviews': ('Tổng Đánh Giá', 'đánh giá', str),
                # Inventory metrics
                'low_stock_products': ('Sản Phẩm Sắp Hết', 'sản phẩm', str),
                'out_of_stock_products': ('Sản Phẩm Hết Hàng', 'sản phẩm', str),
                'total_inventory_value': ('Giá Trị Tồn Kho', 'VNĐ', format_currency),
                'material_cost': ('Chi Phí Nguyên Liệu', 'VNĐ', format_currency),
                'total_material_cost': ('Tổng Chi Phí Nguyên Liệu', 'VNĐ', format_currency),
                'profit': ('Lợi nhuận (ước tính)', 'VNĐ', format_currency),
                'profit_margin': ('Biên lợi nhuận', '%', lambda x: format_percent((float(x) * 100) if isinstance(x, (int, float)) and float(x) <= 1 else float(x))),
            }
            
            # Helper function to format table cells with Vietnamese font
            def format_cell(text):
                """Format table cell text with Vietnamese font"""
                if not text:
                    return ''
                return Paragraph(str(text), table_normal_style)
            
            # Convert all data to Paragraph objects for proper font rendering (no legacy grouping)
            formatted_summary_data = [[format_cell('Chỉ Tiêu'), format_cell('Giá Trị')]]
            for key, (label, unit, formatter) in metric_labels.items():
                if key in summary and summary[key] is not None:
                    value = summary[key]
                    formatted_value = formatter(value)
                    value_str = f"{formatted_value} {unit}"
                    formatted_summary_data.append([format_cell(label), format_cell(value_str)])
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

        # daily_branch_metrics + ML sections (no legacy 6-API raw tables)
        if raw_data and isinstance(raw_data, dict):
            dm = raw_data.get("daily_branch_metrics") or {}
            dk = raw_data.get("derived_kpis") or {}
            iso = raw_data.get("isolation_forest_anomaly") or {}
            fc = raw_data.get("prophet_forecast") or {}

            def format_cell(text):
                if not text:
                    return ''
                return Paragraph(str(text), table_normal_style)

            if isinstance(dm, dict) and dm:
                story.append(PageBreak())
                story.append(Paragraph("Chỉ Số Theo Ngày (daily_branch_metrics)", heading_style))
                dm_table = [[format_cell("Chỉ tiêu"), format_cell("Giá trị")]]
                for k in [
                    "total_revenue",
                    "order_count",
                    "avg_order_value",
                    "peak_hour",
                    "customer_count",
                    "new_customers",
                    "repeat_customers",
                    "unique_products_sold",
                    "product_diversity_score",
                    "avg_review_score",
                    "total_reviews",
                    "low_stock_products",
                    "out_of_stock_products",
                    "material_cost",
                ]:
                    if k in dm and dm.get(k) is not None:
                        dm_table.append([format_cell(k), format_cell(dm.get(k))])
                if isinstance(dk, dict) and dk:
                    if dk.get("profit") is not None:
                        dm_table.append([format_cell("profit (ước tính)"), format_cell(format_currency(dk.get("profit")))])
                    if dk.get("profit_margin") is not None:
                        dm_table.append([format_cell("profit_margin"), format_cell(format_percent(dk.get("profit_margin"))) ])
                t = Table(dm_table, colWidths=[3.2*inch, 2.8*inch])
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ]))
                story.append(t)
                story.append(Spacer(1, 0.2*inch))

            if isinstance(iso, dict) and iso:
                story.append(Paragraph("Phát Hiện Bất Thường (Isolation Forest)", heading_style))
                is_anomaly = bool(iso.get("co_bat_thuong") or iso.get("is_anomaly") or iso.get("is_anomaly_iforest"))
                conf = iso.get("adjusted_confidence") or iso.get("confidence") or iso.get("do_tin_cay")
                story.append(Paragraph(f"Trạng thái: {'CÓ BẤT THƯỜNG' if is_anomaly else 'Không có bất thường'}", normal_style))
                story.append(Paragraph(f"Độ tin cậy: {conf if conf is not None else 'N/A'}", normal_style))
                chi_tieu = iso.get("chi_tieu_bat_thuong") or iso.get("anomalous_features") or []
                if isinstance(chi_tieu, list) and chi_tieu:
                    story.append(Spacer(1, 0.1*inch))
                    for item in chi_tieu:
                        if isinstance(item, dict):
                            metric = item.get("metric") or item.get("name") or item.get("chi_tieu")
                            change = item.get("change_percent") or item.get("phan_tram_thay_doi") or item.get("delta_percent")
                            sev = item.get("severity") or item.get("muc_do") or item.get("level")
                            parts = [p for p in [metric, f"{change}%" if change is not None else None, sev] if p]
                            if parts:
                                story.append(Paragraph("• " + " | ".join([str(p) for p in parts]), normal_style))
                story.append(Spacer(1, 0.2*inch))

            if isinstance(fc, dict) and fc:
                story.append(Paragraph("Dự Báo Tương Lai (Prophet)", heading_style))
                do_tin_cay = fc.get("do_tin_cay")
                conf_pct = do_tin_cay.get("phan_tram") if isinstance(do_tin_cay, dict) else do_tin_cay
                if conf_pct is None:
                    conf_pct = fc.get("confidence")
                target_metric = fc.get("chi_tieu_code") or fc.get("target_metric") or "order_count"
                story.append(Paragraph(f"Chỉ tiêu: {target_metric}", normal_style))
                story.append(Paragraph(f"Độ tin cậy: {conf_pct if conf_pct is not None else 'N/A'}", normal_style))
                story.append(Spacer(1, 0.2*inch))
        
        # Recommendations section
        if recommendations:
            story.append(PageBreak())
            story.append(Paragraph("Khuyến Nghị Hành Động", heading_style))
            for i, rec in enumerate(recommendations, 1):
                story.append(Paragraph(f"{i}. {rec}", normal_style))
                story.append(Spacer(1, 0.1*inch))
        
        # (legacy 6-API raw tables removed)
        
        # Footer
        story.append(Spacer(1, 0.5*inch))
        story.append(Paragraph("AI Analytics Service - Báo cáo được tạo tự động", normal_style))
        story.append(Paragraph("Hệ thống quản lý cà phê - Coffee Management System", normal_style))
        
        # Build PDF
        doc.build(story)
        
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
    
    # ========== Admin Email Methods (All Branches) ==========
    
    async def send_all_branches_report_email(
        self,
        to_emails: List[str],
        report_date: str,
        analysis: str,
        summary: Optional[dict] = None,
        recommendations: Optional[List[str]] = None,
        raw_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Send AI report for ALL branches via email to admin
        
        Args:
            to_emails: List of recipient email addresses (admin emails)
            report_date: Report date (string)
            analysis: Full AI analysis text for all branches
            summary: Summary metrics across all branches (optional)
            recommendations: List of recommendations (optional)
            raw_data: Raw data dictionary with all branches metrics (optional)
        
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
            message["Subject"] = f"📊 Báo Cáo Phân Tích AI - Tất Cả Chi Nhánh - {report_date}"
            
            # Build HTML email body
            html_body = self._build_all_branches_email_html(
                report_date=report_date,
                analysis=analysis,
                summary=summary,
                recommendations=recommendations,
                raw_data=raw_data
            )
            
            # Build plain text version
            text_body = self._build_all_branches_email_text(
                report_date=report_date,
                analysis=analysis,
                summary=summary,
                recommendations=recommendations,
                raw_data=raw_data
            )
            
            # Add both versions
            message.attach(MIMEText(text_body, "plain", "utf-8"))
            message.attach(MIMEText(html_body, "html", "utf-8"))
            
            # Generate and attach PDF report file
            try:
                pdf_path = self._generate_all_branches_pdf_file(
                    report_date=report_date,
                    analysis=analysis,
                    summary=summary,
                    recommendations=recommendations,
                    raw_data=raw_data
                )
                
                # Attach PDF file
                with open(pdf_path, 'rb') as f:
                    attachment = MIMEBase('application', 'pdf')
                    attachment.set_payload(f.read())
                    encoders.encode_base64(attachment)
                    attachment.add_header(
                        'Content-Disposition',
                        f'attachment; filename= "Bao_Cao_AI_Tat_Ca_Chi_Nhanh_{report_date.replace("-", "_")}.pdf"'
                    )
                    message.attach(attachment)
                
                # Clean up temporary file
                os.unlink(pdf_path)
                logger.info(f"All branches report PDF file attached successfully")
            except Exception as e:
                logger.warning(f"Failed to attach PDF report file: {e}. Continuing without attachment.", exc_info=True)
            
            # Send email using SMTPAsync client
            if self.smtp_port == 465:
                smtp = aiosmtplib.SMTP(
                    hostname=self.smtp_host,
                    port=self.smtp_port,
                    use_tls=True,
                )
            else:
                smtp = aiosmtplib.SMTP(
                    hostname=self.smtp_host,
                    port=self.smtp_port,
                    use_tls=False,
                )
            
            await smtp.connect()
            
            if self.smtp_port == 587:
                try:
                    await smtp.starttls()
                except Exception as tls_error:
                    error_msg = str(tls_error).lower()
                    if "already using tls" not in error_msg and "connection already" not in error_msg:
                        raise
            
            await smtp.login(self.smtp_user, self.smtp_password)
            await smtp.send_message(message)
            await smtp.quit()
            
            logger.info(f"All branches report email sent successfully to {to_emails}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending all branches report email: {e}", exc_info=True)
            return False
    
    def _build_all_branches_email_html(
        self,
        report_date: str,
        analysis: str,
        summary: Optional[dict] = None,
        recommendations: Optional[List[str]] = None,
        raw_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """Build HTML email body for all branches report"""
        # daily_branch_metrics (all branches) + ML overview (from raw_data)
        data_source_html = ""
        ml_overview_html = ""
        branches_table_html = ""
        analysis_html = ""

        try:
            if raw_data and isinstance(raw_data, dict):
                source = raw_data.get("source") or ("daily_branch_metrics" if "branches" in raw_data else None)
                if source:
                    data_source_html = f"""
                    <div class="analysis-section" style="border-left-color:#3498db;">
                        <h2 style="color:#3498db;">🗄️ Nguồn Dữ Liệu</h2>
                        <div class="analysis-preview">Nguồn: <strong>{html_lib.escape(str(source))}</strong></div>
                    </div>
                    """

                ml_info = raw_data.get("ml_enrichment") or {}
                branches = raw_data.get("branches") or []
                processed = int(ml_info.get("branches_processed") or 0) if isinstance(ml_info, dict) else 0

                anomaly_branch_ids = []
                if isinstance(branches, list):
                    for b in branches:
                        if not isinstance(b, dict):
                            continue
                        iso = b.get("isolation_forest_anomaly") or {}
                        if isinstance(iso, dict) and iso:
                            is_anomaly = bool(iso.get("co_bat_thuong") or iso.get("is_anomaly") or iso.get("is_anomaly_iforest"))
                            if is_anomaly:
                                bid = b.get("branch_id")
                                if bid is not None:
                                    anomaly_branch_ids.append(bid)
                anomaly_preview = ", ".join([str(x) for x in anomaly_branch_ids[:10]]) if anomaly_branch_ids else "Không có"

                if isinstance(ml_info, dict) and ml_info:
                    ml_overview_html = f"""
                    <div class="analysis-section" style="border-left-color:#667eea;">
                        <h2 style="color:#667eea;">🧠 ML (Bất Thường & Dự Báo)</h2>
                        <div class="analysis-preview">
                            Bật ML: <strong>{html_lib.escape(str(ml_info.get('enabled')))}</strong><br>
                            Chi nhánh đã chạy ML: <strong>{processed}</strong><br>
                            Giới hạn: <strong>{html_lib.escape(str(ml_info.get('ml_branch_limit')))}</strong> | Concurrency: <strong>{html_lib.escape(str(ml_info.get('ml_concurrency')))}</strong><br>
                            Chi nhánh có bất thường: <strong>{len(anomaly_branch_ids)}</strong><br>
                            Danh sách (tối đa 10): {html_lib.escape(str(anomaly_preview))}
                        </div>
                    </div>
                    """

                # Top branches table by revenue (best-effort)
                if isinstance(branches, list) and branches:
                    def _rev(b):
                        dm = (b or {}).get("daily_branch_metrics") or {}
                        v = dm.get("total_revenue")
                        try:
                            return float(v) if v is not None else 0.0
                        except Exception:
                            return 0.0

                    top = sorted([b for b in branches if isinstance(b, dict)], key=_rev, reverse=True)[:10]
                    rows_html = ""
                    for b in top:
                        dm = b.get("daily_branch_metrics") or {}
                        dk = b.get("derived_kpis") or {}
                        iso = b.get("isolation_forest_anomaly") or {}
                        fc = b.get("prophet_forecast") or {}

                        bid = b.get("branch_id")
                        rev = dm.get("total_revenue")
                        orders = dm.get("order_count")
                        cust = dm.get("customer_count")
                        pm = dk.get("profit_margin")
                        is_anom = bool(isinstance(iso, dict) and (iso.get("co_bat_thuong") or iso.get("is_anomaly") or iso.get("is_anomaly_iforest")))
                        do_tin_cay = fc.get("do_tin_cay") if isinstance(fc, dict) else None
                        fc_conf = do_tin_cay.get("phan_tram") if isinstance(do_tin_cay, dict) else do_tin_cay

                        # Format for readability
                        try:
                            rev_fmt = f"{float(rev):,.0f}".replace(",", ".") if rev is not None else "N/A"
                        except Exception:
                            rev_fmt = str(rev)
                        try:
                            pm_num = float(pm) if pm is not None else None
                            pm_fmt = (
                                f"{(pm_num * 100):.2f}%"
                                if pm_num is not None and pm_num <= 1
                                else (f"{pm_num:.2f}%" if pm_num is not None else "N/A")
                            )
                        except Exception:
                            pm_fmt = str(pm)

                        rows_html += f"""
                            <tr>
                                <td style="padding:10px;border-bottom:1px solid #eee;">{html_lib.escape(str(bid))}</td>
                                <td style="padding:10px;border-bottom:1px solid #eee;font-weight:600;">{html_lib.escape(str(rev_fmt))}</td>
                                <td style="padding:10px;border-bottom:1px solid #eee;">{html_lib.escape(str(orders))}</td>
                                <td style="padding:10px;border-bottom:1px solid #eee;">{html_lib.escape(str(cust))}</td>
                                <td style="padding:10px;border-bottom:1px solid #eee;">{html_lib.escape(str(pm_fmt))}</td>
                                <td style="padding:10px;border-bottom:1px solid #eee;">{'⚠️ Có' if is_anom else '✅ Không'}</td>
                                <td style="padding:10px;border-bottom:1px solid #eee;">{html_lib.escape(str(fc_conf)) if fc_conf is not None else 'N/A'}</td>
                            </tr>
                        """

                    branches_table_html = f"""
                    <div class="analysis-section" style="border-left-color:#e67e22;">
                        <h2 style="color:#e67e22;">🏆 Top Chi Nhánh (theo doanh thu)</h2>
                        <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                            <table style="width:100%;border-collapse:collapse;">
                                <thead>
                                    <tr style="background:#fafafa;">
                                        <th style="text-align:left;padding:10px;border-bottom:1px solid #eee;">Branch</th>
                                        <th style="text-align:left;padding:10px;border-bottom:1px solid #eee;">Doanh thu</th>
                                        <th style="text-align:left;padding:10px;border-bottom:1px solid #eee;">Đơn</th>
                                        <th style="text-align:left;padding:10px;border-bottom:1px solid #eee;">Khách</th>
                                        <th style="text-align:left;padding:10px;border-bottom:1px solid #eee;">Biên LN</th>
                                        <th style="text-align:left;padding:10px;border-bottom:1px solid #eee;">Bất thường</th>
                                        <th style="text-align:left;padding:10px;border-bottom:1px solid #eee;">Tin cậy dự báo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows_html}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    """

            if analysis:
                preview = analysis.strip()
                if len(preview) > 1600:
                    preview = preview[:1600] + "\n...\n(đã rút gọn, xem PDF để đầy đủ)"
                preview = html_lib.escape(preview)
                analysis_html = f"""
                <div class="analysis-section">
                    <h2>🧾 Nhận Định & Phân Tích</h2>
                    <div class="analysis-preview">{preview}</div>
                </div>
                """
        except Exception:
            pass

        # Format summary metrics nicely
        summary_html = ""
        if summary:
            summary_html = """
                    <div class="summary-box">
                        <h2>📈 Tóm Tắt Metrics Tổng Hợp</h2>
                        <div class="metrics-grid">
            """
            # Key metrics to highlight for all branches
            key_metrics = {
                'total_branches': ('🏢 Tổng Số Chi Nhánh', 'chi nhánh'),
                'active_branches': ('✅ Chi Nhánh Hoạt Động', 'chi nhánh'),
                'total_revenue': ('💰 Tổng Doanh Thu', 'VNĐ'),
                'total_order_count': ('🛒 Tổng Số Đơn Hàng', 'đơn'),
                'avg_order_value': ('📊 Giá Trị TB/Đơn', 'VNĐ'),
                'total_customer_count': ('👥 Tổng Khách Hàng', 'người'),
                'total_new_customers': ('🆕 Khách Hàng Mới', 'người'),
                'total_repeat_customers': ('🔄 Khách Hàng Quay Lại', 'người'),
                'overall_customer_retention_rate': ('📈 Tỷ Lệ Giữ Chân', '%'),
                'total_unique_products_sold': ('📦 Sản Phẩm Đã Bán', 'sản phẩm'),
                'overall_product_diversity_score': ('🧩 Độ Đa Dạng SP (TB)', ''),
                'overall_avg_review_score': ('⭐ Đánh Giá TB', '/5'),
                'total_reviews': ('💬 Tổng Đánh Giá', 'đánh giá'),
                'average_revenue_per_branch': ('💵 Doanh Thu TB/Chi Nhánh', 'VNĐ'),
                'total_material_cost': ('💵 Tổng Chi Phí Nguyên Liệu', 'VNĐ'),
                'total_profit': ('📌 Tổng Lợi Nhuận (Ước Tính)', 'VNĐ'),
                'overall_profit_margin': ('📊 Biên Lợi Nhuận (TB)', '%'),
            }
            
            for key, (label, unit) in key_metrics.items():
                if key in summary and summary[key] is not None:
                    value = summary[key]
                    if isinstance(value, (int, float)):
                        if key in ['total_revenue', 'avg_order_value', 'average_revenue_per_branch', 'total_material_cost', 'total_profit']:
                            value = f"{value:,.0f}".replace(',', '.')
                        elif key == 'overall_avg_review_score':
                            value = f"{value:.2f}"
                        elif key == 'overall_customer_retention_rate':
                            value = f"{value * 100:.2f}" if value < 1 else f"{value:.2f}"
                        elif key == 'overall_profit_margin':
                            value = f"{value * 100:.2f}" if value < 1 else f"{value:.2f}"
                        elif key == 'overall_product_diversity_score':
                            value = f"{value:.4f}"
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
                    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
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
                    border-left: 5px solid #e74c3c;
                }}
                .summary-box h2 {{
                    color: #e74c3c;
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
                    background: #e74c3c;
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
                    <h1>📊 Báo Cáo Phân Tích AI - Tất Cả Chi Nhánh</h1>
                    <p>Ngày: {report_date}</p>
                </div>
                <div class="content">
                    {summary_html}
                    
                    {recommendations_html}
                    
                    <div class="attachment-notice">
                        <strong>📎 File Báo Cáo Đầy Đủ (PDF)</strong><br>
                        Vui lòng mở file PDF đính kèm để xem báo cáo chi tiết với đánh giá từng chi nhánh, so sánh hiệu suất và khuyến nghị cụ thể.
                    </div>
                    
                    <div class="footer">
                        <p>Tạo tự động bởi AI Analytics Service - Dành cho Admin</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        return html
    
    def _build_all_branches_email_text(
        self,
        report_date: str,
        analysis: str,
        summary: Optional[dict] = None,
        recommendations: Optional[List[str]] = None,
        raw_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """Build plain text email body for all branches"""
        text = f"""
BÁO CÁO PHÂN TÍCH AI - TẤT CẢ CHI NHÁNH
Ngày: {report_date}

"""
        # Admin email: keep body short. Details (data source / ML / top branches / analysis) are in the PDF attachment.
        if summary:
            text += "TÓM TẮT METRICS TỔNG HỢP:\n"
            for key, value in summary.items():
                if value is not None:
                    text += f"- {key.replace('_', ' ').title()}: {value}\n"
            text += "\n"
        
        if recommendations:
            text += "KHUYẾN NGHỊ:\n"
            for i, rec in enumerate(recommendations, 1):
                text += f"{i}. {rec}\n"

        return text
    
    def _generate_all_branches_pdf_file(
        self,
        report_date: str,
        analysis: str,
        summary: Optional[dict] = None,
        recommendations: Optional[List[str]] = None,
        raw_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate comprehensive PDF report file for all branches"""
        # Format currency
        def format_currency(value):
            if isinstance(value, (int, float)):
                return f"{value:,.0f}".replace(',', '.')
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
            textColor=colors.HexColor('#e74c3c'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontName=vietnamese_font,
            fontSize=18,
            textColor=colors.HexColor('#e74c3c'),
            spaceAfter=15,
            spaceBefore=20
        )
        
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
        
        table_normal_style = ParagraphStyle(
            'TableNormal',
            fontName=vietnamese_font,
            fontSize=9
        )
        
        # Title
        story.append(Paragraph(f"Báo Cáo Phân Tích AI - Tất Cả Chi Nhánh", title_style))
        story.append(Paragraph(f"Ngày: {report_date}", normal_style))
        story.append(Paragraph(f"Thời gian tạo: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}", normal_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Summary section
        if summary:
            story.append(Paragraph("Tóm Tắt Metrics Tổng Hợp", heading_style))
            
            summary_data = [['Chỉ Tiêu', 'Giá Trị']]
            metric_labels = {
                'total_branches': ('Tổng Số Chi Nhánh', 'chi nhánh', str),
                'active_branches': ('Chi Nhánh Hoạt Động', 'chi nhánh', str),
                'total_revenue': ('Tổng Doanh Thu', 'VNĐ', format_currency),
                'total_order_count': ('Tổng Số Đơn Hàng', 'đơn', str),
                'avg_order_value': ('Giá Trị TB/Đơn', 'VNĐ', format_currency),
                'total_customer_count': ('Tổng Khách Hàng', 'người', str),
                'total_new_customers': ('Khách Hàng Mới', 'người', str),
                'total_repeat_customers': ('Khách Hàng Quay Lại', 'người', str),
                'overall_customer_retention_rate': ('Tỷ Lệ Giữ Chân', '%', lambda x: f"{x * 100:.2f}" if isinstance(x, float) and x < 1 else f"{x:.2f}"),
                'total_unique_products_sold': ('Sản Phẩm Đã Bán', 'sản phẩm', str),
                'overall_product_diversity_score': ('Độ Đa Dạng SP (TB)', '', lambda x: f"{float(x):.4f}" if isinstance(x, (int, float)) else str(x)),
                'overall_avg_review_score': ('Đánh Giá TB', '/5', lambda x: f"{x:.2f}" if isinstance(x, float) else str(x)),
                'total_reviews': ('Tổng Đánh Giá', 'đánh giá', str),
                'average_revenue_per_branch': ('Doanh Thu TB/Chi Nhánh', 'VNĐ', format_currency),
                'total_material_cost': ('Tổng Chi Phí Nguyên Liệu', 'VNĐ', format_currency),
                'total_profit': ('Tổng Lợi Nhuận (Ước Tính)', 'VNĐ', format_currency),
                'overall_profit_margin': ('Biên Lợi Nhuận (TB)', '%', lambda x: f"{(float(x) * 100):.2f}" if isinstance(x, (int, float)) and float(x) <= 1 else f"{float(x):.2f}"),
            }
            
            def format_cell(text):
                if not text:
                    return ''
                return Paragraph(str(text), table_normal_style)
            
            formatted_summary_data = [[format_cell('Chỉ Tiêu'), format_cell('Giá Trị')]]
            
            for key, (label, unit, formatter) in metric_labels.items():
                if key in summary and summary[key] is not None:
                    value = summary[key]
                    formatted_value = formatter(value)
                    value_str = f"{formatted_value} {unit}"
                    formatted_summary_data.append([format_cell(label), format_cell(value_str)])
            
            summary_table = Table(formatted_summary_data, colWidths=[4*inch, 2*inch])
            table_style = TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e74c3c')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ])
            summary_table.setStyle(table_style)
            story.append(summary_table)
            story.append(Spacer(1, 0.3*inch))
        
        # Format and add AI Analysis section
        if analysis:
            formatted_analysis = self._format_all_branches_ai_analysis(analysis, heading_style, heading3_style, normal_style)
            if formatted_analysis:
                story.append(PageBreak())
                story.append(Paragraph("Phân Tích AI - Đánh Giá Tất Cả Chi Nhánh", heading_style))
                story.extend(formatted_analysis)
                story.append(Spacer(1, 0.3*inch))

        # Branch table (from daily_branch_metrics payload)
        if raw_data and isinstance(raw_data, dict) and isinstance(raw_data.get("branches"), list) and raw_data.get("branches"):
            story.append(PageBreak())
            story.append(Paragraph("Top Chi Nhánh (theo doanh thu) - daily_branch_metrics", heading_style))

            branches = [b for b in raw_data.get("branches") if isinstance(b, dict)]

            def _rev(b):
                dm = (b or {}).get("daily_branch_metrics") or {}
                v = dm.get("total_revenue")
                try:
                    return float(v) if v is not None else 0.0
                except Exception:
                    return 0.0

            top = sorted(branches, key=_rev, reverse=True)[:20]

            def format_cell(text):
                if not text:
                    return ''
                return Paragraph(str(text), table_normal_style)

            branch_data = [[
                format_cell("STT"),
                format_cell("Branch"),
                format_cell("Doanh thu"),
                format_cell("Đơn"),
                format_cell("Khách"),
                format_cell("Biên LN"),
                format_cell("Bất thường"),
            ]]

            for idx, b in enumerate(top, 1):
                dm = b.get("daily_branch_metrics") or {}
                dk = b.get("derived_kpis") or {}
                iso = b.get("isolation_forest_anomaly") or {}
                is_anom = bool(isinstance(iso, dict) and (iso.get("co_bat_thuong") or iso.get("is_anomaly") or iso.get("is_anomaly_iforest")))
                branch_data.append([
                    format_cell(idx),
                    format_cell(b.get("branch_id")),
                    format_cell(format_currency(dm.get("total_revenue") or 0)),
                    format_cell(dm.get("order_count") or 0),
                    format_cell(dm.get("customer_count") or 0),
                    format_cell(f"{(float(dk.get('profit_margin')) * 100):.2f}%" if isinstance(dk.get("profit_margin"), (int, float)) and float(dk.get("profit_margin")) <= 1 else dk.get("profit_margin")),
                    format_cell("Có" if is_anom else "Không"),
                ])

            branch_table = Table(branch_data, colWidths=[0.5*inch, 0.8*inch, 1.2*inch, 0.7*inch, 0.7*inch, 0.9*inch, 0.9*inch])
            branch_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e74c3c')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
            ]))
            story.append(branch_table)
            story.append(Spacer(1, 0.3*inch))
        
        # Recommendations section
        if recommendations:
            story.append(PageBreak())
            story.append(Paragraph("Khuyến Nghị Hành Động", heading_style))
            for i, rec in enumerate(recommendations, 1):
                story.append(Paragraph(f"{i}. {rec}", normal_style))
                story.append(Spacer(1, 0.1*inch))
        
        # Footer
        story.append(Spacer(1, 0.5*inch))
        story.append(Paragraph("AI Analytics Service - Báo cáo được tạo tự động", normal_style))
        story.append(Paragraph("Hệ thống quản lý cà phê - Coffee Management System - Dành cho Admin", normal_style))
        
        # Build PDF
        doc.build(story)
        
        return pdf_path

