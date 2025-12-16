import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cartService } from '../../services/cartService';
import { orderService } from '../../services/orderService';
import { emailService } from '../../services/emailService';
import { addressService } from '../../services/addressService';
import { authService } from '../../services/authService';
import { discountService } from '../../services/discountService';
import { branchService } from '../../services/branchService';
import { stockService } from '../../services/stockService';
import BranchSuggestionModal from '../common/BranchSuggestionModal';
import BranchSettings from '../common/BranchSettings';
import MomoPaymentPage from './MomoPaymentPage';
import { getCurrentUserSession, getCurrentUserSessionAsync, createGuestSession } from '../../utils/userSession';
import axios from 'axios';
import { showToast } from '../../utils/toast';

const CheckoutPage = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        selectedAddressId: '',
        paymentMethod: 'CASH',
        notes: ''
    });

    const [addresses, setAddresses] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showMomoPayment, setShowMomoPayment] = useState(false);
    const [orderInfo, setOrderInfo] = useState(null);
    const [discountCode, setDiscountCode] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState(null);
    const [discountError, setDiscountError] = useState(null);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [showBranchSuggestion, setShowBranchSuggestion] = useState(false);
    const [availableBranches, setAvailableBranches] = useState([]);
    const [originalBranch, setOriginalBranch] = useState(null);
    const [isCheckingStock, setIsCheckingStock] = useState(false);
    const [maxBranchesToCheck, setMaxBranchesToCheck] = useState(5); // Có thể thay đổi số lượng chi nhánh
    const [showBranchSettings, setShowBranchSettings] = useState(false);
    const [branchStockStatus, setBranchStockStatus] = useState(null); // Trạng thái stock của chi nhánh

    // Fetch user info, addresses and cart items on mount
    useEffect(() => {
        loadUserInfo();
        loadAddresses();
        fetchCartItems();
    }, []);

    const loadUserInfo = async () => {
        try {
            const user = localStorage.getItem('user');
            if (user) {
                const userData = JSON.parse(user);
                const userId = userData.userId;

                if (userId) {
                    try {
                        // Gọi API để lấy thông tin user chi tiết
                        const userInfo = await authService.getUserById(userId);
                        const userDetails = userInfo.result || userInfo;

                        setFormData(prev => ({
                            ...prev,
                            name: userDetails.fullname || userDetails.name || userDetails.username || userData.name || userData.username || '',
                            phone: userDetails.phoneNumber || userDetails.phone || userData.phone || '',
                            email: userDetails.email || userData.email || ''
                        }));
                    } catch (apiError) {
                        console.error('Error fetching user details from API:', apiError);
                        // Fallback to localStorage data if API fails
                        setFormData(prev => ({
                            ...prev,
                            name: userData.name || userData.username || '',
                            phone: userData.phone || '',
                            email: userData.email || ''
                        }));
                    }
                } else {
                    // Fallback to localStorage data if no userId
                    setFormData(prev => ({
                        ...prev,
                        name: userData.name || userData.username || '',
                        phone: userData.phone || '',
                        email: userData.email || ''
                    }));
                }
            }
        } catch (error) {
            console.error('Error loading user info:', error);
        }
    };

    const loadAddresses = async () => {
        try {
            setLoading(true);
            const data = await addressService.getCustomerAddresses();
            setAddresses(data || []);
        } catch (error) {
            console.error('Error loading addresses:', error);
            setAddresses([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchCartItems = async () => {
        try {
            const items = await cartService.getCartItems();
            setCartItems(items || []);
        } catch (error) {
            console.error('Error fetching cart items:', error);
            setCartItems([]);
        }
    };

    const handleApplyDiscount = async () => {
        // Check if address is selected
        if (!formData.selectedAddressId) {
            showToast('Please select a delivery address before applying discount', 'warning');
            return;
        }

        if (!discountCode.trim()) {
            showToast('Please enter a discount code', 'warning');
            return;
        }

        try {
            setDiscountError(null);

            // Step 1: Find nearest branch based on selected address
            const selectedAddress = addresses.find(addr => addr.addressId.toString() === formData.selectedAddressId);
            if (!selectedAddress) {
                showToast('Please select a valid address', 'error');
                return;
            }

            const branchResult = await branchService.findNearestBranch(selectedAddress.fullAddress);

            if (!branchResult.success) {
                showToast('Failed to find nearest branch. Please check your address.', 'error');
                return;
            }

            setSelectedBranch(branchResult.branch);

            // Step 2: Validate discount with branch ID
            const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            const result = await discountService.validateDiscount(discountCode, cartTotal, branchResult.branch.branchId);

            if (result.result && result.result.isValid) {
                const discountData = result.result;

                const appliedDiscountData = {
                    code: discountData.discountCode,
                    name: discountData.discountName,
                    amount: Number(discountData.discountAmount),
                    type: discountData.discountType,
                    originalAmount: Number(discountData.originalAmount),
                    finalAmount: Number(discountData.finalAmount),
                    branchId: branchResult.branch.branchId,
                    branchName: branchResult.branch.name
                };

                setAppliedDiscount(appliedDiscountData);
                showToast(`Applied code ${appliedDiscountData.code} successfully`, 'success');
            } else {
                const errorMessage = result.result?.message || result.message || 'Invalid discount code for this branch';
                setDiscountError(errorMessage);
                showToast(errorMessage, 'error');
            }
        } catch (error) {
            setDiscountError('Failed to apply discount. Please try again.');
            showToast('Failed to apply discount. Please try again.', 'error');
        }
    };

    const handleRemoveDiscount = async () => {
        try {
            // Remove discount from frontend state
            setAppliedDiscount(null);
            setDiscountCode('');
            setDiscountError(null);
            showToast('Discount removed', 'info');

            // Optional: Call service for logging/cleanup
            await discountService.removeDiscount();
        } catch (error) {
            console.error('Error removing discount:', error);
            // Even if service call fails, still remove from UI
            setAppliedDiscount(null);
            setDiscountCode('');
            setDiscountError(null);
            showToast('Discount removed', 'info');
        }
    };


    const onChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Tìm chi nhánh khác có hàng khi chi nhánh gần nhất hết hàng
    const findAlternativeBranchWithStock = async (deliveryAddress, currentBranchId, cartItems, userSession) => {
        try {
            
            // Tìm các chi nhánh khác gần địa chỉ
            const branchesResult = await branchService.findTopNearestBranches(deliveryAddress, 10);
            if (!branchesResult.success || branchesResult.branches.length === 0) {
                setBranchStockStatus({ available: false, message: 'Không tìm thấy chi nhánh nào khác gần địa chỉ này' });
                return;
            }
            
            const allBranches = branchesResult.branches;
            // Loại bỏ chi nhánh hiện tại
            const otherBranches = allBranches.filter(branch => branch.branchId !== currentBranchId);
            
            // Kiểm tra stock cho các chi nhánh khác
            const stockResults = await stockService.checkStockForMultipleBranches(cartItems, otherBranches, userSession);
            
            
            const availableBranches = stockResults.filter(result => result.available);
            
            if (availableBranches.length > 0) {
                // Tìm thấy chi nhánh khác có hàng, tự động chọn chi nhánh gần nhất
                const nearestAvailableBranch = availableBranches[0].branch;
                
                setSelectedBranch(nearestAvailableBranch);
                setBranchStockStatus({ 
                    available: true, 
                    message: `Đã tự động chọn chi nhánh khác: ${nearestAvailableBranch.name}` 
                });
            } else {
                setBranchStockStatus({ 
                    available: false, 
                    message: 'Tất cả chi nhánh gần đây đều hết hàng' 
                });
            }
        } catch (error) {
            console.error('Lỗi khi tìm chi nhánh khác:', error);
            setBranchStockStatus({ 
                available: false, 
                message: 'Lỗi khi tìm chi nhánh khác' 
            });
        }
    };

    const handleAddressChange = async (e) => {
        const addressId = e.target.value;
        setFormData((prev) => ({
            ...prev,
            selectedAddressId: addressId
        }));

        // Xóa reservations cũ khi chọn địa chỉ mới
        if (addressId) {
            try {
                let userSession = await getCurrentUserSessionAsync();
                if (!userSession) {
                    // Tạo guest session mới chỉ khi chưa có
                    userSession = createGuestSession();
                }
                
                const clearResult = await stockService.clearAllReservations(userSession);
                if (clearResult.success) {
                    showToast('Đã xóa reservations cũ, đang tìm chi nhánh mới...', 'info');
                }
            } catch (error) {
                console.error('Lỗi khi xóa reservations cũ:', error);
            }
        }

        // Tự động tìm chi nhánh gần nhất khi chọn địa chỉ
        if (addressId) {
            try {
                const selectedAddress = addresses.find(addr => addr.addressId.toString() === addressId);
                if (selectedAddress) {
                    
                    const branchResult = await branchService.findNearestBranch(selectedAddress.fullAddress);
                    
                    if (branchResult.success && branchResult.branch) {
                        setSelectedBranch(branchResult.branch);
                        
                        // Kiểm tra stock của chi nhánh này
                        try {
                            let userSession = await getCurrentUserSessionAsync();
                if (!userSession) {
                    // Tạo guest session mới chỉ khi chưa có
                    userSession = createGuestSession();
                }
                            const stockResult = await stockService.checkStockAvailability(cartItems, branchResult.branch.branchId, userSession);
                            
                            if (stockResult.success && stockResult.available) {
                                setBranchStockStatus({ available: true, message: 'Chi nhánh có đủ hàng' });
                                showToast('Chi nhánh có đủ hàng, có thể đặt hàng', 'success');
                            } else {
                                setBranchStockStatus({ available: false, message: 'Chi nhánh hết hàng, đang tìm chi nhánh khác...' });
                                showToast('Chi nhánh gần nhất hết hàng, đang tìm chi nhánh khác...', 'warning');
                                
                                // Tự động tìm chi nhánh khác có hàng
                                await findAlternativeBranchWithStock(selectedAddress.fullAddress, branchResult.branch.branchId, cartItems, userSession);
                            }
                        } catch (error) {
                            console.error('Lỗi khi kiểm tra stock:', error);
                            showToast('Lỗi khi kiểm tra tồn kho', 'error');
                        }
                    } else {
                        setSelectedBranch(null);
                        showToast('Không tìm thấy chi nhánh gần địa chỉ này', 'error');
                    }
                }
            } catch (error) {
                console.error('Error finding nearest branch:', error);
                setSelectedBranch(null);
                showToast('Lỗi khi tìm chi nhánh', 'error');
            }
        } else {
            setSelectedBranch(null);
            setBranchStockStatus(null);
        }

        // Reset discount when address changes
        if (appliedDiscount) {
            setAppliedDiscount(null);
            setDiscountCode('');
            setDiscountError(null);
            setSelectedBranch(null);
            showToast('Discount removed due to address change. Please reapply discount.', 'info');
        }
    };

    const validateRequired = () => {
        const { name, phone, email, selectedAddressId } = formData;
        return (
            name.trim() !== '' &&
            phone.trim() !== '' &&
            email.trim() !== '' &&
            selectedAddressId.trim() !== ''
        );
    };

    const proceedWithOrder = async () => {
        try {
            setSubmitting(true);
            setIsCheckingStock(true);
            
            // Fetch cart to build order items và lấy cartId
            const cartData = await cartService.getCartWithId();
            const cartItems = cartData.cartItems;
            if (!cartItems || cartItems.length === 0) {
                showToast('Your cart is empty. Please add items before checkout.', 'warning');
                return;
            }
            

            const user = localStorage.getItem('user');
            const customerId = user ? JSON.parse(user).userId : null;

            // Get selected address
            const selectedAddress = addresses.find(addr => addr.addressId.toString() === formData.selectedAddressId);
            if (!selectedAddress) {
                showToast('Please select a valid address.', 'warning');
                return;
            }

            const fullDeliveryAddress = selectedAddress.fullAddress;

            // Extract district and province from full address for branch selection
            const addressParts = fullDeliveryAddress.split(', ');
            const deliveryAddress = addressParts.length >= 2
                ? addressParts.slice(-2).join(', ')
                : fullDeliveryAddress;

            // Kiểm tra đã có chi nhánh được chọn chưa
            if (!selectedBranch) {
                showToast('Vui lòng chọn địa chỉ giao hàng để hệ thống tự động chọn chi nhánh gần nhất.', 'warning');
                return;
            }

            // Chi nhánh đã được kiểm tra và chọn khi chọn địa chỉ

            // Lấy cartId và guestId
            // Ưu tiên lấy cartId từ response của getCart API
            let cartId = cartData.cartId;
            
            // Nếu chưa có cartId, thử lấy từ localStorage hoặc userSession
            if (!cartId) {
                const userSession = await getCurrentUserSessionAsync();
                cartId = userSession?.cartId || localStorage.getItem('cartId');
                if (cartId) {
                    cartId = parseInt(cartId);
                }
            }
            
            // Lấy guestId từ localStorage (luôn có, kể cả khi đã đăng nhập)
            const guestId = localStorage.getItem('guestId') || null;

            const payload = {
                customerId: customerId,
                customerName: formData.name,
                phone: formData.phone,
                deliveryAddress: fullDeliveryAddress, // Lưu đầy đủ địa chỉ vào DB
                branchSelectionAddress: deliveryAddress, // Chỉ dùng để tìm chi nhánh
                branchId: selectedBranch.branchId, // Sử dụng chi nhánh đã chọn
                paymentMethod: formData.paymentMethod,
                discount: appliedDiscount ? appliedDiscount.amount : 0,
                discountCode: appliedDiscount ? appliedDiscount.code : null,
                cartId: cartId, // Thêm cartId để liên kết với reservations
                guestId: guestId, // Thêm guestId để liên kết với reservations
                orderItems: cartItems.map(it => ({
                    productId: it.productId,
                    productDetailId: it.productDetailId,
                    quantity: it.quantity
                })),
                notes: formData.notes
            };


            const orderResult = await orderService.createOrder(payload);
            try { await cartService.clearCart(); } catch (_) { }

            // Send order confirmation email (best-effort, non-blocking)
            try {
                const emailData = {
                    email: formData.email,
                    customerName: formData.name,
                    orderId: orderResult?.orderId || 'N/A',
                    orderItems: cartItems,
                    totalAmount: cartItems.reduce((total, item) => total + (item.price * item.quantity), 0),
                    deliveryAddress: fullDeliveryAddress,
                    paymentMethod: formData.paymentMethod,
                    orderDate: new Date().toLocaleString('vi-VN')
                };
                await emailService.sendOrderConfirmation(emailData);
            } catch (emailError) {
                console.error('Failed to send confirmation email:', emailError);
                // Don't fail the order if email fails
            }

            showToast('Order placed successfully!', 'success');
            window.dispatchEvent(new Event('cartUpdated'));
            navigate('/coffee');
        } catch (error) {
            console.error('Order creation failed:', error);
            const errorMsg = error?.response?.data?.message || error.message || 'Failed to place order';
            showToast('Order failed: ' + errorMsg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const onSubmit = async (e) => {
        e.preventDefault();

        // Check authentication first
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('Please login before placing an order.', 'warning');
            navigate('/coffee/login');
            return;
        }

        if (!validateRequired()) {
            showToast('Please fill all the details !!', 'warning');
            return;
        }

        // Check if Momo payment is selected
        if (formData.paymentMethod === 'CARD') {
            // Prepare order info for Momo payment with VAT and discount
            const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
            const vat = subtotal * 0.1; // 10% VAT
            const discountedSubtotal = appliedDiscount ? appliedDiscount.finalAmount : subtotal;
            const totalAmount = discountedSubtotal + vat;
            const orderId = `ORD${Date.now()}`;

            setOrderInfo({
                orderId: orderId,
                description: `Coffee Order - ${formData.name}`,
                totalAmount: totalAmount,
                customerName: formData.name,
                phone: formData.phone,
                email: formData.email
            });

            setShowMomoPayment(true);
            return;
        }

        // For cash payment, proceed directly
        await proceedWithOrder();
    };

    // Handle Momo payment success
    const handleMomoPaymentSuccess = () => {
        setShowMomoPayment(false);
        proceedWithOrder();
    };

    // Handle Momo payment failure
    const handleMomoPaymentFailure = () => {
        setShowMomoPayment(false);
        showToast('Payment failed. Please try again.', 'error');
    };

    // Handle go back from Momo payment
    const handleMomoGoBack = () => {
        setShowMomoPayment(false);
        setOrderInfo(null);
    };

    // Handle branch selection from suggestion modal
    const handleBranchSelection = (selectedBranch) => {
        setSelectedBranch(selectedBranch);
        setShowBranchSuggestion(false);
        setAvailableBranches([]);
        setOriginalBranch(null);
        
        // Tiếp tục với order với chi nhánh mới
        proceedWithOrder();
    };

    // Handle close branch suggestion modal
    const handleCloseBranchSuggestion = async () => {
        setShowBranchSuggestion(false);
        setAvailableBranches([]);
        setOriginalBranch(null);
        setIsCheckingStock(false);
        setSubmitting(false);
        
        // Xóa giỏ hàng và chuyển về trang chủ khi hủy
        try {
            await cartService.clearCart();
        } catch (error) {
            console.error('Lỗi khi xóa giỏ hàng:', error);
        }
        
        // Chuyển về trang chủ
        navigate('/coffee');
    };

    // Handle branch settings
    const handleMaxBranchesChange = (newValue) => {
        setMaxBranchesToCheck(newValue);
    };

    const handleToggleBranchSettings = () => {
        setShowBranchSettings(!showBranchSettings);
    };

    // Show Momo payment page if selected
    if (showMomoPayment && orderInfo) {
        return (
            <MomoPaymentPage
                orderInfo={orderInfo}
                onPaymentSuccess={handleMomoPaymentSuccess}
                onPaymentFailure={handleMomoPaymentFailure}
                onGoBack={handleMomoGoBack}
            />
        );
    }

    return (
        <>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #000;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #333;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #555;
                }
            `}</style>
            {/* Hero Section to mirror checkout.php */}
            <section className="home-slider owl-carousel">
                <div className="slider-item" style={{ backgroundImage: 'url(/images/bg_3.jpg)' }} data-stellar-background-ratio="0.5">
                    <div className="overlay"></div>
                    <div className="container">
                        <div className="row slider-text justify-content-center align-items-center">
                            <div className="col-md-7 col-sm-12 text-center ftco-animate">
                                <h1 className="mb-3 mt-5 bread">Checkout</h1>
                                <p className="breadcrumbs">
                                    <span className="mr-2"><Link to="/coffee">Home</Link></span>
                                    <span>Checkout</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Billing Form Section */}
            <section className="ftco-section">
                <div className="container">
                    <div className="row">
                        {/* Left Column - Billing Form */}
                        <div className="col-md-8 ftco-animate">
                            <form onSubmit={onSubmit} className="billing-form ftco-bg-dark p-3 p-md-5">
                                <h3 className="mb-4 billing-heading">Billing Details</h3>
                                <div className="row align-items-end">
                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label htmlFor="name">Full Name *</label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={formData.name}
                                                onChange={onChange}
                                                className="form-control"
                                                placeholder="Enter your full name"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="w-100"></div>

                                    <div className="col-md-6">
                                        <div className="form-group">
                                            <label htmlFor="phone">Phone *</label>
                                            <input
                                                type="text"
                                                id="phone"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={onChange}
                                                className="form-control"
                                                placeholder="Enter your phone number"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="form-group">
                                            <label htmlFor="email">Email Address *</label>
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={onChange}
                                                className="form-control"
                                                placeholder="Enter your email"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="w-100"></div>

                                    {/* Address Selection */}
                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label htmlFor="address">Delivery Address *</label>
                                            {loading ? (
                                                <div className="text-center py-3">
                                                    <div className="spinner-border spinner-border-sm" role="status">
                                                        <span className="sr-only">Loading...</span>
                                                    </div>
                                                    <span className="ml-2">Loading addresses...</span>
                                                </div>
                                            ) : addresses.length === 0 ? (
                                                <div className="alert alert-warning">
                                                    <strong>No addresses found!</strong>
                                                    <br />
                                                    <Link to="/users/addresses" className="btn btn-sm btn-primary mt-2">
                                                        Add Address
                                                    </Link>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="select-wrap">
                                                        <div className="icon">
                                                            <span className="ion-ios-arrow-down"></span>
                                                        </div>
                                                        <select
                                                            name="selectedAddressId"
                                                            id="address"
                                                            value={formData.selectedAddressId}
                                                            onChange={handleAddressChange}
                                                            className="form-control"
                                                            required
                                                        >
                                                            <option value="">Select Delivery Address</option>
                                                            {addresses.map((address) => (
                                                                <option key={address.addressId} value={address.addressId}>
                                                                    {address.label} - {address.fullAddress}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="mt-2 d-flex justify-content-between align-items-center">
                                                        <small className="text-muted">
                                                            <i className="fa fa-info-circle me-1"></i>
                                                            Sẽ kiểm tra {maxBranchesToCheck} chi nhánh gần nhất
                                                        </small>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-secondary"
                                                            onClick={handleToggleBranchSettings}
                                                            title="Cài đặt tìm kiếm chi nhánh"
                                                        >
                                                            <i className="fa fa-cog me-1"></i>
                                                            Cài đặt
                                                        </button>
                                                    </div>
                                                    
                                                    {/* Hiển thị thông tin chi nhánh và trạng thái stock */}
                                                    {selectedBranch && (
                                                        <div className="mt-3 p-3 border rounded" style={{ backgroundColor: '#2a2a2a', borderColor: '#444' }}>
                                                            <div className="d-flex align-items-center mb-2">
                                                                <i className="fa fa-store me-2" style={{ color: '#C39C5E' }}></i>
                                                                <strong>Chi nhánh phục vụ:</strong>
                                                            </div>
                                                            <div className="mb-2">
                                                                <span className="text-light">{selectedBranch.name}</span>
                                                            </div>
                                                            <div className="mb-2">
                                                                <small className="text-muted">
                                                                    <i className="fa fa-map-marker-alt me-1"></i>
                                                                    {selectedBranch.address}
                                                                </small>
                                                            </div>
                                                            {branchStockStatus && (
                                                                <div className={`alert ${branchStockStatus.available ? 'alert-success' : 'alert-warning'} mb-0 py-2`}>
                                                                    <i className={`fa ${branchStockStatus.available ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-2`}></i>
                                                                    <small>{branchStockStatus.message}</small>
                                                                    {branchStockStatus.available && branchStockStatus.message.includes('tự động chọn') && (
                                                                        <div className="mt-1">
                                                                            <small className="text-success">
                                                                                <i className="fa fa-info-circle me-1"></i>
                                                                                Chi nhánh gần nhất hết hàng, đã tự động chọn chi nhánh khác có hàng
                                                                            </small>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="w-100"></div>

                                    {/* Payment Method */}
                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label htmlFor="payment-method">Payment Method</label>
                                            <select
                                                id="payment-method"
                                                name="paymentMethod"
                                                value={formData.paymentMethod}
                                                onChange={onChange}
                                                className="form-control"
                                            >
                                                <option value="CASH">Cash On Delivery (COD)</option>
                                                <option value="CARD">Momo e-wallet</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="w-100"></div>

                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label htmlFor="notes">Order Notes (Optional)</label>
                                            <textarea
                                                id="notes"
                                                name="notes"
                                                value={formData.notes}
                                                onChange={onChange}
                                                className="form-control"
                                                rows="3"
                                                placeholder="Any special instructions for your order..."
                                            />
                                        </div>
                                    </div>

                                    <div className="w-100"></div>

                                    <div className="col-md-12">
                                        <div className="form-group mt-4">
                                            <div className="radio">
                                                <p>
                                                    <button
                                                        type="submit"
                                                        name="submit"
                                                        id="submit"
                                                        disabled={submitting || !selectedBranch || (branchStockStatus && !branchStockStatus.available)}
                                                        className="btn btn-primary py-3 px-4"
                                                    >
                                                        {submitting ? 'Placing...' : 'Place an order'}
                                                    </button>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Right Column - Order Summary */}
                        <div className="col-md-4 ftco-animate">
                            <div className="order-summary ftco-bg-dark p-4 p-md-5" style={{
                                minHeight: '600px'
                            }}>
                                <h3 className="mb-4 billing-heading">Your Order</h3>

                                {cartItems.length === 0 ? (
                                    <div className="text-center py-4">
                                        <p className="text-muted">Your cart is empty</p>
                                        <Link to="/coffee" className="btn btn-primary">
                                            Continue Shopping
                                        </Link>
                                    </div>
                                ) : (
                                    <>
                                        <div className="order-items custom-scrollbar" style={{
                                            maxHeight: '500px',
                                            overflowY: 'auto',
                                            paddingRight: '10px',
                                            scrollbarWidth: 'thin',
                                            scrollbarColor: '#333 #000'
                                        }}>
                                            {cartItems.map((item, index) => (
                                                <div key={index} className="order-item mb-3 pb-3 border-bottom">
                                                    <div className="d-flex">
                                                        {/* Product Image */}
                                                        <div className="product-image me-3" style={{ minWidth: '60px' }}>
                                                            <img
                                                                src={item.imageUrl || '/images/menu-1.jpg'}
                                                                alt={item.name}
                                                                className="img-fluid"
                                                                style={{
                                                                    width: '60px',
                                                                    height: '60px',
                                                                    objectFit: 'cover',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid #ddd'
                                                                }}
                                                                onError={(e) => {
                                                                    e.target.src = '/images/menu-1.jpg';
                                                                }}
                                                            />
                                                        </div>

                                                        {/* Product Info */}
                                                        <div className="product-info flex-grow-1" style={{ paddingLeft: '10px' }} >
                                                            <h6 className="mb-1 text-primary">{item.name}</h6>
                                                            {item.size && (
                                                                <small className="text-muted d-block mb-1">
                                                                    <i className="fa fa-tag me-1"></i>
                                                                    Size: {item.size}
                                                                </small>
                                                            )}
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <div className="quantity-info">
                                                                    <small className="text-muted">
                                                                        <i className="fa fa-shopping-cart me-1"></i>
                                                                        Qty: {item.quantity}
                                                                    </small>
                                                                </div>
                                                                <div className="item-price">
                                                                    <span className="price fw-bold text-primary">
                                                                        {(item.price * item.quantity).toLocaleString('vi-VN')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Discount Code Section */}
                                        <div className="discount-section mt-4 pt-3 border-top">
                                            <h6 className="mb-3">
                                                <i className="fa fa-tag me-2"></i>
                                                Discount Code
                                            </h6>

                                            {appliedDiscount ? (
                                                <div className="applied-discount">
                                                    <div className="discount-applied-card" style={{
                                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                                        border: '2px solid #C39C5E',
                                                        color: '#ffffff',
                                                        padding: '12px',
                                                        borderRadius: '8px',
                                                        marginBottom: '12px',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                    }}>
                                                        <div className="d-flex align-items-center mb-2">
                                                            <i className="fa fa-check-circle me-2" style={{ color: '#C39C5E' }}></i>
                                                            <strong style={{ color: '#ffffff' }}>Discount Applied</strong>
                                                        </div>
                                                        <div className="discount-code" style={{
                                                            fontSize: '16px',
                                                            fontWeight: '600',
                                                            color: '#ffffff',
                                                            marginBottom: '4px'
                                                        }}>
                                                            {appliedDiscount.code}
                                                        </div>
                                                        <div className="discount-amount" style={{
                                                            fontSize: '14px',
                                                            color: '#ffffff'
                                                        }}>
                                                            You saved: <span style={{ fontWeight: '600', color: '#C39C5E' }}>{appliedDiscount.amount.toLocaleString('vi-VN')} VND</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={handleRemoveDiscount}
                                                        className="btn btn-sm"
                                                        style={{
                                                            backgroundColor: 'transparent',
                                                            color: '#C39C5E',
                                                            border: '1px solid #C39C5E',
                                                            width: '100%',
                                                            borderRadius: '6px',
                                                            padding: '8px 12px',
                                                            fontSize: '14px',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.target.style.backgroundColor = '#C39C5E';
                                                            e.target.style.color = '#ffffff';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.target.style.backgroundColor = 'transparent';
                                                            e.target.style.color = '#C39C5E';
                                                        }}
                                                    >
                                                        <i className="fa fa-times me-1"></i>
                                                        Remove Discount
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="discount-input">
                                                    <div className="input-group mb-2">
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            placeholder="Enter code"
                                                            value={discountCode}
                                                            onChange={(e) => setDiscountCode(e.target.value)}
                                                            disabled={!formData.selectedAddressId}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary btn-sm fw-bold"
                                                            onClick={handleApplyDiscount}
                                                        >
                                                            Apply
                                                        </button>
                                                    </div>
                                                    {/* Toast will show messages instead of inline error */}
                                                </div>
                                            )}
                                        </div>
                                        {/* VAT + Totals */}
                                        <div className="mt-3">
                                            {(() => {
                                                const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
                                                const vat = subtotal * 0.1; // 10% VAT on products subtotal
                                                const discountedSubtotal = appliedDiscount ? appliedDiscount.finalAmount : subtotal;
                                                return (
                                                    <>
                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                            <span className="mb-0" style={{ color: '#ffffff' }}>Subtotal</span>
                                                            <span className="mb-0" style={{ color: '#ffffff' }}>{subtotal.toLocaleString('vi-VN')} VND</span>
                                                        </div>
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <span className="mb-0" style={{ color: '#ffffff' }}>VAT (10%)</span>
                                                            <span className="mb-0" style={{ color: '#ffffff' }}>{vat.toLocaleString('vi-VN')} VND</span>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>

                                        <div className="order-total mt-3 pt-3 border-top">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <h5 className="mb-0" style={{ color: '#C39C5E' }}>Total:</h5>
                                                <h5 className="mb-0" style={{ color: '#C39C5E' }}>
                                                    {(() => {
                                                        const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
                                                        const vat = subtotal * 0.1; // 10% VAT on products subtotal
                                                        const discountedSubtotal = appliedDiscount
                                                            ? appliedDiscount.finalAmount
                                                            : subtotal;
                                                        const totalWithVat = discountedSubtotal + vat;
                                                        return totalWithVat.toLocaleString('vi-VN');
                                                    })()} VND
                                                </h5>
                                            </div>
                                        </div>

                                        <div className="order-notes mt-4">
                                            <small className="text-muted">
                                                <i className="fa fa-info-circle"></i>
                                                You will receive a confirmation email after placing your order.
                                            </small>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section >

            {/* Branch Suggestion Modal */}
            <BranchSuggestionModal
                isOpen={showBranchSuggestion}
                onClose={handleCloseBranchSuggestion}
                onSelectBranch={handleBranchSelection}
                availableBranches={availableBranches}
                originalBranch={originalBranch}
                cartItems={cartItems}
            />

            {/* Branch Settings Modal */}
            <BranchSettings
                maxBranches={maxBranchesToCheck}
                onMaxBranchesChange={handleMaxBranchesChange}
                isVisible={showBranchSettings}
                onToggle={handleToggleBranchSettings}
            />

            {/* Loading overlay for stock checking */}
            {isCheckingStock && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
                     style={{ 
                         backgroundColor: 'rgba(0, 0, 0, 0.7)', 
                         zIndex: 9999 
                     }}>
                    <div className="text-center text-white">
                        <div className="spinner-border text-primary mb-3" role="status">
                            <span className="sr-only">Loading...</span>
                        </div>
                        <h5>Đang kiểm tra tồn kho...</h5>
                        <p>Vui lòng chờ trong giây lát</p>
                    </div>
                </div>
            )}
        </>
    );
};

export default CheckoutPage;

