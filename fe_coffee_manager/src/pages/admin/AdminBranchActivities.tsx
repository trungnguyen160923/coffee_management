import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  DollarSign,
  ShoppingBag,
  AlertTriangle,
  CheckCircle,
  Store,
  Eye,
  TrendingUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { analyticsService } from '../../services/analyticsService';
import { branchService } from '../../services/branchService';
import { stockService } from '../../services/stockService';
import staffService from '../../services/staffService';
import { Branch } from '../../types';
import { API_ENDPOINTS } from '../../config/constants';
import { apiClient } from '../../config/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { toast } from 'react-hot-toast';

export function AdminBranchActivities() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Branch selection
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  
  // Data states
  const [dailyStats, setDailyStats] = useState<any>(null);
  const [weeklyRevenue, setWeeklyRevenue] = useState<any>(null);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);

  // Load all branches for selection
  useEffect(() => {
    const loadBranches = async () => {
      try {
        setLoading(true);
        // Use the same endpoint as BranchManagement for consistency
        const qs = `?page=0&size=100`;
        const resp = await apiClient.get<{ code: number; result: { data: Branch[]; total: number; page: number; size: number; totalPages: number } }>(`${API_ENDPOINTS.BRANCHES.BASE}/paged${qs}`);
        const payload = resp?.result;
        const branchesList = payload?.data || [];
        
        console.log('Loaded branches:', branchesList.length, branchesList);
        setBranches(branchesList);
        
        // Auto-select first branch if available
        if (branchesList.length > 0 && !selectedBranchId) {
          setSelectedBranchId(branchesList[0].branchId);
          setSelectedBranch(branchesList[0]);
        }
      } catch (err: any) {
        console.error('Error loading branches:', err);
        const errorMsg = err?.response?.data?.message || err?.message || 'Failed to load branches';
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };
    
    loadBranches();
  }, []);

  // Load branch data when branch is selected
  useEffect(() => {
    const loadBranchData = async () => {
      if (!selectedBranchId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Find selected branch
        const branch = branches.find(b => b.branchId === selectedBranchId);
        setSelectedBranch(branch || null);

        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];

        // Load all data in parallel
        const [dailyStatsData, weeklyRevenueData, lowStockData, staffData] = await Promise.all([
          analyticsService.getBranchDailyStats(selectedBranchId, today),
          analyticsService.getBranchWeeklyRevenue(selectedBranchId),
          stockService.getLowOrOutOfStockItems(selectedBranchId).catch(() => []),
          staffService.getStaffsWithUserInfoByBranch(selectedBranchId).catch(() => [])
        ]);

        setDailyStats(dailyStatsData);
        setWeeklyRevenue(weeklyRevenueData);
        setLowStockItems(lowStockData || []);
        setStaffList(staffData || []);
      } catch (err: any) {
        console.error('Error loading branch data:', err);
        setError(err.message || 'Failed to load branch data');
        toast.error('Failed to load branch activities');
      } finally {
        setLoading(false);
      }
    };

    loadBranchData();
  }, [selectedBranchId, branches]);

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toFixed(0);
  };

  // Get initials from name
  const getInitials = (name: string): string => {
    if (!name) return '?';
    const words = name.trim().split(/\s+/);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  // Get color for avatar based on name
  const getAvatarColor = (name: string): string => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-teal-500',
    ];
    if (!name) return colors[0];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Prepare stats cards data
  const stats = useMemo(() => {
    if (!dailyStats || !weeklyRevenue) return [];
    
    return [
      { 
        title: 'Today\'s Revenue', 
        value: formatCurrency(Number(dailyStats.totalRevenue || 0)), 
        change: `${dailyStats.totalOrders || 0} orders`, 
        icon: DollarSign, 
        color: 'bg-green-500' 
      },
      { 
        title: 'Today\'s Orders', 
        value: String(dailyStats.totalOrders || 0), 
        change: 'Completed', 
        icon: ShoppingBag, 
        color: 'bg-blue-500' 
      },
      { 
        title: 'Staff', 
        value: String(staffList.length), 
        change: 'Total', 
        icon: Users, 
        color: 'bg-purple-500' 
      },
      { 
        title: 'Inventory', 
        value: `${lowStockItems.length} alerts`, 
        change: 'Need restock', 
        icon: AlertTriangle, 
        color: 'bg-red-500' 
      }
    ];
  }, [dailyStats, weeklyRevenue, staffList.length, lowStockItems.length]);

  // Prepare hourly orders chart data
  const hourlyOrders = useMemo(() => {
    if (!dailyStats?.hourlyOrderCounts) return [];
    
    return dailyStats.hourlyOrderCounts
      .filter((item: any) => item.orderCount > 0)
      .map((item: any) => ({
        hour: `${item.hour}h`,
        orders: item.orderCount
      }));
  }, [dailyStats]);

  // Prepare weekly revenue chart data
  const weeklyRevenueChart = useMemo(() => {
    if (!weeklyRevenue?.dailyRevenues) return [];
    
    const dayMap: Record<string, string> = {
      'Monday': 'Mon',
      'Tuesday': 'Tue',
      'Wednesday': 'Wed',
      'Thursday': 'Thu',
      'Friday': 'Fri',
      'Saturday': 'Sat',
      'Sunday': 'Sun'
    };

    return weeklyRevenue.dailyRevenues.map((day: any) => ({
      day: dayMap[day.dayOfWeek] || day.dayOfWeek,
      revenue: Number(day.revenue || 0) / 1000000, // Convert to millions
      target: 10 // Keep target line for reference
    }));
  }, [weeklyRevenue]);

  if (loading && !selectedBranchId) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No branches available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="max-w-7xl mx-auto px-2 py-0 sm:px-4 lg:px-2">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">Branch Activities Monitor</h1>
                <p className="text-amber-100">View detailed activities of each branch</p>
              </div>
            </div>
            
            {/* Branch Selector */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-white mb-2">
                Select Branch to View:
              </label>
              <select
                value={selectedBranchId || ''}
                onChange={(e) => {
                  const branchId = parseInt(e.target.value);
                  setSelectedBranchId(branchId);
                }}
                className="w-full md:w-full lg:w-2/3 xl:w-1/2 px-4 py-2 rounded-lg border border-amber-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-base"
              >
                <option value="">-- Select Branch --</option>
                {branches.map((branch) => (
                  <option key={branch.branchId} value={branch.branchId}>
                    {branch.name} {branch.address ? `- ${branch.address}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Content */}
          {!selectedBranchId ? (
            <div className="p-8 text-center">
              <Store className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">Please select a branch to view its activities</p>
            </div>
          ) : loading ? (
            <div className="p-8 flex items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="p-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          ) : (
            <div className="p-8">
              {/* Branch Info Header */}
              {selectedBranch && (
                <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">{selectedBranch.name}</h2>
                      <p className="text-gray-600 mt-1">{selectedBranch.address}</p>
                      {selectedBranch.phone && (
                        <p className="text-sm text-gray-500 mt-1">📞 {selectedBranch.phone}</p>
                      )}
                      {selectedBranch.openHours && selectedBranch.endHours && (
                        <p className="text-sm text-gray-500 mt-1">
                          🕐 {String(selectedBranch.openHours).slice(0, 5)} - {String(selectedBranch.endHours).slice(0, 5)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/admin/branches`)}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors duration-200 flex items-center space-x-2"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Manage Branch</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                  <div key={index} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                        <p className="text-sm text-gray-500 mt-1">{stat.change}</p>
                      </div>
                      <div className={`p-3 rounded-full ${stat.color}`}>
                        <stat.icon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Hourly Orders */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Orders by Hour</h3>
                  {hourlyOrders.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={hourlyOrders}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="hour" stroke="#666" />
                        <YAxis stroke="#666" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                          labelStyle={{ color: '#374151' }}
                        />
                        <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-gray-500">
                      <p>No hourly order data</p>
                    </div>
                  )}
                </div>

                {/* Weekly Revenue */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">This Week's Revenue</h3>
                  {weeklyRevenueChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={weeklyRevenueChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="day" stroke="#666" />
                        <YAxis stroke="#666" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                          labelStyle={{ color: '#374151' }}
                          formatter={(value: any) => `${Number(value).toFixed(1)}M VND`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#10b981" 
                          strokeWidth={3} 
                          dot={{ fill: '#10b981', strokeWidth: 2, r: 6 }}
                          name="Revenue (M VND)"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="target" 
                          stroke="#ef4444" 
                          strokeWidth={2} 
                          strokeDasharray="5 5"
                          dot={false}
                          name="Target (M VND)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-gray-500">
                      <p>No weekly revenue data</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Low Stock Alert */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Low Stock Alerts</h3>
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="space-y-4">
                    {lowStockItems.length > 0 ? (
                      lowStockItems.map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                          <div>
                            <p className="font-medium text-gray-900">{item.ingredientName || `Ingredient #${item.ingredientId}`}</p>
                            <p className="text-sm text-red-600">
                              Available: {Number(item.availableQuantity || item.quantity || 0).toFixed(2)} {item.unitName || item.unitCode || ''} 
                              {item.threshold && ` (minimum: ${Number(item.threshold).toFixed(2)} ${item.unitName || item.unitCode || ''})`}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                        <p>No low stock alerts</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Staff List */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Staff Members</h3>
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="space-y-4">
                    {staffList.length > 0 ? (
                      staffList.map((staff: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors duration-200">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full ${getAvatarColor(staff.fullname || staff.name || '')} flex items-center justify-center text-white font-semibold text-sm`}>
                              {getInitials(staff.fullname || staff.name || `Staff #${staff.userId}`)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{staff.fullname || staff.name || `Staff #${staff.userId}`}</p>
                              <p className="text-sm text-gray-500">{staff.position || 'Staff'}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-green-600 font-medium">Active</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>No staff members</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

