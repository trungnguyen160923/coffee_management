import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import '../../utils/leafletConfig'; // Fix icon issue
import { branchService } from '../../services/branchService';
import { stockService } from '../../services/stockService';
import { showToast } from '../../utils/toast';

// Custom marker icons
const createCustomIcon = (color) => {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: ${color};
            width: 30px;
            height: 30px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        ">
            <div style="
                transform: rotate(45deg);
                color: white;
                font-weight: bold;
                text-align: center;
                line-height: 24px;
                font-size: 12px;
            ">📍</div>
        </div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    });
};

// Component để fit bounds khi branches thay đổi
function MapBounds({ branches, userLocation, currentUserLocation }) {
    const map = useMap();
    
    useEffect(() => {
        if (branches.length === 0) return;
        
        const bounds = L.latLngBounds([]);
        
        // Thêm vị trí địa chỉ giao hàng vào bounds
        if (userLocation) {
            bounds.extend([userLocation.lat, userLocation.lng]);
        }
        
        // Thêm vị trí hiện tại của người dùng vào bounds
        if (currentUserLocation) {
            bounds.extend([currentUserLocation.lat, currentUserLocation.lng]);
        }
        
        // Thêm tất cả chi nhánh vào bounds
        branches.forEach(item => {
            if (item.branch.latitude && item.branch.longitude) {
                bounds.extend([item.branch.latitude, item.branch.longitude]);
            }
        });
        
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
    }, [branches, userLocation, currentUserLocation, map]);
    
    return null;
}

const BranchMapSelector = ({ 
    isOpen, 
    onClose, 
    onSelectBranch, 
    deliveryAddress,
    cartItems,
    userSession,
    selectedBranch: currentSelectedBranch 
}) => {
    const [allBranches, setAllBranches] = useState([]); // Tất cả chi nhánh (để hiển thị trên map)
    const [branches, setBranches] = useState([]); // Chi nhánh có thể chọn (có hàng) - để hiển thị trong danh sách
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [loading, setLoading] = useState(false);
    const [userLocation, setUserLocation] = useState(null); // Vị trí địa chỉ giao hàng
    const [currentUserLocation, setCurrentUserLocation] = useState(null); // Vị trí hiện tại của người dùng (geolocation)
    const [branchStockStatus, setBranchStockStatus] = useState({});
    const [mapCenter, setMapCenter] = useState([10.8231, 106.6297]); // Hồ Chí Minh
    const mapRef = useRef(null);

    // Đảm bảo userLocation được set đúng sau khi geocoding
    useEffect(() => {
        if (userLocation) {
            console.log('✅ userLocation updated:', userLocation);
        }
    }, [userLocation]);

    // Load danh sách chi nhánh khi mở modal
    useEffect(() => {
        console.log('=== BranchMapSelector useEffect ===');
        console.log('isOpen:', isOpen);
        console.log('deliveryAddress:', deliveryAddress);
        console.log('deliveryAddress type:', typeof deliveryAddress);
        console.log('deliveryAddress length:', deliveryAddress?.length);
        
        if (isOpen && deliveryAddress) {
            console.log('✅ Conditions met, calling functions...');
            loadBranches();
            geocodeUserAddress();
            getCurrentUserPosition(); // Lấy vị trí hiện tại của người dùng
        } else {
            console.warn('❌ Conditions not met:', { isOpen, deliveryAddress });
        }
    }, [isOpen, deliveryAddress]);

    // Ngăn scroll page khi đang ở trong modal
    useEffect(() => {
        if (isOpen) {
            // Lưu giá trị overflow ban đầu
            const originalOverflow = document.body.style.overflow;
            // Ngăn scroll body
            document.body.style.overflow = 'hidden';
            
            return () => {
                // Khôi phục scroll khi đóng modal
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isOpen]);

    // Lấy vị trí hiện tại của người dùng (browser geolocation)
    const getCurrentUserPosition = () => {
        if (!navigator.geolocation) {
            console.warn('Geolocation is not supported by this browser');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                setCurrentUserLocation(location);
            },
            (error) => {
                // Không hiển thị lỗi cho user, chỉ log
                if (error.code === error.TIMEOUT) {
                    console.warn('Geolocation timeout - user location will not be shown');
                } else if (error.code === error.PERMISSION_DENIED) {
                    console.warn('Geolocation permission denied - user location will not be shown');
                } else {
                    console.warn('Error getting user location:', error.message);
                }
            },
            {
                enableHighAccuracy: false, // Giảm từ true để tránh timeout
                timeout: 10000, // Tăng timeout lên 10 giây
                maximumAge: 300000 // Cache 5 phút
            }
        );
    };

    // Geocode địa chỉ user (sử dụng OpenStreetMap Nominatim - miễn phí)
    const geocodeUserAddress = async () => {
        console.log('=== geocodeUserAddress called ===');
        console.log('deliveryAddress:', deliveryAddress);
        
        if (!deliveryAddress) {
            console.warn('❌ No deliveryAddress provided');
            return;
        }
        
        // Tạo danh sách các cách thử geocode (từ chi tiết đến đơn giản)
        const geocodeAttempts = [
            deliveryAddress, // Thử địa chỉ đầy đủ trước
            // Nếu fail, thử với địa chỉ đơn giản hơn
            deliveryAddress.split(',').slice(-2).join(',').trim(), // Chỉ lấy 2 phần cuối (Quận, Thành phố)
            deliveryAddress.split(',').slice(-1).join(',').trim(), // Chỉ lấy phần cuối (Thành phố)
        ];
        
        for (let attempt = 0; attempt < geocodeAttempts.length; attempt++) {
            const addressToGeocode = geocodeAttempts[attempt];
            if (!addressToGeocode) continue;
            
            try {
                const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressToGeocode)}&limit=1&countrycodes=vn`;
                console.log(`🌐 Geocoding attempt ${attempt + 1}/${geocodeAttempts.length}:`, addressToGeocode);
                console.log('🌐 Geocoding URL:', geocodeUrl);
                
                // Sử dụng OpenStreetMap Nominatim (miễn phí, không cần API key)
                const response = await fetch(geocodeUrl, {
                    headers: {
                        'User-Agent': 'CoffeeManagementApp/1.0' // Required by Nominatim
                    }
                });
                
                console.log('📡 Response status:', response.status);
                const data = await response.json();
                console.log('📦 Geocoding response data:', data);
                
                if (data && data.length > 0) {
                    const location = {
                        lat: parseFloat(data[0].lat),
                        lng: parseFloat(data[0].lon)
                    };
                    console.log('✅ Setting userLocation:', location);
                    setUserLocation(location);
                    setMapCenter([location.lat, location.lng]);
                    return; // Thành công, dừng lại
                } else {
                    console.warn(`❌ Attempt ${attempt + 1} failed: No location found`);
                    if (attempt < geocodeAttempts.length - 1) {
                        console.log('🔄 Trying next attempt...');
                    }
                }
            } catch (error) {
                console.error(`❌ Error geocoding attempt ${attempt + 1}:`, error);
                if (attempt < geocodeAttempts.length - 1) {
                    console.log('🔄 Trying next attempt...');
                }
            }
        }
        
        // Nếu tất cả đều fail, thử với tọa độ mặc định của Quận 9, HCM
        console.warn('⚠️ All geocoding attempts failed, using fallback location for Quận 9, HCM');
        const fallbackLocation = {
            lat: 10.8428,
            lng: 106.8097
        };
        setUserLocation(fallbackLocation);
        setMapCenter([fallbackLocation.lat, fallbackLocation.lng]);
    };

    // Load tất cả chi nhánh và tính distance
    const loadBranches = async () => {
        if (!deliveryAddress) return;
        
        setLoading(true);
        try {
            // Lấy tất cả chi nhánh
            const allBranchesList = await branchService.getAllBranches();
            
            if (!allBranchesList || allBranchesList.length === 0) {
                showToast('Không tìm thấy chi nhánh nào', 'warning');
                setAllBranches([]);
                setBranches([]);
                return;
            }
            
            // Tính distance cho tất cả chi nhánh
            const result = await branchService.findTopNearestBranchesWithDistance(
                deliveryAddress, 
                1000 // Lấy số lượng lớn để có tất cả chi nhánh
            );
            
            if (result.success && result.branches) {
                // Lưu tất cả chi nhánh (có distance) để hiển thị trên map
                setAllBranches(result.branches);
                
                // Kiểm tra stock cho tất cả chi nhánh
                await checkStockForAllBranches(result.branches);
                
                // Filter chỉ lấy chi nhánh có hàng để hiển thị trong danh sách
                // (sẽ được cập nhật sau khi checkStockForAllBranches hoàn thành)
            } else {
                // Fallback: nếu không có distance, vẫn hiển thị tất cả chi nhánh
                const branchesWithDistance = allBranchesList.map(branch => ({
                    branch: branch,
                    distance: null,
                    estimatedDeliveryTime: null
                }));
                setAllBranches(branchesWithDistance);
                await checkStockForAllBranches(branchesWithDistance);
            }
        } catch (error) {
            console.error('Error loading branches:', error);
            showToast('Lỗi khi tải danh sách chi nhánh', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Kiểm tra stock cho tất cả chi nhánh
    const checkStockForAllBranches = async (branchesList) => {
        if (!cartItems || cartItems.length === 0 || !userSession) {
            return;
        }

        const stockStatusMap = {};
        
        for (const item of branchesList) {
            try {
                const stockResult = await stockService.checkStockAvailability(
                    cartItems,
                    item.branch.branchId,
                    userSession
                );
                stockStatusMap[item.branch.branchId] = {
                    available: stockResult.success && stockResult.available,
                    message: stockResult.message || ''
                };
            } catch (error) {
                console.error(`Error checking stock for branch ${item.branch.branchId}:`, error);
                stockStatusMap[item.branch.branchId] = {
                    available: false,
                    message: 'Lỗi khi kiểm tra tồn kho'
                };
            }
        }
        
        setBranchStockStatus(stockStatusMap);
    };

    // Xử lý khi click marker
    const handleMarkerClick = (branchItem) => {
        setSelectedBranch(branchItem);
    };

    // Hàm để pan/fly to vị trí trên bản đồ
    const panToLocation = (lat, lng, zoom = 15) => {
        if (mapRef.current) {
            const map = mapRef.current;
            map.flyTo([lat, lng], zoom, {
                animate: true,
                duration: 1.0
            });
        }
    };

    // Hàm để pan to tất cả các vị trí (fit bounds)
    const panToAllLocations = () => {
        if (mapRef.current && branches.length > 0) {
            const map = mapRef.current;
            const bounds = L.latLngBounds([]);
            
            if (userLocation) {
                bounds.extend([userLocation.lat, userLocation.lng]);
            }
            if (currentUserLocation) {
                bounds.extend([currentUserLocation.lat, currentUserLocation.lng]);
            }
            branches.forEach(item => {
                if (item.branch.latitude && item.branch.longitude) {
                    bounds.extend([item.branch.latitude, item.branch.longitude]);
                }
            });
            
            if (bounds.isValid()) {
                map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 15 });
            }
        }
    };

    // Xử lý khi chọn chi nhánh
    const handleSelectBranch = async (branchItem) => {
        const branch = branchItem.branch;
        const stockStatus = branchStockStatus[branch.branchId];
        
        // Kiểm tra stock nếu chưa có
        if (!stockStatus && cartItems && cartItems.length > 0 && userSession) {
            try {
                const stockResult = await stockService.checkStockAvailability(
                    cartItems,
                    branch.branchId,
                    userSession
                );
                
                if (!stockResult.success || !stockResult.available) {
                    showToast('Chi nhánh này không có đủ hàng', 'warning');
                    return;
                }
            } catch (error) {
                console.error('Error checking stock:', error);
                showToast('Lỗi khi kiểm tra tồn kho', 'error');
                return;
            }
        } else if (stockStatus && !stockStatus.available) {
            showToast('Chi nhánh này không có đủ hàng', 'warning');
            return;
        }
        
        // Chọn chi nhánh
        onSelectBranch(branch);
        showToast(`Đã chọn chi nhánh: ${branch.name}`, 'success');
        onClose();
    };

    // Format thời gian từ LocalTime string (HH:mm:ss) hoặc object
    const formatTime = (time) => {
        if (!time) return '';
        // Nếu là string, lấy phần HH:mm
        if (typeof time === 'string') {
            return time.substring(0, 5); // Lấy HH:mm từ "HH:mm:ss"
        }
        // Nếu là object có format method
        if (time.format) {
            return time.format('HH:mm');
        }
        return String(time);
    };

    // Format openDays từ "1,2,3,4,5,6,7" thành "Thứ 2 - Chủ nhật" hoặc "Thứ 2-7"
    const formatOpenDays = (openDays) => {
        if (!openDays || !openDays.trim()) return 'Tất cả các ngày';
        
        const dayNames = {
            1: 'Thứ 2',
            2: 'Thứ 3',
            3: 'Thứ 4',
            4: 'Thứ 5',
            5: 'Thứ 6',
            6: 'Thứ 7',
            7: 'Chủ nhật'
        };
        
        const days = openDays.split(',').map(d => parseInt(d.trim())).filter(d => d >= 1 && d <= 7).sort((a, b) => a - b);
        
        if (days.length === 0) return 'Tất cả các ngày';
        if (days.length === 7) return 'Tất cả các ngày';
        
        // Nếu là dãy liên tục (ví dụ: 1,2,3,4,5)
        let isConsecutive = true;
        for (let i = 1; i < days.length; i++) {
            if (days[i] !== days[i-1] + 1) {
                isConsecutive = false;
                break;
            }
        }
        
        if (isConsecutive) {
            if (days.length === 1) {
                return dayNames[days[0]];
            } else {
                return `${dayNames[days[0]]} - ${dayNames[days[days.length - 1]]}`;
            }
        } else {
            // Không liên tục, liệt kê từng ngày
            return days.map(d => dayNames[d]).join(', ');
        }
    };

    // Kiểm tra chi nhánh có đang hoạt động không (openDays + working hours)
    const isBranchOperating = (branch) => {
        if (!branch) return false;
        
        // 1. Kiểm tra openDays
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
        // Convert sang format backend: 1=Monday, 7=Sunday
        const backendDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
        
        if (branch.openDays) {
            const openDays = branch.openDays.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
            if (openDays.length > 0 && !openDays.includes(backendDayOfWeek)) {
                return false; // Không hoạt động vào ngày hôm nay
            }
        }
        
        // 2. Kiểm tra working hours
        if (branch.openHours && branch.endHours) {
            const now = new Date();
            const currentHours = now.getHours();
            const currentMinutes = now.getMinutes();
            const currentTimeMinutes = currentHours * 60 + currentMinutes;
            
            const openTimeStr = formatTime(branch.openHours);
            const endTimeStr = formatTime(branch.endHours);
            
            const [openH, openM] = openTimeStr.split(':').map(Number);
            const [endH, endM] = endTimeStr.split(':').map(Number);
            const openTimeMinutes = openH * 60 + openM;
            const endTimeMinutes = endH * 60 + endM;
            
            // So sánh thời gian
            if (openTimeMinutes <= endTimeMinutes) {
                // Normal same-day window (e.g., 08:00 - 22:00)
                if (currentTimeMinutes < openTimeMinutes || currentTimeMinutes > endTimeMinutes) {
                    return false; // Ngoài giờ làm việc
                }
            } else {
                // Overnight window (e.g., 22:00 - 06:00)
                if (currentTimeMinutes < openTimeMinutes && currentTimeMinutes > endTimeMinutes) {
                    return false; // Ngoài giờ làm việc
                }
            }
        }
        
        return true; // Đang hoạt động
    };

    // Lấy icon marker dựa trên trạng thái
    const getMarkerIcon = (branchItem) => {
        const branchId = branchItem.branch.branchId;
        const stockStatus = branchStockStatus[branchId];
        const isSelected = currentSelectedBranch?.branchId === branchId;
        
        if (isSelected) {
            // Chi nhánh được hệ thống tự chọn - màu xanh lá đậm với border
            return L.divIcon({
                className: 'custom-marker',
                html: `<div style="
                    background-color: #28a745;
                    width: 35px;
                    height: 35px;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    border: 4px solid #155724;
                    box-shadow: 0 3px 8px rgba(0,0,0,0.4);
                ">
                    <div style="
                        transform: rotate(45deg);
                        color: white;
                        font-weight: bold;
                        text-align: center;
                        line-height: 27px;
                        font-size: 14px;
                    ">✓</div>
                </div>`,
                iconSize: [35, 35],
                iconAnchor: [17, 35],
                popupAnchor: [0, -35]
            });
        }
        
        if (stockStatus && !stockStatus.available) {
            return createCustomIcon('#dc3545'); // Red - Out of stock
        }
        
        return createCustomIcon('#ffc107'); // Yellow - Available
    };

    if (!isOpen) return null;

    return (
        <div 
            className="modal fade show" 
            style={{ display: 'block' }} 
            tabIndex="-1"
            onWheel={(e) => {
                // Ngăn scroll propagation khi cuộn trong modal
                e.stopPropagation();
            }}
            onTouchMove={(e) => {
                // Ngăn scroll propagation khi touch trong modal
                e.stopPropagation();
            }}
        >
            <div className="modal-dialog" style={{ 
                maxWidth: '95vw', 
                width: '95vw', 
                height: '95vh',
                margin: '2.5vh auto'
            }}>
                <div className="modal-content" style={{ 
                    backgroundColor: '#1a1a1a', 
                    color: '#ffffff',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div className="modal-header border-secondary">
                        <h5 className="modal-title">
                            <i className="fa fa-map-marker-alt me-2" style={{ color: '#C39C5E' }}></i>
                            Chọn Chi Nhánh trên Bản Đồ
                        </h5>
                        <button 
                            type="button" 
                            className="btn-close btn-close-white" 
                            onClick={onClose}
                        ></button>
                    </div>
                    
                    <div className="modal-body" style={{ flex: 1, overflow: 'hidden', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                        {loading ? (
                            <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '100%' }}>
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <p className="mt-3">Đang tải bản đồ...</p>
                            </div>
                        ) : (
                            <div className="row" style={{ height: '100%', margin: 0, flex: 1, overflow: 'hidden' }}>
                                {/* Bản đồ */}
                                <div className="col-md-8">
                                    <div style={{ height: 'calc(95vh - 200px)', minHeight: '600px', borderRadius: '8px', overflow: 'hidden' }}>
                                        <MapContainer
                                            center={mapCenter}
                                            zoom={12}
                                            style={{ height: '100%', width: '100%' }}
                                            ref={mapRef}
                                            scrollWheelZoom={true}
                                            doubleClickZoom={true}
                                            dragging={true}
                                            touchZoom={true}
                                        >
                                            {/* Tile Layer - Sử dụng OpenStreetMap (miễn phí) */}
                                            <TileLayer
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            />
                                            
                                            {/* Fit bounds khi branches thay đổi */}
                                            <MapBounds 
                                                branches={allBranches} 
                                                userLocation={userLocation}
                                                currentUserLocation={currentUserLocation}
                                            />
                                            
                                            {/* Marker vị trí hiện tại của người dùng (geolocation) */}
                                            {currentUserLocation && (
                                                <Marker
                                                    position={[currentUserLocation.lat, currentUserLocation.lng]}
                                                    icon={L.divIcon({
                                                        className: 'custom-marker',
                                                        html: `<div style="
                                                            background-color: #6f42c1;
                                                            width: 28px;
                                                            height: 28px;
                                                            border-radius: 50%;
                                                            border: 3px solid white;
                                                            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                                                        ">
                                                            <div style="
                                                                color: white;
                                                                font-weight: bold;
                                                                text-align: center;
                                                                line-height: 22px;
                                                                font-size: 16px;
                                                            ">📍</div>
                                                        </div>`,
                                                        iconSize: [28, 28],
                                                        iconAnchor: [14, 14],
                                                        popupAnchor: [0, -14]
                                                    })}
                                                >
                                                    <Popup>
                                                        <strong>📍 Vị trí hiện tại của bạn</strong>
                                                        <br/>
                                                        <small>Lat: {currentUserLocation.lat.toFixed(6)}, Lng: {currentUserLocation.lng.toFixed(6)}</small>
                                                    </Popup>
                                                </Marker>
                                            )}
                                            
                                            {/* Marker địa chỉ giao hàng đã chọn */}
                                            {(() => {
                                                console.log('🔍 Rendering delivery address marker...');
                                                console.log('userLocation:', userLocation);
                                                console.log('deliveryAddress:', deliveryAddress);
                                                
                                                if (!userLocation) {
                                                    console.warn('⚠️ userLocation is null/undefined, marker will not render');
                                                    return null;
                                                }
                                                
                                                console.log('✅ Rendering marker at:', [userLocation.lat, userLocation.lng]);
                                                return (
                                                    <Marker
                                                        position={[userLocation.lat, userLocation.lng]}
                                                        icon={L.divIcon({
                                                            className: 'custom-marker',
                                                            html: `<div style="
                                                                background-color: #007bff;
                                                                width: 30px;
                                                                height: 30px;
                                                                border-radius: 50% 50% 50% 0;
                                                                transform: rotate(-45deg);
                                                                border: 3px solid white;
                                                                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                                                            ">
                                                                <div style="
                                                                    transform: rotate(45deg);
                                                                    color: white;
                                                                    font-weight: bold;
                                                                    text-align: center;
                                                                    line-height: 24px;
                                                                    font-size: 12px;
                                                                ">🏠</div>
                                                            </div>`,
                                                            iconSize: [30, 30],
                                                            iconAnchor: [15, 30],
                                                            popupAnchor: [0, -30]
                                                        })}
                                                    >
                                                        <Popup>
                                                            <strong>🏠 Địa chỉ giao hàng</strong>
                                                            <br/>
                                                            <small>{deliveryAddress}</small>
                                                        </Popup>
                                                    </Marker>
                                                );
                                            })()}
                                            
                                            {/* Marker các chi nhánh - hiển thị TẤT CẢ */}
                                            {allBranches.map((branchItem) => {
                                                const branch = branchItem.branch;
                                                if (!branch.latitude || !branch.longitude) return null;
                                                
                                                return (
                                                    <Marker
                                                        key={branch.branchId}
                                                        position={[branch.latitude, branch.longitude]}
                                                        icon={getMarkerIcon(branchItem)}
                                                        eventHandlers={{
                                                            click: () => handleMarkerClick(branchItem)
                                                        }}
                                                    >
                                                        <Popup>
                                                            <div style={{ color: '#000', minWidth: '200px' }}>
                                                                <h6 style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                                                                    {branch.name}
                                                                    {currentSelectedBranch?.branchId === branch.branchId && (
                                                                        <span className="badge bg-success ms-2">Được chọn</span>
                                                                    )}
                                                                </h6>
                                                                <p style={{ fontSize: '12px', marginBottom: '4px' }}>
                                                                    <i className="fa fa-map-marker-alt"></i> {branch.address}
                                                                </p>
                                                                {branch.openDays && (
                                                                    <p style={{ fontSize: '12px', marginBottom: '4px', color: '#666' }}>
                                                                        <i className="fa fa-calendar"></i> Ngày làm việc: {formatOpenDays(branch.openDays)}
                                                                    </p>
                                                                )}
                                                                {branch.openHours && branch.endHours && (
                                                                    <p style={{ fontSize: '12px', marginBottom: '4px', color: '#666' }}>
                                                                        <i className="fa fa-clock"></i> Giờ mở cửa: {formatTime(branch.openHours)} - {formatTime(branch.endHours)}
                                                                    </p>
                                                                )}
                                                                {!isBranchOperating(branch) && (
                                                                    <p style={{ 
                                                                        fontSize: '12px', 
                                                                        color: '#dc3545',
                                                                        fontWeight: 'bold',
                                                                        marginBottom: '4px'
                                                                    }}>
                                                                        ⚠️ Chi nhánh hiện không hoạt động
                                                                    </p>
                                                                )}
                                                                <p style={{ fontSize: '12px', marginBottom: '4px' }}>
                                                                    <i className="fa fa-route"></i> Cách {branchItem.distance} km
                                                                </p>
                                                                {branchItem.estimatedDeliveryTime && (
                                                                    <p style={{ fontSize: '12px', marginBottom: '8px' }}>
                                                                        <i className="fa fa-clock"></i> ~{branchItem.estimatedDeliveryTime} phút
                                                                    </p>
                                                                )}
                                                                {branchStockStatus[branch.branchId] && (
                                                                    <p style={{ 
                                                                        fontSize: '12px', 
                                                                        color: branchStockStatus[branch.branchId].available ? 'green' : 'red',
                                                                        fontWeight: 'bold'
                                                                    }}>
                                                                        {branchStockStatus[branch.branchId].available 
                                                                            ? '✓ Có đủ hàng' 
                                                                            : '✗ Hết hàng'}
                                                                    </p>
                                                                )}
                                                                <button
                                                                    className="btn btn-primary btn-sm mt-2"
                                                                    onClick={() => handleSelectBranch(branchItem)}
                                                                    disabled={
                                                                        (branchStockStatus[branch.branchId] && !branchStockStatus[branch.branchId].available) ||
                                                                        !isBranchOperating(branch)
                                                                    }
                                                                    title={!isBranchOperating(branch) ? 'Chi nhánh hiện không hoạt động' : ''}
                                                                >
                                                                    Chọn chi nhánh này
                                                                </button>
                                                            </div>
                                                        </Popup>
                                                    </Marker>
                                                );
                                            })}
                                        </MapContainer>
                                    </div>
                                </div>
                                
                                {/* Danh sách chi nhánh */}
                                <div className="col-md-4" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                                    <div className="card bg-dark border-secondary" style={{ 
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        overflow: 'hidden'
                                    }}>
                                        <div className="card-header">
                                            <h6 className="mb-0">
                                                <i className="fa fa-list me-2"></i>
                                                Chi Nhánh Có Thể Chọn ({branches.length}/{allBranches.length})
                                            </h6>
                                        </div>
                                        <div className="card-body p-0" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                                            {branches.length === 0 ? (
                                                <div className="p-3 text-center text-muted">
                                                    Không tìm thấy chi nhánh nào
                                                </div>
                                            ) : (
                                                branches.map((branchItem) => {
                                                    const branch = branchItem.branch;
                                                    const stockStatus = branchStockStatus[branch.branchId];
                                                    const isSelected = currentSelectedBranch?.branchId === branch.branchId;
                                                    
                                                    return (
                                                        <div
                                                            key={branch.branchId}
                                                            className={`p-3 border-bottom border-secondary ${
                                                                isSelected ? 'bg-success bg-opacity-25' : ''
                                                            }`}
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={() => {
                                                                // Focus marker trên map
                                                                if (mapRef.current && branch.latitude && branch.longitude) {
                                                                    const map = mapRef.current;
                                                                    map.setView([branch.latitude, branch.longitude], 15);
                                                                }
                                                                handleMarkerClick(branchItem);
                                                            }}
                                                        >
                                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                                <h6 className="mb-0" style={{ color: isSelected ? '#4ade80' : '#fff' }}>
                                                                    {branch.name}
                                                                    {isSelected && (
                                                                        <span className="badge bg-success ms-2">Đã chọn</span>
                                                                    )}
                                                                </h6>
                                                                {stockStatus && (
                                                                    <span className={`badge ${
                                                                        stockStatus.available ? 'bg-success' : 'bg-danger'
                                                                    }`}>
                                                                        {stockStatus.available ? 'Có hàng' : 'Hết hàng'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-muted small mb-2">
                                                                <i className="fa fa-map-marker-alt me-1"></i>
                                                                {branch.address}
                                                            </p>
                                                            {branch.openDays && (
                                                                <p className="text-muted small mb-2">
                                                                    <i className="fa fa-calendar me-1"></i>
                                                                    Ngày làm việc: {formatOpenDays(branch.openDays)}
                                                                </p>
                                                            )}
                                                            {branch.openHours && branch.endHours && (
                                                                <p className="text-muted small mb-2">
                                                                    <i className="fa fa-clock me-1"></i>
                                                                    Giờ mở cửa: {formatTime(branch.openHours)} - {formatTime(branch.endHours)}
                                                                </p>
                                                            )}
                                                            {!isBranchOperating(branch) && (
                                                                <p className="text-danger small mb-2" style={{ fontWeight: 'bold' }}>
                                                                    ⚠️ Chi nhánh hiện không hoạt động
                                                                </p>
                                                            )}
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <div>
                                                                    <small className="text-muted">
                                                                        <i className="fa fa-route me-1"></i>
                                                                        {branchItem.distance} km
                                                                    </small>
                                                                    {branchItem.estimatedDeliveryTime && (
                                                                        <small className="text-muted ms-2">
                                                                            <i className="fa fa-clock me-1"></i>
                                                                            ~{branchItem.estimatedDeliveryTime} phút
                                                                        </small>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    className="btn btn-primary btn-sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleSelectBranch(branchItem);
                                                                    }}
                                                                    disabled={
                                                                        (stockStatus && !stockStatus.available) ||
                                                                        !isBranchOperating(branch)
                                                                    }
                                                                    title={!isBranchOperating(branch) ? 'Chi nhánh hiện không hoạt động' : ''}
                                                                >
                                                                    Chọn
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Legend */}
                                    <div className="mt-3 p-2 bg-dark border border-secondary rounded">
                                        <small className="text-muted">
                                            <div 
                                                className="mb-1" 
                                                style={{ cursor: currentUserLocation ? 'pointer' : 'not-allowed', opacity: currentUserLocation ? 1 : 0.5 }}
                                                onClick={() => {
                                                    if (currentUserLocation) {
                                                        panToLocation(currentUserLocation.lat, currentUserLocation.lng, 16);
                                                    }
                                                }}
                                                title={currentUserLocation ? 'Click để xem vị trí hiện tại' : 'Vị trí hiện tại chưa có'}
                                            >
                                                <i className="fa fa-circle text-purple me-2"></i>
                                                Vị trí hiện tại của bạn
                                            </div>
                                            <div 
                                                className="mb-1" 
                                                style={{ cursor: userLocation ? 'pointer' : 'not-allowed', opacity: userLocation ? 1 : 0.5 }}
                                                onClick={() => {
                                                    if (userLocation) {
                                                        panToLocation(userLocation.lat, userLocation.lng, 16);
                                                    }
                                                }}
                                                title={userLocation ? 'Click để xem địa chỉ giao hàng' : 'Địa chỉ giao hàng chưa có'}
                                            >
                                                <i className="fa fa-circle text-primary me-2"></i>
                                                Địa chỉ giao hàng
                                            </div>
                                            <div 
                                                className="mb-1" 
                                                style={{ cursor: branches.filter(b => branchStockStatus[b.branch.branchId]?.available).length > 0 ? 'pointer' : 'not-allowed', opacity: branches.filter(b => branchStockStatus[b.branch.branchId]?.available).length > 0 ? 1 : 0.5 }}
                                                onClick={() => {
                                                    const availableBranches = branches.filter(b => branchStockStatus[b.branch.branchId]?.available);
                                                    if (availableBranches.length > 0) {
                                                        // Pan to branch đầu tiên có hàng
                                                        const firstBranch = availableBranches[0];
                                                        if (firstBranch.branch.latitude && firstBranch.branch.longitude) {
                                                            panToLocation(firstBranch.branch.latitude, firstBranch.branch.longitude, 15);
                                                        }
                                                    }
                                                }}
                                                title="Click để xem chi nhánh có hàng"
                                            >
                                                <i className="fa fa-circle text-warning me-2"></i>
                                                Chi nhánh có hàng
                                            </div>
                                            <div 
                                                className="mb-1" 
                                                style={{ cursor: currentSelectedBranch ? 'pointer' : 'not-allowed', opacity: currentSelectedBranch ? 1 : 0.5 }}
                                                onClick={() => {
                                                    if (currentSelectedBranch && currentSelectedBranch.latitude && currentSelectedBranch.longitude) {
                                                        panToLocation(currentSelectedBranch.latitude, currentSelectedBranch.longitude, 16);
                                                    }
                                                }}
                                                title={currentSelectedBranch ? 'Click để xem chi nhánh được chọn' : 'Chưa có chi nhánh được chọn'}
                                            >
                                                <i className="fa fa-circle text-success me-2"></i>
                                                Chi nhánh được chọn (hệ thống)
                                            </div>
                                            <div style={{ opacity: 0.7 }}>
                                                <i className="fa fa-circle text-danger me-2"></i>
                                                Chi nhánh hết hàng
                                            </div>
                                        </small>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="modal-footer border-secondary">
                        <button 
                            type="button" 
                            className="btn btn-secondary" 
                            onClick={onClose}
                        >
                            <i className="fa fa-times me-1"></i>
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BranchMapSelector;

