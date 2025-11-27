import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CatalogProduct, CatalogProductDetail } from '../../types';
import { Table } from '../../types/table';
import { DiscountApplicationResponse, Discount } from '../../types/discount';
import catalogService from '../../services/catalogService';
import { posService, tableService } from '../../services';
import discountService from '../../services/discountService';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { UsageFloatingWidget } from '../../components/stock/UsageFloatingWidget';
import { useNavigate } from 'react-router-dom';
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
    ArrowLeft
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
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
    const [receivedAmount, setReceivedAmount] = useState<number>(0);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [leftPanelTab, setLeftPanelTab] = useState<'products' | 'tables'>('products');
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
            } else {
                setDiscountError(response.message);
                setAppliedDiscount(null);
                setSelectedDiscount(null);
            }
        } catch (error) {
            console.error('Failed to apply discount:', error);
            setDiscountError('Unable to apply discount code');
            setAppliedDiscount(null);
            setSelectedDiscount(null);
        } finally {
            setDiscountLoading(false);
        }
    };

    const removeDiscount = () => {
        setAppliedDiscount(null);
        setSelectedDiscount(null);
        setDiscountError(null);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        if (!selectedTable && selectedTables.length === 0) {
            alert('Please select a table');
            return;
        }
        if (!branchId || !user?.user_id) {
            alert('Missing branch or staff information');
            return;
        }

        // Check if user has STAFF role
        if (user?.role !== 'staff') {
            alert('You need to login with a staff account to use POS');
            return;
        }


        setProcessing(true);
        try {
            const orderData = {
                staffId: Number(user.user_id),
                branchId: branchId,
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

            // Reset form
            setCart([]);
            setSelectedTable(null);
            setSelectedTables([]);
            setAppliedDiscount(null);
            setSelectedDiscount(null);
            setDiscountError(null);
            setShowPaymentModal(false);
            setOrderSuccess(true);

            // Auto print receipt after successful order
            setTimeout(() => {
                printReceipt();
            }, 1000);

            setTimeout(() => setOrderSuccess(false), 3000);
        } catch (error) {
            console.error('Failed to create order:', error);
            alert('Error occurred while creating order');
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

    return (
        <>
        <div className="h-screen bg-gray-50 flex">
            {/* Left Panel - Products */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate('/staff/orders')}
                                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                                title="Go back to the orders screen"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span className="text-sm font-medium">Back</span>
                            </button>
                            <h1 className="text-2xl font-bold text-gray-800">POS - In-Store Orders</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <NotificationBell />
                            <div className="text-sm text-gray-600">
                                Staff: {user?.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-600">
                                Branch: {user?.branch?.name || 'Unknown'}
                            </div>
                        </div>
                    </div>

                    {/* Tab Navigation */}
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
                            <div className="flex items-center justify-center h-64">
                                <div className="text-gray-500">Loading products...</div>
                            </div>
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
                                                    src={product.imageUrl.startsWith('http') ? product.imageUrl : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/catalogs${product.imageUrl}`}
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
                                    <div className="flex items-center justify-center h-32">
                                        <div className="text-gray-500">Loading tables...</div>
                                    </div>
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
                                            <button
                                                onClick={() => {
                                                    // Add logic to create order for this table
                                                    console.log('Creating order for table:', selectedTable);
                                                }}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                                            >
                                                Create Order
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Cart & Checkout */}
            <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
                {/* Cart Header */}
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-2 mb-4">
                        <ShoppingCart className="h-5 w-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-800">Shopping Cart</h2>
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            {cart.length}
                        </span>
                    </div>

                    {/* Selected Table Info */}
                    {selectedTable && (
                        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                        <TableIcon className="h-5 w-5 text-blue-600" />
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
                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-2 rounded-full transition-colors"
                                    title="Deselect table"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Selected Tables Info (Multiple) */}
                    {selectedTables.length > 0 && (
                        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                        <Users className="h-4 w-4 text-green-600" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-green-800">
                                            {selectedTables.length} tables selected
                                        </div>
                                        <div className="text-xs text-green-600">
                                            {selectedTables.map(t => t.label).join(', ')}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={clearTableSelection}
                                    className="text-green-600 hover:text-green-800 hover:bg-green-100 p-2 rounded-full transition-colors"
                                    title="Deselect all"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
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

                    {/* Discount Section */}
                    <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                            <Tag className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-700">Discount Code</span>
                        </div>

                        {!appliedDiscount ? (
                            <div className="space-y-2">
                                {loadingDiscounts ? (
                                    <div className="text-center text-gray-500 py-4">
                                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mx-auto mb-2"></div>
                                        <div className="text-sm">Loading discounts...</div>
                                    </div>
                                ) : availableDiscounts.length === 0 ? (
                                    <div className="text-center text-gray-500 py-4">
                                        <Tag className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                        <div className="text-sm">No discounts available</div>
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
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                        >
                                            {discountLoading ? 'Applying...' : 'Apply Discount'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <div>
                                            <div className="text-sm font-medium text-green-800">
                                                {appliedDiscount.discountName}
                                            </div>
                                            <div className="text-xs text-green-600">
                                                {selectedDiscount?.code} - {appliedDiscount.discountType === 'PERCENT'
                                                    ? `${appliedDiscount.discountValue}% off`
                                                    : `${formatCurrency(appliedDiscount.discountValue)} off`}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={removeDiscount}
                                        className="text-green-600 hover:text-green-800 p-1"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {discountError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <div className="text-sm text-red-600">{discountError}</div>
                            </div>
                        )}
                    </div>

                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4">
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

                {/* Checkout */}
                <div className="border-t border-gray-200 p-4">
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

                                    {paymentMethod === 'cash' && receivedAmount > 0 && (
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
                                        { value: 'cash', label: 'Cash', icon: '💵' },
                                        { value: 'card', label: 'Card', icon: '💳' },
                                        { value: 'transfer', label: 'Transfer', icon: '📱' }
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
                            {paymentMethod === 'cash' && (
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
                            {paymentMethod === 'card' && (
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
                            {paymentMethod === 'transfer' && (
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
                                    disabled={processing || (paymentMethod === 'cash' && receivedAmount < getFinalAmount())}
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
