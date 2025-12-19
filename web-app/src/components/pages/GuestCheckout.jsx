import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cartService } from '../../services/cartService';
import { orderService } from '../../services/orderService';
import { notificationService } from '../../services/notificationService';
import { emailService } from '../../services/emailService';
import { discountService } from '../../services/discountService';
import { branchService } from '../../services/branchService';
import { stockService } from '../../services/stockService';
import { getCurrentUserSession, getCurrentUserSessionAsync, createGuestSession } from '../../utils/userSession';
import BranchMapSelector from '../common/BranchMapSelector';
import LocationMapPicker from '../common/LocationMapPicker';
import MomoPaymentPage from './MomoPaymentPage';
import axios from 'axios';
import { showToast } from '../../utils/toast';
import { CONFIG } from '../../configurations/configuration';
import { getAddressFromCurrentLocation, calculateDistance } from '../../services/locationService';

// Lấy giá trị từ config (env variable)
const MAX_DELIVERY_DISTANCE_KM = CONFIG.MAX_DELIVERY_DISTANCE_KM;

const GuestCheckout = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        streetAddress: '', // Địa chỉ nhà/số nhà
        province: '',
        provinceCode: '',
        district: '',
        districtCode: '',
        ward: '',
        wardCode: '',
        phone: '',
        email: '',
        paymentMethod: 'CASH',
        notes: ''
    });

    // Address input mode: 'manual' or 'map'
    const [addressInputMode, setAddressInputMode] = useState('manual');
    const [selectedLocationFromMap, setSelectedLocationFromMap] = useState(null); // {lat, lng, address}

    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);

    const [submitting, setSubmitting] = useState(false);
    const [cartItems, setCartItems] = useState([]);
    const [showMomoPayment, setShowMomoPayment] = useState(false);
    const [orderInfo, setOrderInfo] = useState(null);
    const [discountCode, setDiscountCode] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState(null);
    const [discountError, setDiscountError] = useState(null);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [branchStockStatus, setBranchStockStatus] = useState(null);
    const [isCheckingStock, setIsCheckingStock] = useState(false);
    const [showBranchMap, setShowBranchMap] = useState(false);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [showLocationMapPicker, setShowLocationMapPicker] = useState(false);

    // Fetch provinces and cart items on mount
    useEffect(() => {
        fetchProvinces();
        fetchCartItems();
    }, []);

    const fetchProvinces = async () => {
        try {
            const response = await axios.get(`${CONFIG.API_GATEWAY}/provinces/p`);
            setProvinces(response.data);
        } catch (error) {
            console.error('Error fetching provinces:', error);
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

    // Tìm chi nhánh khác có hàng khi chi nhánh gần nhất hết hàng
    const findAlternativeBranchWithStock = async (deliveryAddress, currentBranchId, cartItems, userSession) => {
        try {
            // Tìm các chi nhánh khác gần địa chỉ (backend đã tự động filter theo max distance)
            const branchesResult = await branchService.findTopNearestBranches(deliveryAddress, 10);
            if (!branchesResult.success || branchesResult.branches.length === 0) {
                setBranchStockStatus({ 
                    available: false, 
                    message: `Không tìm thấy chi nhánh nào khác trong phạm vi ${MAX_DELIVERY_DISTANCE_KM}km từ địa chỉ này` 
                });
                return;
            }
            
            const allBranches = branchesResult.branches;
            // Loại bỏ chi nhánh hiện tại
            const otherBranches = allBranches.filter(branch => branch.branchId !== currentBranchId);
            
            // QUAN TRỌNG: Kiểm tra lại khoảng cách ở frontend nếu có coordinates
            let validBranches = otherBranches;
            
            if (addressInputMode === 'map' && selectedLocationFromMap?.coordinates) {
                validBranches = otherBranches.filter(branch => {
                    if (!branch.latitude || !branch.longitude) return false;
                    const distance = calculateDistance(
                        selectedLocationFromMap.coordinates.lat,
                        selectedLocationFromMap.coordinates.lng,
                        branch.latitude,
                        branch.longitude
                    );
                    return distance <= MAX_DELIVERY_DISTANCE_KM;
                });
                
                if (validBranches.length === 0) {
                    setBranchStockStatus({ 
                        available: false, 
                        message: `Không tìm thấy chi nhánh nào khác trong phạm vi ${MAX_DELIVERY_DISTANCE_KM}km từ địa chỉ này` 
                    });
                    return;
                }
            }
            
            // Kiểm tra stock cho các chi nhánh khác (đã được filter theo khoảng cách)
            const stockResults = await stockService.checkStockForMultipleBranches(cartItems, validBranches, userSession);
            
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

    const handleApplyDiscount = async () => {
        // Check if all 3 address fields are filled
        if (!formData.province || !formData.district || !formData.ward) {
            showToast('Please fill in all address fields before applying discount', 'warning');
            return;
        }

        if (!discountCode.trim()) {
            showToast('Please enter a discount code', 'warning');
            return;
        }

        try {
            setDiscountError(null);

            // Step 1: Find nearest branch based on address
            const fullAddress = `${formData.ward}, ${formData.district}, ${formData.province}`;
            const branchResult = await branchService.findNearestBranch(fullAddress);

            if (!branchResult.success) {
                showToast('Failed to find nearest branch. Please check your address.', 'error');
                return;
            }

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
                    setDiscountError(`Khoảng cách từ địa chỉ giao hàng đến chi nhánh gần nhất là ${distance.toFixed(2)} km, vượt quá giới hạn ${MAX_DELIVERY_DISTANCE_KM} km. Vui lòng chọn địa chỉ giao hàng gần hơn.`);
                    showToast(`Khoảng cách quá xa (${distance.toFixed(2)} km). Vui lòng chọn địa chỉ giao hàng trong phạm vi ${MAX_DELIVERY_DISTANCE_KM} km từ chi nhánh.`, 'error');
                    return;
                }
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

    const fetchDistricts = async (provinceCode) => {
        try {
            const response = await axios.get(`${CONFIG.API_GATEWAY}/provinces/p/${provinceCode}?depth=2`);
            setDistricts(response.data.districts || []);
            setWards([]);
        } catch (error) {
            console.error('Error fetching districts:', error);
        }
    };

    const fetchWards = async (districtCode) => {
        try {
            const response = await axios.get(`${CONFIG.API_GATEWAY}/provinces/d/${districtCode}?depth=2`);
            setWards(response.data.wards || []);
        } catch (error) {
            console.error('Error fetching wards:', error);
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
            
            // Tạo guest session nếu chưa có
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
            // Không cần ward nữa
            const addressParts = [streetAddress, district, province].filter(a => a && a.trim());
            const fullAddress = addressParts.join(', ');
            
            console.log('[GuestCheckout] findBranchForAddress: Tìm chi nhánh cho địa chỉ:', fullAddress);
            
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
            // Clear timeout cũ nếu có
            if (window.streetAddressTimeout) {
                clearTimeout(window.streetAddressTimeout);
            }
            
            // Chỉ tìm chi nhánh nếu đã có province và district (không cần ward)
            if (newFormData.province && newFormData.district) {
                window.streetAddressTimeout = setTimeout(async () => {
                    await findBranchForAddress(newFormData.province, newFormData.district, value || '');
                }, 1000); // Đợi 1 giây sau khi user ngừng gõ
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
            wardCode: ''
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
            // Clear discount code input when address changes (even if no discount was applied)
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
            
            // Nếu đã có province, tự động tìm chi nhánh sau khi chọn district
            // (Không cần đợi chọn ward hoặc điền street address nữa)
            // Đợi một chút để state cập nhật
            setTimeout(async () => {
                setFormData((prev) => {
                    if (prev.province) {
                        // Tìm chi nhánh với province và district (streetAddress có thể rỗng)
                        findBranchForAddress(prev.province, districtName, prev.streetAddress || '');
                    }
                    return prev;
                });
            }, 200);
        }
    };

    const handleWardChange = async (e) => {
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

        // Kiểm tra stock khi có đủ 3 trường địa chỉ
        if (formData.province && formData.district && wardName) {
            try {
                setIsCheckingStock(true);
                
                // Tạo guest session nếu chưa có
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

                const fullAddress = `${wardName}, ${formData.district}, ${formData.province}`;
                
                // Tìm chi nhánh gần nhất
                const branchResult = await branchService.findNearestBranch(fullAddress);
                
                if (branchResult.success && branchResult.branch) {
                    // Kiểm tra khoảng cách nếu có coordinates
                    
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
                    setBranchStockStatus({ available: false, message: 'Không tìm thấy chi nhánh gần địa chỉ này' });
                    showToast('Không tìm thấy chi nhánh gần địa chỉ này', 'error');
                }
            } catch (error) {
                console.error('Lỗi khi kiểm tra stock:', error);
                setBranchStockStatus({ available: false, message: 'Lỗi khi kiểm tra tồn kho' });
                showToast('Lỗi khi kiểm tra tồn kho', 'error');
            } finally {
                setIsCheckingStock(false);
            }
        }
    };

    // Function to get address from current location
    const getCurrentLocationAddress = async () => {
        console.log('[GuestCheckout] getCurrentLocationAddress: Bắt đầu lấy địa chỉ từ vị trí hiện tại');
        setIsGettingLocation(true);
        
        try {
            console.log('[GuestCheckout] getCurrentLocationAddress: Gọi getAddressFromCurrentLocation với', provinces.length, 'provinces');
            const result = await getAddressFromCurrentLocation(
                provinces,
                CONFIG.API_GATEWAY,
                fetchDistricts,
                fetchWards
            );
            console.log('[GuestCheckout] getCurrentLocationAddress: Kết quả từ service:', result);

            if (!result.success) {
                console.warn('[GuestCheckout] getCurrentLocationAddress: Không thành công:', result.message);
                showToast(result.message, 'warning');
                return;
            }

            // Reset discount when address changes
            if (appliedDiscount) {
                setAppliedDiscount(null);
                setDiscountCode('');
                setDiscountError(null);
                setSelectedBranch(null);
            }

            // Update form data with matched province
            if (result.province) {
                console.log('[GuestCheckout] getCurrentLocationAddress: Cập nhật form data với province:', result.province);
                setFormData(prev => ({
                    ...prev,
                    province: result.province.name,
                    provinceCode: result.province.code,
                    district: result.district ? result.district.name : '',
                    districtCode: result.district ? result.district.code : '',
                    ward: result.ward ? result.ward.name : '',
                    wardCode: ''
                }));

                // If we have district, fetch districts to populate dropdown
                if (result.district) {
                    console.log('[GuestCheckout] getCurrentLocationAddress: Fetch districts cho province:', result.province.code);
                    await fetchDistricts(result.province.code);
                    
                    // If we have ward, fetch wards to populate dropdown
                    if (result.ward) {
                        console.log('[GuestCheckout] getCurrentLocationAddress: Fetch wards cho district:', result.district.code);
                        await fetchWards(result.district.code);
                        
                        // Trigger stock check similar to handleWardChange
                        console.log('[GuestCheckout] getCurrentLocationAddress: Bắt đầu kiểm tra stock...');
                        setTimeout(async () => {
                            try {
                                setIsCheckingStock(true);
                                
                                let userSession = await getCurrentUserSessionAsync();
                                if (!userSession) {
                                    userSession = createGuestSession();
                                }

                                try {
                                    await stockService.clearAllReservations(userSession);
                                } catch (error) {
                                    console.error('Lỗi khi xóa reservations cũ:', error);
                                }

                                const fullAddress = `${result.ward.name}, ${result.district.name}, ${result.province.name}`;
                                console.log('[GuestCheckout] getCurrentLocationAddress: Địa chỉ đầy đủ:', fullAddress);
                                
                                const branchResult = await branchService.findNearestBranch(fullAddress);
                                console.log('[GuestCheckout] getCurrentLocationAddress: Kết quả tìm chi nhánh:', branchResult);
                                
                                if (branchResult.success && branchResult.branch) {
                                    console.log('[GuestCheckout] getCurrentLocationAddress: Đã tìm thấy chi nhánh:', branchResult.branch);
                                    
                                    // Kiểm tra khoảng cách (có coordinates từ reverse geocode)
                                    if (result.coordinates && branchResult.branch.latitude && branchResult.branch.longitude) {
                                        const distance = calculateDistance(
                                            result.coordinates.lat,
                                            result.coordinates.lng,
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
                                    console.log('[GuestCheckout] getCurrentLocationAddress: Kết quả kiểm tra stock:', stockResult);
                                    
                                    if (stockResult.success && stockResult.available) {
                                        console.log('[GuestCheckout] getCurrentLocationAddress: Chi nhánh có đủ hàng');
                                        setBranchStockStatus({ available: true, message: 'Chi nhánh có đủ hàng' });
                                        showToast('Chi nhánh có đủ hàng, có thể đặt hàng', 'success');
                                    } else {
                                        console.log('[GuestCheckout] getCurrentLocationAddress: Chi nhánh hết hàng, tìm chi nhánh khác');
                                        setBranchStockStatus({ available: false, message: 'Chi nhánh hết hàng, đang tìm chi nhánh khác...' });
                                        showToast('Chi nhánh gần nhất hết hàng, đang tìm chi nhánh khác...', 'warning');
                                        
                                        await findAlternativeBranchWithStock(fullAddress, branchResult.branch.branchId, cartItems, userSession);
                                    }
                                } else {
                                    console.warn('[GuestCheckout] getCurrentLocationAddress: Không tìm thấy chi nhánh');
                                    setSelectedBranch(null);
                                    setBranchStockStatus({ available: false, message: 'Không tìm thấy chi nhánh gần địa chỉ này' });
                                    showToast('Không tìm thấy chi nhánh gần địa chỉ này', 'error');
                                }
                            } catch (error) {
                                console.error('[GuestCheckout] getCurrentLocationAddress: Lỗi khi kiểm tra stock:', error);
                                setBranchStockStatus({ available: false, message: 'Lỗi khi kiểm tra tồn kho' });
                            } finally {
                                setIsCheckingStock(false);
                            }
                        }, 100);
                    } else {
                        console.log('[GuestCheckout] getCurrentLocationAddress: Không có ward, chỉ có district');
                    }
                } else {
                    console.log('[GuestCheckout] getCurrentLocationAddress: Không có district, chỉ có province');
                }
            }

            console.log('[GuestCheckout] getCurrentLocationAddress: Hoàn thành, hiển thị toast:', result.message);
            showToast(result.message, 'success');
        } catch (error) {
            console.error('[GuestCheckout] getCurrentLocationAddress: Lỗi:', error);
            showToast(error.message || 'Lỗi khi lấy địa chỉ từ vị trí', 'error');
        } finally {
            setIsGettingLocation(false);
            console.log('[GuestCheckout] getCurrentLocationAddress: Đã hoàn thành (finally)');
        }
    };

    // Handle confirm location from map picker
    const handleLocationFromMapConfirm = async (locationData) => {
        console.log('[GuestCheckout] handleLocationFromMapConfirm: Location data:', locationData);
        
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
            console.log('[GuestCheckout] handleLocationFromMapConfirm: Xóa reservations cũ do thay đổi địa chỉ');
            await stockService.clearAllReservations(userSession);
        } catch (error) {
            console.error('[GuestCheckout] handleLocationFromMapConfirm: Lỗi khi xóa reservations cũ:', error);
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
                    
                    // Trigger stock check
                    setTimeout(async () => {
                        try {
                            setIsCheckingStock(true);
                            
                            let userSession = await getCurrentUserSessionAsync();
                            if (!userSession) {
                                userSession = createGuestSession();
                            }

                            // Đảm bảo đã xóa reservations (có thể đã xóa ở trên, nhưng xóa lại để chắc chắn)
                            try {
                                await stockService.clearAllReservations(userSession);
                            } catch (error) {
                                console.error('[GuestCheckout] handleLocationFromMapConfirm: Lỗi khi xóa reservations cũ (lần 2):', error);
                            }

                            const fullAddress = [
                                locationData.streetAddress,
                                locationData.ward.name,
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
                                setBranchStockStatus({ available: false, message: 'Không tìm thấy chi nhánh gần địa chỉ này' });
                                showToast('Không tìm thấy chi nhánh gần địa chỉ này', 'error');
                            }
                        } catch (error) {
                            console.error('Lỗi khi kiểm tra stock:', error);
                            setBranchStockStatus({ available: false, message: 'Lỗi khi kiểm tra tồn kho' });
                        } finally {
                            setIsCheckingStock(false);
                        }
                    }, 100);
                }
            }

            showToast('Đã chọn địa chỉ từ bản đồ thành công!', 'success');
        }
    };

    const validateRequired = () => {
        const { name, province, district, phone } = formData;
        
        // Nếu chọn mode map, cần có selectedLocationFromMap
        if (addressInputMode === 'map') {
            return (
                name.trim() !== '' &&
                phone.trim() !== '' &&
                selectedLocationFromMap !== null &&
                selectedLocationFromMap.province !== ''
            );
        }
        
        // Mode manual: cần có province và district
        return (
            name.trim() !== '' &&
            province.trim() !== '' &&
            district.trim() !== '' &&
            phone.trim() !== ''
        );
    };

    // Function to proceed with order creation (after payment success)
    const proceedWithOrder = async () => {
        try {
            setSubmitting(true);
            setIsCheckingStock(true);
            
            // Fetch cart to build order items
            const cartItems = await cartService.getCartItems();
            if (!cartItems || cartItems.length === 0) {
                showToast('Your cart is empty. Please add items before checkout.', 'warning');
                return;
            }

            // Kiểm tra đã có chi nhánh được chọn chưa
            if (!selectedBranch) {
                showToast('Vui lòng chọn địa chỉ giao hàng để hệ thống tự động chọn chi nhánh gần nhất.', 'warning');
                return;
            }

            // QUAN TRỌNG: Kiểm tra lại khoảng cách trước khi submit
            // Để đảm bảo không bypass validation
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
            } else if (addressInputMode === 'manual') {
                // Nếu nhập thủ công, không có coordinates nên không thể kiểm tra ở frontend
                // Backend sẽ kiểm tra khi tạo order
                console.log('[GuestCheckout] proceedWithOrder: Manual address input, distance validation will be done by backend');
            }

            // Build full deliveryAddress for database storage
            // Nếu chọn từ map, ưu tiên dùng địa chỉ từ selectedLocationFromMap (đã loại bỏ postal code)
            const fullDeliveryAddress = (() => {
                if (addressInputMode === 'map' && selectedLocationFromMap) {
                    // Dùng địa chỉ từ map (đã loại bỏ postal code khi hiển thị)
                    const address = [
                        selectedLocationFromMap.streetAddress,
                        selectedLocationFromMap.ward,
                        selectedLocationFromMap.district,
                        selectedLocationFromMap.province
                    ].filter(a => a && a.trim()).join(', ');
                    
                    // Đảm bảo loại bỏ postal code nếu có trong fullAddress
                    if (selectedLocationFromMap.fullAddress) {
                        let cleanAddress = selectedLocationFromMap.fullAddress;
                        // Remove postal code pattern (5 digits, possibly with spaces or commas)
                        cleanAddress = cleanAddress.replace(/,\s*\d{5}\s*,?/g, '').replace(/,\s*\d{5}$/, '').trim();
                        // Nếu address từ map không rỗng, dùng nó; nếu không dùng cleanAddress
                        return address || cleanAddress;
                    }
                    return address;
                }
                // Nếu không chọn từ map, dùng formData
                return [
                    formData.streetAddress,
                    formData.ward,
                    formData.district,
                    formData.province
                ].filter(a => a && a.trim()).join(', ');
            })();

            // Build deliveryAddress for branch selection (district + province only)
            const deliveryAddress = [
                formData.district,
                formData.province
            ].filter(a => a.trim()).join(', ');

            // Lấy thông tin session để liên kết với reservations
            const userSession = await getCurrentUserSessionAsync();
            const cartId = userSession?.cartId || null;
            const guestId = userSession?.guestId || null;

            const payload = {
                customerName: formData.name,
                phone: formData.phone,
                email: formData.email,
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

            const orderResult = await orderService.createGuestOrder(payload);
            try { await cartService.clearCart(); } catch (_) { }

            try {
                const totalAmount = orderResult?.totalAmount ??
                    cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
                await notificationService.notifyOrderCreated({
                    orderId: orderResult?.orderId,
                    branchId: selectedBranch.branchId,
                    customerId: null,
                    customerName: formData.name,
                    customerEmail: formData.email,
                    phone: formData.phone,
                    totalAmount,
                    paymentMethod: formData.paymentMethod,
                    createdAt: new Date().toISOString(),
                    items: cartItems.map((it) => ({
                        pdId: it.productDetailId,
                        productName: it.productName || it.name || 'Item',
                        quantity: it.quantity,
                    })),
                });
            } catch (notifyError) {
                console.error('Failed to notify staff about guest order:', notifyError);
            }

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

            showToast('Guest order placed successfully!', 'success');
            window.dispatchEvent(new Event('cartUpdated'));
            navigate('/coffee');
        } catch (error) {
            console.error('Guest order creation failed:', error);
            const errorMsg = error?.response?.data?.message || error.message || 'Failed to place guest order';
            showToast('Guest order failed: ' + errorMsg, 'error');
        } finally {
            setSubmitting(false);
            setIsCheckingStock(false);
        }
    };

    const onSubmit = async (e) => {
        e.preventDefault();

        if (!validateRequired()) {
            if (addressInputMode === 'map') {
                showToast('Vui lòng điền đầy đủ thông tin (Tên, Số điện thoại) và chọn địa chỉ trên bản đồ!', 'warning');
            } else {
                showToast('Vui lòng điền đầy đủ thông tin (Tên, Tỉnh/Thành phố, Quận/Huyện, Số điện thoại)!', 'warning');
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
        alert('Payment failed. Please try again.');
    };

    // Handle go back from Momo payment
    const handleMomoGoBack = () => {
        setShowMomoPayment(false);
        setOrderInfo(null);
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
            {/* Hero Section */}
            <section className="home-slider owl-carousel">
                <div className="slider-item" style={{ backgroundImage: 'url(/images/bg_3.jpg)' }} data-stellar-background-ratio="0.5">
                    <div className="overlay"></div>
                    <div className="container">
                        <div className="row slider-text justify-content-center align-items-center">
                            <div className="col-md-7 col-sm-12 text-center">
                                <h1 className="mb-3 mt-5 bread">CHECKOUT</h1>
                                <p className="breadcrumbs">
                                    <span className="mr-2"><Link to="/coffee">Home</Link></span>
                                    <span>CHECKOUT</span>
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
                                            />
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

                                    {/* Address Input Mode Selection */}
                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label className="mb-3">Cách nhập địa chỉ *</label>
                                            <div className="btn-group w-100" role="group">
                                                <button
                                                    type="button"
                                                    className={`btn ${addressInputMode === 'manual' ? 'btn-primary' : 'btn-outline-primary'}`}
                                                    onClick={() => setAddressInputMode('manual')}
                                                >
                                                    <i className="fa fa-edit me-2"></i>
                                                    Nhập địa chỉ
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`btn ${addressInputMode === 'map' ? 'btn-primary' : 'btn-outline-primary'}`}
                                                    onClick={() => {
                                                        setAddressInputMode('map');
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

                                    {/* Manual Address Input */}
                                    {addressInputMode === 'manual' && (
                                        <>
                                            <div className="col-md-12">
                                                <div className="form-group">
                                                    <label htmlFor="province">Province / City *</label>
                                            <div className="select-wrap">
                                                <div className="icon">
                                                    <span className="ion-ios-arrow-down"></span>
                                                </div>
                                                <select
                                                    name="province"
                                                    id="province"
                                                    value={formData.provinceCode}
                                                    onChange={handleProvinceChange}
                                                    className="form-control"
                                                >
                                                    <option value="">Select Province/City</option>
                                                    {provinces.map((province) => (
                                                        <option key={province.code} value={province.code}>
                                                            {province.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-100"></div>

                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label htmlFor="district">District *</label>
                                            <div className="select-wrap">
                                                <div className="icon">
                                                    <span className="ion-ios-arrow-down"></span>
                                                </div>
                                                <select
                                                    name="district"
                                                    id="district"
                                                    value={formData.districtCode}
                                                    onChange={handleDistrictChange}
                                                    className="form-control"
                                                    disabled={!formData.provinceCode}
                                                >
                                                    <option value="">Select District</option>
                                                    {districts.map((district) => (
                                                        <option key={district.code} value={district.code}>
                                                            {district.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-100"></div>

                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label htmlFor="ward">Ward *</label>
                                            <div className="select-wrap">
                                                <div className="icon">
                                                    <span className="ion-ios-arrow-down"></span>
                                                </div>
                                                <select
                                                    name="ward"
                                                    id="ward"
                                                    value={formData.ward}
                                                    onChange={handleWardChange}
                                                    className="form-control"
                                                    disabled={!formData.districtCode}
                                                >
                                                    <option value="">Select Ward</option>
                                                    {wards.map((ward) => (
                                                        <option key={ward.code} value={ward.name}>
                                                            {ward.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-100"></div>

                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label htmlFor="streetAddress">Street Address / House Number (Optional)</label>
                                            <input
                                                type="text"
                                                id="streetAddress"
                                                name="streetAddress"
                                                value={formData.streetAddress}
                                                onChange={handleStreetAddressChange}
                                                className="form-control"
                                                placeholder="e.g., 123 ABC Street"
                                            />
                                        </div>
                                    </div>

                                    <div className="w-100"></div>
                                        </>
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

                                    {/* Hiển thị thông tin chi nhánh, trạng thái stock và nút chọn trên bản đồ */}
                            {selectedBranch && (
                                <div className="col-md-12">
                                    <div className="mt-3 p-3 border rounded" style={{ backgroundColor: '#2a2a2a', borderColor: '#444' }}>
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <div className="d-flex align-items-center">
                                                <i className="fa fa-store me-2" style={{ color: '#C39C5E' }}></i>
                                                <strong>Chi nhánh phục vụ:</strong>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-primary"
                                                onClick={() => {
                                                    if (!formData.province || !formData.district || !formData.ward) {
                                                        showToast('Vui lòng chọn đầy đủ địa chỉ giao hàng trước', 'warning');
                                                        return;
                                                    }
                                                    setShowBranchMap(true);
                                                }}
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
                                </div>
                            )}

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
                                                placeholder=""
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
                                                placeholder=""
                                            />
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
                                                        <div className="product-image me-4" style={{ minWidth: '60px' }}>
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
                                                        <div className="product-info flex-grow-1" style={{ paddingLeft: '10px' }}>
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
                                                            disabled={!formData.province || !formData.district || !formData.ward}
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
            </section>

            {/* Location Map Picker Modal */}
            <LocationMapPicker
                isOpen={showLocationMapPicker}
                onClose={() => setShowLocationMapPicker(false)}
                onConfirm={(locationData) => {
                    handleLocationFromMapConfirm(locationData);
                }}
                provinces={provinces}
                apiGateway={CONFIG.API_GATEWAY}
                fetchDistricts={fetchDistricts}
                fetchWards={fetchWards}
                initialLocation={selectedLocationFromMap?.rawLocationData || null}
            />

            {/* Branch Map Selector Modal cho guest checkout */}
            {formData.province && formData.district && formData.ward && (
                <BranchMapSelector
                    isOpen={showBranchMap}
                    onClose={() => setShowBranchMap(false)}
                    onSelectBranch={async (branch) => {
                        setSelectedBranch(branch);
                        setShowBranchMap(false);

                        // Kiểm tra lại tồn kho cho chi nhánh được chọn
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
                            setBranchStockStatus({ available: false, message: 'Lỗi khi kiểm tra tồn kho' });
                            showToast('Lỗi khi kiểm tra tồn kho', 'error');
                        }
                    }}
                    deliveryAddress={(() => {
                        // Nếu có địa chỉ từ map với coordinates, ưu tiên dùng nó
                        if (addressInputMode === 'map' && selectedLocationFromMap && selectedLocationFromMap.coordinates) {
                            // Build address từ selectedLocationFromMap (đã loại bỏ postal code)
                            const address = [
                                selectedLocationFromMap.streetAddress,
                                selectedLocationFromMap.ward,
                                selectedLocationFromMap.district,
                                selectedLocationFromMap.province
                            ].filter(a => a && a.trim()).join(', ');
                            return address;
                        }
                        // Nếu không, dùng formData
                        return [
                            formData.streetAddress,
                            formData.ward,
                            formData.district,
                            formData.province
                        ].filter(a => a && a.trim()).join(', ');
                    })()}
                    deliveryCoordinates={(() => {
                        // Nếu có coordinates từ map, truyền luôn để tăng độ chính xác
                        if (addressInputMode === 'map' && selectedLocationFromMap && selectedLocationFromMap.coordinates) {
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

export default GuestCheckout;
