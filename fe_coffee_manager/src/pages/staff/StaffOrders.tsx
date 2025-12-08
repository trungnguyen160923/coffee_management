import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStaffPermissions } from '../../hooks/useStaffPermissions';
import orderService from '../../services/orderService';
import { posService, tableService, branchService } from '../../services';
import catalogService from '../../services/catalogService';
import { stockService } from '../../services/stockService';
import { CatalogProduct, CatalogRecipe } from '../../types';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../config/api';
import { OrdersSkeleton } from '../../components/staff/skeletons';

interface SimpleOrderItem {
    productName?: string;
    quantity?: number;
}

interface SimpleOrder {
    orderId?: number | string;
    customerName?: string;
    phone?: string;
    deliveryAddress?: string;
    tableIds?: number[];
    staffId?: number;
    orderDate?: string;
    totalAmount?: number;
    paymentMethod?: string;
    paymentStatus?: string;
    status?: string;
    items?: SimpleOrderItem[];
}

export default function StaffOrders() {
    const { user, loading: authLoading } = useAuth();
    const staffPermissions = useStaffPermissions();
    const [activeTab, setActiveTab] = useState<'regular' | 'pos'>('regular');
    const [orders, setOrders] = useState<SimpleOrder[]>([]);
    const [posOrders, setPosOrders] = useState<SimpleOrder[]>([]);
    const [search, setSearch] = useState<string>('');
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'>('all');
    const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'dine-in' | 'takeaway'>('all');
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [detailOpen, setDetailOpen] = useState<boolean>(false);
    const [detailOrder, setDetailOrder] = useState<any | null>(null);
    const [detailLoading, setDetailLoading] = useState<boolean>(false);
    const [editingOrderId, setEditingOrderId] = useState<number | string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [productDetails, setProductDetails] = useState<Map<string, CatalogProduct>>(new Map());
    const [recipeModalOpen, setRecipeModalOpen] = useState<boolean>(false);
    const [selectedRecipe, setSelectedRecipe] = useState<CatalogRecipe | null>(null);
    const [recipeLoading, setRecipeLoading] = useState<boolean>(false);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
    const [tableDetails, setTableDetails] = useState<Map<number, any>>(new Map());
    const [staffDetails, setStaffDetails] = useState<Map<number, any>>(new Map());

    const branchId = useMemo(() => {
        // Prefer nested branch from backend, fallback to legacy branchId field
        if (user?.branch?.branchId) return user.branch.branchId;
        if (user?.branchId) return user.branchId;
        return null;
    }, [user]);

    const loadOrders = useCallback(async (isRefresh = false) => {
        if (!branchId) {
            setLoading(false);
            setError('Could not determine staff branch.');
            return;
        }
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
                setError(null);
            }

            // Load regular orders (all staff with canViewOrders can see this)
            const regularData = await orderService.getOrdersByBranch(branchId);
            setOrders(Array.isArray(regularData) ? regularData : []);

            // Only load POS orders if user has permission to view POS
            // POS orders require CASHIER_STAFF role
            let posData: any[] = [];
            if (staffPermissions.canViewPOS && !staffPermissions.loading) {
                try {
                    posData = await posService.getPOSOrdersByBranch(Number(branchId));
                    setPosOrders(Array.isArray(posData) ? posData : []);
                } catch (posError: any) {
                    // If user doesn't have permission for POS orders, just set empty array
                    // Don't show error as this is expected for non-CASHIER_STAFF roles
                    console.log('[StaffOrders] User does not have permission to view POS orders, skipping...');
                    setPosOrders([]);
                }
            } else {
                setPosOrders([]);
            }

            // Fetch table and staff details for POS orders
            if (Array.isArray(posData) && posData.length > 0) {
                const allTableIds = new Set<number>();
                const allStaffIds = new Set<number>();

                posData.forEach((order: any) => {
                    if (order.tableIds && Array.isArray(order.tableIds)) {
                        order.tableIds.forEach((id: number) => allTableIds.add(id));
                    }
                    if (order.staffId) {
                        allStaffIds.add(order.staffId);
                    }
                });

                if (allTableIds.size > 0) {
                    await fetchTableDetails(Array.from(allTableIds));
                }
                if (allStaffIds.size > 0) {
                    await fetchStaffDetails(Array.from(allStaffIds));
                }
            }
            
            setError(null);
        } catch (e: any) {
            console.error('Failed to load orders by branch', e);
            setError(`Failed to load orders: ${e.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [branchId, staffPermissions.canViewPOS, staffPermissions.loading]);

    useEffect(() => {
        // Wait for auth to finish loading and ensure branchId is available before loading orders
        if (authLoading || !branchId || staffPermissions.loading) {
            return;
        }
        loadOrders();
    }, [branchId, authLoading, staffPermissions.loading, loadOrders]);

    // debounce search
    useEffect(() => {
        const h = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
        return () => clearTimeout(h);
    }, [search]);

    // Auto refresh functionality
    useEffect(() => {
        if (!autoRefresh || authLoading || !branchId || staffPermissions.loading) return;
        
        const interval = setInterval(() => {
            // Silent auto-refresh (no toast)
            loadOrders(true);
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, [autoRefresh, branchId, authLoading, staffPermissions.loading, loadOrders]);

    // Auto-switch to regular tab if user doesn't have POS permission and is on POS tab
    useEffect(() => {
        if (!staffPermissions.loading && !staffPermissions.canViewPOS && activeTab === 'pos') {
            setActiveTab('regular');
        }
    }, [staffPermissions.canViewPOS, staffPermissions.loading, activeTab]);

    const currentOrders = useMemo(() => {
        return activeTab === 'regular' ? orders : posOrders;
    }, [activeTab, orders, posOrders]);

    const filteredOrders = useMemo(() => {
        const byStatus = (o: SimpleOrder) => {
            if (statusFilter === 'all') return true;
            return (o.status || '').toLowerCase() === statusFilter;
        };
        const bySearch = (o: SimpleOrder) => {
            if (!debouncedSearch) return true;
            const text = `${o.orderId ?? ''} ${o.customerName ?? ''} ${o.phone ?? ''} ${o.deliveryAddress ?? ''}`.toLowerCase();
            return text.includes(debouncedSearch);
        };
        const byDate = (o: SimpleOrder) => {
            if (!selectedDate || !o.orderDate) return true;
            try {
                const d = new Date(o.orderDate);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;
                return dateStr === selectedDate;
            } catch {
                return true;
            }
        };

        // Filter orders based on tab type
        const isCorrectOrderType = (o: SimpleOrder) => {
            if (activeTab === 'pos') {
                // POS orders: only show orders that have tables or staff_id
                return (o.tableIds && o.tableIds.length > 0) || o.staffId;
            } else {
                // Regular orders: exclude orders that have tables or staff_id (POS orders)
                return !((o.tableIds && o.tableIds.length > 0) || o.staffId);
            }
        };

        // Filter by order type (dine-in vs takeaway) - only for POS tab
        const byOrderType = (o: SimpleOrder) => {
            if (activeTab !== 'pos' || orderTypeFilter === 'all') return true;
            
            if (orderTypeFilter === 'dine-in') {
                // Dine-in: có tableIds (orders created at POS with table selection)
                return o.tableIds && o.tableIds.length > 0;
            } else if (orderTypeFilter === 'takeaway') {
                // Takeaway: delivery_address = "take-away" (orders created at POS as takeaway)
                return o.deliveryAddress === 'take-away';
            }
            return true;
        };

        return currentOrders.filter(o => byStatus(o) && bySearch(o) && byDate(o) && isCorrectOrderType(o) && byOrderType(o));
    }, [currentOrders, statusFilter, debouncedSearch, activeTab, selectedDate, orderTypeFilter]);

    const statusClass = (status?: string) => {
        switch ((status || '').toLowerCase()) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'preparing':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'ready':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'completed':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const formatCurrency = (v?: number) => {
        if (v === undefined || v === null) return '0đ';
        return Number(v).toLocaleString('vi-VN') + 'đ';
    };

    const formatDate = (d?: string) => {
        if (!d) return '';
        try {
            return new Date(d).toLocaleString('vi-VN');
        } catch {
            return d;
        }
    };

    const handleUpdateStatus = async (orderId?: number | string, status?: string) => {
        if (!orderId || !status) return;
        
        try {
            setError(null);

            if (activeTab === 'regular') {
                // Gọi API reservation trước (nếu cần)
                if (status === 'ready') {
                    // Khi chuyển sang ready → commit reservation trước
                    try {
                        await stockService.commitReservation(String(orderId));
                    } catch (reservationError: any) {
                        const errorMessage = reservationError?.response?.data?.message || 
                                           reservationError?.message || 
                                           'Unknown error occurred';
                        toast.error(`Failed to commit reservation: ${errorMessage}`);
                        return; // Dừng lại, không cập nhật trạng thái
                    }
                } else if (status === 'cancelled') {
                    // Khi chuyển sang cancelled → release reservation trước
                    try {
                        await stockService.releaseReservation(String(orderId));
                    } catch (reservationError: any) {
                        const errorMessage = reservationError?.response?.data?.message || 
                                           reservationError?.message || 
                                           'Unknown error occurred';
                        toast.error(`Failed to release reservation: ${errorMessage}`);
                        return; // Dừng lại, không cập nhật trạng thái
                    }
                }
                
                // Chỉ cập nhật trạng thái order nếu reservation API thành công (hoặc không cần gọi)
                // Convert status to uppercase before sending to backend
                const uppercaseStatus = status.toUpperCase();
                const updated = await orderService.updateOrderStatus(String(orderId), uppercaseStatus as any);
                const newStatus = updated?.status ?? status;
                
                setOrders(prev => prev.map(o =>
                    String(o.orderId) === String(orderId)
                        ? { ...o, status: newStatus }
                        : o
                ));
                
                toast.success(`Order status updated to ${status}`);
            } else {
                const updated: any = await posService.updatePOSOrderStatus(Number(orderId), status);
                setPosOrders(prev => prev.map(o =>
                    String(o.orderId) === String(orderId)
                        ? { ...o, status: updated?.status ?? status }
                        : o
                ));
            }
        } catch (e: any) {
            console.error('Failed to update order status', e);
            const errorMessage = e?.response?.data?.message || 
                               e?.message || 
                               'Unknown error occurred';
            toast.error(`Failed to update order status: ${errorMessage}`);
            setError(`Failed to update order status: ${errorMessage}`);
        }
    };


    // Lấy các trạng thái tiếp theo có thể chọn dựa trên trạng thái hiện tại
    const getNextStatuses = (currentStatus?: string) => {
        switch ((currentStatus || '').toLowerCase()) {
            case 'pending':
                return ['preparing', 'cancelled'];
            case 'preparing':
                return ['ready', 'cancelled'];
            case 'ready':
                return ['completed'];
            case 'completed':
            case 'cancelled':
                return []; // Không thể thay đổi trạng thái
            default:
                return ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
        }
    };

    const openDetail = async (orderId?: number | string) => {
        if (!orderId) return;
        try {
            setError(null);
            setDetailLoading(true);
            let resp: any;

            if (activeTab === 'regular') {
                resp = await orderService.getOrder(String(orderId));
            } else {
                resp = await posService.getPOSOrderById(Number(orderId));
            }

            const data = resp && typeof resp === 'object' && 'result' in resp ? resp.result : resp;
            setDetailOrder(data || null);

            // Fetch product details for order items
            if (data?.orderItems && Array.isArray(data.orderItems)) {
                const productIds = data.orderItems
                    .map((item: any) => item.productId)
                    .filter((id: any) => id != null);
                if (productIds.length > 0) {
                    await fetchProductDetails(productIds);
                }
            }

            // Fetch table and staff details for POS orders
            if (activeTab === 'pos' && data) {
                if (data.tableIds && Array.isArray(data.tableIds) && data.tableIds.length > 0) {
                    await fetchTableDetails(data.tableIds);
                }
                if (data.staffId) {
                    await fetchStaffDetails([data.staffId]);
                }
            }

            setDetailOpen(true);
        } catch (e) {
            console.error('Failed to load order detail', e);
            setError('Failed to load order detail.');
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        setDetailOpen(false);
        setDetailOrder(null);
    };

    const fetchProductDetails = async (productIds: (string | number)[]) => {
        const newProductDetails = new Map<string, CatalogProduct>();
        const missingIds = productIds.filter(id => !productDetails.has(String(id)));

        if (missingIds.length === 0) return;

        try {
            const products = await catalogService.getProducts();

            for (const productId of missingIds) {
                const product = products.find(p => p.productId === Number(productId));
                if (product) {
                    newProductDetails.set(String(productId), product);
                }
            }

            if (newProductDetails.size > 0) {
                setProductDetails(prev => new Map([...prev, ...newProductDetails]));
            }
        } catch (error) {
            console.error('Failed to fetch product details:', error);
        }
    };

    const fetchTableDetails = async (tableIds: number[]) => {
        try {
            if (!branchId) return;
            const tables = await tableService.getTablesByBranch(Number(branchId));
            const newMap = new Map<number, any>();
            tables.forEach(table => {
                if (tableIds.includes(table.tableId)) {
                    newMap.set(table.tableId, table);
                }
            });
            setTableDetails(prev => new Map([...prev, ...newMap]));
        } catch (error) {
            console.error('Failed to fetch table details:', error);
        }
    };

    const fetchStaffDetails = async (staffIds: number[]) => {
        try {
            if (!branchId) return;

            // Try to fetch from the new /staff endpoint
            try {
                const staff = await branchService.getBranchStaff(String(branchId));

                const newMap = new Map<number, any>();
                staff.forEach((member: any) => {
                    // Try different possible field names for user ID
                    const userId = member.user_id || member.id || member.userId;
                    if (userId && staffIds.includes(Number(userId))) {
                        newMap.set(Number(userId), member);
                    }
                });

                setStaffDetails(prev => new Map([...prev, ...newMap]));
            } catch (apiError) {
                // Fallback: use current user info if the staffId matches
                const newMap = new Map<number, any>();

                // Check if any of the staffIds match the current user
                if (user && staffIds.includes(Number(user.id))) {
                    newMap.set(Number(user.id), {
                        user_id: Number(user.id),
                        fullname: user.name || user.fullname || 'Current User',
                        email: user.email
                    });
                }

                // For other staff IDs, we'll create placeholder entries
                staffIds.forEach(id => {
                    if (!newMap.has(id)) {
                        newMap.set(id, {
                            user_id: id,
                            fullname: `Staff #${id}`,
                            email: `staff${id}@example.com`
                        });
                    }
                });

                setStaffDetails(prev => new Map([...prev, ...newMap]));
            }
        } catch (error) {
            console.error('Failed to fetch staff details:', error);
            // Create fallback entries for all staff IDs
            const fallbackMap = new Map<number, any>();
            staffIds.forEach(id => {
                fallbackMap.set(id, {
                    user_id: id,
                    fullname: `Staff #${id}`,
                    email: `staff${id}@example.com`
                });
            });
            setStaffDetails(prev => new Map([...prev, ...fallbackMap]));
        }
    };

    const openRecipeModal = async (productId: string | number) => {
        try {
            setRecipeLoading(true);
            setError(null);

            // Fetch recipes for the product
            const recipes = await catalogService.searchRecipes({
                productId: Number(productId),
                status: 'ACTIVE',
                page: 0,
                size: 10
            });

            if (recipes?.content && recipes.content.length > 0) {
                // Get the first active recipe
                setSelectedRecipe(recipes.content[0]);
                setRecipeModalOpen(true);
            } else {
                setError('No recipe found for this product.');
            }
        } catch (e: any) {
            console.error('Failed to load recipe:', e);
            setError('Failed to load recipe.');
        } finally {
            setRecipeLoading(false);
        }
    };

    const closeRecipeModal = () => {
        setRecipeModalOpen(false);
        setSelectedRecipe(null);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto px-2 py-4 sm:px-4 lg:px-4">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-8 pt-6 pb-3">
                        <div>
                            <h1 className="text-xl font-semibold text-slate-900">Branch Orders</h1>
                            <p className="text-sm text-slate-500">Order Management in the Branch.</p>
                        </div>
                        <div className="flex items-center gap-4 text-slate-600"> 
                            {/* 1. Thanh điều hướng Tab (Từ pos_order) */}
                            <div className="mt-4 flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                                <button
                                    onClick={() => {
                                        setActiveTab('regular');
                                        setOrderTypeFilter('all'); // Reset filter when switching tabs
                                    }}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${activeTab === 'regular'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    Regular Orders
                                </button>
                                {staffPermissions.canViewPOS && !staffPermissions.loading && (
                                    <button
                                        onClick={() => {
                                            setActiveTab('pos');
                                            setOrderTypeFilter('all'); // Reset filter when switching tabs
                                        }}
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${activeTab === 'pos'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        POS Orders
                                    </button>
                                )}
                            </div>
                            
                            {/* 2. Auto/Manual Refresh (Từ HEAD) */}
                            {/* Chỉ hiển thị Refresh cho Regular Orders nếu cần */}
                            {activeTab === 'regular' && (
                                <div className="flex items-center gap-3">
                                    {/* Auto refresh toggle */}
                                    <label className="flex items-center gap-2 text-sm text-slate-600">
                                        <input
                                            type="checkbox"
                                            checked={autoRefresh}
                                            onChange={(e) => setAutoRefresh(e.target.checked)}
                                            className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                                        />
                                        <span className="flex items-center gap-1">
                                            Auto Refresh (30s)
                                            {autoRefresh && (
                                                <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" title="Auto refresh is active"></div>
                                            )}
                                        </span>
                                    </label>
                                    
                                    {/* Manual refresh button */}
                                    <button
                                        onClick={async () => {
                                            await loadOrders(true);
                                            toast.success('Orders refreshed manually', {
                                                duration: 2000,
                                                position: 'top-right',
                                            });
                                        }}
                                        disabled={refreshing}
                                        className="flex items-center gap-2 px-3 py-2 text-sm bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {refreshing ? (
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                        )}
                                        {refreshing ? 'Refreshing...' : 'Refresh'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 lg:p-8">
            {loading && <OrdersSkeleton />}
            {error && (
                <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 mb-4">{error}</div>
            )}
    
            {!loading && !error && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600">Status</label>
                                <select
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as any)}
                                >
                                    <option value="all">All</option>
                                    <option value="pending">Pending</option>
                                    <option value="preparing">Preparing</option>
                                    <option value="ready">Ready</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            
                            <div className="h-6 w-px bg-blue-500"></div>
                            
                            {activeTab === 'pos' && (
                                <>
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-gray-600">Order Type</label>
                                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                                            <button
                                                onClick={() => setOrderTypeFilter('all')}
                                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                                                    orderTypeFilter === 'all'
                                                        ? 'bg-white text-gray-900 shadow-sm'
                                                        : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                            >
                                                All
                                            </button>
                                            <button
                                                onClick={() => setOrderTypeFilter('dine-in')}
                                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                                                    orderTypeFilter === 'dine-in'
                                                        ? 'bg-white text-gray-900 shadow-sm'
                                                        : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                            >
                                                Dine-in
                                            </button>
                                            <button
                                                onClick={() => setOrderTypeFilter('takeaway')}
                                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                                                    orderTypeFilter === 'takeaway'
                                                        ? 'bg-white text-gray-900 shadow-sm'
                                                        : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                            >
                                                Takeaway
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="h-6 w-px bg-blue-500"></div>
                                </>
                            )}
                            
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600">Date</label>
                                <input
                                    type="date"
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                />
                            </div>
                            
                            <div className="h-6 w-px bg-blue-500"></div>
                            <div className="flex-1 min-w-[220px] flex items-center gap-2">
                                <label className="text-sm text-gray-600 whitespace-nowrap">Search</label>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search orders..."
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400"
                                />
                            </div>
                        </div>
                    </div>
                    {orders.length === 0 ? (
                        <div className="p-6 text-gray-600">No orders yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-left text-gray-600">
                                        <th className="px-6 py-3 font-medium">Order ID</th>
                                        <th className="px-6 py-3 font-medium">Customer Name</th>
                                        {activeTab === 'regular' && <th className="px-6 py-3 font-medium">Phone</th>}
                                        {activeTab !== 'regular' && (
                                            <>
                                                <th className="px-6 py-3 font-medium">Tables</th>
                                                <th className="px-6 py-3 font-medium">Staff</th>
                                            </>
                                        )}
                                        <th className="px-6 py-3 font-medium">Total Amount</th>
                                        <th className="px-6 py-3 font-medium">Payment</th>
                                        {activeTab === 'regular' && <th className="px-6 py-3 font-medium">Status</th>}
                                        <th className="px-6 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredOrders.map((o, idx) => (
                                        <tr key={String(o.orderId || idx)} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-semibold text-gray-900">{o.orderId}</td>
                                            <td className="px-6 py-4 text-gray-800">{o.customerName || '-'}</td>
                                            {activeTab === 'regular' && <td className="px-6 py-4 text-gray-800">{o.phone || '-'}</td>}
                                            {activeTab !== 'regular' && (
                                                <>
                                                    <td className="px-6 py-4 text-gray-800">
                                                        {o.tableIds && Array.isArray(o.tableIds) && o.tableIds.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {o.tableIds.map((id: number) => {
                                                                    const table = tableDetails.get(id);
                                                                    return (
                                                                        <span key={id} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                                            {table?.label || `Bàn ${id}`}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-800">
                                                        {o.staffId ? (
                                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                                                {(() => {
                                                                    const staff = staffDetails.get(o.staffId);
                                                                    if (staff) {
                                                                        return staff.fullname || staff.name || staff.fullName || `Staff #${o.staffId}`;
                                                                    }
                                                                    return `Staff #${o.staffId}`;
                                                                })()}
                                                            </span>
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </td>
                                                </>
                                            )}
                                            <td className="px-6 py-4 text-gray-900 font-semibold">{formatCurrency(o.totalAmount as unknown as number)}</td>
                                            <td className="px-6 py-4 text-gray-800">{o.paymentMethod || '-'}</td>
                                            {activeTab === 'regular' && (
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusClass(o.status)}`}>{(o.status || 'unknown').toUpperCase()}</span>
                                                </td>
                                            )}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openDetail(o.orderId)}
                                                        className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 inline-flex"
                                                        title="View details"
                                                    >
                                                        {/* Eye icon */}
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                                            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                                                            <circle cx="12" cy="12" r="3" />
                                                        </svg>
                                                    </button>
                                                    
                                                    {/* Logic chỉnh sửa trạng thái (đã hợp nhất) */}
                                                    {activeTab === 'regular' && !['completed', 'cancelled'].includes((o.status || '').toLowerCase()) && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingOrderId(o.orderId!);
                                                                    setSelectedStatus(''); // Reset selected status when opening
                                                                }}
                                                                className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 inline-flex"
                                                                title="Edit status"
                                                            >
                                                                {/* Pencil icon */}
                                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                                                    <path d="M12 20h9" />
                                                                    <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                                                </svg>
                                                            </button>
                                                            {String(editingOrderId) === String(o.orderId) && (
                                                                <select
                                                                    autoFocus
                                                                    className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-700 bg-white inline-flex"
                                                                    value={selectedStatus || ''}
                                                                    onBlur={() => {
                                                                        // Delay onBlur để onChange có cơ hội chạy trước
                                                                        setTimeout(() => {
                                                                            setEditingOrderId(null);
                                                                            setSelectedStatus('');
                                                                        }, 200);
                                                                    }}
                                                                    onChange={async (e) => {
                                                                        const selectedValue = e.target.value;
                                                                        
                                                                        // Update selected status immediately to ensure controlled component works
                                                                        setSelectedStatus(selectedValue);
                                                                        
                                                                        // Always process if it's a valid status option (not the placeholder)
                                                                        if (selectedValue && getNextStatuses(o.status).includes(selectedValue)) {
                                                                            // Prevent onBlur from closing select immediately
                                                                            e.target.focus();
                                                                            
                                                                            try {
                                                                                await handleUpdateStatus(o.orderId, selectedValue);
                                                                                setEditingOrderId(null);
                                                                                setSelectedStatus('');
                                                                            } catch (error) {
                                                                                // Don't close select on error so user can try again
                                                                                setSelectedStatus(selectedValue); // Keep the selection
                                                                            }
                                                                        }
                                                                    }}
                                                                >
                                                                    <option value="" disabled>
                                                                        Select new status...
                                                                    </option>
                                                                    {/* Giả định getNextStatuses(o.status) là logic mong muốn cho việc chuyển trạng thái */}
                                                                    {getNextStatuses(o.status).map(s => (
                                                                        <option key={s} value={s}>
                                                                            {s.charAt(0).toUpperCase() + s.slice(1)}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
    
            {/* Detail Modal (Không có xung đột, giữ nguyên) */}
            {detailOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-800">Order Details</h3>
                            <button onClick={closeDetail} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>
                        <div className="p-6">
                            {detailLoading ? (
                                <div className="text-gray-600">Loading...</div>
                            ) : !detailOrder ? (
                                <div className="text-gray-600">No data.</div>
                            ) : (
                                <div className="space-y-3 text-sm text-gray-800">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><span className="text-gray-500">Order ID:</span> <span className="font-semibold">{detailOrder.orderId}</span></div>
                                        {activeTab === 'regular' && <div><span className="text-gray-500">Status:</span> <span className="font-semibold">{(detailOrder.status || '').toUpperCase()}</span></div>}
                                        <div><span className="text-gray-500">Customer:</span> <span className="font-semibold">{detailOrder.customerName || '-'}</span></div>
                                        {activeTab === 'regular' && <div><span className="text-gray-500">Phone:</span> <span className="font-semibold">{detailOrder.phone || '-'}</span></div>}
                                        {activeTab === 'regular' && <div className="col-span-2"><span className="text-gray-500">Address:</span> <span className="font-semibold">{detailOrder.deliveryAddress || '-'}</span></div>}
                                        {activeTab === 'pos' && (
                                            <>
                                                <div>
                                                    <span className="text-gray-500">Tables:</span>
                                                    <span className="font-semibold ml-2">
                                                        {detailOrder.tableIds && Array.isArray(detailOrder.tableIds) && detailOrder.tableIds.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {detailOrder.tableIds.map((id: number) => {
                                                                    const table = tableDetails.get(id);
                                                                    return (
                                                                        <span key={id} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                                            {table?.label || `Bàn ${id}`}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Staff:</span>
                                                    <span className="font-semibold ml-2">
                                                        {detailOrder.staffId ? (
                                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                                                {(() => {
                                                                    const staff = staffDetails.get(detailOrder.staffId);
                                                                    if (staff) {
                                                                        return staff.fullname || staff.name || staff.fullName || `Staff #${detailOrder.staffId}`;
                                                                    }
                                                                    return `Staff #${detailOrder.staffId}`;
                                                                })()}
                                                            </span>
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                        <div><span className="text-gray-500">Order Date:</span> <span className="font-semibold">{formatDate(detailOrder.orderDate)}</span></div>
                                        <div><span className="text-gray-500">Payment:</span> <span className="font-semibold">{detailOrder.paymentMethod || '-'}</span></div>
                                        {activeTab === 'regular' && <div><span className="text-gray-500">Payment Status:</span> <span className="font-semibold">{detailOrder.paymentStatus || '-'}</span></div>}
                                        <div><span className="text-gray-500">Total:</span> <span className="font-semibold">{formatCurrency(detailOrder.totalAmount as number)}</span></div>
                                    </div>
    
                                    <div className="mt-4">
                                        <h4 className="font-semibold mb-2">Items</h4>
                                        {Array.isArray(detailOrder.orderItems) && detailOrder.orderItems.length > 0 ? (
                                            <div className="border border-gray-100 rounded-xl overflow-hidden">
                                                <table className="min-w-full text-xs">
                                                    <thead>
                                                        <tr className="bg-gray-50 text-gray-600">
                                                            <th className="px-4 py-2 text-left font-medium">Product</th>
                                                            <th className="px-4 py-2 text-left font-medium">Qty</th>
                                                            <th className="px-4 py-2 text-left font-medium">Unit Price</th>
                                                            <th className="px-4 py-2 text-left font-medium">Total</th>
                                                            <th className="px-4 py-2 text-left font-medium">Recipe</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {detailOrder.orderItems.map((it: any, i: number) => {
                                                            const productId = String(it.productId || '');
                                                            const product = productDetails.get(productId);
                                                            const imageSrc = product?.imageUrl && (product.imageUrl.startsWith('http') ? product.imageUrl : `${API_BASE_URL}/api/catalogs${product.imageUrl}`);
    
                                                            return (
                                                                <tr key={i}>
                                                                    <td className="px-4 py-2">
                                                                        <div className="flex items-center space-x-3">
                                                                            {imageSrc ? (
                                                                                <img
                                                                                    src={imageSrc}
                                                                                    alt={product?.name || it.productName || 'Product'}
                                                                                    className="w-10 h-10 rounded-lg object-cover"
                                                                                    loading="lazy"
                                                                                    decoding="async"
                                                                                />
                                                                            ) : (
                                                                                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                                                                    <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                                                                                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                                                                    </svg>
                                                                                </div>
                                                                            )}
                                                                            <div>
                                                                                <div className="font-medium text-gray-900">
                                                                                    {product?.name || it.productName || `Product ${it.productId}`}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-2">{String(it.quantity ?? '-')}</td>
                                                                    <td className="px-4 py-2">{formatCurrency(Number(it.unitPrice))}</td>
                                                                    <td className="px-4 py-2">{formatCurrency(Number(it.totalPrice))}</td>
                                                                    <td className="px-4 py-2">
                                                                        <button
                                                                            onClick={() => openRecipeModal(it.productId)}
                                                                            disabled={recipeLoading}
                                                                            className="px-2 py-1 text-xs rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                                                                            title="View recipe"
                                                                        >
                                                                            {recipeLoading ? (
                                                                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                </svg>
                                                                            ) : (
                                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                </svg>
                                                                            )}
                                                                            Recipe
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-gray-600">No items.</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                            <button onClick={closeDetail} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Close</button>
                        </div>
                    </div>
                </div>
            )}
    
            {/* Recipe Modal (Không có xung đột, giữ nguyên) */}
            {recipeModalOpen && selectedRecipe && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-800">Recipe Details</h3>
                            <button onClick={closeRecipeModal} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>
                        <div className="p-6 text-sm text-gray-800 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><span className="text-gray-500">Name:</span> <span className="font-semibold">{selectedRecipe.name}</span></div>
                                <div><span className="text-gray-500">Version:</span> <span className="font-semibold">{selectedRecipe.version}</span></div>
                                <div><span className="text-gray-500">Status:</span> <span className="font-semibold">{selectedRecipe.status}</span></div>
                                <div><span className="text-gray-500">Product/Size:</span> <span className="font-semibold">{selectedRecipe.productDetail?.size?.name || '-'}</span></div>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">Instructions</h4>
                                {(() => {
                                    const steps = (selectedRecipe.instructions || '')
                                        .split(/\r?\n/)
                                        .map(s => s.trim())
                                        .filter(Boolean);
    
                                    return steps.length === 0 ? (
                                        <div className="text-gray-500 italic text-xs">No instructions provided</div>
                                    ) : (
                                        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                                            <div className="space-y-2 p-2">
                                                {steps.map((step, idx) => (
                                                    <div key={idx} className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                                                        <div className="flex-shrink-0 w-4 h-4 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                                            {idx + 1}
                                                        </div>
                                                        <div className="flex-1 text-gray-800 text-xs leading-relaxed">
                                                            {step}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">Ingredients</h4>
                                {Array.isArray(selectedRecipe.items) && selectedRecipe.items.length > 0 ? (
                                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                                        <table className="min-w-full text-xs">
                                            <thead>
                                                <tr className="bg-gray-50 text-gray-600">
                                                    <th className="px-4 py-2 text-left font-medium">Ingredient</th>
                                                    <th className="px-4 py-2 text-left font-medium">Quantity</th>
                                                    <th className="px-4 py-2 text-left font-medium">Unit</th>
                                                    <th className="px-4 py-2 text-left font-medium">Note</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {selectedRecipe.items.map((it, i) => (
                                                    <tr key={i}>
                                                        <td className="px-4 py-2">{it.ingredient?.name || '-'}</td>
                                                        <td className="px-4 py-2">{String(it.qty ?? '-')}</td>
                                                        <td className="px-4 py-2">{it.unit?.name || it.unit?.code || '-'}</td>
                                                        <td className="px-4 py-2">{it.note || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-gray-600">No ingredients.</div>
                                )}
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                            <button onClick={closeRecipeModal} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Close</button>
                        </div>
                    </div>
                </div>
            )}
                    </div>
                </div>
            </div>
        </div>
    );
}
