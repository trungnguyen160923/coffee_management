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
import BranchMapSelector from '../common/BranchMapSelector';
import MomoPaymentPage from './MomoPaymentPage';
import { getCurrentUserSession, getCurrentUserSessionAsync, createGuestSession } from '../../utils/userSession';
import axios from 'axios';
import { showToast } from '../../utils/toast';
import { getAddressFromCurrentLocation, calculateDistance } from '../../services/locationService';
import { CONFIG } from '../../configurations/configuration';
import LocationMapPicker from '../common/LocationMapPicker';

const CheckoutPage = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        selectedAddressId: '',
        paymentMethod: 'CASH',
        notes: '',
        // Manual address input fields
        streetAddress: '',
        province: '',
        provinceCode: '',
        district: '',
        districtCode: '',
        ward: '',
        wardCode: ''
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
    const [showBranchMap, setShowBranchMap] = useState(false); // Hiển thị modal chọn chi nhánh trên bản đồ
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [provinces, setProvinces] = useState([]);
    
    // Address input mode: 'saved' (chọn từ danh sách), 'manual' (nhập thủ công), 'map' (chọn từ map)
    const [addressInputMode, setAddressInputMode] = useState('saved');
    const [selectedLocationFromMap, setSelectedLocationFromMap] = useState(null); // {lat, lng, address, coordinates}
    const [showLocationMapPicker, setShowLocationMapPicker] = useState(false);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);
    
    // Lấy giá trị từ config (env variable)
    const MAX_DELIVERY_DISTANCE_KM = CONFIG.MAX_DELIVERY_DISTANCE_KM;

    // Fetch user info, addresses and cart items on mount
    useEffect(() => {
        loadUserInfo();
        loadAddresses();
        fetchCartItems();
        fetchProvinces();
    }, []);

    const fetchProvinces = async () => {
        try {
            const response = await axios.get(`${CONFIG.API_GATEWAY}/provinces/p`);
            setProvinces(response.data);
        } catch (error) {
            console.error('Error fetching provinces:', error);
        }
    };

    const fetchDistricts = async (provinceCode) => {
        try {
            const response = await axios.get(`${CONFIG.API_GATEWAY}/provinces/p/${provinceCode}?depth=2`);
            const districtsList = response.data.districts || [];
            setDistricts(districtsList);
            setWards([]);
            return districtsList;
        } catch (error) {
            console.error('Error fetching districts:', error);
            setDistricts([]);
            return [];
        }
    };

    const fetchWards = async (districtCode) => {
        try {
            const response = await axios.get(`${CONFIG.API_GATEWAY}/provinces/d/${districtCode}?depth=2`);
            const wardsList = response.data.wards || [];
            setWards(wardsList);
            return wardsList;
        } catch (error) {
            console.error('Error fetching wards:', error);
            setWards([]);
            return [];
        }
    };

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
                const errorMessage = branchResult.message || 'Không tìm thấy chi nhánh phù hợp. Có thể do chi nhánh đang nghỉ, ngoài giờ làm việc, hoặc không hoạt động.';
                setBranchStockStatus({ 
                    available: false, 
                    message: errorMessage,
                    showMapButton: true
                });
                showToast(errorMessage + ' Vui lòng chọn trên bản đồ.', 'warning');
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

    // Function tìm chi nhánh dựa trên địa chỉ (province, district, streetAddress)
    const findBranchForAddress = async (province, district, streetAddress = '') => {
        try {
            setIsCheckingStock(true);
            
            // Tạo user session
            let userSession = await getCurrentUserSessionAsync();
            if (!userSession) {
                userSession = createGuestSession();
            }

            // Xóa reservations cũ
            try {
                await stockService.clearAllReservations(userSession);
            } catch (error) {
                console.error('Lỗi khi xóa reservations cũ:', error);
            }

            // Build địa chỉ: streetAddress (nếu có), district, province
            const addressParts = [streetAddress, district, province].filter(a => a && a.trim());
            const fullAddress = addressParts.join(', ');
            
            console.log('[CheckoutPage] findBranchForAddress: Tìm chi nhánh cho địa chỉ:', fullAddress);
            
            // Tìm chi nhánh gần nhất
            const branchResult = await branchService.findNearestBranch(fullAddress);
            
            if (branchResult.success && branchResult.branch) {
                // Kiểm tra khoảng cách nếu có coordinates (chỉ khi chọn từ map)
                if (addressInputMode === 'map' && selectedLocationFromMap?.coordinates && 
                    branchResult.branch.latitude && branchResult.branch.longitude) {
                    const distance = calculateDistance(
                        selectedLocationFromMap.coordinates.lat,
                        selectedLocationFromMap.coordinates.lng,
                        branchResult.branch.latitude,
                        branchResult.branch.longitude
                    );
                    
                    if (distance > MAX_DELIVERY_DISTANCE_KM) {
                        setSelectedBranch(null);
                        setBranchStockStatus({ 
                            available: false, 
                            message: `Khoảng cách từ địa chỉ giao hàng đến chi nhánh gần nhất là ${distance.toFixed(2)} km, vượt quá giới hạn ${MAX_DELIVERY_DISTANCE_KM} km. Vui lòng chọn địa chỉ giao hàng gần hơn.` 
                        });
                        showToast(`Khoảng cách quá xa (${distance.toFixed(2)} km). Vui lòng chọn địa chỉ giao hàng trong phạm vi ${MAX_DELIVERY_DISTANCE_KM} km từ chi nhánh.`, 'error');
                        return;
                    }
                }
                
                setSelectedBranch(branchResult.branch);
                
                // Kiểm tra stock của chi nhánh này
                const stockResult = await stockService.checkStockAvailability(cartItems, branchResult.branch.branchId, userSession);
                
                if (stockResult.success && stockResult.available) {
                    setBranchStockStatus({ available: true, message: 'Chi nhánh có đủ hàng' });
                    showToast('Chi nhánh có đủ hàng, có thể đặt hàng', 'success');
                } else {
                    setBranchStockStatus({ available: false, message: 'Chi nhánh hết hàng, đang tìm chi nhánh khác...' });
                    showToast('Chi nhánh gần nhất hết hàng, đang tìm chi nhánh khác...', 'warning');
                    
                    // Tự động tìm chi nhánh khác có hàng
                    await findAlternativeBranchWithStock(fullAddress, branchResult.branch.branchId, cartItems, userSession);
                }
            } else {
                setSelectedBranch(null);
                setBranchStockStatus({ 
                    available: false, 
                    message: branchResult.message || `Không tìm thấy chi nhánh gần địa chỉ này trong phạm vi ${MAX_DELIVERY_DISTANCE_KM}km` 
                });
                showToast(branchResult.message || `Không tìm thấy chi nhánh gần địa chỉ này trong phạm vi ${MAX_DELIVERY_DISTANCE_KM}km`, 'error');
            }
        } catch (error) {
            console.error('Lỗi khi tìm chi nhánh:', error);
            setBranchStockStatus({ available: false, message: 'Lỗi khi tìm chi nhánh' });
            showToast('Lỗi khi tìm chi nhánh', 'error');
        } finally {
            setIsCheckingStock(false);
        }
    };

    // Handler cho street address với debounce để tìm chi nhánh sau khi user nhập xong
    const handleStreetAddressChange = (e) => {
        const { value } = e.target;
        setFormData((prev) => {
            const newFormData = { ...prev, streetAddress: value };
            
            // Debounce: Đợi 1 giây sau khi user ngừng gõ mới tìm chi nhánh
            if (window.streetAddressTimeout) {
                clearTimeout(window.streetAddressTimeout);
            }
            
            // Chỉ tìm chi nhánh nếu đã có province và district
            if (newFormData.province && newFormData.district) {
                window.streetAddressTimeout = setTimeout(async () => {
                    await findBranchForAddress(newFormData.province, newFormData.district, value || '');
                }, 1000);
            }
            
            return newFormData;
        });
    };

    const handleProvinceChange = (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const provinceCode = selectedOption.value;
        const provinceName = selectedOption.text;

        setFormData((prev) => ({
            ...prev,
            province: provinceName,
            provinceCode: provinceCode,
            district: '',
            districtCode: '',
            ward: '',
            wardCode: '',
            streetAddress: ''
        }));

        setDistricts([]);
        setWards([]);

        // Reset discount when address changes
        if (appliedDiscount) {
            setAppliedDiscount(null);
            setDiscountCode('');
            setDiscountError(null);
            setSelectedBranch(null);
            showToast('Discount removed due to address change. Please reapply discount.', 'info');
        } else {
            setDiscountCode('');
        }

        if (provinceCode) {
            fetchDistricts(provinceCode);
        }
    };

    const handleDistrictChange = async (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const districtCode = selectedOption.value;
        const districtName = selectedOption.text;

        setFormData((prev) => ({
            ...prev,
            district: districtName,
            districtCode: districtCode,
            ward: '',
            wardCode: ''
        }));

        setWards([]);

        // Reset discount when address changes
        if (appliedDiscount) {
            setAppliedDiscount(null);
            setDiscountCode('');
            setDiscountError(null);
            setSelectedBranch(null);
            showToast('Discount removed due to address change. Please reapply discount.', 'info');
        }

        if (districtCode) {
            fetchWards(districtCode);
            
            // Tự động tìm chi nhánh sau khi chọn district (không cần đợi ward hoặc street address)
            setTimeout(async () => {
                setFormData((prev) => {
                    if (prev.province) {
                        findBranchForAddress(prev.province, districtName, prev.streetAddress || '');
                    }
                    return prev;
                });
            }, 200);
        }
    };

    const handleWardChange = (e) => {
        const wardName = e.target.options[e.target.selectedIndex].text;
        setFormData((prev) => ({
            ...prev,
            ward: wardName
        }));

        // Reset discount when address changes
        if (appliedDiscount) {
            setAppliedDiscount(null);
            setDiscountCode('');
            setDiscountError(null);
            setSelectedBranch(null);
            showToast('Discount removed due to address change. Please reapply discount.', 'info');
        }
    };

    // Handler khi chọn địa chỉ từ map
    const handleLocationSelect = async (locationData) => {
        console.log('[CheckoutPage] handleLocationSelect: Đã chọn địa chỉ từ map:', locationData);
        
        if (!locationData || !locationData.province) {
            showToast('Không thể lấy địa chỉ từ vị trí đã chọn', 'error');
            return;
        }

        // Save selected location data for display (including coordinates)
        setSelectedLocationFromMap({
            streetAddress: locationData.streetAddress || '',
            province: locationData.province ? locationData.province.name : '',
            district: locationData.district ? locationData.district.name : '',
            ward: locationData.ward ? locationData.ward.name : '',
            fullAddress: locationData.fullAddress || '',
            coordinates: locationData.coordinates || null,
            // Store raw data for matching
            rawLocationData: locationData
        });
        
        setShowLocationMapPicker(false);

        // Reset discount when address changes
        if (appliedDiscount) {
            setAppliedDiscount(null);
            setDiscountCode('');
            setDiscountError(null);
            setSelectedBranch(null);
        }

        // Xóa reservations cũ ngay khi thay đổi địa chỉ (trước khi tìm chi nhánh mới)
        try {
            let userSession = await getCurrentUserSessionAsync();
            if (!userSession) {
                userSession = createGuestSession();
            }
            console.log('[CheckoutPage] handleLocationSelect: Xóa reservations cũ do thay đổi địa chỉ');
            await stockService.clearAllReservations(userSession);
        } catch (error) {
            console.error('[CheckoutPage] handleLocationSelect: Lỗi khi xóa reservations cũ:', error);
        }

        // Update form data
        if (locationData.province) {
            setFormData(prev => ({
                ...prev,
                streetAddress: locationData.streetAddress || '',
                province: locationData.province.name,
                provinceCode: locationData.province.code,
                district: locationData.district ? locationData.district.name : '',
                districtCode: locationData.district ? locationData.district.code : '',
                ward: locationData.ward ? locationData.ward.name : '',
                wardCode: ''
            }));

            // Fetch districts and wards if needed
            if (locationData.district) {
                await fetchDistricts(locationData.province.code);
                if (locationData.ward) {
                    await fetchWards(locationData.district.code);
                }
                
                // Trigger stock check
                setTimeout(async () => {
                    try {
                        setIsCheckingStock(true);
                        
                        let userSession = await getCurrentUserSessionAsync();
                        if (!userSession) {
                            userSession = createGuestSession();
                        }

                        // Đảm bảo đã xóa reservations
                        try {
                            await stockService.clearAllReservations(userSession);
                        } catch (error) {
                            console.error('[CheckoutPage] handleLocationSelect: Lỗi khi xóa reservations cũ (lần 2):', error);
                        }

                        const fullAddress = [
                            locationData.streetAddress,
                            locationData.ward ? locationData.ward.name : '',
                            locationData.district.name,
                            locationData.province.name
                        ].filter(a => a && a.trim()).join(', ');
                        
                        const branchResult = await branchService.findNearestBranch(fullAddress);
                        
                        if (branchResult.success && branchResult.branch) {
                            // Kiểm tra khoảng cách nếu có coordinates
                            if (locationData.coordinates && branchResult.branch.latitude && branchResult.branch.longitude) {
                                const distance = calculateDistance(
                                    locationData.coordinates.lat,
                                    locationData.coordinates.lng,
                                    branchResult.branch.latitude,
                                    branchResult.branch.longitude
                                );
                                
                                if (distance > MAX_DELIVERY_DISTANCE_KM) {
                                    setSelectedBranch(null);
                                    setBranchStockStatus({ 
                                        available: false, 
                                        message: `Khoảng cách quá xa (${distance.toFixed(2)} km). Vui lòng chọn địa chỉ giao hàng trong phạm vi ${MAX_DELIVERY_DISTANCE_KM} km.` 
                                    });
                                    showToast(`Khoảng cách từ địa chỉ đến chi nhánh gần nhất là ${distance.toFixed(2)} km, vượt quá giới hạn ${MAX_DELIVERY_DISTANCE_KM} km. Vui lòng chọn địa chỉ giao hàng gần hơn.`, 'error');
                                    return;
                                }
                            }
                            
                            setSelectedBranch(branchResult.branch);
                            
                            const stockResult = await stockService.checkStockAvailability(cartItems, branchResult.branch.branchId, userSession);
                            
                            if (stockResult.success && stockResult.available) {
                                setBranchStockStatus({ available: true, message: 'Chi nhánh có đủ hàng' });
                                showToast('Chi nhánh có đủ hàng, có thể đặt hàng', 'success');
                            } else {
                                setBranchStockStatus({ available: false, message: 'Chi nhánh hết hàng, đang tìm chi nhánh khác...' });
                                showToast('Chi nhánh gần nhất hết hàng, đang tìm chi nhánh khác...', 'warning');
                                
                                await findAlternativeBranchWithStock(fullAddress, branchResult.branch.branchId, cartItems, userSession);
                            }
                        } else {
                            setSelectedBranch(null);
                            setBranchStockStatus({ 
                                available: false, 
                                message: branchResult.message || `Không tìm thấy chi nhánh gần địa chỉ này trong phạm vi ${MAX_DELIVERY_DISTANCE_KM}km` 
                            });
                            showToast(branchResult.message || `Không tìm thấy chi nhánh gần địa chỉ này trong phạm vi ${MAX_DELIVERY_DISTANCE_KM}km`, 'error');
                        }
                    } catch (error) {
                        console.error('[CheckoutPage] handleLocationSelect: Lỗi khi kiểm tra stock:', error);
                        setBranchStockStatus({ available: false, message: 'Lỗi khi kiểm tra tồn kho' });
                    } finally {
                        setIsCheckingStock(false);
                    }
                }, 100);
            }
        }

        showToast('Đã chọn địa chỉ từ bản đồ thành công!', 'success');
    };

    // Tìm chi nhánh khác có hàng khi chi nhánh gần nhất hết hàng
    const findAlternativeBranchWithStock = async (deliveryAddress, currentBranchId, cartItems, userSession) => {
        try {
            
            // Tìm các chi nhánh khác gần địa chỉ
            const branchesResult = await branchService.findTopNearestBranches(deliveryAddress, 10);
            if (!branchesResult.success || branchesResult.branches.length === 0) {
                const errorMessage = branchesResult.message || 'Không tìm thấy chi nhánh nào khác gần địa chỉ này. Có thể do tất cả chi nhánh đang nghỉ, ngoài giờ làm việc, hoặc không hoạt động.';
                setBranchStockStatus({ 
                    available: false, 
                    message: errorMessage,
                    showMapButton: true
                });
                showToast(errorMessage + ' Vui lòng chọn trên bản đồ.', 'warning');
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

    // Function to get address from current location and auto-select nearest branch
    const getCurrentLocationAddress = async () => {
        console.log('[CheckoutPage] getCurrentLocationAddress: Bắt đầu lấy địa chỉ từ vị trí hiện tại');
        setIsGettingLocation(true);
        
        try {
            console.log('[CheckoutPage] getCurrentLocationAddress: Gọi getAddressFromCurrentLocation với', provinces.length, 'provinces');
            const result = await getAddressFromCurrentLocation(
                provinces,
                CONFIG.API_GATEWAY,
                fetchDistricts,
                fetchWards
            );
            console.log('[CheckoutPage] getCurrentLocationAddress: Kết quả từ service:', result);

            if (!result.success) {
                console.warn('[CheckoutPage] getCurrentLocationAddress: Không thành công:', result.message);
                showToast(result.message, 'warning');
                return;
            }

            // Build full address string
            const addressParts = [];
            if (result.ward) addressParts.push(result.ward.name);
            if (result.district) addressParts.push(result.district.name);
            if (result.province) addressParts.push(result.province.name);
            const fullAddress = addressParts.join(', ');
            console.log('[CheckoutPage] getCurrentLocationAddress: Địa chỉ đầy đủ:', fullAddress);

            // Find nearest branch based on the location
            try {
                console.log('[CheckoutPage] getCurrentLocationAddress: Bắt đầu kiểm tra stock...');
                setIsCheckingStock(true);
                
                let userSession = await getCurrentUserSessionAsync();
                if (!userSession) {
                    userSession = createGuestSession();
                }
                console.log('[CheckoutPage] getCurrentLocationAddress: User session:', userSession);

                try {
                    await stockService.clearAllReservations(userSession);
                    console.log('[CheckoutPage] getCurrentLocationAddress: Đã xóa reservations cũ');
                } catch (error) {
                    console.error('[CheckoutPage] getCurrentLocationAddress: Lỗi khi xóa reservations cũ:', error);
                }

                const branchResult = await branchService.findNearestBranch(fullAddress);
                console.log('[CheckoutPage] getCurrentLocationAddress: Kết quả tìm chi nhánh:', branchResult);
                
                if (branchResult.success && branchResult.branch) {
                    console.log('[CheckoutPage] getCurrentLocationAddress: Đã tìm thấy chi nhánh:', branchResult.branch);
                    setSelectedBranch(branchResult.branch);
                    
                    const stockResult = await stockService.checkStockAvailability(cartItems, branchResult.branch.branchId, userSession);
                    console.log('[CheckoutPage] getCurrentLocationAddress: Kết quả kiểm tra stock:', stockResult);
                    
                    if (stockResult.success && stockResult.available) {
                        console.log('[CheckoutPage] getCurrentLocationAddress: Chi nhánh có đủ hàng');
                        setBranchStockStatus({ available: true, message: 'Chi nhánh có đủ hàng' });
                        showToast('Đã lấy địa chỉ từ vị trí hiện tại và tìm thấy chi nhánh có đủ hàng', 'success');
                    } else {
                        console.log('[CheckoutPage] getCurrentLocationAddress: Chi nhánh hết hàng, tìm chi nhánh khác');
                        setBranchStockStatus({ available: false, message: 'Chi nhánh hết hàng, đang tìm chi nhánh khác...' });
                        showToast('Chi nhánh gần nhất hết hàng, đang tìm chi nhánh khác...', 'warning');
                        
                        await findAlternativeBranchWithStock(fullAddress, branchResult.branch.branchId, cartItems, userSession);
                    }
                } else {
                    console.warn('[CheckoutPage] getCurrentLocationAddress: Không tìm thấy chi nhánh');
                    setSelectedBranch(null);
                    setBranchStockStatus({ available: false, message: 'Không tìm thấy chi nhánh gần địa chỉ này' });
                    showToast('Không tìm thấy chi nhánh gần địa chỉ này', 'error');
                }
            } catch (error) {
                console.error('[CheckoutPage] getCurrentLocationAddress: Lỗi khi kiểm tra stock:', error);
                setBranchStockStatus({ available: false, message: 'Lỗi khi kiểm tra tồn kho' });
            } finally {
                setIsCheckingStock(false);
            }

            // Reset discount when address changes
            if (appliedDiscount) {
                console.log('[CheckoutPage] getCurrentLocationAddress: Reset discount do thay đổi địa chỉ');
                setAppliedDiscount(null);
                setDiscountCode('');
                setDiscountError(null);
            }

            console.log('[CheckoutPage] getCurrentLocationAddress: Hoàn thành, hiển thị toast');
            showToast(result.message + ' Bạn có thể tiếp tục đặt hàng hoặc lưu địa chỉ này vào danh sách.', 'success');
        } catch (error) {
            console.error('[CheckoutPage] getCurrentLocationAddress: Lỗi:', error);
            showToast(error.message || 'Lỗi khi lấy địa chỉ từ vị trí', 'error');
        } finally {
            setIsGettingLocation(false);
            console.log('[CheckoutPage] getCurrentLocationAddress: Đã hoàn thành (finally)');
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
                        const errorMessage = branchResult.message || 'Không tìm thấy chi nhánh phù hợp. Có thể do chi nhánh đang nghỉ, ngoài giờ làm việc, hoặc không hoạt động vào ngày hôm nay.';
                        setBranchStockStatus({ 
                            available: false, 
                            message: errorMessage,
                            showMapButton: true
                        });
                        showToast(errorMessage + ' Vui lòng chọn trên bản đồ.', 'warning');
                    }
                }
            } catch (error) {
                console.error('Error finding nearest branch:', error);
                setSelectedBranch(null);
                const errorMessage = error?.response?.data?.message || error?.message || 'Lỗi khi tìm chi nhánh. Vui lòng thử lại sau.';
                setBranchStockStatus({ 
                    available: false, 
                    message: errorMessage,
                    showMapButton: true
                });
                showToast(errorMessage + ' Vui lòng chọn trên bản đồ.', 'error');
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
        const { name, phone, email } = formData;
        
        // Kiểm tra thông tin cơ bản
        if (!name.trim() || !phone.trim() || !email.trim()) {
            return false;
        }
        
        // Kiểm tra địa chỉ theo mode
        if (addressInputMode === 'saved') {
            return formData.selectedAddressId.trim() !== '';
        } else if (addressInputMode === 'map') {
            return selectedLocationFromMap !== null && selectedLocationFromMap.province !== '';
        } else if (addressInputMode === 'manual') {
            // Manual mode: cần province và district (không cần ward)
            return formData.province && formData.district;
        }
        
        return false;
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

            // Get delivery address based on input mode
            let fullDeliveryAddress = '';
            
            if (addressInputMode === 'saved') {
                // Lấy từ địa chỉ đã lưu
                const selectedAddress = addresses.find(addr => addr.addressId.toString() === formData.selectedAddressId);
                if (!selectedAddress) {
                    showToast('Please select a valid address.', 'warning');
                    return;
                }
                fullDeliveryAddress = selectedAddress.fullAddress;
            } else if (addressInputMode === 'map' && selectedLocationFromMap) {
                // Lấy từ map (đã loại bỏ postal code)
                const address = [
                    selectedLocationFromMap.streetAddress,
                    selectedLocationFromMap.ward,
                    selectedLocationFromMap.district,
                    selectedLocationFromMap.province
                ].filter(a => a && a.trim()).join(', ');
                
                if (selectedLocationFromMap.fullAddress) {
                    let cleanAddress = selectedLocationFromMap.fullAddress;
                    cleanAddress = cleanAddress.replace(/,\s*\d{5}\s*,?/g, '').replace(/,\s*\d{5}$/, '').trim();
                    fullDeliveryAddress = address || cleanAddress;
                } else {
                    fullDeliveryAddress = address;
                }
            } else {
                showToast('Please select or enter a delivery address.', 'warning');
                return;
            }

            // Extract district and province from full address for branch selection
            let deliveryAddress = '';
            if (addressInputMode === 'saved') {
                const addressParts = fullDeliveryAddress.split(', ');
                deliveryAddress = addressParts.length >= 2
                    ? addressParts.slice(-2).join(', ')
                    : fullDeliveryAddress;
            } else {
                // Manual hoặc map mode: dùng district và province từ formData hoặc selectedLocationFromMap
                if (addressInputMode === 'map' && selectedLocationFromMap) {
                    deliveryAddress = [
                        selectedLocationFromMap.district,
                        selectedLocationFromMap.province
                    ].filter(a => a && a.trim()).join(', ');
                } else {
                    deliveryAddress = [
                        formData.district,
                        formData.province
                    ].filter(a => a && a.trim()).join(', ');
                }
            }

            // Kiểm tra đã có chi nhánh được chọn chưa
            if (!selectedBranch) {
                showToast('Vui lòng chọn địa chỉ giao hàng để hệ thống tự động chọn chi nhánh gần nhất.', 'warning');
                return;
            }

            // QUAN TRỌNG: Kiểm tra lại khoảng cách trước khi submit (nếu có coordinates)
            if (addressInputMode === 'map' && selectedLocationFromMap?.coordinates && 
                selectedBranch.latitude && selectedBranch.longitude) {
                const distance = calculateDistance(
                    selectedLocationFromMap.coordinates.lat,
                    selectedLocationFromMap.coordinates.lng,
                    selectedBranch.latitude,
                    selectedBranch.longitude
                );
                
                if (distance > MAX_DELIVERY_DISTANCE_KM) {
                    showToast(`Khoảng cách từ địa chỉ đến chi nhánh là ${distance.toFixed(2)} km, vượt quá giới hạn ${MAX_DELIVERY_DISTANCE_KM} km. Vui lòng chọn địa chỉ giao hàng gần hơn.`, 'error');
                    setSelectedBranch(null);
                    setBranchStockStatus({ 
                        available: false, 
                        message: `Khoảng cách quá xa (${distance.toFixed(2)} km). Vui lòng chọn địa chỉ giao hàng trong phạm vi ${MAX_DELIVERY_DISTANCE_KM} km.` 
                    });
                    return;
                }
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
            if (addressInputMode === 'map') {
                showToast('Vui lòng điền đầy đủ thông tin (Tên, Số điện thoại) và chọn địa chỉ trên bản đồ!', 'warning');
            } else {
                showToast('Please fill all the details !!', 'warning');
            }
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

                                    {/* Address Input Mode Selection */}
                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label className="mb-3">Cách nhập địa chỉ *</label>
                                            <div className="btn-group w-100" role="group">
                                                <button
                                                    type="button"
                                                    className={`btn ${addressInputMode === 'saved' ? 'btn-primary' : 'btn-outline-primary'}`}
                                                    onClick={() => {
                                                        setAddressInputMode('saved');
                                                        setSelectedLocationFromMap(null);
                                                    }}
                                                >
                                                    <i className="fa fa-list me-2"></i>
                                                    Chọn từ địa chỉ đã lưu
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`btn ${addressInputMode === 'map' ? 'btn-primary' : 'btn-outline-primary'}`}
                                                    onClick={() => {
                                                        setAddressInputMode('map');
                                                        setFormData(prev => ({ ...prev, selectedAddressId: '' }));
                                                        setShowLocationMapPicker(true);
                                                    }}
                                                >
                                                    <i className="fa fa-map-marker-alt me-2"></i>
                                                    Chọn trên bản đồ
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-100"></div>

                                    {/* Saved Address Selection */}
                                    {addressInputMode === 'saved' && (
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
                                                </>
                                            )}
                                            </div>
                                        </div>
                                    )}


                                    {/* Map Selected Address Display */}
                                    {addressInputMode === 'map' && selectedLocationFromMap && (
                                        <div className="col-md-12">
                                            <div className="alert alert-info" style={{ 
                                                backgroundColor: '#e7f3ff', 
                                                borderColor: '#b3d9ff',
                                                color: '#004085'
                                            }}>
                                                <div className="d-flex align-items-center mb-2">
                                                    <i className="fa fa-map-marker-alt me-2" style={{ color: '#C39C5E' }}></i>
                                                    <strong style={{ color: '#004085' }}>Địa chỉ đã chọn từ bản đồ:</strong>
                                                </div>
                                                <div style={{ color: '#004085', fontWeight: '500', marginBottom: '10px' }}>
                                                    {(() => {
                                                        // Remove postal code (5-digit number) from address
                                                        let address = selectedLocationFromMap.fullAddress || 
                                                            `${selectedLocationFromMap.streetAddress || ''}, ${selectedLocationFromMap.ward || ''}, ${selectedLocationFromMap.district || ''}, ${selectedLocationFromMap.province || ''}`.replace(/^,\s*|,\s*$/g, '');
                                                        // Remove postal code pattern (5 digits, possibly with spaces or commas)
                                                        address = address.replace(/,\s*\d{5}\s*,?/g, '').replace(/,\s*\d{5}$/, '').trim();
                                                        return address;
                                                    })()}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm"
                                                    onClick={() => setShowLocationMapPicker(true)}
                                                    style={{
                                                        backgroundColor: '#004085',
                                                        color: '#fff',
                                                        borderColor: '#004085'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.backgroundColor = '#003366';
                                                        e.target.style.borderColor = '#003366';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.backgroundColor = '#004085';
                                                        e.target.style.borderColor = '#004085';
                                                    }}
                                                >
                                                    <i className="fa fa-edit me-1"></i>
                                                    Thay đổi địa chỉ
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="w-100"></div>

                                    {/* Hiển thị thông tin chi nhánh và trạng thái stock - hiển thị cho tất cả modes */}
                                    {(addressInputMode === 'saved' || addressInputMode === 'map') && (
                                        <div className="col-md-12">
                                            <div className="mt-3 p-3 border rounded" style={{ backgroundColor: '#2a2a2a', borderColor: '#444' }}>
                                                {selectedBranch ? (
                                                    <>
                                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                                            <div className="d-flex align-items-center">
                                                                <i className="fa fa-store me-2" style={{ color: '#C39C5E' }}></i>
                                                                <strong>Chi nhánh phục vụ:</strong>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-primary"
                                                                onClick={() => {
                                                                    if (addressInputMode === 'saved') {
                                                                        const selectedAddress = addresses.find(addr => 
                                                                            addr.addressId.toString() === formData.selectedAddressId
                                                                        );
                                                                        if (selectedAddress) {
                                                                            setShowBranchMap(true);
                                                                        } else {
                                                                            showToast('Vui lòng chọn địa chỉ giao hàng trước', 'warning');
                                                                        }
                                                                    } else {
                                                                        setShowBranchMap(true);
                                                                    }
                                                                }}
                                                                disabled={addressInputMode === 'saved' && !formData.selectedAddressId}
                                                                title="Chọn chi nhánh trên bản đồ"
                                                            >
                                                                <i className="fa fa-map me-1"></i>
                                                                Chọn trên bản đồ
                                                            </button>
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
                                                    </>
                                                ) : (
                                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                                        <div className="d-flex align-items-center">
                                                            <i className="fa fa-store me-2" style={{ color: '#C39C5E' }}></i>
                                                            <strong>Chi nhánh phục vụ:</strong>
                                                        </div>
                                                    </div>
                                                )}
                                                
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
                                                        {!branchStockStatus.available && branchStockStatus.showMapButton && 
                                                         (formData.selectedAddressId || addressInputMode === 'map') && (
                                                            <div className="mt-2">
                                                                <button
                                                                    className="btn btn-sm btn-primary"
                                                                    onClick={() => setShowBranchMap(true)}
                                                                    style={{ fontSize: '12px' }}
                                                                >
                                                                    <i className="fa fa-map-marker-alt me-1"></i>
                                                                    Chọn chi nhánh trên bản đồ
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

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
                                                            disabled={addressInputMode === 'saved' ? !formData.selectedAddressId :
                                                                     (addressInputMode === 'map' ? !selectedLocationFromMap : false)}
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

            {/* Location Map Picker Modal */}
            <LocationMapPicker
                isOpen={showLocationMapPicker}
                onClose={() => setShowLocationMapPicker(false)}
                onConfirm={(locationData) => {
                    handleLocationSelect(locationData);
                }}
                initialLocation={selectedLocationFromMap?.rawLocationData || selectedLocationFromMap}
                provinces={provinces}
                apiGateway={CONFIG.API_GATEWAY}
                fetchDistricts={fetchDistricts}
                fetchWards={fetchWards}
            />

            {/* Branch Map Selector Modal */}
            {(formData.selectedAddressId || addressInputMode === 'map') && (
                <BranchMapSelector
                    isOpen={showBranchMap}
                    onClose={() => setShowBranchMap(false)}
                    onSelectBranch={async (branch) => {
                        setSelectedBranch(branch);
                        setShowBranchMap(false);
                        
                        // Kiểm tra stock lại
                        try {
                            let userSession = await getCurrentUserSessionAsync();
                            if (!userSession) {
                                userSession = createGuestSession();
                            }
                            
                            const stockResult = await stockService.checkStockAvailability(
                                cartItems,
                                branch.branchId,
                                userSession
                            );
                            
                            if (stockResult.success && stockResult.available) {
                                setBranchStockStatus({ available: true, message: 'Chi nhánh có đủ hàng' });
                                showToast('Đã chọn chi nhánh và kiểm tra tồn kho thành công', 'success');
                            } else {
                                setBranchStockStatus({ 
                                    available: false, 
                                    message: 'Chi nhánh không có đủ hàng' 
                                });
                                showToast('Chi nhánh này không có đủ hàng. Vui lòng chọn chi nhánh khác.', 'warning');
                            }
                        } catch (error) {
                            console.error('Error checking stock:', error);
                            showToast('Lỗi khi kiểm tra tồn kho', 'error');
                        }
                    }}
                    deliveryAddress={(() => {
                        if (addressInputMode === 'saved') {
                            return addresses.find(addr =>
                                addr.addressId.toString() === formData.selectedAddressId
                            )?.fullAddress;
                        } else if (addressInputMode === 'map' && selectedLocationFromMap) {
                            const address = [
                                selectedLocationFromMap.streetAddress,
                                selectedLocationFromMap.ward,
                                selectedLocationFromMap.district,
                                selectedLocationFromMap.province
                            ].filter(a => a && a.trim()).join(', ');
                            return address || selectedLocationFromMap.fullAddress;
                        }
                        return null;
                    })()}
                    deliveryCoordinates={(() => {
                        // Nếu chọn từ map, có coordinates thì dùng luôn (chính xác hơn)
                        if (addressInputMode === 'map' && selectedLocationFromMap?.coordinates) {
                            return selectedLocationFromMap.coordinates;
                        }
                        return null;
                    })()}
                    cartItems={cartItems}
                    userSession={getCurrentUserSession()}
                    selectedBranch={selectedBranch}
                />
            )}

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

