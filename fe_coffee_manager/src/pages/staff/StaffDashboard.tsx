import { useState, useEffect, useMemo } from 'react';
import {
  Coffee,
  Clock,
  CheckCircle,
  Calendar,
  Timer,
  RefreshCw,
  ChefHat
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStaffPermissions } from '../../hooks/useStaffPermissions';
import orderService from '../../services/orderService';
import reservationService from '../../services/reservationService';
import { shiftAssignmentService } from '../../services/shiftAssignmentService';
import catalogService from '../../services/catalogService';
import { CatalogRecipe, CatalogProduct } from '../../types';
import { format, startOfDay, endOfDay, isToday, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ProductRecipeModal from '../../components/recipe/ProductRecipeModal';
import { API_BASE_URL } from '../../config/api';
import { DashboardSkeleton } from '../../components/staff/skeletons';

export function StaffDashboard() {
  const { user } = useAuth();
  const staffPermissions = useStaffPermissions();
  const navigate = useNavigate();
  
  // Determine default tab based on permissions
  const getDefaultTab = () => {
    if (staffPermissions.canViewOrders) return 'orders';
    if (staffPermissions.canViewReservations) return 'reservations';
    if (staffPermissions.canViewRecipes) return 'recipes';
    return 'orders'; // Fallback
  };
  
  const [activeTab, setActiveTab] = useState(getDefaultTab());
  
  // Update activeTab when permissions load
  useEffect(() => {
    if (!staffPermissions.loading) {
      const availableTabs = [];
      if (staffPermissions.canViewOrders) availableTabs.push('orders');
      if (staffPermissions.canViewReservations) availableTabs.push('reservations');
      if (staffPermissions.canViewRecipes) availableTabs.push('recipes');
      
      // If current tab is not available, switch to first available tab
      if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
        setActiveTab(availableTabs[0]);
      }
    }
  }, [staffPermissions.loading, staffPermissions.canViewOrders, staffPermissions.canViewReservations, staffPermissions.canViewRecipes]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [orders, setOrders] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [todayShifts, setTodayShifts] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<CatalogRecipe[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);

  const branchId = useMemo(() => {
    if (user?.branch?.branchId) return user.branch.branchId;
    if (user?.branchId) return Number(user.branchId);
    return null;
  }, [user]);

  const userId = useMemo(() => {
    return user?.user_id || (user?.id ? Number(user.id) : null);
  }, [user]);

  // Get today's date range
  const todayStart = useMemo(() => format(startOfDay(new Date()), 'yyyy-MM-dd'), []);
  const todayEnd = useMemo(() => format(endOfDay(new Date()), 'yyyy-MM-dd'), []);

  // Load all data
  const loadData = async (isRefresh = false) => {
    if (!branchId) {
      setLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Load orders for today
      const ordersData = await orderService.getOrders({
        branchId: String(branchId),
        dateFrom: todayStart,
        dateTo: todayEnd,
        limit: 50
      });
      const ordersList = Array.isArray(ordersData.orders) ? ordersData.orders : (Array.isArray(ordersData) ? ordersData : []);

      // Load reservations for today
      const reservationsData = await reservationService.getByBranch(branchId);
      const reservationsList = Array.isArray(reservationsData) ? reservationsData : [];
      const todayReservations = reservationsList.filter((r: any) => {
        if (!r.createAt) return false;
        try {
          const resDate = new Date(r.createAt);
          return isToday(resDate);
        } catch {
          return false;
        }
      });

      // Load today's shifts for current user
      let shiftsData: any[] = [];
      if (userId) {
        try {
          shiftsData = await shiftAssignmentService.getMyAssignments({
            startDate: todayStart,
            endDate: todayEnd
          });
        } catch (error) {
          console.error('Failed to load shifts', error);
        }
      }

      // Load popular recipes and products
      let recipesData: CatalogRecipe[] = [];
      let productsData: CatalogProduct[] = [];
      try {
        const [recipesPage, productsPage] = await Promise.all([
          catalogService.searchRecipes({
            status: 'ACTIVE',
            page: 0,
            size: 50
          }),
          catalogService.searchProducts({
            page: 0,
            size: 1000,
            active: true
          })
        ]);
        recipesData = Array.isArray(recipesPage?.content) ? recipesPage.content : [];
        productsData = Array.isArray(productsPage?.content) ? productsPage.content : [];
      } catch (error) {
        console.error('Failed to load recipes or products', error);
      }

      setOrders(ordersList);
      setReservations(todayReservations);
      setTodayShifts(shiftsData);
      setRecipes(recipesData);
      setProducts(productsData);
    } catch (error: any) {
      console.error('Failed to load dashboard data', error);
      toast.error(error?.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [branchId, userId, todayStart, todayEnd]);

  // Calculate statistics (include all order types: dine-in, takeaway, online)
  const stats = useMemo(() => {
    const todayOrders = orders.filter((order: any) => {
      if (!order.orderDate) return false;
      try {
        const orderDate = new Date(order.orderDate);
        return isToday(orderDate);
      } catch {
        return false;
      }
    });

    const pendingOrders = todayOrders.filter((o: any) => 
      ['pending', 'PENDING'].includes(String(o.status).toLowerCase())
    );
    const preparingOrders = todayOrders.filter((o: any) => 
      ['preparing', 'PREPARING'].includes(String(o.status).toLowerCase())
    );
    const completedOrders = todayOrders.filter((o: any) => 
      ['completed', 'COMPLETED'].includes(String(o.status).toLowerCase())
    );

    const confirmedReservations = reservations.filter((r: any) => 
      ['CONFIRMED', 'confirmed'].includes(String(r.status).toUpperCase())
    );
    const seatedReservations = reservations.filter((r: any) => 
      ['SEATED', 'seated'].includes(String(r.status).toUpperCase())
    );

    const todayConfirmedShifts = todayShifts.filter((s: any) => 
      s.status === 'CONFIRMED' || s.status === 'CHECKED_IN'
    );

    return {
      totalOrders: todayOrders.length,
      pendingOrders: pendingOrders.length,
      preparingOrders: preparingOrders.length,
      completedOrders: completedOrders.length,
      totalReservations: reservations.length,
      confirmedReservations: confirmedReservations.length,
      seatedReservations: seatedReservations.length,
      todayShifts: todayConfirmedShifts.length
    };
  }, [orders, reservations, todayShifts]);

  // Filter orders for display
  // Display latest orders (all types: dine-in, takeaway, online)
  const displayOrders = useMemo(() => {
    return orders
      .filter((order: any) => {
        if (!order.orderDate) return false;
        try {
          const orderDate = new Date(order.orderDate);
          return isToday(orderDate);
        } catch {
          return false;
        }
      })
      .sort((a: any, b: any) => {
        const dateA = new Date(a.orderDate || 0).getTime();
        const dateB = new Date(b.orderDate || 0).getTime();
        return dateB - dateA; // Newest first
      })
      .slice(0, 5); // Show only 5 latest orders
  }, [orders]);

  // Display latest reservations
  const displayReservations = useMemo(() => {
    return reservations
      .sort((a: any, b: any) => {
        const dateA = new Date(a.reservedAt || a.createAt || 0).getTime();
        const dateB = new Date(b.reservedAt || b.createAt || 0).getTime();
        return dateB - dateA; // Newest first
      })
      .slice(0, 5); // Show only 5 latest reservations
  }, [reservations]);

  // Group recipes by product
  const groupedByProduct = useMemo(() => {
    const productMap = new Map<number, { product: CatalogProduct; recipes: CatalogRecipe[] }>();
    
    recipes.forEach(recipe => {
      if (!recipe.productDetail?.pdId) return;
      
      // Find product that contains this productDetail
      const product = products.find(p => 
        p.productDetails?.some(pd => pd.pdId === recipe.productDetail.pdId)
      );
      
      if (product) {
        if (!productMap.has(product.productId)) {
          productMap.set(product.productId, { product, recipes: [] });
        }
        productMap.get(product.productId)!.recipes.push(recipe);
      }
    });
    
    return Array.from(productMap.values());
  }, [recipes, products]);

  const getProductImageUrl = (product: CatalogProduct): string | null => {
    if (!product.imageUrl) return null;
    return product.imageUrl.startsWith('http')
      ? product.imageUrl
      : `${API_BASE_URL}/api/catalogs${product.imageUrl}`;
  };

  const getStatusColor = (status: string) => {
    const statusLower = String(status).toLowerCase();
    switch (statusLower) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'seated': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    const statusLower = String(status).toLowerCase();
    switch (statusLower) {
      case 'pending': return 'Pending';
      case 'preparing': return 'Preparing';
      case 'ready': return 'Ready';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'confirmed': return 'Confirmed';
      case 'seated': return 'Seated';
      default: return status;
    }
  };

  const getTypeColor = (type: string) => {
    const typeLower = String(type).toLowerCase();
    switch (typeLower) {
      case 'dine-in': return 'bg-purple-100 text-purple-800';
      case 'takeaway': return 'bg-orange-100 text-orange-800';
      case 'online': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeText = (type: string) => {
    const typeLower = String(type).toLowerCase();
    switch (typeLower) {
      case 'dine-in': return 'Dine-in';
      case 'takeaway': return 'Takeaway';
      case 'online': return 'Online';
      default: return type;
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'HH:mm');
    } catch {
      return '';
    }
  };

  const handleRefresh = () => {
    loadData(true);
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-sky-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading data...</p>
        </div>
      </div>
    );
  }

  const todayStats = [
    { 
      title: 'Today\'s Orders', 
      value: stats.totalOrders.toString(), 
      icon: Coffee, 
      color: 'bg-blue-500',
      onClick: () => navigate('/staff/orders')
    },
    { 
      title: 'In Progress', 
      value: (stats.pendingOrders + stats.preparingOrders).toString(), 
      icon: Clock, 
      color: 'bg-orange-500',
      onClick: () => navigate('/staff/orders')
    },
    { 
      title: 'Completed', 
      value: stats.completedOrders.toString(), 
      icon: CheckCircle, 
      color: 'bg-green-500',
      onClick: () => navigate('/staff/orders')
    },
    { 
      title: 'Today\'s Reservations', 
      value: stats.totalReservations.toString(), 
      icon: Calendar, 
      color: 'bg-purple-500',
      onClick: () => navigate('/staff/reservations')
    },
    { 
      title: 'Work Shifts', 
      value: stats.todayShifts.toString(), 
      icon: Timer, 
      color: 'bg-indigo-500',
      onClick: () => navigate('/staff/shifts')
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-2 py-4 sm:px-4 lg:px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-8 pt-6 pb-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Overview</h1>
              <p className="text-sm text-slate-500">Manage orders and serve customers</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="p-6 lg:p-8 pt-4">
      {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {todayStats.map((stat, index) => (
                <div 
                  key={index} 
                  onClick={stat.onClick}
                  className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 cursor-pointer hover:shadow-xl transition-shadow"
                >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
              <div className="flex flex-wrap gap-4">
                {staffPermissions.canViewPOS && (
                  <button 
                    onClick={() => navigate('/staff/pos')}
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg"
                  >
                    <Coffee className="h-5 w-5" />
                    <span>Create New Order</span>
                  </button>
                )}
                {staffPermissions.canViewReservations && (
                  <button 
                    onClick={() => navigate('/staff/reservations')}
                    className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg"
                  >
                    <Calendar className="h-5 w-5" />
                    <span>View Reservations</span>
                  </button>
                )}
                {staffPermissions.canViewRecipes && (
                  <button 
                    onClick={() => navigate('/staff/recipes')}
                    className="flex items-center space-x-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white px-6 py-3 rounded-xl font-medium hover:from-amber-700 hover:to-amber-800 transition-all duration-200 shadow-lg"
                  >
                    <ChefHat className="h-5 w-5" />
                    <span>View Recipes</span>
                  </button>
                )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 rounded-xl p-1">
          {[
                  { id: 'orders', label: 'Orders', icon: Coffee, requiresPermission: 'canViewOrders' },
                  { id: 'reservations', label: 'Reservations', icon: Calendar, requiresPermission: 'canViewReservations' },
                  { id: 'recipes', label: 'Recipes', icon: ChefHat, requiresPermission: 'canViewRecipes' }
          ]
            .filter(tab => {
              if (!tab.requiresPermission) return true;
              const permission = tab.requiresPermission as keyof typeof staffPermissions;
              return staffPermissions[permission] === true;
            })
            .map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'orders' && staffPermissions.canViewOrders && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">Latest Orders</h3>
                  {orders.filter((o: any) => {
                    if (!o.orderDate) return false;
                    try {
                      const orderDate = new Date(o.orderDate);
                      return isToday(orderDate);
                    } catch {
                      return false;
                    }
                  }).length > 5 && (
                    <button
                      onClick={() => navigate('/staff/orders')}
                      className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                    >
                      View All →
                    </button>
                  )}
          </div>
          <div className="divide-y divide-gray-100">
                  {displayOrders.length === 0 ? (
                    <div className="p-12 text-center">
                      <Coffee className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No orders today</p>
                    </div>
                  ) : (
                    displayOrders.map((order: any) => (
                      <div key={order.orderId || order.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                            <div className="text-lg font-bold text-gray-900">
                              #{order.orderId || order.id}
                            </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                            {order.type && (
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${getTypeColor(order.type)}`}>
                      {getTypeText(order.type)}
                    </span>
                            )}
                  </div>
                  <div className="flex items-center space-x-4">
                            {order.orderDate && (
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Timer className="h-4 w-4" />
                                <span>{formatTime(order.orderDate)}</span>
                    </div>
                            )}
                            {order.totalAmount && (
                    <div className="text-lg font-bold text-gray-900">
                                {order.totalAmount.toLocaleString('vi-VN')}đ
                    </div>
                            )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                          {order.customerName && (
                  <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">Customer:</p>
                              <p className="text-gray-900">{order.customerName}</p>
                  </div>
                          )}
                          {order.items && order.items.length > 0 && (
                  <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">Products:</p>
                    <ul className="text-gray-900">
                                {order.items.slice(0, 3).map((item: any, index: number) => (
                                  <li key={index} className="text-sm">
                                    • {item.productName || item.name} x{item.quantity || 1}
                                  </li>
                                ))}
                                {order.items.length > 3 && (
                                  <li className="text-sm text-gray-500">... and {order.items.length - 3} more items</li>
                                )}
                    </ul>
                  </div>
                          )}
                </div>
              </div>
                    ))
                  )}
          </div>
        </div>
      )}

      {activeTab === 'reservations' && staffPermissions.canViewReservations && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">Latest Reservations</h3>
                  {reservations.length > 5 && (
                    <button
                      onClick={() => navigate('/staff/reservations')}
                      className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                    >
                      View All →
                    </button>
                  )}
          </div>
          <div className="divide-y divide-gray-100">
                  {displayReservations.length === 0 ? (
                    <div className="p-12 text-center">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No reservations today</p>
                    </div>
                  ) : (
                    displayReservations.map((reservation: any) => (
                      <div key={reservation.reservationId} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                            <div className="text-lg font-bold text-gray-900">
                              #{reservation.reservationId}
                            </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(reservation.status)}`}>
                      {getStatusText(reservation.status)}
                    </span>
                  </div>
                          {reservation.reservedAt && (
                  <div className="text-lg font-bold text-gray-900">
                              {formatTime(reservation.reservedAt)}
                  </div>
                          )}
                </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Customer:</p>
                            <p className="text-gray-900">{reservation.customerName || 'N/A'}</p>
                            {reservation.phone && (
                    <p className="text-sm text-gray-500">{reservation.phone}</p>
                            )}
                  </div>
                          {reservation.partySize && (
                  <div>
                              <p className="text-sm font-medium text-gray-700 mb-1">Party Size:</p>
                              <p className="text-gray-900">{reservation.partySize} guests</p>
                  </div>
                          )}
                  </div>
                </div>
                    ))
                  )}
          </div>
        </div>
      )}

      {activeTab === 'recipes' && staffPermissions.canViewRecipes && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedByProduct.length === 0 ? (
                  <div className="col-span-3 p-12 text-center">
                    <ChefHat className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No recipes available</p>
                </div>
                ) : (
                  groupedByProduct.map(({ product, recipes: productRecipes }) => {
                    const imageUrl = getProductImageUrl(product);
                    const availableSizes = product.productDetails?.filter(pd => pd.active && pd.size) || [];
                    const recipesBySize = new Map<number, CatalogRecipe>();
                    productRecipes.forEach(recipe => {
                      if (recipe.productDetail?.pdId) {
                        recipesBySize.set(recipe.productDetail.pdId, recipe);
                      }
                    });

                    return (
                      <div
                        key={product.productId}
                        className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => {
                          setSelectedProduct(product);
                          setProductModalOpen(true);
                        }}
                      >
                        {/* Product Image */}
                        {imageUrl && (
                          <div className="w-full h-32 bg-gray-100 rounded-t-lg overflow-hidden">
                            <img
                              src={imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
              </div>
                        )}
                        
                        {/* Product Info */}
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-base font-semibold text-gray-900 line-clamp-1">{product.name}</h3>
                            {product.category && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium ml-2 flex-shrink-0">
                                {product.category.name}
                              </span>
                            )}
              </div>

                          {/* Sizes */}
                          <div className="mt-3 min-h-[3rem]">
                            {availableSizes.length > 0 ? (
                              <>
                                <p className="text-xs text-gray-500 mb-1.5">Sizes:</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {availableSizes.map((pd) => {
                                    const hasRecipe = recipesBySize.has(pd.pdId);
                                    return (
                                      <span
                                        key={pd.pdId}
                                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                                          hasRecipe
                                            ? 'bg-green-100 text-green-700 border border-green-200'
                                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                                        }`}
                                      >
                                        {pd.size?.name || 'N/A'}
                                        {hasRecipe && <ChefHat className="w-3 h-3 inline ml-1" />}
                      </span>
                                    );
                                  })}
                                </div>
                              </>
                            ) : (
                              <div className="h-8"></div>
                            )}
                          </div>
              </div>
            </div>
                    );
                  })
                )}
        </div>
      )}
          </div>
        </div>
      </div>

      {/* Product Recipe Modal */}
      {selectedProduct && (
        <ProductRecipeModal
          open={productModalOpen}
          onClose={() => {
            setProductModalOpen(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
          recipes={recipes.filter(r => {
            if (!r.productDetail?.pdId) return false;
            return selectedProduct.productDetails?.some(pd => pd.pdId === r.productDetail.pdId);
          })}
        />
      )}
    </div>
  );
}
