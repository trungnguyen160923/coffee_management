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

interface AllBranchesPDFExportOptions {
  reportDate: string;
  aiData: {
    success: boolean;
    date: string;
    analysis: string;
    summary?: {
      total_branches?: number;
      active_branches?: number;
      total_revenue?: number;
      total_order_count?: number;
      avg_order_value?: number;
      total_customer_count?: number;
      total_new_customers?: number;
      total_repeat_customers?: number;
      overall_customer_retention_rate?: number;
      total_unique_products_sold?: number;
      overall_product_diversity_score?: number;
      overall_avg_review_score?: number;
      total_reviews?: number;
      total_positive_reviews?: number;
      total_negative_reviews?: number;
      average_revenue_per_branch?: number;
      total_orders?: number;
      average_orders_per_branch?: number;
    };
    recommendations?: string[];
    raw_data?: any;
  };
  branchesData?: Array<{
    id: number;
    name: string;
    revenue: number;
    orders: number;
    avgOrderValue: number;
    rating: number;
    customerRetention: number;
    status: 'good' | 'warning' | 'critical';
  }>;
}

/**
 * Format number with thousand separators
 */
const formatNumber = (value: number): string => {
  return value.toLocaleString('vi-VN');
};

/**
 * Clean analysis text by removing markdown characters and ID references
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
  
  // Remove ID references from text: (ID: X), ID: X, hoặc các pattern tương tự
  // Pattern: (ID: 1), (ID:1), ID: 1, ID:1, (ID 1), ID 1
  cleaned = cleaned.replace(/\s*\(ID:\s*\d+\)/gi, '');
  cleaned = cleaned.replace(/\s*\(ID\s*\d+\)/gi, '');
  cleaned = cleaned.replace(/\s*ID:\s*\d+/gi, '');
  cleaned = cleaned.replace(/\s*ID\s+\d+/gi, '');
  
  // Remove lines that only contain "ID: X" or similar
  cleaned = cleaned.split('\n').map(line => {
    // Remove ID from end of line: "text (ID: 1)" -> "text"
    line = line.replace(/\s*\(ID:\s*\d+\)\s*$/gi, '');
    line = line.replace(/\s*\(ID\s*\d+\)\s*$/gi, '');
    line = line.replace(/\s*ID:\s*\d+\s*$/gi, '');
    line = line.replace(/\s*ID\s+\d+\s*$/gi, '');
    return line;
  }).filter(line => {
    const trimmed = line.trim();
    // Skip lines that are just ID references
    if (/^ID:\s*\d+$/i.test(trimmed)) return false;
    if (/^\(ID:\s*\d+\)$/i.test(trimmed)) return false;
    if (/^ID\s+\d+$/i.test(trimmed)) return false;
    return true;
  }).join('\n');
  
  // Clean up multiple spaces (but preserve line breaks)
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  // Clean up multiple empty lines
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
  
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
        
        // Lọc bỏ nội dung về dự báo khỏi issues section
        const isForecastContent = currentSection === 'issues' && (
          cleaned.toLowerCase().includes('dự báo') ||
          cleaned.toLowerCase().includes('dự đoán') ||
          cleaned.toLowerCase().includes('forecast') ||
          cleaned.toLowerCase().includes('prophet') ||
          cleaned.toLowerCase().includes('ngày tiếp theo') ||
          cleaned.toLowerCase().includes('7 ngày') ||
          cleaned.toLowerCase().includes('độ tin cậy') ||
          /ngày\s+\d+\/\d+/.test(cleaned.toLowerCase()) // Pattern như "ngày 9/11"
        );
        
        if (!isHeader && !isForecastContent) {
          sections[currentSection].push(cleaned);
        }
      }
    }
  }

  return sections;
};

/**
 * Generate bar chart HTML for top products using SVG for better PDF rendering
 */
const generateBarChartHTML = (data: Array<{name: string, value: number}>, maxItems: number = 10): string => {
  if (!data || data.length === 0) return '';
  
  const items = data.slice(0, maxItems);
  const maxValue = Math.max(...items.map(item => item.value), 1);
  
  // Màu sắc gradient cho mỗi bar (dùng SVG gradient)
  const barGradients = [
    { id: 'grad1', start: '#14b8a6', end: '#0d9488' }, // Teal
    { id: 'grad2', start: '#fbbf24', end: '#f59e0b' }, // Yellow/Amber
    { id: 'grad3', start: '#a78bfa', end: '#8b5cf6' }, // Purple
    { id: 'grad4', start: '#fb7185', end: '#f43f5e' }, // Rose/Pink
    { id: 'grad5', start: '#60a5fa', end: '#3b82f6' }, // Blue
    { id: 'grad6', start: '#34d399', end: '#10b981' }, // Green
    { id: 'grad7', start: '#f97316', end: '#ea580c' }, // Orange
    { id: 'grad8', start: '#ec4899', end: '#db2777' }, // Pink
    { id: 'grad9', start: '#6366f1', end: '#4f46e5' }, // Indigo
    { id: 'grad10', start: '#06b6d4', end: '#0891b2' }, // Cyan
  ];
  
  const svgWidth = 800;
  const svgHeight = Math.max(400, items.length * 45 + 60);
  const padding = 200; // Space for labels
  const chartWidth = svgWidth - padding - 40;
  const chartHeight = svgHeight - 60;
  const barHeight = 35;
  const barSpacing = 10;
  const startY = 40;
  
  return `
    <div class="bar-chart-container">
      <svg class="bar-chart-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" style="width: 100%; height: ${svgHeight}px;">
        <!-- Background -->
        <rect x="${padding}" y="20" width="${chartWidth}" height="${chartHeight}" fill="#fafafa" rx="4"/>
        
        <!-- Grid lines -->
        ${[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const x = padding + (ratio * chartWidth);
          return `<line x1="${x}" y1="20" x2="${x}" y2="${20 + chartHeight}" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="2,2"/>`;
        }).join('')}
        
        <!-- Bars -->
        ${items.map((item, index) => {
          const percentage = (item.value / maxValue) * 100;
          const barWidth = (percentage / 100) * chartWidth;
          const y = startY + index * (barHeight + barSpacing);
          const gradientId = barGradients[index % barGradients.length].id;
          const gradient = barGradients[index % barGradients.length];
          
          return `
            <!-- Bar ${index} -->
            <defs>
              <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:${gradient.start};stop-opacity:1" />
                <stop offset="100%" style="stop-color:${gradient.end};stop-opacity:1" />
              </linearGradient>
            </defs>
            <rect x="${padding}" y="${y}" width="${barWidth}" height="${barHeight}" fill="url(#${gradientId})" rx="6" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));"/>
            <text x="${padding + barWidth - 8}" y="${y + barHeight / 2 + 5}" text-anchor="end" font-size="13" font-weight="bold" fill="white" style="text-shadow: 0 1px 2px rgba(0,0,0,0.3);">${item.value}</text>
            <text x="${padding - 10}" y="${y + barHeight / 2 + 5}" text-anchor="end" font-size="12" font-weight="600" fill="#374151">${item.name.length > 25 ? item.name.substring(0, 25) + '...' : item.name}</text>
          `;
        }).join('')}
        
        <!-- X-axis line -->
        <line x1="${padding}" y1="${20 + chartHeight}" x2="${padding + chartWidth}" y2="${20 + chartHeight}" stroke="#374151" stroke-width="2.5"/>
        
        <!-- Y-axis line -->
        <line x1="${padding}" y1="20" x2="${padding}" y2="${20 + chartHeight}" stroke="#374151" stroke-width="2.5"/>
        
        <!-- X-axis label -->
        <text x="${padding + chartWidth / 2}" y="${svgHeight - 10}" text-anchor="middle" font-size="13" font-weight="bold" fill="#1f2937">Số Lượng Bán</text>
        
        <!-- X-axis values -->
        ${[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const x = padding + (ratio * chartWidth);
          const value = Math.round(ratio * maxValue);
          return `
            <line x1="${x}" y1="${20 + chartHeight}" x2="${x}" y2="${20 + chartHeight + 5}" stroke="#6b7280" stroke-width="2"/>
            <text x="${x}" y="${20 + chartHeight + 18}" text-anchor="middle" font-size="11" font-weight="600" fill="#4b5563">${value}</text>
          `;
        }).join('')}
      </svg>
    </div>
  `;
};

/**
 * Generate line chart HTML for revenue by hour
 */
const generateLineChartHTML = (data: Array<{hour: number, revenue: number}>): string => {
  if (!data || data.length === 0) return '';
  
  const items = data.slice(0, 24);
  const maxRevenue = Math.max(...items.map(item => item.revenue || 0), 1);
  const minRevenue = Math.min(...items.map(item => item.revenue || 0), 0);
  const range = maxRevenue - minRevenue || 1;
  
  const svgWidth = 850;
  const svgHeight = 350;
  const padding = 70;
  const chartWidth = svgWidth - padding * 2;
  const chartHeight = svgHeight - padding * 2;
  
  // Generate points for line
  const points = items.map((item, index) => {
    const x = padding + (index / (items.length - 1 || 1)) * chartWidth;
    const y = padding + chartHeight - ((item.revenue || 0) - minRevenue) / range * chartHeight;
    return `${x},${y}`;
  }).join(' ');
  
  // Generate area path
  const areaPath = `M ${padding},${padding + chartHeight} L ${points} L ${padding + chartWidth},${padding + chartHeight} Z`;
  
  return `
    <div class="line-chart-container">
      <svg class="line-chart-svg" viewBox="0 0 ${svgWidth} ${svgHeight}">
        <!-- Background -->
        <rect x="${padding}" y="${padding}" width="${chartWidth}" height="${chartHeight}" fill="#fafafa" rx="4"/>
        
        <!-- Grid lines -->
        ${[0, 0.2, 0.4, 0.6, 0.8, 1].map(ratio => {
          const y = padding + chartHeight - (ratio * chartHeight);
          return `<line x1="${padding}" y1="${y}" x2="${padding + chartWidth}" y2="${y}" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="2,2"/>`;
        }).join('')}
        
        <!-- Vertical grid lines -->
        ${items.length > 1 ? items.map((_, index) => {
          if (index === 0 || index === items.length - 1) return '';
          const x = padding + (index / (items.length - 1 || 1)) * chartWidth;
          return `<line x1="${x}" y1="${padding}" x2="${x}" y2="${padding + chartHeight}" stroke="#f3f4f6" stroke-width="1"/>`;
        }).join('') : ''}
        
        <!-- Area fill with gradient -->
        <path d="${areaPath}" fill="url(#revenueGradient)" opacity="0.6"/>
        
        <!-- Main line -->
        <polyline points="${points}" fill="none" stroke="#6366f1" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        
        <!-- Points with glow effect -->
        ${items.map((item, index) => {
          const x = padding + (index / (items.length - 1 || 1)) * chartWidth;
          const y = padding + chartHeight - ((item.revenue || 0) - minRevenue) / range * chartHeight;
          return `
            <circle cx="${x}" cy="${y}" r="8" fill="url(#pointGradient)" opacity="0.3"/>
            <circle cx="${x}" cy="${y}" r="6" fill="#6366f1" stroke="#ffffff" stroke-width="3"/>
          `;
        }).join('')}
        
        <!-- X-axis labels -->
        ${items.map((item, index) => {
          const x = padding + (index / (items.length - 1 || 1)) * chartWidth;
          return `
            <text x="${x}" y="${svgHeight - 20}" text-anchor="middle" font-size="12" font-weight="600" fill="#4b5563">${item.hour || 0}</text>
            <text x="${x}" y="${svgHeight - 5}" text-anchor="middle" font-size="10" fill="#9ca3af">Giờ</text>
          `;
        }).join('')}
        
        <!-- Y-axis labels -->
        ${[0, 0.2, 0.4, 0.6, 0.8, 1].map(ratio => {
          const y = padding + chartHeight - (ratio * chartHeight);
          const value = minRevenue + (ratio * range);
          const formattedValue = value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value.toFixed(0);
          return `
            <line x1="${padding - 5}" y1="${y}" x2="${padding}" y2="${y}" stroke="#6b7280" stroke-width="2"/>
            <text x="${padding - 12}" y="${y + 4}" text-anchor="end" font-size="12" font-weight="600" fill="#4b5563">${formattedValue}</text>
          `;
        }).join('')}
        
        <!-- Axis lines -->
        <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${padding + chartHeight}" stroke="#374151" stroke-width="2.5"/>
        <line x1="${padding}" y1="${padding + chartHeight}" x2="${padding + chartWidth}" y2="${padding + chartHeight}" stroke="#374151" stroke-width="2.5"/>
        
        <!-- Axis labels -->
        <text x="${svgWidth / 2}" y="${svgHeight - 5}" text-anchor="middle" font-size="13" font-weight="bold" fill="#1f2937">Giờ trong ngày</text>
        <text x="20" y="${svgHeight / 2}" text-anchor="middle" font-size="13" font-weight="bold" fill="#1f2937" transform="rotate(-90 20 ${svgHeight / 2})">Doanh Thu (VNĐ)</text>
        
        <!-- Gradient definitions -->
        <defs>
          <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#6366f1;stop-opacity:0.6" />
            <stop offset="50%" style="stop-color:#818cf8;stop-opacity:0.4" />
            <stop offset="100%" style="stop-color:#a5b4fc;stop-opacity:0.1" />
          </linearGradient>
          <radialGradient id="pointGradient" cx="50%" cy="50%">
            <stop offset="0%" style="stop-color:#6366f1;stop-opacity:0.5" />
            <stop offset="100%" style="stop-color:#6366f1;stop-opacity:0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  `;
};

/**
 * Generate forecast line chart HTML
 */
const generateForecastChartHTML = (forecastData: Array<{ngay: string, du_bao: number, khoang_tin_cay?: {min: number, max: number}}>): string => {
  if (!forecastData || forecastData.length === 0) return '';
  
  const items = forecastData.slice(0, 7);
  const forecasts = items.map(item => item.du_bao || 0);
  const mins = items.map(item => item.khoang_tin_cay?.min || item.du_bao || 0);
  const maxs = items.map(item => item.khoang_tin_cay?.max || item.du_bao || 0);
  
  const maxValue = Math.max(...maxs, 1);
  const minValue = Math.min(...mins, 0);
  const range = maxValue - minValue || 1;
  
  const svgWidth = 850;
  const svgHeight = 350;
  const padding = 70;
  const chartWidth = svgWidth - padding * 2;
  const chartHeight = svgHeight - padding * 2;
  
  // Generate points
  const forecastPoints = forecasts.map((value, index) => {
    const x = padding + (index / (items.length - 1 || 1)) * chartWidth;
    const y = padding + chartHeight - ((value - minValue) / range * chartHeight);
    return `${x},${y}`;
  }).join(' ');
  
  const upperPoints = maxs.map((value, index) => {
    const x = padding + (index / (items.length - 1 || 1)) * chartWidth;
    const y = padding + chartHeight - ((value - minValue) / range * chartHeight);
    return `${x},${y}`;
  }).join(' ');
  
  const lowerPoints = mins.map((value, index) => {
    const x = padding + (index / (items.length - 1 || 1)) * chartWidth;
    const y = padding + chartHeight - ((value - minValue) / range * chartHeight);
    return `${x},${y}`;
  }).reverse().join(' ');
  
  const confidenceArea = `M ${padding + (0 / (items.length - 1 || 1)) * chartWidth},${padding + chartHeight - ((mins[0] - minValue) / range * chartHeight)} L ${upperPoints} L ${padding + chartWidth},${padding + chartHeight - ((mins[items.length - 1] - minValue) / range * chartHeight)} L ${lowerPoints} Z`;
  
  return `
    <div class="line-chart-container">
      <svg class="line-chart-svg" viewBox="0 0 ${svgWidth} ${svgHeight}">
        <!-- Background -->
        <rect x="${padding}" y="${padding}" width="${chartWidth}" height="${chartHeight}" fill="#fafafa" rx="4"/>
        
        <!-- Grid lines -->
        ${[0, 0.2, 0.4, 0.6, 0.8, 1].map(ratio => {
          const y = padding + chartHeight - (ratio * chartHeight);
          return `<line x1="${padding}" y1="${y}" x2="${padding + chartWidth}" y2="${y}" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="2,2"/>`;
        }).join('')}
        
        <!-- Vertical grid lines -->
        ${items.length > 1 ? items.map((_, index) => {
          if (index === 0 || index === items.length - 1) return '';
          const x = padding + (index / (items.length - 1 || 1)) * chartWidth;
          return `<line x1="${x}" y1="${padding}" x2="${x}" y2="${padding + chartHeight}" stroke="#f3f4f6" stroke-width="1"/>`;
        }).join('') : ''}
        
        <!-- Confidence interval area with gradient -->
        <path d="${confidenceArea}" fill="url(#confidenceGradient)" opacity="0.5"/>
        
        <!-- Confidence interval border -->
        <polyline points="${upperPoints}" fill="none" stroke="#60a5fa" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.6"/>
        <polyline points="${lowerPoints.split(' ').reverse().join(' ')}" fill="none" stroke="#60a5fa" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.6"/>
        
        <!-- Forecast line -->
        <polyline points="${forecastPoints}" fill="none" stroke="#10b981" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        
        <!-- Points with glow -->
        ${forecasts.map((value, index) => {
          const x = padding + (index / (items.length - 1 || 1)) * chartWidth;
          const y = padding + chartHeight - ((value - minValue) / range * chartHeight);
          return `
            <circle cx="${x}" cy="${y}" r="9" fill="url(#forecastPointGradient)" opacity="0.4"/>
            <circle cx="${x}" cy="${y}" r="6" fill="#10b981" stroke="#ffffff" stroke-width="3"/>
          `;
        }).join('')}
        
        <!-- X-axis labels -->
        ${items.map((item, index) => {
          const x = padding + (index / (items.length - 1 || 1)) * chartWidth;
          const dateStr = item.ngay ? new Date(item.ngay).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' }) : '';
          return `
            <text x="${x}" y="${svgHeight - 25}" text-anchor="middle" font-size="12" font-weight="600" fill="#4b5563" transform="rotate(-45 ${x} ${svgHeight - 25})">${dateStr}</text>
          `;
        }).join('')}
        
        <!-- Y-axis labels -->
        ${[0, 0.2, 0.4, 0.6, 0.8, 1].map(ratio => {
          const y = padding + chartHeight - (ratio * chartHeight);
          const value = minValue + (ratio * range);
          const formattedValue = value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value.toFixed(0);
          return `
            <line x1="${padding - 5}" y1="${y}" x2="${padding}" y2="${y}" stroke="#6b7280" stroke-width="2"/>
            <text x="${padding - 12}" y="${y + 4}" text-anchor="end" font-size="12" font-weight="600" fill="#4b5563">${formattedValue}</text>
          `;
        }).join('')}
        
        <!-- Axis lines -->
        <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${padding + chartHeight}" stroke="#374151" stroke-width="2.5"/>
        <line x1="${padding}" y1="${padding + chartHeight}" x2="${padding + chartWidth}" y2="${padding + chartHeight}" stroke="#374151" stroke-width="2.5"/>
        
        <!-- Axis labels -->
        <text x="${svgWidth / 2}" y="${svgHeight - 5}" text-anchor="middle" font-size="13" font-weight="bold" fill="#1f2937">Ngày</text>
        <text x="20" y="${svgHeight / 2}" text-anchor="middle" font-size="13" font-weight="bold" fill="#1f2937" transform="rotate(-90 20 ${svgHeight / 2})">Giá Trị Dự Báo</text>
        
        <!-- Legend with better styling -->
        <g transform="translate(${svgWidth - 200}, 30)">
          <rect x="0" y="0" width="18" height="18" fill="url(#legendConfidenceGradient)" rx="2"/>
          <text x="25" y="14" font-size="12" font-weight="600" fill="#1f2937">Khoảng tin cậy</text>
          <line x1="0" y1="28" x2="18" y2="28" stroke="#10b981" stroke-width="4" stroke-linecap="round"/>
          <text x="25" y="32" font-size="12" font-weight="600" fill="#1f2937">Dự báo</text>
        </g>
        
        <!-- Gradient definitions -->
        <defs>
          <linearGradient id="confidenceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#60a5fa;stop-opacity:0.6" />
            <stop offset="50%" style="stop-color:#93c5fd;stop-opacity:0.4" />
            <stop offset="100%" style="stop-color:#dbeafe;stop-opacity:0.2" />
          </linearGradient>
          <radialGradient id="forecastPointGradient" cx="50%" cy="50%">
            <stop offset="0%" style="stop-color:#10b981;stop-opacity:0.6" />
            <stop offset="100%" style="stop-color:#10b981;stop-opacity:0" />
          </radialGradient>
          <linearGradient id="legendConfidenceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#60a5fa;stop-opacity:0.5" />
            <stop offset="100%" style="stop-color:#93c5fd;stop-opacity:0.3" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  `;
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
      border: 1px solid #e5e7eb;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    
    .strengths-box {
      background: #f0fdf4;
      border: 1px solid #e5e7eb;
    }
    
    .weaknesses-box {
      background: #fef2f2;
      border: 1px solid #e5e7eb;
    }
    
    .issues-box {
      background: #fffbeb;
      border: 1px solid #e5e7eb;
    }
    
    .recommendations-box {
      background: #eff6ff;
      border: 1px solid #e5e7eb;
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
    
    .table tbody tr td:first-child strong {
      color: #667eea;
      font-size: 12px;
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
      text-align: center;
      font-size: 10px;
      color: #666;
    }
    
    .chart-container {
      margin: 20px 0;
      padding: 15px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
    }
    
    .chart-title {
      font-size: 16px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 20px;
      text-align: center;
      padding-bottom: 10px;
    }
    
    .bar-chart-container {
      margin: 20px 0;
      padding: 15px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .bar-chart-svg {
      width: 100%;
      height: auto;
    }
    
    .line-chart-container {
      margin: 20px 0;
      padding: 15px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .line-chart-svg {
      width: 100%;
      height: 350px;
    }
    
    .chart-legend {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-top: 10px;
      font-size: 10px;
      color: #666;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }
    
    @media print {
      body {
        padding: 15px;
      }
      .section {
        page-break-inside: avoid;
      }
      .chart-container {
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

  <!-- 1. Tóm Tắt Metrics Chính -->
  <div class="section">
    <div class="section-title">1. Tóm Tắt Metrics Chính</div>
    
    <table class="table" style="margin-bottom: 20px;">
      <thead>
        <tr>
          <th>Chỉ Tiêu</th>
          <th>Giá Trị</th>
        </tr>
      </thead>
      <tbody>
        ${summary.total_revenue !== undefined ? `
          <tr>
            <td><strong>DOANH THU & ĐƠN HÀNG</strong></td>
            <td></td>
          </tr>
          <tr>
            <td>Doanh Thu</td>
            <td>${formatNumber(summary.total_revenue || 0)} VNĐ</td>
          </tr>
          <tr>
            <td>Số Đơn Hàng</td>
            <td>${formatNumber(summary.order_count || 0)} đơn</td>
          </tr>
          <tr>
            <td>Giá Trị TB/Đơn</td>
            <td>${formatNumber(summary.avg_order_value || 0)} VNĐ</td>
          </tr>
        ` : ''}
        ${summary.customer_count !== undefined ? `
          <tr>
            <td><strong>KHÁCH HÀNG</strong></td>
            <td></td>
          </tr>
          <tr>
            <td>Tổng Khách Hàng</td>
            <td>${formatNumber(summary.customer_count || 0)} người</td>
          </tr>
          <tr>
            <td>Khách Hàng Mới</td>
            <td>${formatNumber(summary.new_customers || 0)} người</td>
          </tr>
          <tr>
            <td>Khách Hàng Quay Lại</td>
            <td>${formatNumber(summary.repeat_customers || 0)} người</td>
          </tr>
        ` : ''}
        ${summary.unique_products_sold !== undefined ? `
          <tr>
            <td><strong>SẢN PHẨM</strong></td>
            <td></td>
          </tr>
          <tr>
            <td>Sản Phẩm Đã Bán</td>
            <td>${formatNumber(summary.unique_products_sold || 0)} sản phẩm</td>
          </tr>
        ` : ''}
        ${summary.avg_review_score !== undefined ? `
          <tr>
            <td><strong>ĐÁNH GIÁ</strong></td>
            <td></td>
          </tr>
          <tr>
            <td>Đánh Giá Trung Bình</td>
            <td>${(summary.avg_review_score || 0).toFixed(2)}/5</td>
          </tr>
          <tr>
            <td>Tổng Đánh Giá</td>
            <td>${formatNumber(summary.total_reviews || 0)} đánh giá</td>
          </tr>
        ` : ''}
        ${summary.low_stock_count !== undefined || summary.out_of_stock_count !== undefined ? `
          <tr>
            <td><strong>TỒN KHO</strong></td>
            <td></td>
          </tr>
          ${summary.low_stock_count !== undefined ? `
            <tr>
              <td>Sản Phẩm Sắp Hết</td>
              <td>${formatNumber(summary.low_stock_count || 0)} sản phẩm</td>
            </tr>
          ` : ''}
          ${summary.out_of_stock_count !== undefined ? `
            <tr>
              <td>Sản Phẩm Hết Hàng</td>
              <td>${formatNumber(summary.out_of_stock_count || 0)} sản phẩm</td>
            </tr>
          ` : ''}
          ${summary.total_inventory_value !== undefined ? `
            <tr>
              <td>Giá Trị Tồn Kho</td>
              <td>${formatNumber(summary.total_inventory_value || 0)} VNĐ</td>
            </tr>
          ` : ''}
          ${(summary as any).material_cost !== undefined ? `
            <tr>
              <td>Chi Phí Nguyên Liệu</td>
              <td>${formatNumber((summary as any).material_cost || 0)} VNĐ</td>
            </tr>
          ` : ''}
        ` : ''}
      </tbody>
    </table>
  </div>

  <!-- 2. Phân Tích AI -->
  ${analysisSections.summary.length > 0 || analysisSections.strengths.length > 0 || analysisSections.weaknesses.length > 0 || analysisSections.issues.length > 0 ? `
    <div class="section">
      <div class="section-title">2. Phân Tích AI</div>
      
      <!-- 2.1. Tóm Tắt Tình Hình Hoạt Động -->
      ${analysisSections.summary.length > 0 ? `
        <div class="subsection-title">2.1. Tóm Tắt Tình Hình Hoạt Động</div>
        <div class="analysis-box">
          ${analysisSections.summary.map(item => `<div class="analysis-item">${item}</div>`).join('')}
        </div>
      ` : ''}
      
      <!-- 2.2. Điểm Mạnh Và Điểm Yếu -->
      ${analysisSections.strengths.length > 0 || analysisSections.weaknesses.length > 0 ? `
        <div class="subsection-title">2.2. Điểm Mạnh Và Điểm Yếu</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0;">
          ${analysisSections.strengths.length > 0 ? `
            <div class="analysis-box strengths-box">
              <div style="font-weight: bold; margin-bottom: 10px;">Điểm Mạnh:</div>
              ${analysisSections.strengths.map(item => `<div class="analysis-item">${item}</div>`).join('')}
            </div>
          ` : '<div class="analysis-box strengths-box"><div class="analysis-item">Chưa có thông tin</div></div>'}
          
          ${analysisSections.weaknesses.length > 0 ? `
            <div class="analysis-box weaknesses-box">
              <div style="font-weight: bold; margin-bottom: 10px;">Điểm Yếu:</div>
              ${analysisSections.weaknesses.map(item => `<div class="analysis-item">${item}</div>`).join('')}
            </div>
          ` : '<div class="analysis-box weaknesses-box"><div class="analysis-item">Không có vấn đề</div></div>'}
        </div>
      ` : ''}
      
      <!-- 2.3. Các Vấn Đề Cần Chú Ý -->
      ${hasAnomaly && anomalyFeatures.length > 0 || analysisSections.issues.length > 0 || rawData?.inventory_metrics?.lowStockItems?.length > 0 || rawData?.inventory_metrics?.outOfStockItems?.length > 0 ? `
        <div class="subsection-title">2.3. Các Vấn Đề Cần Chú Ý</div>
        
        ${hasAnomaly && anomalyFeatures.length > 0 ? `
          <div class="analysis-box issues-box">
            <div style="font-weight: bold; margin-bottom: 10px;">⚠️ Phát hiện Bất thường</div>
            ${anomalyFeatures
              .filter((feature: any) => {
                const featureText = typeof feature === 'string' ? feature : 
                  feature.name || feature.feature || feature.description || JSON.stringify(feature);
                const lowerText = featureText.toLowerCase();
                // Lọc bỏ các feature có chứa từ khóa về dự báo
                return !lowerText.includes('dự báo') && 
                       !lowerText.includes('dự đoán') && 
                       !lowerText.includes('forecast') &&
                       !lowerText.includes('prophet') &&
                       !lowerText.includes('ngày tiếp theo') &&
                       !lowerText.includes('7 ngày') &&
                       !/ngày\s+\d+\/\d+/.test(lowerText);
              })
              .map((feature: any) => {
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
        ` : !hasAnomaly ? `
          <div class="analysis-box issues-box">
            <div class="analysis-item">✓ Không có bất thường được phát hiện</div>
          </div>
        ` : ''}
        
        ${analysisSections.issues.length > 0 ? `
          <div class="analysis-box issues-box" style="margin-top: 15px;">
            ${analysisSections.issues
              .filter(item => {
                const lowerItem = item.toLowerCase();
                // Lọc bỏ các item có chứa từ khóa về dự báo
                return !lowerItem.includes('dự báo') && 
                       !lowerItem.includes('dự đoán') && 
                       !lowerItem.includes('forecast') &&
                       !lowerItem.includes('prophet') &&
                       !lowerItem.includes('ngày tiếp theo') &&
                       !lowerItem.includes('7 ngày') &&
                       !lowerItem.includes('độ tin cậy') &&
                       !/ngày\s+\d+\/\d+/.test(lowerItem) && // Pattern như "ngày 9/11"
                       !/\d+\s+đơn/.test(lowerItem) && // Pattern như "219 đơn", "222 đơn"
                       !lowerItem.includes('dự kiến') &&
                       !lowerItem.includes('dự tính');
              })
              .map(item => `<div class="analysis-item">${item}</div>`).join('')}
          </div>
        ` : ''}
        
        ${rawData?.inventory_metrics?.lowStockItems?.length > 0 || rawData?.inventory_metrics?.outOfStockItems?.length > 0 ? `
          <div class="analysis-box issues-box" style="margin-top: 15px;">
            <div style="font-weight: bold; margin-bottom: 10px;">📦 Cảnh Báo Tồn Kho</div>
            ${rawData.inventory_metrics.outOfStockItems?.map((item: any) => `
              <div class="analysis-item">${item.ingredientName || 'N/A'} - Hết hàng (Còn: ${item.currentQuantity || 0} ${item.unitName || ''})</div>
            `).join('') || ''}
            ${rawData.inventory_metrics.lowStockItems?.map((item: any) => `
              <div class="analysis-item">${item.ingredientName || 'N/A'} - Sắp hết (Còn: ${item.currentQuantity || 0}/${item.threshold || 0} ${item.unitName || ''})</div>
            `).join('') || ''}
          </div>
        ` : ''}
      ` : ''}
    </div>
  ` : ''}

  <!-- 3. Khuyến Nghị Hành Động -->
  ${recommendations.length > 0 || analysisSections.recommendations.length > 0 ? `
    <div class="section">
      <div class="section-title">3. Khuyến Nghị Hành Động</div>
      
      <div class="analysis-box recommendations-box">
        ${recommendations.length > 0 ? recommendations.map((rec, idx) => {
          const priority = rec.toLowerCase().includes('khẩn cấp') || rec.toLowerCase().includes('khẩn') ? 'high' :
                          rec.toLowerCase().includes('quan trọng') || rec.toLowerCase().includes('nên') ? 'medium' : 'low';
          const badgeClass = priority === 'high' ? 'badge-high' : priority === 'medium' ? 'badge-medium' : 'badge-low';
          const badgeText = priority === 'high' ? 'Khẩn cấp' : priority === 'medium' ? 'Quan trọng' : 'Theo dõi';
          
          return `
            <div class="analysis-item" style="margin-bottom: 12px;">
              <span class="badge ${badgeClass}">${badgeText}</span>
              <span style="margin-left: 8px;">${idx + 1}. ${rec}</span>
            </div>
          `;
        }).join('') : analysisSections.recommendations.map((rec, idx) => `
          <div class="analysis-item">${idx + 1}. ${rec}</div>
        `).join('')}
      </div>
    </div>
  ` : ''}

  <!-- 4. Biểu Đồ Thống Kê -->
  <div class="section">
    <div class="section-title">4. Biểu Đồ Thống Kê</div>
    
    <!-- 4.1. Doanh Thu Theo Giờ -->
    ${revenueByHour.length > 0 ? `
      <div class="chart-container">
        <div class="chart-title">Doanh Thu Theo Giờ</div>
        ${generateLineChartHTML(revenueByHour.map((item: any) => ({
          hour: item.hour || 0,
          revenue: item.revenue || 0
        })))}
        <div class="chart-legend">
          <div class="legend-item">
            <div class="legend-color" style="background: #667eea;"></div>
            <span>Doanh Thu (VNĐ)</span>
          </div>
        </div>
      </div>
    ` : ''}
    
    <!-- 4.2. Top Sản Phẩm Bán Chạy -->
    ${topProducts.length > 0 ? `
      <div class="chart-container">
        <div class="chart-title">Top 10 Sản Phẩm Bán Chạy</div>
        ${generateBarChartHTML(topProducts.slice(0, 10).map((product: any) => ({
          name: product.name,
          value: product.quantity
        })))}
      </div>
    ` : ''}
    
    <!-- 4.3. Dự Báo Tương Lai -->
    ${forecastData.length > 0 ? `
      <div class="chart-container">
        <div class="chart-title">Dự Báo Tương Lai (7 Ngày Tiếp Theo)</div>
        ${generateForecastChartHTML(forecastData.slice(0, 7).map((item: any) => ({
          ngay: item.ngay || '',
          du_bao: item.du_bao || 0,
          khoang_tin_cay: item.khoang_tin_cay || { min: item.du_bao || 0, max: item.du_bao || 0 }
        })))}
        <div class="analysis-item" style="margin-top: 15px;">
          Độ tin cậy: ${typeof forecast?.do_tin_cay === 'object' 
            ? `${forecast.do_tin_cay.phan_tram || forecast.do_tin_cay.muc_do || 'N/A'}%` 
            : forecast?.do_tin_cay || 'N/A'}
        </div>
      </div>
    ` : ''}
  </div>

  <!-- 5. Dự Báo Tương Lai (Chi Tiết) -->
  ${forecastData.length > 0 ? `
    <div class="section">
      <div class="section-title">5. Dự Báo Tương Lai (Chi Tiết)</div>
      
      <table class="table">
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
    </div>
  ` : ''}

  <!-- 6. Dữ Liệu Chi Tiết -->
  <div class="section">
    <div class="section-title">6. Dữ Liệu Chi Tiết</div>
    
    <!-- 6.1. Tình Trạng Đơn Hàng -->
    <div class="subsection-title">6.1. Tình Trạng Đơn Hàng</div>
    <table class="table" style="margin-bottom: 20px;">
      <thead>
        <tr>
          <th>Tình Trạng</th>
          <th>Số Lượng</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Hoàn thành</td>
          <td>${formatNumber(orderStatus.completed)}</td>
        </tr>
        <tr>
          <td>Đang chờ</td>
          <td>${formatNumber(orderStatus.pending)}</td>
        </tr>
        <tr>
          <td>Đã hủy</td>
          <td>${formatNumber(orderStatus.cancelled)}</td>
        </tr>
      </tbody>
    </table>

    <!-- 6.2. Doanh Thu Theo Giờ (Bảng) -->
    ${revenueByHour.length > 0 ? `
      <div class="subsection-title">6.2. Doanh Thu Theo Giờ (Bảng)</div>
      <table class="table" style="margin-bottom: 20px;">
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
  </div>

  <!-- 7. Sản Phẩm Bán Chạy -->
  ${topProducts.length > 0 ? `
    <div class="section">
      <div class="section-title">7. Sản Phẩm Bán Chạy</div>
      
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

  <!-- 8. Khách Hàng Hàng Đầu -->
  ${topCustomers.length > 0 ? `
    <div class="section">
      <div class="section-title">8. Khách Hàng Hàng Đầu</div>
      
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

  <!-- 9. Phản Hồi Khách Hàng -->
  ${recentReviews.length > 0 || Object.keys(reviewDistribution).length > 0 ? `
    <div class="section">
      <div class="section-title">9. Phản Hồi Khách Hàng</div>
      
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

  <!-- 10. Nguyên Liệu & Chi Phí -->
  ${topIngredientsByValue.length > 0 || topCostIngredients.length > 0 ? `
    <div class="section">
      <div class="section-title">10. Nguyên Liệu & Chi Phí</div>
      
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

  <!-- 11. Doanh Thu Theo Phương Thức Thanh Toán -->
  ${Object.keys(revenueByPaymentMethod).length > 0 ? `
    <div class="section">
      <div class="section-title">11. Doanh Thu Theo Phương Thức Thanh Toán</div>
      
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

/**
 * Generate comparison bar chart HTML for branches
 */
const generateComparisonBarChartHTML = (
  data: Array<{name: string, revenue: number, orders: number}>
): string => {
  if (!data || data.length === 0) return '';
  
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
  const maxOrders = Math.max(...data.map(d => d.orders), 1);
  
  const svgWidth = 1000;
  const svgHeight = Math.max(500, data.length * 60 + 100);
  const padding = 150;
  const chartWidth = svgWidth - padding - 60;
  const chartHeight = svgHeight - 100;
  const barHeight = 25;
  const barSpacing = 8;
  const groupSpacing = 20;
  const startY = 60;
  
  return `
    <div class="chart-container">
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" style="width: 100%; height: ${svgHeight}px;">
        <rect x="${padding}" y="40" width="${chartWidth}" height="${chartHeight}" fill="#fafafa" rx="4"/>
        
        ${data.map((item, index) => {
          const y = startY + index * (barHeight * 2 + barSpacing + groupSpacing);
          const revenueWidth = (item.revenue / maxRevenue) * chartWidth;
          const ordersWidth = (item.orders / maxOrders) * chartWidth;
          
          return `
            <!-- Branch ${index} -->
            <g>
              <text x="${padding - 10}" y="${y + barHeight / 2 + 5}" text-anchor="end" font-size="11" font-weight="600" fill="#374151">${item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name}</text>
              
              <!-- Revenue bar -->
              <rect x="${padding}" y="${y}" width="${revenueWidth}" height="${barHeight}" fill="#f59e0b" rx="4"/>
              <text x="${padding + revenueWidth - 5}" y="${y + barHeight / 2 + 4}" text-anchor="end" font-size="10" font-weight="bold" fill="white">${(item.revenue).toFixed(0)}k</text>
              
              <!-- Orders bar -->
              <rect x="${padding}" y="${y + barHeight + barSpacing}" width="${ordersWidth}" height="${barHeight}" fill="#3b82f6" rx="4"/>
              <text x="${padding + ordersWidth - 5}" y="${y + barHeight + barSpacing + barHeight / 2 + 4}" text-anchor="end" font-size="10" font-weight="bold" fill="white">${item.orders}</text>
            </g>
          `;
        }).join('')}
        
        <line x1="${padding}" y1="40" x2="${padding}" y2="${40 + chartHeight}" stroke="#374151" stroke-width="2"/>
        <line x1="${padding}" y1="${40 + chartHeight}" x2="${padding + chartWidth}" y2="${40 + chartHeight}" stroke="#374151" stroke-width="2"/>
        
        <!-- Legend -->
        <g transform="translate(${padding + chartWidth - 150}, 20)">
          <rect x="0" y="0" width="15" height="15" fill="#f59e0b" rx="2"/>
          <text x="20" y="12" font-size="12" fill="#374151">Doanh thu (k)</text>
          <rect x="0" y="20" width="15" height="15" fill="#3b82f6" rx="2"/>
          <text x="20" y="32" font-size="12" fill="#374151">Đơn hàng</text>
        </g>
      </svg>
    </div>
  `;
};

/**
 * Generate pie chart HTML for branch status distribution
 */
const generateStatusPieChartHTML = (branchesData: Array<{status: 'good' | 'warning' | 'critical'}>): string => {
  if (!branchesData || branchesData.length === 0) return '';
  
  const statusCounts = {
    good: branchesData.filter(b => b.status === 'good').length,
    warning: branchesData.filter(b => b.status === 'warning').length,
    critical: branchesData.filter(b => b.status === 'critical').length,
  };
  
  const total = branchesData.length;
  const goodPercent = (statusCounts.good / total) * 100;
  const warningPercent = (statusCounts.warning / total) * 100;
  const criticalPercent = (statusCounts.critical / total) * 100;
  
  const svgSize = 300;
  const centerX = svgSize / 2;
  const centerY = svgSize / 2;
  const radius = 100;
  
  // Calculate angles
  const goodAngle = (goodPercent / 100) * 360;
  const warningAngle = (warningPercent / 100) * 360;
  const criticalAngle = (criticalPercent / 100) * 360;
  
  const goodStartAngle = 0;
  const goodEndAngle = goodAngle;
  const warningStartAngle = goodEndAngle;
  const warningEndAngle = warningStartAngle + warningAngle;
  const criticalStartAngle = warningEndAngle;
  const criticalEndAngle = criticalStartAngle + criticalAngle;
  
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const getArcPath = (startAngle: number, endAngle: number) => {
    const start = {
      x: centerX + radius * Math.cos(toRadians(startAngle - 90)),
      y: centerY + radius * Math.sin(toRadians(startAngle - 90)),
    };
    const end = {
      x: centerX + radius * Math.cos(toRadians(endAngle - 90)),
      y: centerY + radius * Math.sin(toRadians(endAngle - 90)),
    };
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${centerX} ${centerY} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
  };
  
  return `
    <div class="chart-container">
      <svg viewBox="0 0 ${svgSize} ${svgSize + 80}" style="width: 100%; max-width: 400px;">
        <path d="${getArcPath(goodStartAngle, goodEndAngle)}" fill="#10b981" stroke="#fff" stroke-width="2"/>
        <path d="${getArcPath(warningStartAngle, warningEndAngle)}" fill="#f59e0b" stroke="#fff" stroke-width="2"/>
        <path d="${getArcPath(criticalStartAngle, criticalEndAngle)}" fill="#ef4444" stroke="#fff" stroke-width="2"/>
        
        <!-- Labels -->
        <g transform="translate(${centerX}, ${svgSize + 20})">
          <rect x="-120" y="0" width="15" height="15" fill="#10b981" rx="2"/>
          <text x="-100" y="12" font-size="12" fill="#374151">Tốt: ${statusCounts.good} (${goodPercent.toFixed(1)}%)</text>
          
          <rect x="-120" y="20" width="15" height="15" fill="#f59e0b" rx="2"/>
          <text x="-100" y="32" font-size="12" fill="#374151">Cảnh báo: ${statusCounts.warning} (${warningPercent.toFixed(1)}%)</text>
          
          <rect x="-120" y="40" width="15" height="15" fill="#ef4444" rx="2"/>
          <text x="-100" y="52" font-size="12" fill="#374151">Nghiêm trọng: ${statusCounts.critical} (${criticalPercent.toFixed(1)}%)</text>
        </g>
      </svg>
    </div>
  `;
};

/**
 * Generate HTML content for All Branches PDF export
 */
const generateAllBranchesPDFHTML = (options: AllBranchesPDFExportOptions): string => {
  const { reportDate, aiData, branchesData = [] } = options;
  const summary = aiData.summary || {};
  const recommendations = aiData.recommendations || [];
  const rawData = aiData.raw_data || {};
  
  // Parse analysis into 5 sections
  const analysisSections = {
    overview: '',
    branchEvaluation: '',
    comparison: '',
    branchRecommendations: '',
    conclusion: '',
  };
  
  if (aiData.analysis) {
    const lines = aiData.analysis.split('\n');
    let currentSection: keyof typeof analysisSections | null = null;
    let currentContent: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.match(/^1\.|tổng quan.*chi nhánh|tổng quan.*tất cả/i)) {
        if (currentSection) analysisSections[currentSection] = currentContent.join('\n').trim();
        currentSection = 'overview';
        currentContent = [];
        continue;
      }
      if (trimmed.match(/^2\.|đánh giá.*chi nhánh|đánh giá.*từng/i)) {
        if (currentSection) analysisSections[currentSection] = currentContent.join('\n').trim();
        currentSection = 'branchEvaluation';
        currentContent = [];
        continue;
      }
      if (trimmed.match(/^3\.|so sánh|phân tích.*so sánh/i)) {
        if (currentSection) analysisSections[currentSection] = currentContent.join('\n').trim();
        currentSection = 'comparison';
        currentContent = [];
        continue;
      }
      if (trimmed.match(/^4\.|khuyến nghị.*chi nhánh|khuyến nghị.*từng/i)) {
        if (currentSection) analysisSections[currentSection] = currentContent.join('\n').trim();
        currentSection = 'branchRecommendations';
        currentContent = [];
        continue;
      }
      if (trimmed.match(/^5\.|kết luận|tổng kết/i)) {
        if (currentSection) analysisSections[currentSection] = currentContent.join('\n').trim();
        currentSection = 'conclusion';
        currentContent = [];
        continue;
      }
      
      if (currentSection) {
        currentContent.push(line);
      } else if (!analysisSections.overview) {
        currentContent.push(line);
      }
    }
    
    if (currentSection) {
      analysisSections[currentSection] = currentContent.join('\n').trim();
    }
  }
  
  // Format currency for table (with dots)
  const formatCurrencyTable = (value: number) => {
    if (typeof value !== 'number') return '0';
    return value.toLocaleString('vi-VN').replace(/,/g, '.');
  };
  
  // Prepare comparison data
  const comparisonData = branchesData.map(b => ({
    name: b.name.replace('Chi nhánh ', '').replace('Main Branch', 'Main'),
    revenue: b.revenue / 1000,
    orders: b.orders,
  }));
  
  const formattedDate = new Date(reportDate).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo Cáo Phân Tích AI - Tất Cả Chi Nhánh</title>
  <style>
    @media print {
      @page {
        size: A4;
        margin: 1cm;
      }
      body {
        margin: 0;
        padding: 0;
      }
      .page-break {
        page-break-before: always;
      }
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: white;
      padding: 20px;
    }
    
    .header {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    
    .header p {
      font-size: 16px;
      opacity: 0.95;
    }
    
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 20px;
      font-weight: bold;
      color: #f59e0b;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 3px solid #f59e0b;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    
    .metric-card {
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #f59e0b;
    }
    
    .metric-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 5px;
    }
    
    .metric-value {
      font-size: 18px;
      font-weight: bold;
      color: #333;
    }
    
    .chart-container {
      margin: 20px 0;
      padding: 20px;
      background: #fafafa;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    
    .chart-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 15px;
      color: #374151;
    }
    
    .analysis-content {
      white-space: pre-wrap;
      line-height: 1.8;
      color: #555;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 6px;
      margin: 15px 0;
    }
    
    .recommendations-list {
      list-style: none;
      padding: 0;
    }
    
    .recommendation-item {
      padding: 12px;
      margin: 10px 0;
      background: white;
      border-left: 4px solid #f59e0b;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    .table th,
    .table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .table th {
      background: #f59e0b;
      color: white;
      font-weight: bold;
    }
    
    .table tr:nth-child(even) {
      background: #f9fafb;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Báo Cáo Phân Tích AI - Tất Cả Chi Nhánh</h1>
    <p>Ngày: ${formattedDate}</p>
    <p>Thời gian tạo: ${new Date().toLocaleString('vi-VN')}</p>
  </div>
  
  <!-- Tóm Tắt Metrics Tổng Hợp -->
  ${summary && Object.keys(summary).length > 0 ? `
    <div class="section">
      <div class="section-title">📈 Tóm Tắt Metrics Tổng Hợp</div>
      <table class="table">
        <thead>
          <tr>
            <th>Chỉ Tiêu</th>
            <th>Giá Trị</th>
          </tr>
        </thead>
        <tbody>
          ${summary.total_branches ? `<tr>
            <td>🏢 Tổng Số Chi Nhánh</td>
            <td>${summary.total_branches} chi nhánh</td>
          </tr>` : ''}
          ${summary.active_branches ? `<tr>
            <td>✅ Chi Nhánh Hoạt Động</td>
            <td>${summary.active_branches} chi nhánh</td>
          </tr>` : ''}
          ${summary.total_revenue ? `<tr>
            <td>💰 Tổng Doanh Thu</td>
            <td>${formatCurrencyTable(summary.total_revenue)} VNĐ</td>
          </tr>` : ''}
          ${summary.total_order_count ? `<tr>
            <td>🛒 Tổng Số Đơn Hàng</td>
            <td>${summary.total_order_count} đơn</td>
          </tr>` : ''}
          ${summary.avg_order_value ? `<tr>
            <td>📊 Giá Trị TB/Đơn</td>
            <td>${formatCurrencyTable(summary.avg_order_value)} VNĐ</td>
          </tr>` : ''}
          ${summary.total_customer_count ? `<tr>
            <td>👥 Tổng Khách Hàng</td>
            <td>${summary.total_customer_count} người</td>
          </tr>` : ''}
          ${summary.total_new_customers ? `<tr>
            <td>🆕 Khách Hàng Mới</td>
            <td>${summary.total_new_customers} người</td>
          </tr>` : ''}
          ${summary.total_repeat_customers ? `<tr>
            <td>🔄 Khách Hàng Quay Lại</td>
            <td>${summary.total_repeat_customers} người</td>
          </tr>` : ''}
          ${summary.overall_customer_retention_rate !== undefined ? `<tr>
            <td>📈 Tỷ Lệ Giữ Chân</td>
            <td>${(summary.overall_customer_retention_rate < 1 ? summary.overall_customer_retention_rate * 100 : summary.overall_customer_retention_rate).toFixed(2)}%</td>
          </tr>` : ''}
          ${summary.total_unique_products_sold ? `<tr>
            <td>📦 Sản Phẩm Đã Bán</td>
            <td>${summary.total_unique_products_sold} sản phẩm</td>
          </tr>` : ''}
          ${summary.overall_avg_review_score ? `<tr>
            <td>⭐ Đánh Giá TB</td>
            <td>${summary.overall_avg_review_score.toFixed(2)}/5</td>
          </tr>` : ''}
          ${summary.total_reviews ? `<tr>
            <td>💬 Tổng Đánh Giá</td>
            <td>${summary.total_reviews} đánh giá</td>
          </tr>` : ''}
          ${summary.average_revenue_per_branch ? `<tr>
            <td>💵 Doanh Thu TB/Chi Nhánh</td>
            <td>${formatCurrencyTable(summary.average_revenue_per_branch)} VNĐ</td>
          </tr>` : ''}
        </tbody>
      </table>
    </div>
  ` : ''}
  
  <!-- Phân Tích AI - Đánh Giá Tất Cả Chi Nhánh -->
  ${aiData.analysis ? `
    <div class="section page-break">
      <div class="section-title">Phân Tích AI - Đánh Giá Tất Cả Chi Nhánh</div>
      
      ${analysisSections.overview ? `
        <div style="margin: 15px 0;">
          <h3 style="color: #f59e0b; font-size: 16px; margin-bottom: 10px;">1. TỔNG QUAN TẤT CẢ CHI NHÁNH</h3>
          <div class="analysis-content">${cleanAnalysisText(analysisSections.overview)}</div>
        </div>
      ` : ''}
      
      ${analysisSections.branchEvaluation ? `
        <div style="margin: 15px 0;">
          <h3 style="color: #f59e0b; font-size: 16px; margin-bottom: 10px;">2. ĐÁNH GIÁ TỪNG CHI NHÁNH</h3>
          <div class="analysis-content">${cleanAnalysisText(analysisSections.branchEvaluation)}</div>
        </div>
      ` : ''}
      
      ${analysisSections.comparison ? `
        <div style="margin: 15px 0;">
          <h3 style="color: #f59e0b; font-size: 16px; margin-bottom: 10px;">3. SO SÁNH VÀ PHÂN TÍCH</h3>
          <div class="analysis-content">${cleanAnalysisText(analysisSections.comparison)}</div>
        </div>
      ` : ''}
      
      ${analysisSections.branchRecommendations ? `
        <div style="margin: 15px 0;">
          <h3 style="color: #f59e0b; font-size: 16px; margin-bottom: 10px;">4. KHUYẾN NGHỊ CHO TỪNG CHI NHÁNH</h3>
          <div class="analysis-content">${cleanAnalysisText(analysisSections.branchRecommendations)}</div>
        </div>
      ` : ''}
      
      ${analysisSections.conclusion ? `
        <div style="margin: 15px 0;">
          <h3 style="color: #f59e0b; font-size: 16px; margin-bottom: 10px;">5. KẾT LUẬN</h3>
          <div class="analysis-content">${cleanAnalysisText(analysisSections.conclusion)}</div>
        </div>
      ` : ''}
    </div>
  ` : ''}
  
  <!-- So Sánh Chi Nhánh -->
  ${rawData.all_branches_stats?.branchSummaries?.length > 0 ? `
    <div class="section page-break">
      <div class="section-title">So Sánh Chi Nhánh</div>
      <table class="table">
        <thead>
          <tr>
            <th>STT</th>
            <th>Tên Chi Nhánh</th>
            <th>Doanh Thu</th>
            <th>Số Đơn</th>
            <th>Đơn Hoàn Thành</th>
            <th>Đơn Hủy</th>
          </tr>
        </thead>
        <tbody>
          ${rawData.all_branches_stats.branchSummaries.slice(0, 20).map((branch: any, idx: number) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${(branch.branchName || 'Chi nhánh').substring(0, 25)}</td>
              <td>${formatCurrencyTable(branch.revenue || 0)}</td>
              <td>${branch.orderCount || 0}</td>
              <td>${branch.completedOrders || 0}</td>
              <td>${branch.cancelledOrders || 0}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      ${comparisonData.length > 0 ? `
        <div class="chart-container">
          <div class="chart-title">Biểu đồ so sánh chi nhánh</div>
          ${generateComparisonBarChartHTML(comparisonData)}
        </div>
      ` : ''}
    </div>
  ` : ''}
  
  <!-- Top Chi Nhánh Hoạt Động Tốt Nhất -->
  ${rawData.all_branches_stats?.topPerformingBranches?.length > 0 ? `
    <div class="section page-break">
      <div class="section-title">Top Chi Nhánh Hoạt Động Tốt Nhất</div>
      <table class="table">
        <thead>
          <tr>
            <th>Hạng</th>
            <th>Tên Chi Nhánh</th>
            <th>Doanh Thu</th>
            <th>Số Đơn</th>
          </tr>
        </thead>
        <tbody>
          ${rawData.all_branches_stats.topPerformingBranches.slice(0, 10).map((branch: any, idx: number) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${(branch.branchName || 'Chi nhánh').substring(0, 30)}</td>
              <td>${formatCurrencyTable(branch.revenue || 0)}</td>
              <td>${branch.orderCount || 0}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : ''}
  
  <!-- Đánh Giá Theo Chi Nhánh -->
  ${rawData.all_branches_review_metrics?.branchReviewStats?.length > 0 ? `
    <div class="section page-break">
      <div class="section-title">Đánh Giá Theo Chi Nhánh</div>
      <table class="table">
        <thead>
          <tr>
            <th>Chi Nhánh</th>
            <th>Điểm TB</th>
            <th>Tổng Đánh Giá</th>
            <th>Tích Cực</th>
            <th>Tiêu Cực</th>
          </tr>
        </thead>
        <tbody>
          ${rawData.all_branches_review_metrics.branchReviewStats.slice(0, 20).map((branch: any) => `
            <tr>
              <td>${(branch.branchName || 'Chi nhánh').substring(0, 25)}</td>
              <td>${(branch.avgReviewScore || 0).toFixed(2)}</td>
              <td>${branch.totalReviews || 0}</td>
              <td>${branch.positiveReviews || 0}</td>
              <td>${branch.negativeReviews || 0}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      ${branchesData.length > 0 ? `
        <div class="chart-container">
          <div class="chart-title">Biểu đồ đánh giá từng chi nhánh</div>
          ${generateBarChartHTML(branchesData.map(b => ({
            name: b.name.replace('Chi nhánh ', '').replace('Main Branch', 'Main'),
            value: b.rating * 20, // Scale to 100
          })))}
        </div>
      ` : ''}
    </div>
  ` : ''}
  
  <!-- Khuyến Nghị Hành Động -->
  ${recommendations.length > 0 ? `
    <div class="section page-break">
      <div class="section-title">Khuyến Nghị Hành Động</div>
      <ul class="recommendations-list">
        ${recommendations.map((rec, idx) => `
          <li class="recommendation-item">
            <strong>${idx + 1}.</strong> ${rec}
          </li>
        `).join('')}
      </ul>
      
      ${branchesData.length > 0 ? `
        <div class="chart-container">
          <div class="chart-title">Phân bố trạng thái chi nhánh</div>
          ${generateStatusPieChartHTML(branchesData)}
        </div>
      ` : ''}
    </div>
  ` : ''}
  
  <div class="footer">
    <p>AI Analytics Service - Báo cáo được tạo tự động</p>
    <p>Hệ thống quản lý cà phê - Coffee Management System - Dành cho Admin</p>
  </div>
</body>
</html>
  `;
};

/**
 * Export All Branches AI Statistics report to PDF
 */
export const exportAllBranchesToPDF = async (options: AllBranchesPDFExportOptions): Promise<void> => {
  try {
    // Generate HTML content
    const htmlContent = generateAllBranchesPDFHTML(options);

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
  } catch (error) {
    console.error('Error exporting all branches PDF:', error);
    throw new Error('Không thể xuất PDF. Vui lòng thử lại.');
  }
};

