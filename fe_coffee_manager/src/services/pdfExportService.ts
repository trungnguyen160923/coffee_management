/**
 * PDF Export Service for AI Statistics Report
 * Supports exporting AI analysis reports to PDF format
 */

import { AIAnalysisResponse } from './aiStatisticsService';

interface PDFExportOptions {
  branchName?: string;
  branchId?: number;
  reportDate: string;
  aiData: AIAnalysisResponse;
}

/**
 * Format number with thousand separators
 */
const formatNumber = (value: number): string => {
  return value.toLocaleString('vi-VN');
};

/**
 * Clean analysis text by removing markdown characters
 */
const cleanAnalysisText = (text: string): string => {
  if (!text) return '';
  
  // Remove markdown headers
  let cleaned = text.replace(/###?\s*/g, '').replace(/##\s*/g, '').replace(/#\s*/g, '');
  
  // Remove bold/italic markers
  cleaned = cleaned.replace(/\*\*/g, '').replace(/\*/g, '').replace(/__/g, '').replace(/_/g, '');
  
  // Remove numbered list prefixes
  cleaned = cleaned.replace(/^\d+\.\s*/gm, '');
  
  // Remove bullet points
  cleaned = cleaned.replace(/^[-•*]\s*/gm, '');
  
  return cleaned.trim();
};

/**
 * Parse analysis text into structured sections
 */
const parseAnalysisSections = (analysisText: string) => {
  const sections = {
    summary: [] as string[],
    strengths: [] as string[],
    weaknesses: [] as string[],
    issues: [] as string[],
    recommendations: [] as string[],
  };

  if (!analysisText) return sections;

  const lines = analysisText.split('\n');
  let currentSection: keyof typeof sections | null = null;

  const cleanLine = (line: string): string => {
    return cleanAnalysisText(line).trim();
  };

  const detectSection = (line: string): keyof typeof sections | null => {
    const lower = line.toLowerCase();
    const cleaned = cleanLine(line).toLowerCase();

    if (cleaned.includes('tóm tắt') || cleaned.includes('tình hình hoạt động') || cleaned.includes('tổng quan')) {
      if (lower.includes('1.') || cleaned.includes('tóm tắt')) return 'summary';
    }
    if (cleaned.includes('điểm mạnh') || cleaned.includes('strengths')) {
      if (lower.includes('2.') || cleaned.includes('điểm mạnh')) return 'strengths';
    }
    if (cleaned.includes('điểm yếu') || cleaned.includes('weaknesses')) {
      return 'weaknesses';
    }
    if (cleaned.includes('vấn đề') || cleaned.includes('chú ý') || cleaned.includes('bất thường')) {
      if (lower.includes('3.') || cleaned.includes('vấn đề')) return 'issues';
    }
    if (cleaned.includes('khuyến nghị') || cleaned.includes('recommendations') || cleaned.includes('hành động')) {
      if (lower.includes('4.') || lower.includes('5.') || cleaned.includes('khuyến nghị')) return 'recommendations';
    }
    return null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const detected = detectSection(trimmed);
    if (detected) {
      currentSection = detected;
      continue;
    }

    if (currentSection) {
      const cleaned = cleanLine(trimmed);
      if (cleaned && cleaned.length > 5) {
        // Skip if it's just a section header
        const isHeader = ['tóm tắt', 'điểm mạnh', 'điểm yếu', 'vấn đề', 'khuyến nghị'].some(
          keyword => cleaned.toLowerCase().includes(keyword) && cleaned.length < 50
        );
        if (!isHeader) {
          sections[currentSection].push(cleaned);
        }
      }
    }
  }

  return sections;
};

/**
 * Generate HTML content for PDF export
 */
const generatePDFHTML = (options: PDFExportOptions): string => {
  const { branchName, branchId, reportDate, aiData } = options;
  const summary = aiData.summary || {};
  const rawData = aiData.raw_data as any;
  const recommendations = aiData.recommendations || [];
  const analysisSections = parseAnalysisSections(aiData.analysis || '');

  // Format date
  const formattedDate = new Date(reportDate).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Get forecast data
  const forecast = rawData?.prophet_forecast;
  const forecastData = forecast?.du_bao_theo_ngay || [];

  // Get anomaly data
  const anomaly = rawData?.isolation_forest_anomaly;
  const anomalyFeatures = anomaly?.chi_tieu_bat_thuong || anomaly?.anomalous_features || [];
  const hasAnomaly = anomaly?.is_anomaly || false;

  // Prepare all data sections
  const revenueByHour = rawData?.revenue_metrics?.revenueByHour || [];
  const orderStatus = {
    completed: rawData?.revenue_metrics?.completedOrders || 0,
    cancelled: rawData?.revenue_metrics?.cancelledOrders || 0,
    pending: rawData?.revenue_metrics?.pendingOrders || 0,
  };
  const topCustomers = (rawData?.customer_metrics?.topCustomers || []).map((item: any) => ({
    name: item.customerName || 'Khách vãng lai',
    orderCount: item.orderCount || 0,
    totalSpent: item.totalSpent ? Number(item.totalSpent) : 0,
  }));
  const topProducts = (rawData?.product_metrics?.topProducts || []).map((item: any) => ({
    name: item.productName || 'N/A',
    quantity: item.quantitySold ? Number(item.quantitySold) : 0,
    revenue: item.revenue ? Number(item.revenue) : 0,
  }));
  const productsByCategory = rawData?.product_metrics?.productsByCategory || {};
  const topIngredientsByValue = (rawData?.inventory_metrics?.topIngredientsByValue || []).map((item: any) => ({
    name: item.ingredientName || 'N/A',
    quantity: item.quantity ? Number(item.quantity) : 0,
    unit: item.unitCode || '',
    stockValue: item.stockValue ? Number(item.stockValue) : 0,
  }));
  const topCostIngredients = (rawData?.material_cost_metrics?.topCostIngredients || []).map((item: any) => ({
    name: item.ingredientName || 'N/A',
    totalCost: item.totalCost ? Number(item.totalCost) : 0,
    percentage: item.percentage ? Number(item.percentage) : 0,
  }));
  const recentReviews = (rawData?.review_metrics?.recentReviews || []).map((review: any) => ({
    rating: review.rating || 0,
    comment: review.comment || review.content || '',
    date: review.createdAt || review.date || '',
  }));
  const reviewDistribution = rawData?.review_metrics?.reviewDistribution || {};
  const revenueByPaymentMethod = rawData?.revenue_metrics?.revenueByPaymentMethod || {};

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo Cáo Phân Tích AI - ${reportDate}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      background: #fff;
      padding: 20px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #f59e0b;
    }
    
    .header h1 {
      font-size: 24px;
      color: #f59e0b;
      margin-bottom: 10px;
      font-weight: bold;
    }
    
    .header-info {
      font-size: 11px;
      color: #666;
      margin-top: 5px;
    }
    
    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .subsection-title {
      font-size: 14px;
      font-weight: bold;
      color: #555;
      margin: 15px 0 10px 0;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    
    .metric-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 12px;
    }
    
    .metric-label {
      font-size: 10px;
      color: #666;
      margin-bottom: 5px;
    }
    
    .metric-value {
      font-size: 18px;
      font-weight: bold;
      color: #111;
    }
    
    .analysis-box {
      background: #f9fafb;
      border-left: 4px solid #10b981;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    
    .strengths-box {
      background: #f0fdf4;
      border-left: 4px solid #10b981;
    }
    
    .weaknesses-box {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
    }
    
    .issues-box {
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
    }
    
    .recommendations-box {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
    }
    
    .analysis-item {
      margin: 8px 0;
      padding-left: 20px;
      position: relative;
    }
    
    .analysis-item::before {
      content: "•";
      position: absolute;
      left: 0;
      color: #667eea;
      font-weight: bold;
    }
    
    .strengths-box .analysis-item::before {
      content: "✓";
      color: #10b981;
    }
    
    .weaknesses-box .analysis-item::before {
      content: "✗";
      color: #ef4444;
    }
    
    .issues-box .analysis-item::before {
      content: "⚠";
      color: #f59e0b;
    }
    
    .recommendations-box .analysis-item::before {
      content: "→";
      color: #3b82f6;
    }
    
    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 11px;
    }
    
    .table th,
    .table td {
      padding: 8px;
      text-align: left;
      border: 1px solid #e5e7eb;
    }
    
    .table th {
      background: #667eea;
      color: white;
      font-weight: bold;
    }
    
    .table tr:nth-child(even) {
      background: #f9fafb;
    }
    
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
    }
    
    .badge-high {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .badge-medium {
      background: #fef3c7;
      color: #92400e;
    }
    
    .badge-low {
      background: #e0e7ff;
      color: #3730a3;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 10px;
      color: #666;
    }
    
    @media print {
      body {
        padding: 15px;
      }
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <h1>📊 Báo Cáo Phân Tích AI</h1>
    <div class="header-info">
      <div>Chi Nhánh: ${branchName || `#${branchId}`}</div>
      <div>Ngày: ${formattedDate}</div>
      <div>Thời gian tạo: ${new Date().toLocaleString('vi-VN')}</div>
    </div>
  </div>

  <!-- 1. Tóm Tắt Tình Hình Hoạt Động -->
  <div class="section">
    <div class="section-title">1. Tóm Tắt Tình Hình Hoạt Động</div>
    
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">💰 Doanh Thu</div>
        <div class="metric-value">${formatNumber(summary.total_revenue || 0)} VNĐ</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">🛒 Số Đơn Hàng</div>
        <div class="metric-value">${formatNumber(summary.order_count || 0)} đơn</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">📊 Giá Trị TB/Đơn</div>
        <div class="metric-value">${formatNumber(summary.avg_order_value || 0)} VNĐ</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">👥 Tổng Khách Hàng</div>
        <div class="metric-value">${formatNumber(summary.customer_count || 0)} người</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">🆕 Khách Hàng Mới</div>
        <div class="metric-value">${formatNumber(summary.new_customers || 0)} người</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">🔄 Khách Quay Lại</div>
        <div class="metric-value">${formatNumber(summary.repeat_customers || 0)} người</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">⭐ Đánh Giá TB</div>
        <div class="metric-value">${(summary.avg_review_score || 0).toFixed(1)}/5</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">💬 Tổng Đánh Giá</div>
        <div class="metric-value">${formatNumber(summary.total_reviews || 0)} đánh giá</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">📦 Sản Phẩm Đã Bán</div>
        <div class="metric-value">${formatNumber(summary.unique_products_sold || 0)} sản phẩm</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">📈 Tỷ Lệ Quay Lại</div>
        <div class="metric-value">${((summary.customer_retention_rate || 0) * 100).toFixed(1)}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">⚠️ Sản Phẩm Sắp Hết</div>
        <div class="metric-value">${formatNumber(summary.low_stock_count || 0)} sản phẩm</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">🔴 Sản Phẩm Hết Hàng</div>
        <div class="metric-value">${formatNumber(summary.out_of_stock_count || 0)} sản phẩm</div>
      </div>
    </div>

    ${revenueByHour.length > 0 ? `
      <div class="subsection-title">📊 Doanh Thu Theo Giờ</div>
      <table class="table">
        <thead>
          <tr>
            <th>Giờ</th>
            <th>Doanh Thu (VNĐ)</th>
            <th>Số Đơn</th>
          </tr>
        </thead>
        <tbody>
          ${revenueByHour.map((item: any) => `
            <tr>
              <td>${item.hour || 0}:00</td>
              <td>${formatNumber(item.revenue || 0)}</td>
              <td>${item.orderCount || 0}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}

    <div class="subsection-title">📋 Tình Trạng Đơn Hàng</div>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 15px 0;">
      <div class="metric-card" style="background: #f0fdf4; border-left: 4px solid #10b981;">
        <div class="metric-label">Hoàn thành</div>
        <div class="metric-value" style="color: #10b981;">${formatNumber(orderStatus.completed)}</div>
      </div>
      <div class="metric-card" style="background: #fffbeb; border-left: 4px solid #f59e0b;">
        <div class="metric-label">Đang chờ</div>
        <div class="metric-value" style="color: #f59e0b;">${formatNumber(orderStatus.pending)}</div>
      </div>
      <div class="metric-card" style="background: #fef2f2; border-left: 4px solid #ef4444;">
        <div class="metric-label">Đã hủy</div>
        <div class="metric-value" style="color: #ef4444;">${formatNumber(orderStatus.cancelled)}</div>
      </div>
    </div>

    ${analysisSections.summary.length > 0 ? `
      <div class="analysis-box">
        ${analysisSections.summary.map(item => `<div class="analysis-item">${item}</div>`).join('')}
      </div>
    ` : ''}
  </div>

  <!-- 2. Điểm Mạnh Và Điểm Yếu -->
  <div class="section">
    <div class="section-title">2. Điểm Mạnh Và Điểm Yếu</div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
      ${analysisSections.strengths.length > 0 ? `
        <div class="analysis-box strengths-box">
          <div class="subsection-title">Điểm Mạnh</div>
          ${analysisSections.strengths.map(item => `<div class="analysis-item">${item}</div>`).join('')}
        </div>
      ` : '<div class="analysis-box strengths-box"><div class="analysis-item">Chưa có thông tin</div></div>'}
      
      ${analysisSections.weaknesses.length > 0 ? `
        <div class="analysis-box weaknesses-box">
          <div class="subsection-title">Điểm Yếu</div>
          ${analysisSections.weaknesses.map(item => `<div class="analysis-item">${item}</div>`).join('')}
        </div>
      ` : '<div class="analysis-box weaknesses-box"><div class="analysis-item">Không có vấn đề</div></div>'}
    </div>
  </div>

  <!-- 3. Các Vấn Đề Cần Chú Ý -->
  <div class="section">
    <div class="section-title">3. Các Vấn Đề Cần Chú Ý</div>
    
    ${hasAnomaly && anomalyFeatures.length > 0 ? `
      <div class="analysis-box issues-box">
        <div class="subsection-title">⚠️ Phát hiện Bất thường</div>
        ${anomalyFeatures.map((feature: any) => {
          const featureText = typeof feature === 'string' ? feature : 
            feature.name || feature.feature || feature.description || JSON.stringify(feature);
          const change = typeof feature === 'object' ? (feature.change || feature.percentage) : null;
          const severity = typeof feature === 'object' ? (feature.severity || feature.muc_do) : null;
          
          return `
            <div class="analysis-item">
              ${featureText}
              ${change ? ` (Thay đổi: ${change > 0 ? '+' : ''}${change}%)` : ''}
              ${severity ? ` - Mức độ: ${severity}` : ''}
            </div>
          `;
        }).join('')}
      </div>
    ` : `
      <div class="analysis-box issues-box">
        <div class="analysis-item">✓ Không có bất thường được phát hiện</div>
      </div>
    `}
    
    ${analysisSections.issues.length > 0 ? `
      <div class="analysis-box issues-box" style="margin-top: 15px;">
        ${analysisSections.issues.map(item => `<div class="analysis-item">${item}</div>`).join('')}
      </div>
    ` : ''}
    
    ${rawData?.inventory_metrics?.lowStockItems?.length > 0 || rawData?.inventory_metrics?.outOfStockItems?.length > 0 ? `
      <div class="analysis-box issues-box" style="margin-top: 15px;">
        <div class="subsection-title">📦 Cảnh Báo Tồn Kho</div>
        ${rawData.inventory_metrics.outOfStockItems?.map((item: any) => `
          <div class="analysis-item">${item.ingredientName || 'N/A'} - Hết hàng (Còn: ${item.currentQuantity || 0} ${item.unitName || ''})</div>
        `).join('') || ''}
        ${rawData.inventory_metrics.lowStockItems?.map((item: any) => `
          <div class="analysis-item">${item.ingredientName || 'N/A'} - Sắp hết (Còn: ${item.currentQuantity || 0}/${item.threshold || 0} ${item.unitName || ''})</div>
        `).join('') || ''}
      </div>
    ` : ''}
  </div>

  <!-- 4. Khuyến Nghị Hành Động -->
  <div class="section">
    <div class="section-title">4. Khuyến Nghị Hành Động</div>
    
    <div class="analysis-box recommendations-box">
      ${recommendations.length > 0 ? recommendations.map((rec) => {
        const priority = rec.toLowerCase().includes('khẩn cấp') || rec.toLowerCase().includes('khẩn') ? 'high' :
                        rec.toLowerCase().includes('quan trọng') || rec.toLowerCase().includes('nên') ? 'medium' : 'low';
        const badgeClass = priority === 'high' ? 'badge-high' : priority === 'medium' ? 'badge-medium' : 'badge-low';
        const badgeText = priority === 'high' ? 'Khẩn cấp' : priority === 'medium' ? 'Quan trọng' : 'Theo dõi';
        
        return `
          <div class="analysis-item" style="margin-bottom: 12px;">
            <span class="badge ${badgeClass}">${badgeText}</span>
            <span style="margin-left: 8px;">${rec}</span>
          </div>
        `;
      }).join('') : analysisSections.recommendations.map((rec, idx) => `
        <div class="analysis-item">${idx + 1}. ${rec}</div>
      `).join('')}
      
      ${recommendations.length === 0 && analysisSections.recommendations.length === 0 ? `
        <div class="analysis-item">Chưa có khuyến nghị</div>
      ` : ''}
    </div>
  </div>

  <!-- 5. Dự Báo Tương Lai -->
  ${forecastData.length > 0 ? `
    <div class="section">
      <div class="section-title">5. Dự Báo Tương Lai</div>
      
      <div class="analysis-box">
        <div class="subsection-title">📈 Dự Báo ${forecast?.chi_tieu || 'Số Đơn Hàng'}</div>
        <div class="analysis-item">
          Dự báo ${forecastData.length} ngày tiếp theo với độ tin cậy: 
          ${typeof forecast?.do_tin_cay === 'object' 
            ? `${forecast.do_tin_cay.phan_tram || forecast.do_tin_cay.muc_do || 'N/A'}%` 
            : forecast?.do_tin_cay || 'N/A'}
        </div>
        
        ${forecastData.length > 0 ? `
          <table class="table" style="margin-top: 15px;">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Dự Báo</th>
                <th>Khoảng Tin Cậy (Min - Max)</th>
              </tr>
            </thead>
            <tbody>
              ${forecastData.map((item: any) => {
                const forecastValue = item.du_bao || 0;
                const min = item.khoang_tin_cay?.min || forecastValue;
                const max = item.khoang_tin_cay?.max || forecastValue;
                const chiTieuCode = forecast?.chi_tieu_code || 'order_count';
                const unit = chiTieuCode === 'order_count' ? 'đơn' : 'VNĐ';
                return `
                  <tr>
                    <td>${item.ngay || 'N/A'}</td>
                    <td>${formatNumber(forecastValue)} ${unit}</td>
                    <td>${formatNumber(min)} - ${formatNumber(max)} ${unit}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        ` : ''}
      </div>
    </div>
  ` : ''}

  <!-- 6. Sản Phẩm Bán Chạy -->
  ${topProducts.length > 0 ? `
    <div class="section">
      <div class="section-title">6. Sản Phẩm Bán Chạy</div>
      
      <table class="table">
        <thead>
          <tr>
            <th>STT</th>
            <th>Tên Sản Phẩm</th>
            <th>Số Lượng</th>
            <th>Doanh Thu (VNĐ)</th>
          </tr>
        </thead>
        <tbody>
          ${topProducts.slice(0, 20).map((product: any, idx: number) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${product.name}</td>
              <td>${formatNumber(product.quantity)}</td>
              <td>${formatNumber(product.revenue)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      ${Object.keys(productsByCategory).length > 0 ? `
        <div class="subsection-title" style="margin-top: 20px;">Sản Phẩm Theo Danh Mục</div>
        <table class="table">
          <thead>
            <tr>
              <th>Danh Mục</th>
              <th>Số Lượng</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(productsByCategory).map(([category, count]: [string, any]) => `
              <tr>
                <td>${category}</td>
                <td>${formatNumber(count)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
    </div>
  ` : ''}

  <!-- 7. Khách Hàng Hàng Đầu -->
  ${topCustomers.length > 0 ? `
    <div class="section">
      <div class="section-title">7. Khách Hàng Hàng Đầu</div>
      
      <table class="table">
        <thead>
          <tr>
            <th>STT</th>
            <th>Tên Khách Hàng</th>
            <th>Số Đơn</th>
            <th>Tổng Chi Tiêu (VNĐ)</th>
          </tr>
        </thead>
        <tbody>
          ${topCustomers.slice(0, 20).map((customer: any, idx: number) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${customer.name}</td>
              <td>${formatNumber(customer.orderCount)}</td>
              <td>${formatNumber(customer.totalSpent)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : ''}

  <!-- 8. Phản Hồi Khách Hàng -->
  ${recentReviews.length > 0 || Object.keys(reviewDistribution).length > 0 ? `
    <div class="section">
      <div class="section-title">8. Phản Hồi Khách Hàng</div>
      
      ${Object.keys(reviewDistribution).length > 0 ? `
        <div class="subsection-title">Phân Bố Đánh Giá</div>
        <table class="table" style="margin-bottom: 20px;">
          <thead>
            <tr>
              <th>Sao</th>
              <th>Số Lượng</th>
              <th>Tỷ Lệ</th>
            </tr>
          </thead>
          <tbody>
            ${[5, 4, 3, 2, 1].map((rating) => {
              const count = reviewDistribution[rating.toString()] || reviewDistribution[rating] || 0;
              const total = Object.values(reviewDistribution).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
              const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
              return `
                <tr>
                  <td>${rating} sao</td>
                  <td>${formatNumber(count)}</td>
                  <td>${percentage}%</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      ` : ''}
      
      ${recentReviews.length > 0 ? `
        <div class="subsection-title">Đánh Giá Gần Đây</div>
        <div style="space-y: 10px;">
          ${recentReviews.slice(0, 10).map((review: any) => {
            const dateStr = review.date ? new Date(review.date).toLocaleDateString('vi-VN') : 'N/A';
            const stars = '⭐'.repeat(review.rating || 0);
            return `
              <div class="analysis-box" style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span><strong>${stars}</strong> ${review.rating || 0}/5</span>
                  <span style="color: #666; font-size: 10px;">${dateStr}</span>
                </div>
                <div style="font-size: 11px; color: #555;">${review.comment || 'Không có bình luận'}</div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    </div>
  ` : ''}

  <!-- 9. Nguyên Liệu & Chi Phí -->
  ${topIngredientsByValue.length > 0 || topCostIngredients.length > 0 ? `
    <div class="section">
      <div class="section-title">9. Nguyên Liệu & Chi Phí</div>
      
      ${topIngredientsByValue.length > 0 ? `
        <div class="subsection-title">Nguyên Liệu Có Giá Trị Cao Nhất</div>
        <table class="table" style="margin-bottom: 20px;">
          <thead>
            <tr>
              <th>STT</th>
              <th>Tên Nguyên Liệu</th>
              <th>Số Lượng</th>
              <th>Giá Trị (VNĐ)</th>
            </tr>
          </thead>
          <tbody>
            ${topIngredientsByValue.slice(0, 10).map((item: any, idx: number) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.name}</td>
                <td>${formatNumber(item.quantity)} ${item.unit}</td>
                <td>${formatNumber(item.stockValue)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
      
      ${topCostIngredients.length > 0 ? `
        <div class="subsection-title">Nguyên Liệu Có Chi Phí Cao Nhất</div>
        <table class="table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Tên Nguyên Liệu</th>
              <th>Chi Phí (VNĐ)</th>
              <th>Tỷ Lệ (%)</th>
            </tr>
          </thead>
          <tbody>
            ${topCostIngredients.map((item: any, idx: number) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.name}</td>
                <td>${formatNumber(item.totalCost)}</td>
                <td>${item.percentage.toFixed(1)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
    </div>
  ` : ''}

  <!-- 10. Doanh Thu Theo Phương Thức Thanh Toán -->
  ${Object.keys(revenueByPaymentMethod).length > 0 ? `
    <div class="section">
      <div class="section-title">10. Doanh Thu Theo Phương Thức Thanh Toán</div>
      
      <table class="table">
        <thead>
          <tr>
            <th>Phương Thức</th>
            <th>Doanh Thu (VNĐ)</th>
            <th>Tỷ Lệ (%)</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(revenueByPaymentMethod).map(([method, amount]: [string, any]) => {
            const totalRevenue = summary.total_revenue || 1;
            const percentage = ((Number(amount) / totalRevenue) * 100).toFixed(1);
            const methodName = method === 'CASH' ? 'Tiền mặt' : 
                             method === 'CARD' ? 'Thẻ' : 
                             method === 'MOMO' ? 'MoMo' : 
                             method === 'ZALOPAY' ? 'ZaloPay' : method;
            return `
              <tr>
                <td>${methodName}</td>
                <td>${formatNumber(Number(amount))}</td>
                <td>${percentage}%</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  ` : ''}

  <!-- Footer -->
  <div class="footer">
    <div>Báo cáo được tạo tự động bởi AI Analytics Service</div>
    <div>Hệ thống quản lý cà phê - Coffee Management System</div>
  </div>
</body>
</html>
  `;
};

/**
 * Export AI Statistics report to PDF
 * Uses browser's print functionality to generate PDF
 */
export const exportAIStatisticsToPDF = async (options: PDFExportOptions): Promise<void> => {
  try {
    // Generate HTML content
    const htmlContent = generatePDFHTML(options);

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
    }

    // Write HTML content
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 500));

    // Trigger print dialog
    printWindow.focus();
    printWindow.print();

    // Note: Don't close the window immediately as user might cancel print
    // The window will be closed by the browser after print dialog
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw new Error('Không thể xuất PDF. Vui lòng thử lại.');
  }
};

/**
 * Alternative: Export using jsPDF (requires jsPDF and html2canvas packages)
 * Uncomment and install packages if needed:
 * npm install jspdf html2canvas
 */
/*
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportAIStatisticsToPDFWithCanvas = async (
  options: PDFExportOptions,
  elementId?: string
): Promise<void> => {
  try {
    let element: HTMLElement | null = null;
    
    if (elementId) {
      element = document.getElementById(elementId);
    }
    
    if (!element) {
      // Create a temporary container
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = generatePDFHTML(options);
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      document.body.appendChild(tempDiv);
      element = tempDiv;
    }
    
    const canvas = await html2canvas(element || document.body, {
      scale: 2,
      useCORS: true,
      logging: false,
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    const fileName = `Bao_Cao_AI_${options.branchId || 'Unknown'}_${options.reportDate.replace(/-/g, '_')}.pdf`;
    pdf.save(fileName);
    
    if (element && elementId) {
      document.body.removeChild(element);
    }
  } catch (error) {
    console.error('Error exporting PDF with canvas:', error);
    throw new Error('Không thể xuất PDF. Vui lòng thử lại.');
  }
};
*/

