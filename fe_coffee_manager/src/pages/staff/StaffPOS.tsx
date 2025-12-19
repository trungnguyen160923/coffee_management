import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CatalogProduct, CatalogProductDetail, Branch } from '../../types';
import { Table } from '../../types/table';
import { DiscountApplicationResponse, Discount } from '../../types/discount';
import catalogService from '../../services/catalogService';
import { posService, tableService } from '../../services';
import { stockService, CheckAndReserveItem } from '../../services/stockService';
import discountService from '../../services/discountService';
import branchService from '../../services/branchService';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { UsageFloatingWidget } from '../../components/stock/UsageFloatingWidget';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';
import { POSSkeleton, POSTableManagementSkeleton } from '../../components/staff/skeletons';
import { toast } from 'react-hot-toast';
import { useActiveShift } from '../../hooks/useActiveShift';
import { ActiveShiftBanner } from '../../components/staff/ActiveShiftBanner';
import {
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    CreditCard,
    Table as TableIcon,
    Search,
    Coffee,
    CheckCircle,
    Users,
    Tag,
    X,
    ArrowLeft,
    RefreshCw,
    ShoppingBag,
    UserSearch,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

interface CartItem {
    product: CatalogProduct;
    productDetail: CatalogProductDetail;
    quantity: number;
    notes?: string;
}


// Remove TableInfo interface as we'll use Table from types

export default function StaffPOS() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { activeShift, hasActiveShift, loading: shiftLoading, refresh: refreshShift } = useActiveShift();
    const [products, setProducts] = useState<CatalogProduct[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [selectedTables, setSelectedTables] = useState<Table[]>([]);
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
    const [receivedAmount, setReceivedAmount] = useState<number>(0);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [leftPanelTab, setLeftPanelTab] = useState<'products' | 'tables'>('products');
    const [orderMode, setOrderMode] = useState<'dine-in' | 'takeaway'>('dine-in');
    const [customerName, setCustomerName] = useState<string>('');
    const [customerPhone, setCustomerPhone] = useState<string>('');
    const [searchingCustomer, setSearchingCustomer] = useState(false);
    const [customerSearchResult, setCustomerSearchResult] = useState<any>(null);
    const [customerSearchError, setCustomerSearchError] = useState<string | null>(null);
    const [tables, setTables] = useState<Table[]>([]);
    const [tablesLoading, setTablesLoading] = useState(false);
    const [tablesError, setTablesError] = useState<string | null>(null);

    // Discount states
    const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);
    const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
    const [appliedDiscount, setAppliedDiscount] = useState<DiscountApplicationResponse | null>(null);
    const [discountLoading, setDiscountLoading] = useState(false);
    const [discountError, setDiscountError] = useState<string | null>(null);
    const [loadingDiscounts, setLoadingDiscounts] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [branchInfo, setBranchInfo] = useState<Branch | null>(null);
    const [customerInfoCollapsed, setCustomerInfoCollapsed] = useState(false);

    const branchId = useMemo(() => {
        if (user?.branch?.branchId) return Number(user.branch.branchId);
        if (user?.branchId) return Number(user.branchId);
        return null;
    }, [user]);

    useEffect(() => {
        const loadProducts = async () => {
            try {
                setLoading(true);
                const data = await catalogService.getProducts();
                setProducts(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Failed to load products:', error);
            } finally {
                setLoading(false);
            }
        };

        if (branchId) {
            loadProducts();
        }
    }, [branchId]);

    useEffect(() => {
        const loadTables = async () => {
            if (!branchId) return;

            try {
                setTablesLoading(true);
                setTablesError(null);
                const data = await tableService.getTablesByBranch(branchId);
                setTables(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Failed to load tables:', error);
                setTablesError('Unable to load table list');
            } finally {
                setTablesLoading(false);
            }
        };

        loadTables();
    }, [branchId]);

    useEffect(() => {
        const loadDiscounts = async () => {
            if (!branchId) return;

            try {
                setLoadingDiscounts(true);
                const discounts = await discountService.getActiveDiscounts(branchId);
                setAvailableDiscounts(discounts);
            } catch (error) {
                console.error('Failed to load discounts:', error);
            } finally {
                setLoadingDiscounts(false);
            }
        };

        loadDiscounts();
    }, [branchId]);

    useEffect(() => {
        const loadBranchInfo = async () => {
            if (!branchId) return;

            try {
                const branch = await branchService.getBranch(String(branchId));
                setBranchInfo(branch);
            } catch (error) {
                console.error('Failed to load branch info:', error);
            }
        };

        loadBranchInfo();
    }, [branchId]);

    // Helper function to filter active product details
    const getActiveProductDetails = (productDetails: any[]) => {
        return productDetails.filter(detail =>
            detail.active !== null && detail.active !== false
        );
    };

    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.description?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === 'all' || product.category?.name === categoryFilter;

            // Check if product is active (not null or false)
            const isProductActive = product.active !== null && product.active !== false;

            // Check if product has at least one active productDetail
            const activeDetails = getActiveProductDetails(product.productDetails || []);
            const hasActiveProductDetails = activeDetails.length > 0;

            return matchesSearch && matchesCategory && isProductActive && hasActiveProductDetails;
        });
    }, [products, searchTerm, categoryFilter]);

    const categories = useMemo(() => {
        const cats = products.map(p => p.category?.name).filter(Boolean);
        return ['all', ...Array.from(new Set(cats))];
    }, [products]);

    const addToCart = (product: CatalogProduct, productDetail: CatalogProductDetail) => {
        const existingItem = cart.find(item =>
            item.product.productId === product.productId &&
            item.productDetail.pdId === productDetail.pdId
        );
        if (existingItem) {
            setCart(cart.map(item =>
                item.product.productId === product.productId && item.productDetail.pdId === productDetail.pdId
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setCart([...cart, { product, productDetail, quantity: 1 }]);
        }
    };

    const updateQuantity = (productId: number, pdId: number, quantity: number) => {
        if (quantity <= 0) {
            setCart(cart.filter(item =>
                !(item.product.productId === productId && item.productDetail.pdId === pdId)
            ));
        } else {
            setCart(cart.map(item =>
                item.product.productId === productId && item.productDetail.pdId === pdId
                    ? { ...item, quantity }
                    : item
            ));
        }
    };

    const removeFromCart = (productId: number, pdId: number) => {
        setCart(cart.filter(item =>
            !(item.product.productId === productId && item.productDetail.pdId === pdId)
        ));
    };

    const getTotalAmount = () => {
        return cart.reduce((total, item) => total + (item.productDetail.price * item.quantity), 0);
    };

    const getFinalAmount = () => {
        if (appliedDiscount && appliedDiscount.isValid) {
            return appliedDiscount.finalAmount;
        }
        return getTotalAmount();
    };

    const getChangeAmount = () => {
        return Math.max(0, receivedAmount - getFinalAmount());
    };

    const applyDiscount = async (discount: Discount) => {
        if (!branchId) return;

        setDiscountLoading(true);
        setDiscountError(null);

        try {
            const response = await discountService.applyDiscount({
                discountCode: discount.code,
                orderAmount: getTotalAmount(),
                branchId: branchId
            });

            if (response.isValid) {
                setAppliedDiscount(response);
                setSelectedDiscount(discount);
                setDiscountError(null);
                toast.success(`Đã áp dụng mã giảm giá: ${discount.code}`, { duration: 2000 });
            } else {
                setDiscountError(response.message);
                setAppliedDiscount(null);
                setSelectedDiscount(null);
                toast.error(response.message || 'Không thể áp dụng mã giảm giá', { duration: 3000 });
            }
        } catch (error) {
            console.error('Failed to apply discount:', error);
            setDiscountError('Unable to apply discount code');
            setAppliedDiscount(null);
            setSelectedDiscount(null);
            toast.error('Lỗi khi áp dụng mã giảm giá. Vui lòng thử lại.', { duration: 3000 });
        } finally {
            setDiscountLoading(false);
        }
    };

    const removeDiscount = () => {
        setAppliedDiscount(null);
        setSelectedDiscount(null);
        setDiscountError(null);
        toast.success('Đã xóa mã giảm giá', { duration: 2000 });
    };

    // Kiểm tra thời gian làm việc của chi nhánh
    const isWithinBusinessHours = (): boolean => {
        if (!branchInfo?.openHours || !branchInfo?.endHours) {
            // Nếu không có thông tin giờ làm việc, cho phép tạo đơn
            return true;
        }

        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const openTime = branchInfo.openHours.length === 5 ? branchInfo.openHours : branchInfo.openHours.substring(0, 5);
        const endTime = branchInfo.endHours.length === 5 ? branchInfo.endHours : branchInfo.endHours.substring(0, 5);

        // So sánh thời gian (HH:mm format)
        if (endTime > openTime) {
            // Normal same-day window (e.g., 08:00 -> 22:00)
            return currentTime >= openTime && currentTime <= endTime;
        } else {
            // Overnight window (e.g., 20:00 -> 02:00)
            return currentTime >= openTime || currentTime <= endTime;
        }
    };

    const handleSearchCustomer = async () => {
        if (!customerPhone.trim()) {
            toast.error('Vui lòng nhập số điện thoại');
            setCustomerSearchError('Please enter a phone number');
            return;
        }

        setSearchingCustomer(true);
        setCustomerSearchError(null);
        setCustomerSearchResult(null);

        try {
            const { apiClient } = await import('../../config/api');
            // Search customer by phone
            const response = await apiClient.get<any>(`/api/auth-service/users/customers/search?phone=${encodeURIComponent(customerPhone.trim())}`);
            
            const customer = (response && typeof response === 'object' && 'result' in response)
                ? (response as any).result
                : response;

            if (customer) {
                setCustomerSearchResult(customer);
                setCustomerName(customer.name || customer.fullname || '');
                setCustomerPhone(customer.phone || customer.phoneNumber || customerPhone);
                toast.success(`Đã tìm thấy khách hàng: ${customer.name || customer.fullname}`);
            } else {
                setCustomerSearchError('Customer not found');
                toast.error('Không tìm thấy khách hàng');
            }
        } catch (error: any) {
            console.error('Failed to search customer:', error);

            // Ưu tiên dùng message trả về từ BE (api.ts đã gán vào error.message và error.response.message)
            const beMessage =
                error?.response?.message ||
                error?.message ||
                'Có lỗi xảy ra khi tìm kiếm khách hàng';

            if (error?.status === 404 || error?.code === 1024) {
                // 404 hoặc code 1024: khách hàng không tồn tại
                setCustomerSearchError(beMessage);
                toast.error(beMessage);
            } else {
                // Các lỗi khác: vẫn hiển thị message từ BE nếu có
                setCustomerSearchError(beMessage);
                toast.error(beMessage);
            }
        } finally {
            setSearchingCustomer(false);
        }
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        
        // Validation dựa trên mode
        if (orderMode === 'dine-in') {
            if (!selectedTable && selectedTables.length === 0) {
                toast.error('Vui lòng chọn bàn');
                return;
            }
        }
        
        if (!branchId || !user?.user_id) {
            toast.error('Thiếu thông tin chi nhánh hoặc nhân viên');
            return;
        }

        // Check if user has STAFF role
        if (user?.role !== 'staff') {
            toast.error('Bạn cần đăng nhập bằng tài khoản nhân viên để sử dụng POS');
            return;
        }

        // Kiểm tra active shift
        if (!hasActiveShift) {
            toast.error('Bạn phải đang trong ca làm việc mới có thể tạo đơn. Vui lòng check-in vào ca làm việc của bạn.', {
                duration: 5000,
            });
            navigate('/staff/my-shifts');
            return;
        }

        // Kiểm tra thời gian làm việc
        if (!isWithinBusinessHours()) {
            const openTime = branchInfo?.openHours || 'N/A';
            const endTime = branchInfo?.endHours || 'N/A';
            toast.error(`Không thể tạo đơn ngoài giờ làm việc của chi nhánh.\nGiờ làm việc: ${openTime} - ${endTime}`);
            return;
        }

        setProcessing(true);
        try {
            // Tạo order data dựa trên mode
            let orderData: any;
            
            // Cả takeaway và dine-in đều phải có branchId để check & reserve
            if (!branchId) {
                throw new Error('Branch ID is missing for POS order');
            }

            // 1) Check & reserve stock tại catalog-service để lấy holdId
            const reserveItems: CheckAndReserveItem[] = cart.map(item => ({
                productDetailId: item.productDetail.pdId,
                quantity: item.quantity
            }));

            const reserveResp = await stockService.checkAndReserve(branchId, reserveItems);
            
            if (orderMode === 'takeaway') {
                // Takeaway order - sử dụng guest order endpoint nhưng có giữ chỗ nguyên liệu (holdId)
                const { apiClient } = await import('../../config/api');
                orderData = {
                    // Customer info is optional for POS takeaway; nếu bỏ trống sẽ dùng mặc định
                    customerName: customerName.trim() || 'Customer take away',
                    // Backend CreateGuestOrderRequest yêu cầu phone không null, dùng '_' như POSService
                    phone: customerPhone.trim() || '_',
                    branchId: branchId,
                    orderType: 'takeaway',
                    // Gửi holdId để backend link reservation với order giống online/dine-in
                    holdId: reserveResp.holdId,
                    orderItems: cart.map(item => ({
                        productId: item.product.productId,
                        productDetailId: item.productDetail.pdId,
                        quantity: item.quantity,
                        notes: item.notes
                    })),
                    paymentMethod: paymentMethod,
                    paymentStatus: 'PENDING',
                    discount: appliedDiscount?.discountAmount || 0,
                    discountCode: appliedDiscount?.discountCode,
                    notes: customerName
                        ? `Takeaway order - ${customerName}`
                        : 'Takeaway order',
                };
                
                await apiClient.post('/api/order-service/api/orders/guest', orderData);
            } else {
                // Dine-in order - dùng reservation giống customer:
                // 2) Gửi order POS kèm holdId xuống order-service
                orderData = {
                    staffId: Number(user.user_id),
                    branchId: branchId,
                    holdId: reserveResp.holdId,
                    tableIds: selectedTable ? [selectedTable.tableId] : selectedTables.map(t => t.tableId),
                    orderItems: cart.map(item => ({
                        productId: item.product.productId,
                        productDetailId: item.productDetail.pdId,
                        quantity: item.quantity,
                        notes: item.notes
                    })),
                    paymentMethod: paymentMethod,
                    paymentStatus: 'PENDING',
                    discount: appliedDiscount?.discountAmount || 0,
                    discountCode: appliedDiscount?.discountCode,
                    notes: selectedTable ? `Table ${selectedTable.label}` :
                        selectedTables.length > 0 ? `Tables ${selectedTables.map(t => t.label).join(', ')}` : 'In-store'
                };

                await posService.createPOSOrder(orderData);
            }

            // Reset form
            setCart([]);
            setSelectedTable(null);
            setSelectedTables([]);
            setAppliedDiscount(null);
            setSelectedDiscount(null);
            setDiscountError(null);
            setCustomerName('');
            setCustomerPhone('');
            setCustomerSearchResult(null);
            setShowPaymentModal(false);
            setOrderSuccess(true);

            // Show success toast
            toast.success(
                orderMode === 'takeaway' 
                    ? 'Đã tạo đơn takeaway thành công!' 
                    : 'Đã tạo đơn thành công!',
                { duration: 3000 }
            );

            // Auto print receipt after successful order
            setTimeout(() => {
                printReceipt();
            }, 1000);

            setTimeout(() => setOrderSuccess(false), 3000);
        } catch (error: any) {
            console.error('Failed to create order:', error);
            const errorMessage = error?.response?.data?.message || error?.message || 'Có lỗi xảy ra khi tạo đơn';
            
            // Hiển thị thông báo lỗi cụ thể từ backend
            if (errorMessage.includes('giờ làm việc') || errorMessage.includes('business hours') || errorMessage.includes('POS_ORDER_OUTSIDE_BUSINESS_HOURS')) {
                toast.error('Không thể tạo đơn ngoài giờ làm việc của chi nhánh', { duration: 4000 });
            } else if (errorMessage.includes('nghỉ') || errorMessage.includes('closed') || errorMessage.includes('BRANCH_CLOSED')) {
                toast.error('Chi nhánh đang nghỉ. Không thể tạo đơn', { duration: 4000 });
            } else if (errorMessage.includes('không hoạt động') || errorMessage.includes('not operating') || errorMessage.includes('BRANCH_NOT_OPERATING')) {
                toast.error('Chi nhánh không hoạt động vào ngày này. Vui lòng chọn ngày khác', { duration: 4000 });
            } else {
                toast.error(errorMessage, { duration: 4000 });
            }
        } finally {
            setProcessing(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('en-US') + ' ₫';
    };

    const handlePrintReceipt = () => {
        printReceipt();
    };

    const printReceipt = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const orderNumber = Date.now().toString().slice(-6);
        const currentTime = new Date().toLocaleString('vi-VN');
        const tableInfo = selectedTable ? `Table ${selectedTable.label}` :
            selectedTables.length > 0 ? `Tables ${selectedTables.map(t => t.label).join(', ')}` : 'In-store';

        const receiptContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>POS Receipt</title>
                <style>
                    body { 
                        font-family: 'Courier New', monospace; 
                        font-size: 12px; 
                        line-height: 1.4; 
                        margin: 0; 
                        padding: 10px;
                        max-width: 300px;
                    }
                    .header { text-align: center; margin-bottom: 15px; }
                    .title { font-size: 18px; font-weight: bold; margin-bottom: 5px; color: #2563eb; }
                    .subtitle { font-size: 10px; color: #666; }
                    .divider { border-top: 1px dashed #000; margin: 10px 0; }
                    .item { margin: 5px 0; }
                    .item-name { font-weight: bold; }
                    .item-details { font-size: 10px; color: #666; margin-left: 10px; }
                    .total-section { margin-top: 10px; }
                    .total-line { display: flex; justify-content: space-between; margin: 3px 0; }
                    .final-total { font-weight: bold; font-size: 14px; color: #dc2626; }
                    .footer { text-align: center; margin-top: 15px; font-size: 10px; color: #666; }
                    .payment-info { background: #f3f4f6; padding: 8px; border-radius: 4px; margin: 8px 0; }
                    .success-badge { background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-size: 10px; }
                    @media print {
                        body { margin: 0; padding: 5px; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">☕ COFFEE SHOP</div>
                    <div class="subtitle">POS Receipt</div>
                </div>
                
                <div class="divider"></div>
                
                <div>
                    <div><strong>Order #:</strong> ${orderNumber}</div>
                    <div><strong>Time:</strong> ${currentTime}</div>
                    <div><strong>Location:</strong> ${tableInfo}</div>
                    <div><strong>Staff:</strong> ${user?.name || 'Unknown'}</div>
                    <div><strong>Branch:</strong> ${user?.branch?.name || 'Unknown'}</div>
                </div>
                
                <div class="divider"></div>
                
                <div>
                    ${cart.map(item => `
                        <div class="item">
                            <div class="item-name">${item.product.name}</div>
                            <div class="item-details">
                                ${item.productDetail.size?.name ? `Size: ${item.productDetail.size.name}` : ''}
                                ${item.notes ? `Notes: ${item.notes}` : ''}
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>${item.quantity} x ${formatCurrency(item.productDetail.price)}</span>
                                <span>${formatCurrency(item.productDetail.price * item.quantity)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="divider"></div>
                
                <div class="total-section">
                    <div class="total-line">
                        <span>Subtotal:</span>
                        <span>${formatCurrency(getTotalAmount())}</span>
                    </div>
                    ${appliedDiscount && appliedDiscount.isValid ? `
                        <div class="total-line">
                            <span>Discount (${appliedDiscount.discountName}):</span>
                            <span>-${formatCurrency(appliedDiscount.discountAmount)}</span>
                        </div>
                    ` : ''}
                    <div class="divider"></div>
                    <div class="total-line final-total">
                        <span>TOTAL:</span>
                        <span>${formatCurrency(getFinalAmount())}</span>
                    </div>
                </div>
                
                <div class="payment-info">
                    <div><strong>Payment Method:</strong> ${paymentMethod.toUpperCase()}</div>
                    ${paymentMethod === 'cash' && receivedAmount > 0 ? `
                        <div><strong>Received:</strong> ${formatCurrency(receivedAmount)}</div>
                        <div><strong>Change:</strong> ${formatCurrency(getChangeAmount())}</div>
                    ` : ''}
                </div>
                
                <div class="footer">
                    <div class="success-badge">✓ ORDER COMPLETED</div>
                    <div style="margin-top: 8px;">Thank you for your order!</div>
                    <div style="margin-top: 4px; font-size: 9px;">Generated by POS System</div>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(receiptContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };

    const getTableStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'available': return 'bg-green-100 text-green-800 border-green-200';
            case 'occupied': return 'bg-red-100 text-red-800 border-red-200';
            case 'reserved': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'maintenance': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getTableStatusText = (status: string) => {
        switch (status.toLowerCase()) {
            case 'available': return 'Available';
            case 'occupied': return 'Occupied';
            case 'reserved': return 'Reserved';
            case 'maintenance': return 'Maintenance';
            default: return status;
        }
    };

    const toggleTableSelection = (table: Table) => {
        if (table.status.toLowerCase() !== 'available') return;

        if (selectedTables.find(t => t.tableId === table.tableId)) {
            setSelectedTables(selectedTables.filter(t => t.tableId !== table.tableId));
        } else {
            setSelectedTables([...selectedTables, table]);
        }
    };

    const clearTableSelection = () => {
        setSelectedTable(null);
        setSelectedTables([]);
    };

    const handleRefresh = async () => {
        if (!branchId) return;
        
        setRefreshing(true);
        try {
            // Reload products
            const productsData = await catalogService.getProducts();
            setProducts(Array.isArray(productsData) ? productsData : []);
            
            // Reload tables
            const tablesData = await tableService.getTablesByBranch(branchId);
            setTables(Array.isArray(tablesData) ? tablesData : []);
            
            // Reload discounts
            const discounts = await discountService.getActiveDiscounts(branchId);
            setAvailableDiscounts(discounts);
        } catch (error) {
            console.error('Failed to refresh data:', error);
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <>
        <ActiveShiftBanner />
        <div className={`h-screen bg-gray-50 flex ${!shiftLoading && !hasActiveShift ? 'pt-14' : ''}`}>
            {/* Left Panel - Products */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 shadow-sm">
                    <div className="p-4">
                        {/* Top Row: Navigation & User Info */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => navigate('/staff/orders')}
                                    className="flex items-center space-x-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-all shadow-sm hover:shadow"
                                    title="Go back to the orders screen"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    <span className="text-sm font-medium">Back</span>
                                </button>
                                <div className="h-6 w-px bg-gray-300"></div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    POS System
                                </h1>
                            </div>
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={handleRefresh}
                                    disabled={refreshing}
                                    className="flex items-center space-x-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Refresh data"
                                >
                                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                                    <span className="text-sm font-medium">Refresh</span>
                                </button>
                                <NotificationBell />
                                <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg shadow-sm">
                                    <div className="flex flex-col items-end">
                                        <div className="text-sm font-semibold text-gray-800">
                                            {user?.name || 'Unknown'}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {user?.branch?.name || 'Unknown Branch'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Bottom Row: Order Mode Selector */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <span className="text-sm font-medium text-gray-600">Order Type:</span>
                                <div className="flex items-center space-x-1 bg-white rounded-lg p-1 shadow-sm">
                                    <button
                                        onClick={() => {
                                            setOrderMode('dine-in');
                                            setSelectedTable(null);
                                            setSelectedTables([]);
                                        }}
                                        className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                                            orderMode === 'dine-in'
                                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <TableIcon className="h-4 w-4" />
                                            <span>Dine-in</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setOrderMode('takeaway');
                                            setSelectedTable(null);
                                            setSelectedTables([]);
                                        }}
                                        className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                                            orderMode === 'takeaway'
                                                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <ShoppingBag className="h-4 w-4" />
                                            <span>Takeaway</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tab Navigation - Ẩn Table Management khi chọn Takeaway */}
                    <div className="flex space-x-2 mb-4">
                        <button
                            onClick={() => setLeftPanelTab('products')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${leftPanelTab === 'products'
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            <Coffee className="h-4 w-4" />
                            <span>Products</span>
                        </button>
                        {orderMode === 'dine-in' && (
                            <button
                                onClick={() => setLeftPanelTab('tables')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${leftPanelTab === 'tables'
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                <TableIcon className="h-4 w-4" />
                                <span>Table Management</span>
                            </button>
                        )}
                    </div>

                    {/* Search and Filters - Only show for products tab */}
                    {leftPanelTab === 'products' && (
                        <div className="flex space-x-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Search products..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>
                                        {cat === 'all' ? 'All Categories' : cat}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4">
                    {leftPanelTab === 'products' ? (
                        // Products Tab
                        loading ? (
                            <POSSkeleton />
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {filteredProducts.map((product) => (
                                    <div
                                        key={product.productId}
                                        className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                                    >
                                        <div className="aspect-square relative overflow-hidden rounded-t-xl">
                                            {product.imageUrl ? (
                                                <img
                                                    src={product.imageUrl.startsWith('http') ? product.imageUrl : `${API_BASE_URL}/api/catalogs${product.imageUrl}`}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-amber-100 flex items-center justify-center">
                                                    <Coffee className="h-12 w-12 text-amber-600" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <h3 className="font-semibold text-gray-800 text-sm mb-2 line-clamp-2">
                                                {product.name}
                                            </h3>

                                            {/* Product sizes and prices */}
                                            <div className="space-y-3">
                                                {(() => {
                                                    const activeDetails = getActiveProductDetails(product.productDetails || []);
                                                    return activeDetails.length > 1 ? (
                                                        // Multiple sizes - show dropdown selector
                                                        <div className="space-y-2">
                                                            <select
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                onChange={(e) => {
                                                                    const selectedDetail = activeDetails.find(detail =>
                                                                        detail.pdId === parseInt(e.target.value)
                                                                    );
                                                                    if (selectedDetail) {
                                                                        addToCart(product, selectedDetail);
                                                                    }
                                                                }}
                                                            >
                                                                <option value="">Select size...</option>
                                                                {activeDetails.map((detail) => (
                                                                    <option key={detail.pdId} value={detail.pdId}>
                                                                        {detail.size?.name || 'No size'} - {formatCurrency(detail.price)}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ) : activeDetails.length === 1 ? (
                                                        // Single size - compact add button
                                                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                                                            onClick={() => addToCart(product, activeDetails[0])}>
                                                            <div className="flex items-center space-x-2">
                                                                <div className="text-xs font-medium text-gray-700">
                                                                    {activeDetails[0].size?.name || 'No size'}
                                                                </div>
                                                                <div className="text-sm font-bold text-amber-600">
                                                                    {formatCurrency(activeDetails[0].price)}
                                                                </div>
                                                            </div>
                                                            <button className="bg-blue-500 text-white rounded-full p-1 hover:bg-blue-600 transition-colors">
                                                                <Plus className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        // No active details
                                                        <div className="p-2 text-center text-gray-500 text-sm">
                                                            No available sizes
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            <div className="mt-2">
                                                <span className="text-xs text-gray-500">
                                                    {product.category?.name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        // Tables Tab
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-800">Table Management</h3>
                                    <button
                                        onClick={() => setShowMergeModal(true)}
                                        className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 border border-green-200 rounded-lg hover:bg-green-200 transition-colors"
                                    >
                                        <Users className="h-4 w-4" />
                                        <span>Merge Tables</span>
                                    </button>
                                </div>

                                {/* Table Status Summary */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-center mb-2">
                                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                <TableIcon className="h-4 w-4 text-green-600" />
                                            </div>
                                        </div>
                                        <div className="text-2xl font-bold text-green-600">
                                            {tables.filter(t => t.status.toLowerCase() === 'available').length}
                                        </div>
                                        <div className="text-sm text-green-700">Available</div>
                                    </div>
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-center mb-2">
                                            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                                <div className="relative">
                                                    <TableIcon className="h-4 w-4 text-red-600" />
                                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-2xl font-bold text-red-600">
                                            {tables.filter(t => t.status.toLowerCase() === 'occupied').length}
                                        </div>
                                        <div className="text-sm text-red-700">Occupied</div>
                                    </div>
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-center mb-2">
                                            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                                                <div className="relative">
                                                    <TableIcon className="h-4 w-4 text-yellow-600" />
                                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-2xl font-bold text-yellow-600">
                                            {tables.filter(t => t.status.toLowerCase() === 'reserved').length}
                                        </div>
                                        <div className="text-sm text-yellow-700">Reserved</div>
                                    </div>
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-center mb-2">
                                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                                <TableIcon className="h-4 w-4 text-gray-600" />
                                            </div>
                                        </div>
                                        <div className="text-2xl font-bold text-gray-600">
                                            {tables.filter(t => t.status.toLowerCase() === 'maintenance').length}
                                        </div>
                                        <div className="text-sm text-gray-700">Maintenance</div>
                                    </div>
                                </div>

                                {/* Tables Grid */}
                                {tablesLoading ? (
                                    <POSTableManagementSkeleton />
                                ) : tablesError ? (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                                        <div className="text-red-600 mb-2">{tablesError}</div>
                                        <button
                                            onClick={() => {
                                                if (branchId) {
                                                    tableService.getTablesByBranch(branchId).then(data => {
                                                        setTables(Array.isArray(data) ? data : []);
                                                    }).catch(() => { });
                                                }
                                            }}
                                            className="text-sm text-red-700 hover:text-red-800 underline"
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                ) : tables.length === 0 ? (
                                    <div className="text-center text-gray-500 py-8">
                                        <TableIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                        <p>No tables available</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {tables.map((table) => (
                                            <div
                                                key={table.tableId}
                                                className={`p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer hover:shadow-lg hover:scale-105 ${selectedTable?.tableId === table.tableId
                                                    ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                                                    : selectedTables.find(t => t.tableId === table.tableId)
                                                        ? 'border-green-500 bg-green-50 shadow-lg scale-105'
                                                        : getTableStatusColor(table.status)
                                                    }`}
                                                onClick={() => {
                                                    if (table.status.toLowerCase() === 'available') {
                                                        if (selectedTables.length > 0) {
                                                            toggleTableSelection(table);
                                                        } else {
                                                            setSelectedTable(table);
                                                        }
                                                    }
                                                }}
                                            >
                                                <div className="text-center">
                                                    {/* Table Icon/Image */}
                                                    <div className="mb-3 flex justify-center">
                                                        {table.status.toLowerCase() === 'available' ? (
                                                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                                                <TableIcon className="h-6 w-6 text-green-600" />
                                                            </div>
                                                        ) : table.status.toLowerCase() === 'occupied' ? (
                                                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                                                <div className="relative">
                                                                    <TableIcon className="h-6 w-6 text-red-600" />
                                                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                                                                </div>
                                                            </div>
                                                        ) : table.status.toLowerCase() === 'reserved' ? (
                                                            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                                                                <div className="relative">
                                                                    <TableIcon className="h-6 w-6 text-yellow-600" />
                                                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full"></div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                                                <TableIcon className="h-6 w-6 text-gray-600" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Table Number */}
                                                    <div className="text-2xl font-bold text-gray-800 mb-2">
                                                        {table.label}
                                                    </div>

                                                    {/* Status Badge */}
                                                    <div className={`text-sm font-medium px-3 py-1 rounded-full border ${getTableStatusColor(table.status)} mb-2`}>
                                                        {getTableStatusText(table.status)}
                                                    </div>

                                                    {/* Capacity */}
                                                    <div className="text-sm text-gray-600 flex items-center justify-center space-x-1">
                                                        <Users className="h-4 w-4" />
                                                        <span>{table.capacity} seats</span>
                                                    </div>

                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Table Actions */}
                                {selectedTable && (
                                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <h4 className="font-semibold text-blue-800 mb-2">
                                            Table {selectedTable.label} selected
                                        </h4>
                                        <div className="flex space-x-3">
                                            <button
                                                onClick={() => setSelectedTable(null)}
                                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
                                            >
                                                Deselect
                                            </button>
                                            {/* Future: add quick-create order for this table */}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Cart & Checkout */}
            <div className="w-[500px] bg-white border-l border-gray-200 flex flex-col h-screen">
                {/* Cart Header - Scrollable with max height */}
                <div className="border-b border-gray-200 flex-shrink-0">
                    <div className="p-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <ShoppingCart className="h-5 w-5 text-gray-600" />
                            <h2 className="text-lg font-semibold text-gray-800">Shopping Cart</h2>
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                {cart.length}
                            </span>
                        </div>
                    </div>

                    {/* Scrollable header content */}
                    <div className="overflow-y-auto max-h-[40vh] px-4 pb-4">
                        {/* Customer Info and Discount Code - Side by Side */}
                        {orderMode === 'takeaway' && (
                            <div className="mb-3 flex gap-3">
                                {/* Customer Info for Takeaway - Collapsible */}
                                <div className="flex-1 p-3 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-lg shadow-sm">
                                <button
                                    onClick={() => setCustomerInfoCollapsed(!customerInfoCollapsed)}
                                    className="w-full flex items-center justify-between mb-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <Users className="h-4 w-4 text-orange-600" />
                                        <h3 className="text-sm font-semibold text-orange-800">Customer Information</h3>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {customerSearchResult && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCustomerSearchResult(null);
                                                    setCustomerName('');
                                                    setCustomerPhone('');
                                                }}
                                                className="text-xs text-orange-600 hover:text-orange-800 underline"
                                            >
                                                New Customer
                                            </button>
                                        )}
                                        {customerInfoCollapsed ? (
                                            <ChevronDown className="h-4 w-4 text-orange-600" />
                                        ) : (
                                            <ChevronUp className="h-4 w-4 text-orange-600" />
                                        )}
                                    </div>
                                </button>
                                
                                {!customerInfoCollapsed && (
                                    <>
                                        {/* Search Customer Section */}
                                        {!customerSearchResult && (
                                            <div className="mb-3 p-2 bg-white rounded-lg border border-orange-200">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <UserSearch className="h-3.5 w-3.5 text-orange-600" />
                                                    <span className="text-xs font-medium text-gray-700">Search Customer</span>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <input
                                                        type="tel"
                                                        value={customerPhone}
                                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                                        onKeyPress={(e) => {
                                                            if (e.key === 'Enter' && customerPhone.trim()) {
                                                                handleSearchCustomer();
                                                            }
                                                        }}
                                                        placeholder="Enter phone number"
                                                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                    />
                                                    <button
                                                        onClick={handleSearchCustomer}
                                                        disabled={!customerPhone.trim() || searchingCustomer}
                                                        className="px-2 py-1.5 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors"
                                                    >
                                                        {searchingCustomer ? (
                                                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Search className="h-3.5 w-3.5" />
                                                        )}
                                                    </button>
                                                </div>
                                                {customerSearchError && (
                                                    <div className="mt-2 text-xs text-red-600">{customerSearchError}</div>
                                                )}
                                            </div>
                                        )}

                                        {/* Customer Info Display */}
                                        {customerSearchResult && (
                                            <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-green-800 truncate">
                                                            {customerSearchResult.name || customerSearchResult.fullname}
                                                        </div>
                                                        <div className="text-xs text-green-600 truncate">
                                                            {customerSearchResult.phone || customerPhone}
                                                        </div>
                                                        {customerSearchResult.email && (
                                                            <div className="text-xs text-green-500 mt-1 truncate">
                                                                {customerSearchResult.email}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 ml-2" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Customer Input Fields */}
                                        <div className="space-y-2">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Customer Name <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={customerName}
                                                    onChange={(e) => setCustomerName(e.target.value)}
                                                    placeholder="Enter customer name"
                                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                    disabled={!!customerSearchResult}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Phone Number <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={customerPhone}
                                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                                    placeholder="Enter phone number"
                                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                    disabled={!!customerSearchResult}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                                </div>

                                {/* Discount Section */}
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center space-x-2">
                                        <Tag className="h-4 w-4 text-gray-600" />
                                        <span className="text-sm font-medium text-gray-700">Discount Code</span>
                                    </div>

                                    {!appliedDiscount ? (
                                        <div className="space-y-2">
                                            {loadingDiscounts ? (
                                                <div className="text-center text-gray-500 py-3">
                                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent mx-auto mb-2"></div>
                                                    <div className="text-xs">Loading discounts...</div>
                                                </div>
                                            ) : availableDiscounts.length === 0 ? (
                                                <div className="text-center text-gray-500 py-3">
                                                    <Tag className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                                                    <div className="text-xs">No discounts available</div>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <select
                                                        value={selectedDiscount?.discountId || ''}
                                                        onChange={(e) => {
                                                            const discountId = parseInt(e.target.value);
                                                            const discount = availableDiscounts.find(d => d.discountId === discountId);
                                                            setSelectedDiscount(discount || null);
                                                        }}
                                                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="">Select discount code...</option>
                                                        {availableDiscounts.map((discount) => (
                                                            <option key={discount.discountId} value={discount.discountId}>
                                                                {discount.name} ({discount.code}) - {discount.discountType === 'PERCENT'
                                                                    ? `${discount.discountValue}% off`
                                                                    : `${formatCurrency(discount.discountValue)} off`}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={() => selectedDiscount && applyDiscount(selectedDiscount)}
                                                        disabled={!selectedDiscount || discountLoading}
                                                        className="w-full px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                                                    >
                                                        {discountLoading ? 'Applying...' : 'Apply Discount'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2 flex-1 min-w-0">
                                                    <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-xs font-medium text-green-800 truncate">
                                                            {appliedDiscount.discountName}
                                                        </div>
                                                        <div className="text-xs text-green-600 truncate">
                                                            {selectedDiscount?.code} - {appliedDiscount.discountType === 'PERCENT'
                                                                ? `${appliedDiscount.discountValue}% off`
                                                                : `${formatCurrency(appliedDiscount.discountValue)} off`}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={removeDiscount}
                                                    className="text-green-600 hover:text-green-800 p-1 flex-shrink-0"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {discountError && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                                            <div className="text-xs text-red-600">{discountError}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Selected Table Info - Chỉ hiển thị khi Dine-in */}
                        {orderMode === 'dine-in' && selectedTable && (
                            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                            <TableIcon className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-blue-800">
                                                Table {selectedTable.label}
                                            </div>
                                            <div className="text-xs text-blue-600 flex items-center space-x-1">
                                                <Users className="h-3 w-3" />
                                                <span>{selectedTable.capacity} seats</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedTable(null)}
                                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-1.5 rounded-full transition-colors"
                                        title="Deselect table"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Selected Tables Info (Multiple) - Chỉ hiển thị khi Dine-in */}
                        {orderMode === 'dine-in' && selectedTables.length > 0 && (
                            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                            <Users className="h-4 w-4 text-green-600" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-green-800">
                                                {selectedTables.length} tables selected
                                            </div>
                                            <div className="text-xs text-green-600 truncate">
                                                {selectedTables.map(t => t.label).join(', ')}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={clearTableSelection}
                                        className="text-green-600 hover:text-green-800 hover:bg-green-100 p-1.5 rounded-full transition-colors"
                                        title="Deselect all"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedTables.map((table) => (
                                        <div key={table.tableId} className="flex items-center space-x-1 bg-white px-2 py-1 rounded border border-green-200">
                                            <span className="text-xs text-green-700">Table {table.label}</span>
                                            <button
                                                onClick={() => setSelectedTables(selectedTables.filter(t => t.tableId !== table.tableId))}
                                                className="text-green-600 hover:text-green-800"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Discount Section - Only show when not takeaway mode */}
                        {orderMode !== 'takeaway' && (
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <Tag className="h-4 w-4 text-gray-600" />
                                    <span className="text-sm font-medium text-gray-700">Discount Code</span>
                                </div>

                                {!appliedDiscount ? (
                                    <div className="space-y-2">
                                        {loadingDiscounts ? (
                                            <div className="text-center text-gray-500 py-3">
                                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent mx-auto mb-2"></div>
                                                <div className="text-xs">Loading discounts...</div>
                                            </div>
                                        ) : availableDiscounts.length === 0 ? (
                                            <div className="text-center text-gray-500 py-3">
                                                <Tag className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                                                <div className="text-xs">No discounts available</div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <select
                                                    value={selectedDiscount?.discountId || ''}
                                                    onChange={(e) => {
                                                        const discountId = parseInt(e.target.value);
                                                        const discount = availableDiscounts.find(d => d.discountId === discountId);
                                                        setSelectedDiscount(discount || null);
                                                    }}
                                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="">Select discount code...</option>
                                                    {availableDiscounts.map((discount) => (
                                                        <option key={discount.discountId} value={discount.discountId}>
                                                            {discount.name} ({discount.code}) - {discount.discountType === 'PERCENT'
                                                                ? `${discount.discountValue}% off`
                                                                : `${formatCurrency(discount.discountValue)} off`}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => selectedDiscount && applyDiscount(selectedDiscount)}
                                                    disabled={!selectedDiscount || discountLoading}
                                                    className="w-full px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                                                >
                                                    {discountLoading ? 'Applying...' : 'Apply Discount'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                                                <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-xs font-medium text-green-800 truncate">
                                                        {appliedDiscount.discountName}
                                                    </div>
                                                    <div className="text-xs text-green-600 truncate">
                                                        {selectedDiscount?.code} - {appliedDiscount.discountType === 'PERCENT'
                                                            ? `${appliedDiscount.discountValue}% off`
                                                            : `${formatCurrency(appliedDiscount.discountValue)} off`}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={removeDiscount}
                                                className="text-green-600 hover:text-green-800 p-1 flex-shrink-0"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {discountError && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                                        <div className="text-xs text-red-600">{discountError}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Cart Items - Always visible with proper spacing */}
                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                    {cart.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>Cart is empty</p>
                            <p className="text-sm">Select products to add to cart</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cart.map((item) => (
                                <div key={`${item.product.productId}-${item.productDetail.pdId}`} className="bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <h4 className="font-medium text-gray-800 text-sm line-clamp-1">
                                                {item.product.name}
                                            </h4>
                                            <span className="text-xs text-gray-500">
                                                {item.productDetail.size?.name ? `Size: ${item.productDetail.size.name}` : ''}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(item.product.productId, item.productDetail.pdId)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => updateQuantity(item.product.productId, item.productDetail.pdId, item.quantity - 1)}
                                                className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                                            >
                                                <Minus className="h-3 w-3" />
                                            </button>
                                            <span className="text-sm font-medium w-8 text-center">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => updateQuantity(item.product.productId, item.productDetail.pdId, item.quantity + 1)}
                                                className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </button>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-800">
                                            {formatCurrency(item.productDetail.price * item.quantity)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Checkout - Fixed at bottom */}
                <div className="border-t border-gray-200 p-4 flex-shrink-0 bg-white">
                    <div className="space-y-3">
                        {/* Subtotal */}
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Subtotal:</span>
                            <span className="text-sm text-gray-600">
                                {formatCurrency(getTotalAmount())}
                            </span>
                        </div>

                        {/* Discount */}
                        {appliedDiscount && appliedDiscount.isValid && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-green-600">Discount ({appliedDiscount.discountName}):</span>
                                <span className="text-sm text-green-600">
                                    -{formatCurrency(appliedDiscount.discountAmount)}
                                </span>
                            </div>
                        )}

                        {/* Total */}
                        <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                            <span className="text-lg font-semibold text-gray-800">Total:</span>
                            <span className="text-xl font-bold text-amber-600">
                                {formatCurrency(getFinalAmount())}
                            </span>
                        </div>

                        <button
                            onClick={() => setShowPaymentModal(true)}
                            disabled={cart.length === 0 || processing}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                        >
                            {processing ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <CreditCard className="h-4 w-4" />
                                    <span>Checkout</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <X className="h-5 w-5 text-gray-600" />
                            </button>
                            <h3 className="text-lg font-semibold text-gray-800">Payment</h3>
                            <div className="w-9"></div> {/* Spacer for centering */}
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto">
                            {/* Order Info */}
                            <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
                                <span>Order #{Date.now().toString().slice(-4)}</span>
                                <span>{new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            {/* Order Summary */}
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">Order Total:</span>
                                    <span className="font-medium">{formatCurrency(getTotalAmount())}</span>
                                </div>

                                {appliedDiscount && appliedDiscount.isValid && (
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-gray-700">Discount:</span>
                                            <span className="text-xs">🎁</span>
                                        </div>
                                        <span className="font-medium text-green-600">-{formatCurrency(appliedDiscount.discountAmount)}</span>
                                    </div>
                                )}

                                <div className="border-t border-gray-200 pt-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-lg font-semibold text-blue-600">Amount Due:</span>
                                        <span className="text-xl font-bold text-blue-600">{formatCurrency(getFinalAmount())}</span>
                                    </div>

                                    {paymentMethod === 'CASH' && receivedAmount > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-lg font-semibold text-blue-600">Amount Received:</span>
                                            <span className="text-xl font-bold text-blue-600">{formatCurrency(receivedAmount)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Payment Methods */}
                            <div className="mb-6">
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Payment Method</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { value: 'CASH', label: 'Cash', icon: '💵' },
                                        { value: 'CARD', label: 'Card', icon: '💳' },
                                        { value: 'TRANSFER', label: 'Transfer', icon: '📱' }
                                    ].map((method) => (
                                        <button
                                            key={method.value}
                                            onClick={() => setPaymentMethod(method.value as any)}
                                            className={`p-3 rounded-lg border text-xs font-medium transition-colors ${paymentMethod === method.value
                                                ? 'bg-blue-100 border-blue-300 text-blue-800'
                                                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                                                }`}
                                        >
                                            <div className="text-lg mb-1">{method.icon}</div>
                                            <div>{method.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>


                            {/* Cash Input */}
                            {paymentMethod === 'CASH' && (
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Amount Received
                                    </label>
                                    <input
                                        type="number"
                                        value={receivedAmount || ''}
                                        onChange={(e) => setReceivedAmount(Number(e.target.value))}
                                        placeholder="Enter amount received"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />

                                    {receivedAmount > 0 && (
                                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">Change:</span>
                                                <span className={`text-lg font-semibold ${getChangeAmount() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatCurrency(getChangeAmount())}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Card Payment */}
                            {paymentMethod === 'CARD' && (
                                <div className="mb-6">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <span className="text-2xl">💳</span>
                                            </div>
                                            <h4 className="font-semibold text-blue-800 mb-2">Card Payment</h4>
                                            <p className="text-sm text-blue-600 mb-4">
                                                Swipe or tap card on POS terminal
                                            </p>
                                            <div className="bg-white rounded-lg p-3 border border-blue-200">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm text-gray-600">Amount:</span>
                                                    <span className="font-semibold text-blue-800">{formatCurrency(getFinalAmount())}</span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Waiting for payment...
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Transfer Payment */}
                            {paymentMethod === 'TRANSFER' && (
                                <div className="mb-6">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <span className="text-2xl">📱</span>
                                            </div>
                                            <h4 className="font-semibold text-green-800 mb-2">Bank Transfer</h4>
                                            <p className="text-sm text-green-600 mb-4">
                                                Scan QR code to pay
                                            </p>

                                            {/* QR Code Mock */}
                                            <div className="bg-white rounded-lg p-4 border border-green-200 mb-4">
                                                <div className="w-32 h-32 bg-gray-100 rounded-lg mx-auto mb-3 flex items-center justify-center overflow-hidden">
                                                    <img
                                                        src="/images/momo.png"
                                                        alt="Momo QR Code"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="text-xs text-gray-600 mb-2">Momo QR Code</div>
                                                <div className="text-sm font-medium text-green-800 mb-1">
                                                    {formatCurrency(getFinalAmount())}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Scan code to pay via Momo
                                                </div>
                                            </div>

                                            <div className="bg-white rounded-lg p-3 border border-green-200">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm text-gray-600">Amount:</span>
                                                    <span className="font-semibold text-green-800">{formatCurrency(getFinalAmount())}</span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Waiting for transfer confirmation...
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex space-x-3 mt-6">
                                <button
                                    onClick={handlePrintReceipt}
                                    disabled={cart.length === 0}
                                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span>🖨️</span>
                                    <span>Print Receipt</span>
                                </button>
                                <button
                                    onClick={handleCheckout}
                                    disabled={processing || (paymentMethod === 'CASH' && receivedAmount < getFinalAmount())}
                                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span>💰</span>
                                    <span>Pay</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Merge Tables Modal */}
            {showMergeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <button
                                onClick={() => setShowMergeModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <X className="h-5 w-5 text-gray-600" />
                            </button>
                            <h3 className="text-lg font-semibold text-gray-800">Merge Tables</h3>
                            <div className="w-9"></div>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto">
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-4">
                                    Select multiple tables to create a shared order for a group
                                </p>

                                {selectedTables.length > 0 && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <Users className="h-5 w-5 text-green-600" />
                                                <span className="font-medium text-green-800">
                                                    {selectedTables.length} tables selected
                                                </span>
                                            </div>
                                            <button
                                                onClick={clearTableSelection}
                                                className="text-green-600 hover:text-green-800"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {selectedTables.map((table) => (
                                                <span key={table.tableId} className="bg-white px-2 py-1 rounded text-sm text-green-700 border border-green-200">
                                                    Table {table.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Tables Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {tables.filter(t => t.status.toLowerCase() === 'available').map((table) => (
                                    <div
                                        key={table.tableId}
                                        className={`p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer hover:shadow-lg hover:scale-105 ${selectedTables.find(t => t.tableId === table.tableId)
                                            ? 'border-green-500 bg-green-50 shadow-lg scale-105'
                                            : 'border-gray-200 bg-white hover:border-green-300'
                                            }`}
                                        onClick={() => toggleTableSelection(table)}
                                    >
                                        <div className="text-center">
                                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <TableIcon className="h-6 w-6 text-green-600" />
                                            </div>
                                            <div className="text-lg font-bold text-gray-800 mb-2">
                                                {table.label}
                                            </div>
                                            <div className="text-sm text-gray-600 flex items-center justify-center space-x-1">
                                                <Users className="h-4 w-4" />
                                                <span>{table.capacity} seats</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex space-x-3 mt-6">
                                <button
                                    onClick={() => setShowMergeModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setShowMergeModal(false);
                                        setSelectedTable(null);
                                    }}
                                    disabled={selectedTables.length === 0}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Confirm ({selectedTables.length} tables)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Notification */}
            {orderSuccess && (
                <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5" />
                    <div>
                        <div>Order created successfully!</div>
                        <div className="text-xs opacity-90">Receipt will be printed automatically</div>
                    </div>
                </div>
            )}
        </div>
        <UsageFloatingWidget />
        </>
    );
}
