import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import '../../utils/leafletConfig';
import { reverseGeocode, getCurrentPosition, findMatchingProvince, findMatchingDistrict, findMatchingWard } from '../../services/locationService';
import { showToast } from '../../utils/toast';

// Component để lắng nghe click trên map
function MapClickHandler({ onLocationSelect }) {
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

    useMapEvents({
        click: async (e) => {
            const { lat, lng } = e.latlng;
            console.log('[LocationMapPicker] Map clicked at:', { lat, lng });
            
            setSelectedLocation({ lat, lng });
            setIsReverseGeocoding(true);

            try {
                const addressData = await reverseGeocode(lat, lng);
                console.log('[LocationMapPicker] Reverse geocoded address:', addressData);
                
                onLocationSelect({
                    lat,
                    lng,
                    ...addressData
                });
                
                setIsReverseGeocoding(false);
            } catch (error) {
                console.error('[LocationMapPicker] Error reverse geocoding:', error);
                showToast('Không thể lấy địa chỉ từ vị trí này', 'error');
                setIsReverseGeocoding(false);
            }
        }
    });

    return selectedLocation ? (
        <Marker
            position={[selectedLocation.lat, selectedLocation.lng]}
            icon={L.divIcon({
                className: 'custom-marker',
                html: `<div style="
                    background-color: #28a745;
                    width: 32px;
                    height: 32px;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                ">
                    <div style="
                        transform: rotate(45deg);
                        color: white;
                        font-weight: bold;
                        text-align: center;
                        line-height: 26px;
                        font-size: 16px;
                    ">📍</div>
                </div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            })}
        >
            <Popup>
                {isReverseGeocoding ? (
                    <div>Đang lấy địa chỉ...</div>
                ) : (
                    <div>
                        <strong>Vị trí đã chọn</strong>
                        <br />
                        <small>Lat: {selectedLocation.lat.toFixed(6)}, Lng: {selectedLocation.lng.toFixed(6)}</small>
                    </div>
                )}
            </Popup>
        </Marker>
    ) : null;
}

// Component để pan to current location
function PanToCurrentLocation({ currentLocation, mapRef }) {
    const map = useMap();
    const [isMapReady, setIsMapReady] = useState(false);
    
    useEffect(() => {
        // Đợi map ready
        if (map && map.getContainer()) {
            setIsMapReady(true);
        }
    }, [map]);
    
    useEffect(() => {
        if (currentLocation && isMapReady && map) {
            // Sử dụng setTimeout để đảm bảo map đã render hoàn toàn
            const timer = setTimeout(() => {
                try {
                    if (map && map.getContainer()) {
                        map.flyTo([currentLocation.lat, currentLocation.lng], 15, {
                            duration: 1
                        });
                    }
                } catch (error) {
                    console.error('[PanToCurrentLocation] Error flying to location:', error);
                }
            }, 100);
            
            return () => clearTimeout(timer);
        }
    }, [currentLocation, isMapReady, map]);

    return null;
}

const LocationMapPicker = ({ 
    isOpen, 
    onClose, 
    onConfirm,
    provinces,
    apiGateway,
    fetchDistricts,
    fetchWards,
    initialLocation = null // { lat, lng, fullAddress, ... } - địa chỉ đã chọn trước đó
}) => {
    const [currentLocation, setCurrentLocation] = useState(null);
    const [selectedLocationData, setSelectedLocationData] = useState(null);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [isProcessingAddress, setIsProcessingAddress] = useState(false);
    const [mapCenter, setMapCenter] = useState([10.8231, 106.6297]); // Hồ Chí Minh
    const mapRef = useRef(null);

    // Lấy vị trí hiện tại khi mở modal và ngăn scroll body
    useEffect(() => {
        if (isOpen) {
            // Ngăn scroll của body khi modal mở
            document.body.style.overflow = 'hidden';
            
            // Nếu có initialLocation (địa chỉ đã chọn trước đó), load nó
            if (initialLocation && initialLocation.coordinates) {
                console.log('[LocationMapPicker] Loading initial location:', initialLocation);
                const { lat, lng } = initialLocation.coordinates;
                setMapCenter([lat, lng]);
                setCurrentLocation({ lat, lng }); // Set current location để hiển thị marker
                
                // Nếu initialLocation đã có đầy đủ thông tin, dùng luôn
                if (initialLocation.province && initialLocation.district) {
                    // Đã có thông tin đầy đủ, không cần reverse geocode lại
                    setSelectedLocationData({
                        lat,
                        lng,
                        province: initialLocation.province.name || initialLocation.province,
                        district: initialLocation.district.name || initialLocation.district,
                        ward: initialLocation.ward ? (initialLocation.ward.name || initialLocation.ward) : '',
                        streetAddress: initialLocation.streetAddress || '',
                        fullAddress: initialLocation.fullAddress || ''
                    });
                } else {
                    // Reverse geocode để lấy đầy đủ thông tin
                    reverseGeocode(lat, lng).then(addressData => {
                        setSelectedLocationData({
                            lat,
                            lng,
                            ...addressData
                        });
                    }).catch(error => {
                        console.error('[LocationMapPicker] Error reverse geocoding initial location:', error);
                    });
                }
            } else {
                // Nếu không có initialLocation, lấy vị trí hiện tại
                getCurrentUserLocation();
            }
        } else {
            // Cho phép scroll lại khi modal đóng
            document.body.style.overflow = '';
        }
        
        // Cleanup: đảm bảo restore scroll khi component unmount
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, initialLocation]);

    const getCurrentUserLocation = async () => {
        setIsGettingLocation(true);
        try {
            const position = await getCurrentPosition();
            setCurrentLocation(position);
            setMapCenter([position.lat, position.lng]);
            
            // Tự động reverse geocode vị trí hiện tại
            try {
                const addressData = await reverseGeocode(position.lat, position.lng);
                setSelectedLocationData({
                    lat: position.lat,
                    lng: position.lng,
                    ...addressData
                });
            } catch (error) {
                console.error('[LocationMapPicker] Error reverse geocoding current location:', error);
            }
        } catch (error) {
            console.error('[LocationMapPicker] Error getting current location:', error);
            showToast('Không thể lấy vị trí hiện tại', 'warning');
        } finally {
            setIsGettingLocation(false);
        }
    };

    const handleLocationSelect = (locationData) => {
        console.log('[LocationMapPicker] Location selected:', locationData);
        setSelectedLocationData(locationData);
    };

    const handleConfirm = async () => {
        if (!selectedLocationData) {
            showToast('Vui lòng chọn vị trí trên bản đồ', 'warning');
            return;
        }

        setIsProcessingAddress(true);
        try {
            // Parse và match với province/district/ward
            const matchedProvince = findMatchingProvince(selectedLocationData.province, provinces);
            
            if (!matchedProvince) {
                showToast('Không tìm thấy tỉnh/thành phố phù hợp. Vui lòng chọn thủ công', 'warning');
                setIsProcessingAddress(false);
                return;
            }

            // Fetch districts
            await fetchDistricts(matchedProvince.code);
            const districtsResponse = await fetch(`${apiGateway}/provinces/p/${matchedProvince.code}?depth=2`);
            const districtsData = await districtsResponse.json();
            const districts = districtsData.districts || [];

            const matchedDistrict = findMatchingDistrict(selectedLocationData.district, districts);
            
            let matchedWard = null;
            if (matchedDistrict) {
                await fetchWards(matchedDistrict.code);
                const wardsResponse = await fetch(`${apiGateway}/provinces/d/${matchedDistrict.code}?depth=2`);
                const wardsData = await wardsResponse.json();
                const wards = wardsData.wards || [];
                matchedWard = findMatchingWard(selectedLocationData.ward, wards);
            }

            onConfirm({
                province: matchedProvince,
                district: matchedDistrict,
                ward: matchedWard,
                streetAddress: selectedLocationData.streetAddress || '',
                fullAddress: selectedLocationData.fullAddress,
                coordinates: { lat: selectedLocationData.lat, lng: selectedLocationData.lng }
            });
            
            onClose();
        } catch (error) {
            console.error('[LocationMapPicker] Error processing address:', error);
            showToast('Lỗi khi xử lý địa chỉ', 'error');
        } finally {
            setIsProcessingAddress(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="modal fade show" 
            style={{ 
                display: 'block', 
                backgroundColor: 'rgba(0,0,0,0.5)',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1050,
                overflow: 'auto'
            }}
            onClick={onClose}
        >
            <div 
                className="modal-dialog modal-lg modal-dialog-centered"
                style={{
                    margin: '1.75rem auto',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-content" style={{ 
                    backgroundColor: '#1a1a1a', 
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '90vh',
                    overflow: 'hidden'
                }}>
                    <div className="modal-header" style={{ flexShrink: 0 }}>
                        <h5 className="modal-title">
                            <i className="fa fa-map-marker-alt me-2"></i>
                            Chọn địa chỉ trên bản đồ
                        </h5>
                        <button 
                            type="button" 
                            className="btn-close btn-close-white" 
                            onClick={onClose}
                            aria-label="Close"
                        ></button>
                    </div>
                    <div className="modal-body p-0" style={{ 
                        flex: '1 1 auto',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0
                    }}>
                        <div style={{ 
                            flex: '1 1 auto',
                            height: '400px',
                            minHeight: 0,
                            position: 'relative'
                        }}>
                            <MapContainer
                                center={mapCenter}
                                zoom={15}
                                style={{ height: '100%', width: '100%', zIndex: 1 }}
                                scrollWheelZoom={true}
                                whenReady={() => {
                                    // Map đã sẵn sàng
                                    if (mapRef.current) {
                                        console.log('[LocationMapPicker] Map is ready');
                                    }
                                }}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                />
                                
                                {/* Pan to current location */}
                                {currentLocation && <PanToCurrentLocation currentLocation={currentLocation} />}
                                
                                {/* Current location marker */}
                                {currentLocation && (
                                    <Marker
                                        position={[currentLocation.lat, currentLocation.lng]}
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
                                            <strong>Vị trí hiện tại của bạn</strong>
                                            <br />
                                            <small>Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}</small>
                                        </Popup>
                                    </Marker>
                                )}
                                
                                {/* Map click handler */}
                                <MapClickHandler onLocationSelect={handleLocationSelect} />
                            </MapContainer>
                            
                            {/* Loading overlay */}
                            {isGettingLocation && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: 'rgba(0,0,0,0.5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 1000
                                }}>
                                    <div className="text-center text-white">
                                        <div className="spinner-border mb-2" role="status"></div>
                                        <div>Đang lấy vị trí hiện tại...</div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Selected address info */}
                        {selectedLocationData && (
                            <div className="p-3" style={{ 
                                backgroundColor: '#2a2a2a', 
                                borderTop: '1px solid #444',
                                flexShrink: 0,
                                maxHeight: '120px',
                                overflowY: 'auto'
                            }}>
                                <div className="mb-2">
                                    <strong>
                                        <i className="fa fa-map-marker-alt me-2" style={{ color: '#C39C5E' }}></i>
                                        Địa chỉ đã chọn:
                                    </strong>
                                </div>
                                <div className="text-light" style={{ fontSize: '0.9rem' }}>
                                    {selectedLocationData.fullAddress || 
                                     `${selectedLocationData.streetAddress || ''}, ${selectedLocationData.ward || ''}, ${selectedLocationData.district || ''}, ${selectedLocationData.province || ''}`.replace(/^,\s*|,\s*$/g, '')}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="modal-footer" style={{ 
                        flexShrink: 0,
                        borderTop: '1px solid #444',
                        padding: '1rem',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.5rem'
                    }}>
                        <button 
                            type="button" 
                            className="btn btn-secondary" 
                            onClick={onClose}
                            style={{ minWidth: '100px' }}
                        >
                            Hủy
                        </button>
                        <button 
                            type="button" 
                            className="btn btn-primary"
                            onClick={handleConfirm}
                            disabled={!selectedLocationData || isProcessingAddress}
                            style={{ minWidth: '120px' }}
                        >
                            {isProcessingAddress ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                    Đang xử lý...
                                </>
                            ) : (
                                <>
                                    <i className="fa fa-check me-2"></i>
                                    Xác nhận
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LocationMapPicker;
