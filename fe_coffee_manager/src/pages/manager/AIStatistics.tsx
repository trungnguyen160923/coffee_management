import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Brain,
  BarChart3,
  RefreshCw,
  Download,
  Star,
  Package,
  DollarSign,
  ShoppingCart,
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Users,
  CreditCard,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Line,
  ComposedChart,
  Legend,
} from 'recharts';
import { aiStatisticsService } from '../../services';
import { AIAnalysisResponse, BranchMonthlyStats, BranchYearlyStats } from '../../services/aiStatisticsService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { exportAIStatisticsToPDF } from '../../services/pdfExportService';
import {
  MonthlyStatsView,
  YearlyStatsView,
  DayTabSkeleton,
  MonthTabSkeleton,
  YearTabSkeleton,
} from './statistics';

type TabType = 'day' | 'month' | 'year';

export default function AIStatistics() {
  const { managerBranch } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('day');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [monthlyStats, setMonthlyStats] = useState<BranchMonthlyStats | null>(null);
  const [yearlyStats, setYearlyStats] = useState<BranchYearlyStats | null>(null);
  const [loadingMonthly, setLoadingMonthly] = useState<boolean>(false);
  const [loadingYearly, setLoadingYearly] = useState<boolean>(false);
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    analysis: true,
    anomalyForecast: true,
    products: true,
    inventory: true,
    feedback: true,
    customers: false,
    materials: false,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [aiData, setAiData] = useState<AIAnalysisResponse | null>(null);
  const [dataSource, setDataSource] = useState<'cached' | 'new' | null>(null); // Track data source
  const [hasFetchedAIData, setHasFetchedAIData] = useState<boolean>(false); // Track if AI data has been fetched

  // Check if AI data exists in database when page loads or date changes (without calling ChatGPT)
  useEffect(() => {
    if (activeTab === 'day' && managerBranch?.branchId && selectedDate) {
      checkExistingAIData();
    }
  }, [managerBranch?.branchId, selectedDate, activeTab]);

  // Check existing AI data (without calling ChatGPT)
  const checkExistingAIData = async () => {
    if (!managerBranch?.branchId) return;

    try {
      setLoading(true);
      setError(null);
      
      // Check if data exists in database
      try {
        const existingReport = await aiStatisticsService.getReportByBranchAndDate(
          managerBranch.branchId,
          selectedDate
        );
        
        // If data exists, load it
        if (existingReport && existingReport.id) {
          const convertedData: AIAnalysisResponse = {
            success: true,
            branch_id: existingReport.branch_id,
            date: existingReport.report_date,
            analysis: existingReport.analysis || '',
            summary: existingReport.summary || {},
            recommendations: existingReport.recommendations || [],
            raw_data: existingReport.raw_data || {},
            message: 'Data already exists in database',
          };
          
          setAiData(convertedData);
          setDataSource('cached');
          setHasFetchedAIData(true);
        } else {
          setHasFetchedAIData(false);
        }
      } catch (checkError: any) {
        // If 404, no data exists
        if (checkError?.response?.status === 404 || checkError?.status === 404) {
          setHasFetchedAIData(false);
        } else {
          // Other errors, don't show error, just mark as no data
          setHasFetchedAIData(false);
        }
      }
    } catch (err: any) {
      // Silent fail, just mark as no data
      setHasFetchedAIData(false);
    } finally {
      setLoading(false);
    }
  };

  // Fetch monthly stats when branch or month changes
  useEffect(() => {
    if (activeTab === 'month' && managerBranch?.branchId && selectedMonth) {
      fetchMonthlyStats();
    }
  }, [managerBranch?.branchId, selectedMonth, activeTab]);

  // Fetch yearly stats when branch or year changes
  useEffect(() => {
    if (activeTab === 'year' && managerBranch?.branchId && selectedYear) {
      fetchYearlyStats();
    }
  }, [managerBranch?.branchId, selectedYear, activeTab]);

  const fetchAIData = async () => {
    if (!managerBranch?.branchId) {
      setError('Branch information not found');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Bước 1: Kiểm tra xem dữ liệu đã tồn tại trong database chưa
      try {
        const existingReport = await aiStatisticsService.getReportByBranchAndDate(
          managerBranch.branchId,
          selectedDate
        );
        
        // Nếu có dữ liệu đã tồn tại, convert sang format AIAnalysisResponse và sử dụng
        if (existingReport && existingReport.id) {
          const convertedData: AIAnalysisResponse = {
            success: true,
            branch_id: existingReport.branch_id,
            date: existingReport.report_date,
            analysis: existingReport.analysis || '',
            summary: existingReport.summary || {},
            recommendations: existingReport.recommendations || [],
            raw_data: existingReport.raw_data || {},
            message: 'Data already exists in database',
          };
          
          setAiData(convertedData);
          setDataSource('cached'); // Đánh dấu là dữ liệu từ cache/database
          setHasFetchedAIData(true); // Mark as fetched
          setLoading(false);
          setRefreshing(false);
          return; // Dừng lại, không cần gọi AI nữa
        }
      } catch (checkError: any) {
        // Nếu không tìm thấy dữ liệu (404) hoặc lỗi khác, tiếp tục gọi AI
        // Chỉ log lỗi nếu không phải 404 (not found)
        if (checkError?.response?.status !== 404) {
          console.warn('Error checking existing report:', checkError);
        }
        // Tiếp tục với việc gọi AI để tạo mới
      }
      
      // Bước 2: Nếu không có dữ liệu, gọi AI để tạo mới
      const response = await aiStatisticsService.getAIAnalysis({
        branch_id: managerBranch.branchId,
        date: selectedDate,
        tool_type: 'tool1',
      });
      
      setAiData(response);
      setDataSource('new'); // Đánh dấu là dữ liệu mới được tạo bởi AI
      setHasFetchedAIData(true); // Mark as fetched
    } catch (err: any) {
      console.error('Error fetching AI data:', err);
      const errorMessage = err?.response?.data?.detail || err?.message || 'Unable to load AI data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (!managerBranch?.branchId) return;
    
    setRefreshing(true);
    setDataSource(null);
    
    // Force refresh: bỏ qua check cache, gọi AI trực tiếp
    try {
      setError(null);
      const response = await aiStatisticsService.getAIAnalysis({
        branch_id: managerBranch.branchId,
        date: selectedDate,
        tool_type: 'tool1',
      });
      setAiData(response);
      setDataSource('new');
      setHasFetchedAIData(true); // Mark as fetched
      toast.success('AI data refreshed');
    } catch (err: any) {
      console.error('Error refreshing AI data:', err);
      const errorMessage = err?.response?.data?.detail || err?.message || 'Unable to refresh AI data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchMonthlyStats = async () => {
    if (!managerBranch?.branchId) {
      setError('Branch information not found');
      return;
    }

    try {
      setLoadingMonthly(true);
      setError(null);
      const [year, month] = selectedMonth.split('-').map(Number);
      const stats = await aiStatisticsService.getBranchMonthlyStats(
        managerBranch.branchId,
        year,
        month
      );
      
      setMonthlyStats(stats);
    } catch (err: any) {
      console.error('Error fetching monthly stats:', err);
      const errorMessage = err?.response?.data?.detail || err?.message || 'Unable to load monthly statistics';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoadingMonthly(false);
    }
  };

  const fetchYearlyStats = async () => {
    if (!managerBranch?.branchId) {
      setError('Branch information not found');
      return;
    }

    try {
      setLoadingYearly(true);
      setError(null);
      const stats = await aiStatisticsService.getBranchYearlyStats(
        managerBranch.branchId,
        selectedYear
      );
      
      setYearlyStats(stats);
    } catch (err: any) {
      console.error('Error fetching yearly stats:', err);
      const errorMessage = err?.response?.data?.detail || err?.message || 'Unable to load yearly statistics';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoadingYearly(false);
    }
  };

  const handleExportPDF = async () => {
    if (!aiData || !managerBranch) {
      toast.error('No data available to export PDF');
      return;
    }

    try {
      await exportAIStatisticsToPDF({
        branchName: managerBranch.name,
        branchId: managerBranch.branchId,
        reportDate: selectedDate,
        aiData: aiData,
      });
      toast.success('Opening PDF print window...');
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      toast.error(error?.message || 'Unable to export PDF. Please try again.');
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Parse analysis text to extract strengths, weaknesses, and recommendations
  const parseAnalysis = (analysisText: string) => {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];
    
    if (!analysisText) return { strengths, weaknesses, recommendations };
    
    const lines = analysisText.split('\n');
    let currentSection: 'strengths' | 'weaknesses' | 'recommendations' | null = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Detect section headers
      if (trimmed.includes('Điểm mạnh') || trimmed.includes('điểm mạnh') || (trimmed.includes('2.') && trimmed.toLowerCase().includes('điểm mạnh'))) {
        currentSection = 'strengths';
        continue;
      }
      if (trimmed.includes('Điểm yếu') || trimmed.includes('điểm yếu') || trimmed.includes('Vấn đề') || (trimmed.includes('2.') && trimmed.toLowerCase().includes('điểm yếu'))) {
        currentSection = 'weaknesses';
        continue;
      }
      if (trimmed.includes('Khuyến nghị') || trimmed.includes('khuyến nghị') || trimmed.includes('5.')) {
        currentSection = 'recommendations';
        continue;
      }
      
      // Extract bullet points
      if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
        const content = trimmed.replace(/^[-•*]\s*/, '').replace(/\*\*/g, '').trim();
        if (content && content.length > 10) {
          if (currentSection === 'strengths') {
            strengths.push(content);
          } else if (currentSection === 'weaknesses') {
            weaknesses.push(content);
          } else if (currentSection === 'recommendations') {
            recommendations.push(content);
          }
        }
      } else if (trimmed.length > 20 && !trimmed.startsWith('#') && !trimmed.startsWith('###')) {
        // Also capture non-bullet lines that look like analysis points
        if (currentSection === 'strengths' && strengths.length < 5) {
          strengths.push(trimmed);
        } else if (currentSection === 'weaknesses' && weaknesses.length < 5) {
          weaknesses.push(trimmed);
        } else if (currentSection === 'recommendations' && recommendations.length < 10) {
          recommendations.push(trimmed);
        }
      }
    }
    
    return { 
      strengths: strengths.slice(0, 5), 
      weaknesses: weaknesses.slice(0, 5),
      recommendations: recommendations.slice(0, 10)
    };
  };

  // Extract forecast data from prophet_forecast
  const getForecastData = () => {
    const rawData = aiData?.raw_data as any;
    if (!rawData?.prophet_forecast || Object.keys(rawData.prophet_forecast).length === 0) return null;
    
    const forecast = rawData.prophet_forecast;
    
    // Handle Vietnamese structure: du_bao_theo_ngay
    let forecastData: any[] = [];
    if (forecast.du_bao_theo_ngay && Array.isArray(forecast.du_bao_theo_ngay)) {
      forecastData = forecast.du_bao_theo_ngay.map((item: any) => ({
        date: item.ngay,
        value: item.du_bao || 0,
        min: item.khoang_tin_cay?.min || item.du_bao || 0,
        max: item.khoang_tin_cay?.max || item.du_bao || 0,
      }));
    } else {
      // Fallback to old structure
      let forecastValues = forecast.forecast_values || [];
      if (Array.isArray(forecastValues)) {
        forecastData = forecastValues;
      } else if (typeof forecastValues === 'object' && forecastValues !== null) {
        // Convert object to array: {"2025-11-10": 150, "2025-11-11": 165}
        forecastData = Object.entries(forecastValues).map(([date, value]: [string, any]) => ({
          date,
          value: typeof value === 'object' ? (value.value || value.forecast || 0) : value,
          min: typeof value === 'object' ? (value.min || value.value || 0) : value,
          max: typeof value === 'object' ? (value.max || value.value || 0) : value,
        }));
      }
    }
    
    if (forecastData.length === 0) return null;
    
    // Get tomorrow's forecast (first future date, skip today if it's in the array)
    const tomorrow = forecastData.find((item: any) => {
      const itemDate = new Date(item.date);
      const today = new Date(selectedDate);
      return itemDate > today;
    }) || forecastData[0];
    
    // Get confidence level
    let confidenceLevel: string | number = 'medium';
    if (forecast.do_tin_cay) {
      if (typeof forecast.do_tin_cay === 'object') {
        confidenceLevel = forecast.do_tin_cay.muc_do || forecast.do_tin_cay.phan_tram || 'medium';
      } else {
        confidenceLevel = forecast.do_tin_cay;
      }
    } else {
      confidenceLevel = forecast.confidence_level || forecast.confidence || 'medium';
    }
    
    return {
      tomorrow: {
        revenue: tomorrow.value || 0,
        orders: tomorrow.value || 0,
        rawValue: tomorrow.value || 0,
        confidence: confidenceLevel,
      },
      allForecasts: forecastData,
      confidenceIntervals: forecast.confidence_intervals || {},
      confidenceLevel: confidenceLevel,
      forecastStartDate: forecast.tu_ngay || forecast.forecast_start_date,
      forecastEndDate: forecast.den_ngay || forecast.forecast_end_date,
      chiTieu: forecast.chi_tieu || 'Doanh thu',
      chiTieuCode: forecast.chi_tieu_code || 'revenue',
    };
  };

  // Extract anomaly data
  const getAnomalyData = () => {
    const rawData = aiData?.raw_data as any;
    if (!rawData?.isolation_forest_anomaly || Object.keys(rawData.isolation_forest_anomaly).length === 0) {
      return null;
    }
    
    const anomaly = rawData.isolation_forest_anomaly;
    
    // Handle different anomaly data structures
    const isAnomaly = anomaly.is_anomaly || anomaly.overall_result?.is_anomaly || false;
    const anomalyScore = anomaly.anomaly_score || anomaly.overall_result?.isolation_forest_result?.anomaly_score || 0;
    const confidence = anomaly.confidence_level || anomaly.overall_result?.isolation_forest_result?.confidence_level || 0;
    const confidencePercent = anomaly.confidence_percent || (confidence ? confidence * 100 : 0);
    
    // Get anomalous features - support both formats
    let anomalousFeatures: any[] = [];
    if (anomaly.chi_tieu_bat_thuong && Array.isArray(anomaly.chi_tieu_bat_thuong)) {
      anomalousFeatures = anomaly.chi_tieu_bat_thuong;
    } else if (anomaly.anomalous_features && Array.isArray(anomaly.anomalous_features)) {
      anomalousFeatures = anomaly.anomalous_features;
    }
    
    return {
      isAnomaly,
      anomalyScore,
      confidence,
      confidencePercent,
      anomalousFeatures,
      featureValues: anomaly.feature_values || {},
      comparisonSummary: anomaly.comparison_summary || {},
      overallResult: anomaly.overall_result || {},
    };
  };

  // Parse anomaly and forecast from analysis text
  const parseAnomalyAndForecastFromAnalysis = (analysisText: string) => {
    if (!analysisText) return { anomalies: [], forecast: null };
    
    const anomalies: string[] = [];
    let forecast: string | null = null;
    
    const lines = analysisText.split('\n');
    let inAnomalySection = false;
    let inForecastSection = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Detect anomaly section
      if (trimmed.includes('3.') && (trimmed.includes('vấn đề') || trimmed.includes('chú ý') || trimmed.includes('bất thường'))) {
        inAnomalySection = true;
        inForecastSection = false;
        continue;
      }
      
      // Detect forecast section
      if (trimmed.includes('4.') && (trimmed.includes('dự đoán') || trimmed.includes('dự báo') || trimmed.includes('tương lai'))) {
        inForecastSection = true;
        inAnomalySection = false;
        continue;
      }
      
      // Stop at next section
      if (trimmed.includes('5.') || trimmed.includes('###')) {
        inAnomalySection = false;
        inForecastSection = false;
        continue;
      }
      
      // Extract anomaly points
      if (inAnomalySection && (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*'))) {
        const content = trimmed.replace(/^[-•*]\s*/, '').replace(/\*\*/g, '').trim();
        if (content && content.length > 10) {
          anomalies.push(content);
        }
      } else if (inAnomalySection && trimmed.length > 20 && !trimmed.startsWith('#')) {
        anomalies.push(trimmed);
      }
      
      // Extract forecast text
      if (inForecastSection && trimmed.length > 20 && !trimmed.startsWith('#')) {
        if (!forecast) {
          forecast = trimmed;
        } else {
          forecast += ' ' + trimmed;
        }
      }
    }
    
    return { anomalies: anomalies.slice(0, 10), forecast };
  };

  // Get alerts from inventory and anomaly data
  const getAlerts = () => {
    const alerts: Array<{ type: 'critical' | 'warning'; title: string; message: string; count?: number }> = [];
    
    if (!aiData?.raw_data) return alerts;
    
    const rawData = aiData.raw_data as any;
    const inventory = rawData.inventory_metrics;
    const anomaly = rawData.isolation_forest_anomaly;
    
    // Inventory alerts
    if (inventory?.outOfStockProducts > 0) {
      alerts.push({
        type: 'critical',
        title: 'Out of stock ingredients',
        message: `${inventory.outOfStockProducts} ingredients are out of stock`,
        count: inventory.outOfStockProducts,
      });
    }
    
    if (inventory?.lowStockProducts > 0) {
      alerts.push({
        type: 'warning',
        title: 'Low stock ingredients',
        message: `${inventory.lowStockProducts} ingredients need urgent restocking`,
        count: inventory.lowStockProducts,
      });
    }
    
    // Anomaly alerts
    if (anomaly?.is_anomaly) {
      const anomalyCount = anomaly.chi_tieu_bat_thuong?.length || anomaly.anomalous_features?.length || 0;
      if (anomalyCount > 0) {
        alerts.push({
          type: 'warning',
          title: 'Anomaly detected',
          message: `${anomalyCount} abnormal indicators detected`,
        });
      }
    }
    
    return alerts;
  };

  // Format currency helper
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}tr`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toFixed(0);
  };

  // Prepare data for display
  const rawData = aiData?.raw_data as any;
  const parsedAnalysis = parseAnalysis(aiData?.analysis || '');
  
  const displayData = {
    summary: aiData?.summary || {
      total_revenue: 0,
      order_count: 0,
      avg_order_value: 0,
      avg_review_score: 0,
    },
    alerts: getAlerts(),
    revenueByHour: (rawData?.revenue_metrics?.revenueByHour || []).map((item: any) => ({
      hour: item.hour,
      revenue: item.revenue ? Number(item.revenue) : 0,
      orders: item.orderCount || 0,
    })),
    revenueByPaymentMethod: rawData?.revenue_metrics?.revenueByPaymentMethod || {},
    orderStatus: {
      completed: rawData?.revenue_metrics?.completedOrders || 0,
      cancelled: rawData?.revenue_metrics?.cancelledOrders || 0,
      pending: rawData?.revenue_metrics?.pendingOrders || 0,
    },
    topCustomers: (rawData?.customer_metrics?.topCustomers || []).map((item: any) => ({
      name: item.customerName || 'Walk-in customer',
      orderCount: item.orderCount || 0,
      totalSpent: item.totalSpent ? Number(item.totalSpent) : 0,
    })),
    topProducts: (rawData?.product_metrics?.topProducts || []).map((item: any) => ({
      name: item.productName || 'N/A',
      quantity: item.quantitySold ? Number(item.quantitySold) : 0,
      revenue: item.revenue ? Number(item.revenue) : 0,
      trend: 0, // Trend data not available from API
    })),
    productsByCategory: rawData?.product_metrics?.productsByCategory || {},
    lowStockItems: [
      ...(rawData?.inventory_metrics?.lowStockItems || []).map((item: any) => ({
        name: item.ingredientName || 'N/A',
        current: item.currentQuantity ? Number(item.currentQuantity) : 0,
        unit: item.unitName || item.unitCode || '',
        threshold: item.threshold ? Number(item.threshold) : 0,
        urgency: item.currentQuantity && item.threshold && Number(item.currentQuantity) < Number(item.threshold) * 0.5 ? 'high' : 'medium',
      })),
      ...(rawData?.inventory_metrics?.outOfStockItems || []).map((item: any) => ({
        name: item.ingredientName || 'N/A',
        current: item.currentQuantity ? Number(item.currentQuantity) : 0,
        unit: item.unitName || item.unitCode || '',
        threshold: item.threshold ? Number(item.threshold) : 0,
        urgency: 'high' as const,
      })),
    ],
    topIngredientsByValue: (rawData?.inventory_metrics?.topIngredientsByValue || []).map((item: any) => ({
      name: item.ingredientName || 'N/A',
      quantity: item.quantity ? Number(item.quantity) : 0,
      unit: item.unitCode || '',
      stockValue: item.stockValue ? Number(item.stockValue) : 0,
    })),
    topCostIngredients: (rawData?.material_cost_metrics?.topCostIngredients || []).map((item: any) => ({
      name: item.ingredientName || 'N/A',
      totalCost: item.totalCost ? Number(item.totalCost) : 0,
      percentage: item.percentage ? Number(item.percentage) : 0,
    })),
    recentReviews: (rawData?.review_metrics?.recentReviews || []).map((review: any) => ({
      rating: review.rating || 0,
      comment: review.comment || review.content || '',
      date: review.createdAt || review.date || '',
      customerId: review.customerId,
    })),
    reviewDistribution: rawData?.review_metrics?.reviewDistribution || {},
    aiAnalysis: {
      strengths: parsedAnalysis.strengths,
      weaknesses: parsedAnalysis.weaknesses,
      recommendations: parsedAnalysis.recommendations.length > 0 
        ? parsedAnalysis.recommendations.map((rec: string) => {
            const priority = rec.toLowerCase().includes('urgent') || rec.toLowerCase().includes('critical') ? 'high' :
                            rec.toLowerCase().includes('important') || rec.toLowerCase().includes('should') || rec.toLowerCase().includes('enhance') ? 'medium' : 'low';
            return { priority, action: rec };
          })
        : (aiData?.recommendations || []).map((rec: string) => {
            const priority = rec.toLowerCase().includes('khẩn cấp') || rec.toLowerCase().includes('khẩn') ? 'high' :
                            rec.toLowerCase().includes('quan trọng') || rec.toLowerCase().includes('nên') ? 'medium' : 'low';
            return { priority, action: rec };
          }),
      forecast: getForecastData() || {
        tomorrow: { revenue: 0, orders: 0, confidence: 'low' },
      },
    },
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-2 py-4 sm:px-4 lg:px-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header actions */}
          <div className="flex items-center justify-between px-8 pt-6 pb-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">AI Statistics</h1>
              <p className="text-sm text-slate-500">
                Automated analysis & forecasting for your branch
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeTab === 'day' && !hasFetchedAIData && (
                <button 
                  onClick={fetchAIData}
                  disabled={loading || refreshing}
                  className="flex items-center space-x-2 rounded-lg bg-amber-500 text-white px-4 py-2 text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Brain className="w-4 h-4" />
                  <span>{loading || refreshing ? 'Đang phân tích AI...' : 'Phân tích AI'}</span>
                </button>
              )}
              {activeTab === 'day' && hasFetchedAIData && (
                <button 
                  onClick={handleRefresh}
                  disabled={loading || refreshing}
                  className="flex items-center space-x-2 rounded-lg bg-slate-100 text-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              )}
              {activeTab === 'month' && (
                <button 
                  onClick={fetchMonthlyStats}
                  disabled={loadingMonthly}
                  className="flex items-center space-x-2 rounded-lg bg-slate-100 text-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingMonthly ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              )}
              {activeTab === 'year' && (
                <button 
                  onClick={fetchYearlyStats}
                  disabled={loadingYearly}
                  className="flex items-center space-x-2 rounded-lg bg-slate-100 text-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingYearly ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              )}
              <button 
                onClick={handleExportPDF}
                disabled={loading || !aiData}
                className="flex items-center space-x-2 rounded-lg bg-sky-500 text-white px-4 py-2 text-sm font-medium hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 pt-4">

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('day')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'day'
                      ? 'text-sky-600 border-b-2 border-sky-600 bg-sky-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setActiveTab('month')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'month'
                      ? 'text-sky-600 border-b-2 border-sky-600 bg-sky-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setActiveTab('year')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'year'
                      ? 'text-sky-600 border-b-2 border-sky-600 bg-sky-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Year
                </button>
              </div>
            </div>

            {/* Filters - Inline */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Branch</label>
              <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                {managerBranch?.name || 'No branch information'}
              </div>
            </div>
            {activeTab === 'day' && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setHasFetchedAIData(false); // Reset khi đổi ngày
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
            )}
            {activeTab === 'month' && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Month</label>
                <input
                  type="month"
                  value={selectedMonth}
                  max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  disabled={loadingMonthly}
                />
              </div>
            )}
            {activeTab === 'year' && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
                <input
                  type="number"
                  value={selectedYear}
                  min="2020"
                  max={new Date().getFullYear()}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  disabled={loadingYearly}
                />
              </div>
            )}
          </div>
        </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* No Branch Warning */}
            {!managerBranch && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-medium">Branch information not found. Please log in again.</p>
                </div>
              </div>
            )}

            {/* Loading State - Skeleton for Day tab */}
            {activeTab === 'day' && loading && (
              <DayTabSkeleton />
            )}
      {/* Loading State - Skeleton for Month tab */}
      {activeTab === 'month' && (loadingMonthly || (!monthlyStats && managerBranch?.branchId && selectedMonth)) && (
        <MonthTabSkeleton />
      )}
      {/* Loading State - Skeleton for Year tab */}
      {activeTab === 'year' && (loadingYearly || (!yearlyStats && managerBranch?.branchId && selectedYear)) && (
        <YearTabSkeleton />
      )}

            {/* Alerts - Compact - Only show in Day tab */}
            {activeTab === 'day' && !loading && displayData.alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {displayData.alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-lg border-l-4 ${
                alert.type === 'critical'
                  ? 'bg-red-50 border-red-500'
                  : 'bg-yellow-50 border-yellow-500'
              }`}
            >
              <AlertTriangle
                className={`h-5 w-5 flex-shrink-0 ${
                  alert.type === 'critical' ? 'text-red-600' : 'text-yellow-600'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">{alert.title}</p>
                <p className="text-xs text-gray-600">{alert.message}</p>
              </div>
              {alert.count && (
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">
                  {alert.count}
                </span>
              )}
            </div>
                ))}
              </div>
            )}

            {/* Key Metrics - Compact Grid - Only show in Day tab */}
            {activeTab === 'day' && !loading && aiData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <MetricCard
            title="Revenue"
            value={formatCurrency(displayData.summary.total_revenue || 0)}
            change={0}
            icon={DollarSign}
            color="emerald"
          />
          <MetricCard
            title="Orders"
            value={(displayData.summary.order_count || 0).toString()}
            change={0}
            icon={ShoppingCart}
            color="blue"
          />
          <MetricCard
            title="Avg/Order"
            value={formatCurrency(displayData.summary.avg_order_value || 0)}
            change={0}
            icon={Activity}
            color="purple"
          />
          <MetricCard
            title="Rating"
            value={`${(displayData.summary.avg_review_score || 0).toFixed(1)}/5`}
            change={0}
            icon={Star}
            color="amber"
          />
        </div>
      )}

      {/* Additional Metrics Row - Only show in Day tab */}
      {activeTab === 'day' && !loading && aiData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <MetricCard
            title="Customers"
            value={(displayData.summary.customer_count || 0).toString()}
            change={0}
            icon={Activity}
            color="blue"
          />
          <MetricCard
            title="New Customers"
            value={(displayData.summary.new_customers || 0).toString()}
            change={0}
            icon={Activity}
            color="emerald"
          />
          <MetricCard
            title="Retention Rate"
            value={`${((displayData.summary.customer_retention_rate || 0) * 100).toFixed(0)}%`}
            change={0}
            icon={Activity}
            color="purple"
          />
          <MetricCard
            title="Product Diversity"
            value={`${((displayData.summary.product_diversity_score || 0) * 100).toFixed(0)}%`}
            change={0}
            icon={Package}
            color="amber"
          />
              </div>
            )}

            {/* Empty State - Chưa gọi API ChatGPT */}
            {activeTab === 'day' && !loading && !hasFetchedAIData && !error && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center">
                <Brain className="h-16 w-16 text-amber-400 mb-4" />
                <p className="text-gray-600 text-lg mb-2 font-semibold">Chưa có phân tích AI</p>
                <p className="text-gray-500 text-sm mb-4">Nhấn nút "Phân tích AI" ở trên để bắt đầu phân tích</p>
                <button
                  onClick={fetchAIData}
                  disabled={loading}
                  className="px-6 py-3 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Brain className="h-5 w-5" />
                  {loading ? 'Đang phân tích...' : 'Phân tích AI'}
                </button>
              </div>
            )}

            {/* Day Tab Content */}
            {activeTab === 'day' && !loading && hasFetchedAIData && aiData && (
        <div className="space-y-4">
          {/* 1. OVERVIEW & FORECAST */}
          <CollapsibleSection
            title="Overview & Forecast"
            icon={Activity}
            expanded={expandedSections.overview}
            onToggle={() => toggleSection('overview')}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Revenue Chart */}
              

            {/* Forecast Summary */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Tomorrow's Forecast
              </h3>
              <div className="space-y-3">
                {displayData.aiAnalysis.forecast.tomorrow.revenue > 0 ? (
                  <>

                    <div>
                      <p className="text-xs text-gray-600">Expected Orders</p>
                      <p className="text-xl font-bold text-gray-800">
                      {Math.floor(displayData.aiAnalysis.forecast.tomorrow.orders)} orders
                      </p>
                    </div>
                    <div className="pt-2 border-t border-green-200">
                      <p className="text-xs text-gray-500">
                        Confidence: <span className={`font-semibold ${
                          displayData.aiAnalysis.forecast.tomorrow.confidence === 'high' ? 'text-green-600' :
                          displayData.aiAnalysis.forecast.tomorrow.confidence === 'medium' ? 'text-yellow-600' :
                          'text-gray-600'
                        }`}>
                          {displayData.aiAnalysis.forecast.tomorrow.confidence === 'high' ? 'High' :
                           displayData.aiAnalysis.forecast.tomorrow.confidence === 'medium' ? 'Medium' : 'Low'}
                        </span>
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-400 text-sm py-4">
                    No forecast available
                  </div>
                )}
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* 2. ANOMALY ANALYSIS & FUTURE FORECAST */}
        <CollapsibleSection
          title="Anomaly Analysis & Future Forecast"
          icon={Activity}
          expanded={expandedSections.anomalyForecast}
          onToggle={() => toggleSection('anomalyForecast')}
        >
          <div className="space-y-4">
            {/* Anomaly Detection Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Points to Note - Anomaly Detection
              </h3>
              {(() => {
                const anomalyData = getAnomalyData();
                const analysisInfo = parseAnomalyAndForecastFromAnalysis(aiData?.analysis || '');
                
                // Use analysis text if available, otherwise use raw data
                const anomalyPoints = analysisInfo.anomalies.length > 0 
                  ? analysisInfo.anomalies 
                  : (anomalyData?.anomalousFeatures || []);
                
                if (!anomalyData && anomalyPoints.length === 0) {
                  return (
                    <div className="text-center py-6 text-gray-400 text-sm">
                      <p>✓ No anomalies detected</p>
                      <p className="text-xs mt-1">All indicators are operating normally</p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-3">
                    {/* Status Card */}
                    {anomalyData && (
                      <div className={`p-3 rounded-lg border-l-4 ${
                        anomalyData.isAnomaly 
                          ? 'bg-red-50 border-red-500' 
                          : 'bg-green-50 border-green-500'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm">
                            {anomalyData.isAnomaly ? '⚠️ Anomaly detected' : '✓ No anomalies'}
                          </span>
                          {anomalyData.confidencePercent > 0 && (
                            <span className={`text-xs font-medium ${
                              anomalyData.isAnomaly ? 'text-red-700' : 'text-green-700'
                            }`}>
                              Confidence: {anomalyData.confidencePercent.toFixed(1)}%
                            </span>
                          )}
                        </div>
                        {anomalyData.anomalyScore > 0 && (
                          <p className="text-xs text-gray-600">
                            Anomaly Score: {anomalyData.anomalyScore.toFixed(3)}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Anomaly Points from Analysis or Raw Data */}
                    {anomalyPoints.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Abnormal indicators:</h4>
                        <div className="space-y-2">
                          {anomalyPoints.map((point: any, idx: number) => {
                            // Handle both string and object formats
                            const pointText = typeof point === 'string' ? point : 
                                            point.name || point.feature || point.description || JSON.stringify(point);
                            const change = typeof point === 'object' ? (point.change || point.percentage) : null;
                            const severity = typeof point === 'object' ? (point.severity || point.muc_do) : null;
                            
                            return (
                              <div key={idx} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                <p className="text-sm font-medium text-gray-900">{pointText}</p>
                                {(change || severity) && (
                                  <div className="mt-1 flex gap-3 text-xs text-gray-600">
                                    {change && (
                                      <span>Change: <span className="font-semibold">{change > 0 ? '+' : ''}{change}%</span></span>
                                    )}
                                    {severity && (
                                      <span>Severity: <span className="font-semibold">{severity}</span></span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Forecast Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Future Forecast
              </h3>
              {(() => {
                const forecastData = getForecastData();
                const analysisInfo = parseAnomalyAndForecastFromAnalysis(aiData?.analysis || '');
                
                if (!forecastData && !analysisInfo.forecast) {
                  return (
                    <div className="text-center py-6 text-gray-400 text-sm">
                      <p>No forecast data available</p>
                      <p className="text-xs mt-1">Data will be updated when model is trained</p>
                    </div>
                  );
                }
                
                // Prepare forecast chart data
                const chartData: any[] = [];
                if (forecastData?.allForecasts && forecastData.allForecasts.length > 0) {
                  forecastData.allForecasts.forEach((item: any) => {
                    const date = item.date ? new Date(item.date) : new Date();
                    const value = item.value || 0;
                    const min = item.min !== undefined ? Math.max(0, item.min) : value; // Ensure non-negative for display
                    const max = item.max !== undefined ? Math.max(0, item.max) : value;
                    
                    chartData.push({
                      day: date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' }),
                      date: item.date,
                      value: Math.max(0, value), // Show 0 instead of negative values
                      min: min,
                      max: max,
                      rawValue: value, // Keep original for tooltip
                    });
                  });
                }
                
                return (
                  <div className="space-y-4">
                    {/* Forecast Summary Cards */}
                    {forecastData && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 p-3">
                          <p className="text-xs text-gray-600 mb-1">Tomorrow's Forecast</p>
                          <p className="text-xl font-bold text-green-700">
                            {forecastData.tomorrow.orders > 0 
                              ? `${Math.max(0, forecastData.tomorrow.orders).toFixed(0)} orders`
                              : formatCurrency(Math.max(0, forecastData.tomorrow.revenue || forecastData.tomorrow.orders))
                            }
                          </p>
                          {forecastData.tomorrow.rawValue !== undefined && forecastData.tomorrow.rawValue < 0 && (
                            <p className="text-xs text-yellow-600 mt-1">
                              Original value: {forecastData.tomorrow.rawValue}
                            </p>
                          )}
                        </div>
                        <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
                          <p className="text-xs text-gray-600 mb-1">Confidence</p>
                          <p className={`text-lg font-bold ${
                            typeof forecastData.confidenceLevel === 'string' 
                              ? (forecastData.confidenceLevel === 'CAO' || forecastData.confidenceLevel === 'high' ? 'text-green-600' : 
                                 forecastData.confidenceLevel === 'TRUNG BÌNH' || forecastData.confidenceLevel === 'medium' ? 'text-yellow-600' : 'text-gray-600')
                              : (forecastData.confidenceLevel > 0.7 ? 'text-green-600' : 
                                 forecastData.confidenceLevel > 0.4 ? 'text-yellow-600' : 'text-gray-600')
                          }`}>
                            {typeof forecastData.confidenceLevel === 'string' 
                              ? (forecastData.confidenceLevel === 'CAO' || forecastData.confidenceLevel === 'high' ? 'High' : 
                                 forecastData.confidenceLevel === 'TRUNG BÌNH' || forecastData.confidenceLevel === 'medium' ? 'Medium' : 'Low')
                              : `${(forecastData.confidenceLevel * 100).toFixed(0)}%`
                            }
                          </p>
                          {typeof forecastData.confidenceLevel === 'object' && forecastData.confidenceLevel !== null && 'phan_tram' in forecastData.confidenceLevel && (
                            <p className="text-xs text-gray-500 mt-1">
                              {(forecastData.confidenceLevel as any).phan_tram}%
                            </p>
                          )}
                        </div>
                        <div className="bg-purple-50 rounded-lg border border-purple-200 p-3">
                          <p className="text-xs text-gray-600 mb-1">Forecast Days</p>
                          <p className="text-lg font-bold text-purple-700">
                            {forecastData.allForecasts?.length || 0} days
                          </p>
                          {forecastData.forecastStartDate && forecastData.forecastEndDate && (
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(forecastData.forecastStartDate).toLocaleDateString('vi-VN')} - {new Date(forecastData.forecastEndDate).toLocaleDateString('vi-VN')}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Forecast Chart */}
                    {chartData.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-gray-700">
                            Forecast Chart - {forecastData?.chiTieu || 'order count'} ({chartData.length} days)
                          </h4>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span>Forecast</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-blue-200 rounded"></div>
                              <span>Confidence Interval</span>
                            </div>
                          </div>
                        </div>
                        <ResponsiveContainer width="100%" height={280}>
                          <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 60, left: 10 }}>
                            <defs>
                              <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#93c5fd" stopOpacity={0.1} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                            <XAxis 
                              dataKey="day" 
                              stroke="#666" 
                              tick={{ fontSize: 10 }}
                              angle={-45}
                              textAnchor="end"
                              height={70}
                              interval={0}
                            />
                            <YAxis 
                              stroke="#666" 
                              tick={{ fontSize: 11 }}
                              label={{ value: forecastData?.chiTieuCode === 'order_count' ? 'Orders' : 'Value', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                            />
                            <Tooltip
                              formatter={(_value: any, name: string, props: any) => {
                                if (name === 'Confidence Interval') {
                                  return [`${formatCurrency(props.payload.min)} - ${formatCurrency(props.payload.max)}`, 'Confidence Interval'];
                                }
                                const rawValue = props.payload.rawValue;
                                const displayValue = Math.max(0, rawValue);
                                return [
                                  `${formatCurrency(displayValue)}${rawValue < 0 ? ' (original: ' + rawValue + ')' : ''}`,
                                  name
                                ];
                              }}
                              labelFormatter={(label) => `Date: ${label}`}
                              contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '12px',
                                padding: '8px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              }}
                            />
                            <Legend 
                              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                              iconType="line"
                            />
                            {/* Confidence Interval Area */}
                            <Area
                              type="monotone"
                              dataKey="max"
                              stroke="none"
                              fill="url(#confidenceGradient)"
                              fillOpacity={0.3}
                              name="Confidence Interval"
                              isAnimationActive={false}
                            />
                            <Area
                              type="monotone"
                              dataKey="min"
                              stroke="none"
                              fill="#fff"
                              fillOpacity={1}
                              isAnimationActive={false}
                            />
                            {/* Forecast Line */}
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke="#10b981"
                              strokeWidth={3}
                              dot={{ fill: '#10b981', r: 5, strokeWidth: 2, stroke: '#fff' }}
                              activeDot={{ r: 7, stroke: '#10b981', strokeWidth: 2 }}
                              name="Forecast"
                              isAnimationActive={true}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                        {chartData.some((item: any) => item.rawValue < 0) && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                            <span className="font-semibold">Note:</span> Some forecast values are negative (possibly due to insufficient historical data), displayed as 0 on the chart.
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Forecast Text Description */}
                    {analysisInfo.forecast && (
                      <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Forecast Description:</h4>
                        <p className="text-sm text-gray-700 leading-relaxed">{analysisInfo.forecast}</p>
                      </div>
                    )}
                    
                    {/* Forecast List */}
                    {forecastData?.allForecasts && forecastData.allForecasts.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Daily Forecast Details:</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {forecastData.allForecasts.map((item: any, idx: number) => {
                            const value = item.value || 0;
                            const min = item.min !== undefined ? item.min : value;
                            const max = item.max !== undefined ? item.max : value;
                            const hasConfidenceInterval = item.min !== undefined && item.max !== undefined && item.min !== item.max;
                            const isNegative = value < 0;
                            
                            return (
                              <div 
                                key={idx} 
                                className={`p-3 rounded-lg border ${
                                  isNegative 
                                    ? 'bg-yellow-50 border-yellow-200' 
                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                } transition-colors`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-700">
                                    {item.date ? new Date(item.date).toLocaleDateString('vi-VN', { 
                                      weekday: 'long',
                                      day: 'numeric', 
                                      month: 'long',
                                      year: 'numeric'
                                    }) : `Ngày ${idx + 1}`}
                                  </span>
                                  <span className={`text-sm font-bold ${
                                    isNegative ? 'text-yellow-700' : 'text-gray-900'
                                  }`}>
                                    {forecastData.chiTieuCode === 'order_count' 
                                      ? `${Math.max(0, value).toFixed(0)} đơn`
                                      : formatCurrency(Math.max(0, value))
                                    }
                                    {isNegative && (
                                      <span className="ml-1 text-xs text-yellow-600">({value})</span>
                                    )}
                                  </span>
                                </div>
                                {hasConfidenceInterval && (
                                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                    <span>Khoảng tin cậy:</span>
                                    <span className="font-medium text-gray-700">
                                      {forecastData.chiTieuCode === 'order_count' 
                                        ? `${Math.max(0, min).toFixed(0)} - ${Math.max(0, max).toFixed(0)} đơn`
                                        : `${formatCurrency(Math.max(0, min))} - ${formatCurrency(Math.max(0, max))}`
                                      }
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </CollapsibleSection>

        {/* 3. PHÂN TÍCH AI */}
        <CollapsibleSection
          title="AI Analysis - Strengths & Weaknesses"
          icon={Brain}
          expanded={expandedSections.analysis}
          onToggle={() => toggleSection('analysis')}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="bg-green-50 rounded-lg border border-green-200 p-4">
              <h3 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Strengths
              </h3>
              <ul className="space-y-2">
                {displayData.aiAnalysis.strengths.length > 0 ? (
                  displayData.aiAnalysis.strengths.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-500">No information available</li>
                )}
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="bg-red-50 rounded-lg border border-red-200 p-4">
              <h3 className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Weaknesses & Issues
              </h3>
              <ul className="space-y-2">
                {displayData.aiAnalysis.weaknesses.length > 0 ? (
                  displayData.aiAnalysis.weaknesses.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-red-600 mt-0.5">✗</span>
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-500">No issues</li>
                )}
              </ul>
            </div>
          </div>

          {/* Recommendations */}
          <div className="mt-4 bg-blue-50 rounded-lg border border-blue-200 p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-3">Action Recommendations</h3>
            <div className="space-y-2">
              {displayData.aiAnalysis.recommendations.length > 0 ? (
                displayData.aiAnalysis.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    rec.priority === 'high'
                      ? 'bg-red-50 border-red-300'
                      : rec.priority === 'medium'
                      ? 'bg-yellow-50 border-yellow-300'
                      : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                      rec.priority === 'high'
                        ? 'bg-red-200 text-red-800'
                        : rec.priority === 'medium'
                        ? 'bg-yellow-200 text-yellow-800'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {rec.priority === 'high' ? 'Urgent' : rec.priority === 'medium' ? 'Important' : 'Monitor'}
                  </span>
                  <p className="text-sm text-gray-700 flex-1">{rec.action}</p>
                </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 p-3">No recommendations available</div>
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* 4. SẢN PHẨM BÁN CHẠY */}
        <CollapsibleSection
          title="Best Selling Products"
          icon={BarChart3}
          expanded={expandedSections.products}
          onToggle={() => toggleSection('products')}
        >
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="space-y-2">
                {displayData.topProducts.length > 0 ? (
                  displayData.topProducts.map((product: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-100"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.quantity} items • {formatCurrency(product.revenue)}</p>
                      </div>
                      <div className="text-right">
                        {product.trend !== 0 && (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium ${
                              product.trend > 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {product.trend > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {Math.abs(product.trend)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 text-sm py-4">No product data available</div>
                )}
              </div>
            </div>
            
            {/* Products by Category */}
            {Object.keys(displayData.productsByCategory).length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Products by Category</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(displayData.productsByCategory).map(([category, count]: [string, any]) => (
                    <div key={category} className="p-2 bg-gray-50 rounded border border-gray-200">
                      <p className="text-xs text-gray-600">{category}</p>
                      <p className="text-lg font-bold text-gray-900">{count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* 5. TỒN KHO */}
        <CollapsibleSection
          title="Inventory Alerts"
          icon={Package}
          expanded={expandedSections.inventory}
          onToggle={() => toggleSection('inventory')}
          badge={displayData.lowStockItems.length}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayData.lowStockItems.length > 0 ? (
              displayData.lowStockItems.map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  item.urgency === 'high'
                    ? 'bg-red-50 border-red-500'
                    : 'bg-yellow-50 border-yellow-500'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                  <Package
                    className={`h-4 w-4 ${
                      item.urgency === 'high' ? 'text-red-600' : 'text-yellow-600'
                    }`}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-600">
                    Remaining: <span className="font-bold text-gray-900">{item.current} {item.unit}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Safety threshold: {item.threshold} {item.unit}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div
                      className={`h-1.5 rounded-full ${
                        item.urgency === 'high' ? 'bg-red-600' : 'bg-yellow-600'
                      }`}
                      style={{ width: `${(item.current / item.threshold) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              ))
            ) : (
              <div className="text-center text-gray-400 text-sm py-4 col-span-full">No inventory alerts</div>
            )}
          </div>
        </CollapsibleSection>

        {/* 6. PHẢN HỒI KHÁCH HÀNG */}
        <CollapsibleSection
          title="Customer Feedback"
          icon={Star}
          expanded={expandedSections.feedback}
          onToggle={() => toggleSection('feedback')}
        >
          <div className="space-y-4">
            {/* Review Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Total Reviews</p>
                  <p className="text-xl font-bold text-gray-900">{displayData.summary.total_reviews || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Positive</p>
                  <p className="text-xl font-bold text-green-600">{displayData.summary.positive_reviews || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Negative</p>
                  <p className="text-xl font-bold text-red-600">{displayData.summary.negative_reviews || 0}</p>
                </div>
              </div>
              {/* Review Distribution */}
              {Object.keys(displayData.reviewDistribution).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-600 mb-2">Review Distribution</p>
                  <div className="flex gap-2">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <div key={rating} className="flex-1 text-center">
                        <div className="flex justify-center gap-0.5 mb-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs font-bold text-gray-700">
                          {displayData.reviewDistribution[rating.toString()] || 0}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Recent Reviews */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">Recent Reviews</h4>
              {displayData.recentReviews.length > 0 ? (
                displayData.recentReviews.map((review: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">
                        {review.date ? new Date(review.date).toLocaleDateString('vi-VN') : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{review.comment}</p>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 text-sm py-4">No customer feedback available</div>
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* 7. KHÁCH HÀNG */}
        <CollapsibleSection
          title="Top Customers"
          icon={Users}
          expanded={expandedSections.customers}
          onToggle={() => toggleSection('customers')}
        >
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="space-y-2">
              {displayData.topCustomers.length > 0 ? (
                displayData.topCustomers.map((customer: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-100"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{customer.name}</p>
                      <p className="text-xs text-gray-500">{customer.orderCount} orders • {formatCurrency(customer.totalSpent)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 text-sm py-4">No customer data available</div>
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* 8. NGUYÊN LIỆU & CHI PHÍ */}
        <CollapsibleSection
          title="Ingredients & Costs"
          icon={Package}
          expanded={expandedSections.materials}
          onToggle={() => toggleSection('materials')}
        >
          <div className="space-y-4">
            {/* Top Ingredients by Value */}
            {displayData.topIngredientsByValue.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Highest Value Ingredients</h4>
                <div className="space-y-2">
                  {displayData.topIngredientsByValue.slice(0, 5).map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded border border-gray-200"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.quantity} {item.unit}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(item.stockValue)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Cost Ingredients */}
            {displayData.topCostIngredients.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Highest Cost Ingredients</h4>
                <div className="space-y-2">
                  {displayData.topCostIngredients.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded border border-gray-200"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className="h-1.5 rounded-full bg-amber-600"
                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(item.totalCost)}</p>
                        <p className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Revenue by Payment Method */}
            {Object.keys(displayData.revenueByPaymentMethod).length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Revenue by Payment Method
                </h4>
                <div className="space-y-2">
                  {Object.entries(displayData.revenueByPaymentMethod).map(([method, amount]: [string, any]) => {
                    const totalRevenue = displayData.summary.total_revenue || 1;
                    const percentage = ((Number(amount) / totalRevenue) * 100).toFixed(1);
                    return (
                      <div key={method} className="flex items-center justify-between p-2 rounded border border-gray-200">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {method === 'CASH' ? 'Cash' : method === 'CARD' ? 'Card' : method === 'MOMO' ? 'MoMo' : method}
                          </p>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div
                              className="h-1.5 rounded-full bg-green-600"
                              style={{ width: `${Math.min(Number(percentage), 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(Number(amount))}</p>
                          <p className="text-xs text-gray-500">{percentage}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
              </CollapsibleSection>
              </div>
            )}

            {/* Month Tab Content */}
            {activeTab === 'month' && !loadingMonthly && monthlyStats && (
              <MonthlyStatsView stats={monthlyStats} branchName={managerBranch?.name || ''} />
            )}
            {activeTab === 'month' && !loadingMonthly && !monthlyStats && (
              <div className="text-center py-12 text-gray-500">
                <p>Chưa có dữ liệu thống kê cho tháng này</p>
              </div>
            )}

            {/* Year Tab Content */}
            {activeTab === 'year' && !loadingYearly && yearlyStats && (
              <YearlyStatsView stats={yearlyStats} branchName={managerBranch?.name || ''} />
            )}
            {activeTab === 'year' && !loadingYearly && !yearlyStats && (
              <div className="text-center py-12 text-gray-500">
                <p>Chưa có dữ liệu thống kê cho năm này</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  color: 'emerald' | 'blue' | 'purple' | 'amber';
}

function MetricCard({ title, value, change, icon: Icon, color }: MetricCardProps) {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-600">{title}</p>
        <div className={`p-1.5 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-xl font-bold text-gray-900 mb-1">{value}</p>
      {change !== 0 && (
        <div className="flex items-center gap-1">
          {change > 0 ? (
            <TrendingUp className="h-3 w-3 text-green-600" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-600" />
          )}
          <span className={`text-xs font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {Math.abs(change).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  icon: React.ElementType;
  expanded: boolean;
  onToggle: () => void;
  badge?: number;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon: Icon,
  expanded,
  onToggle,
  badge,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-amber-600" />
          <h2 className="text-base font-bold text-gray-800">{title}</h2>
          {badge !== undefined && badge > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
              {badge}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {expanded && <div className="p-4 pt-0 border-t border-gray-100">{children}</div>}
    </div>
  );
}