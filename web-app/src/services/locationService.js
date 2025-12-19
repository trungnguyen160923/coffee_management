/**
 * Service for geolocation and reverse geocoding
 * Reusable functions for getting current location and converting coordinates to address
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Get current position from browser geolocation API
 * @returns {Promise<{lat: number, lng: number}>}
 */
export const getCurrentPosition = () => {
    console.log('[locationService] getCurrentPosition: Bắt đầu lấy vị trí GPS...');
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            console.error('[locationService] getCurrentPosition: Trình duyệt không hỗ trợ geolocation');
            reject(new Error('Trình duyệt của bạn không hỗ trợ lấy vị trí'));
            return;
        }

        // Sử dụng cấu hình giống BranchMapSelector để đảm bảo consistency
        // enableHighAccuracy: false để tránh timeout, có thể dùng network-based location
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                console.log('[locationService] getCurrentPosition: Đã lấy được vị trí:', location, 'với accuracy:', position.coords.accuracy, 'm');
                resolve(location);
            },
            (error) => {
                let errorMessage = 'Không thể lấy vị trí';
                
                if (error.code === error.PERMISSION_DENIED) {
                    errorMessage = 'Bạn đã từ chối quyền truy cập vị trí';
                    console.error('[locationService] getCurrentPosition: PERMISSION_DENIED');
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    errorMessage = 'Không thể xác định vị trí của bạn';
                    console.error('[locationService] getCurrentPosition: POSITION_UNAVAILABLE');
                } else if (error.code === error.TIMEOUT) {
                    errorMessage = 'Hết thời gian chờ lấy vị trí. Vui lòng kiểm tra kết nối và thử lại';
                    console.error('[locationService] getCurrentPosition: TIMEOUT');
                } else {
                    console.error('[locationService] getCurrentPosition: Lỗi khác:', error);
                }
                
                reject(new Error(errorMessage));
            },
            {
                enableHighAccuracy: false, // Giống BranchMapSelector - tránh timeout, có thể dùng network location
                timeout: 10000, // 10 giây như BranchMapSelector
                maximumAge: 300000 // Cache 5 phút như BranchMapSelector
            }
        );
    });
};

/**
 * Reverse geocode coordinates to address using OpenStreetMap Nominatim
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} Address object with province, district, ward information
 */
export const reverseGeocode = async (lat, lng) => {
    try {
        console.log('[locationService] reverseGeocode: Bắt đầu reverse geocode cho tọa độ:', { lat, lng });
        const reverseGeocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=vi`;
        console.log('[locationService] reverseGeocode: URL:', reverseGeocodeUrl);
        
        const response = await fetch(reverseGeocodeUrl, {
            headers: {
                'User-Agent': 'CoffeeManagementApp/1.0' // Required by Nominatim
            }
        });

        if (!response.ok) {
            console.error('[locationService] reverseGeocode: Response không OK:', response.status, response.statusText);
            throw new Error('Không thể lấy địa chỉ từ vị trí');
        }

        const data = await response.json();
        console.log('[locationService] reverseGeocode: Dữ liệu từ Nominatim:', data);
        
        if (!data || !data.address) {
            console.error('[locationService] reverseGeocode: Không có địa chỉ trong response');
            throw new Error('Không tìm thấy địa chỉ cho vị trí này');
        }

        const address = data.address;
        console.log('[locationService] reverseGeocode: Raw address object:', address);
        
        // Extract province, district, ward from address
        // OpenStreetMap uses different field names for Vietnam addresses
        let provinceName = address.state || address.province || address.region || '';
        let districtName = address.city || address.county || address.district || address.municipality || '';
        let wardName = address.suburb || address.neighbourhood || address.village || address.town || address.hamlet || '';
        let streetAddress = address.road || address.house_number || '';

        console.log('[locationService] reverseGeocode: Extracted - province:', provinceName, 'district:', districtName, 'ward:', wardName, 'street:', streetAddress);

        // If province is empty, try to get from state_district
        if (!provinceName && address.state_district) {
            const parts = address.state_district.split(',');
            if (parts.length > 1) {
                provinceName = parts[parts.length - 1].trim();
                console.log('[locationService] reverseGeocode: Lấy province từ state_district:', provinceName);
            }
        }

        // If province is still empty, try to extract from fullAddress (display_name)
        // Example: "..., Thành phố Hồ Chí Minh, ..."
        if (!provinceName && data.display_name) {
            const addressParts = data.display_name.split(',');
            // Tìm phần có "Thành phố" hoặc "Tỉnh" ở cuối
            for (let i = addressParts.length - 1; i >= 0; i--) {
                const part = addressParts[i].trim();
                if (part.includes('Thành phố') || part.includes('Tỉnh')) {
                    provinceName = part;
                    console.log('[locationService] reverseGeocode: Lấy province từ display_name:', provinceName);
                    break;
                }
            }
        }

        // Fallback: Map ISO3166-2-lvl4 to province name (VN-SG = Hồ Chí Minh)
        if (!provinceName && address['ISO3166-2-lvl4']) {
            const isoCode = address['ISO3166-2-lvl4'];
            if (isoCode === 'VN-SG') {
                provinceName = 'Thành phố Hồ Chí Minh';
                console.log('[locationService] reverseGeocode: Lấy province từ ISO3166-2-lvl4:', provinceName);
            }
        }

        const result = {
            province: provinceName,
            district: districtName,
            ward: wardName,
            streetAddress: streetAddress,
            fullAddress: data.display_name || '',
            rawAddress: address,
            coordinates: { lat, lng }
        };
        console.log('[locationService] reverseGeocode: Kết quả:', result);
        return result;
    } catch (error) {
        console.error('Error in reverseGeocode:', error);
        throw error;
    }
};

/**
 * Normalize Vietnamese address component name
 * Removes common prefixes like "Tỉnh", "Thành phố", "Quận", "Huyện", etc.
 * @param {string} name - Address component name
 * @returns {string} Normalized name
 */
export const normalizeAddressName = (name) => {
    if (!name) return '';
    
    return name
        .replace(/^(Tỉnh|Thành phố|TP\.?)\s*/i, '')
        .replace(/^(Quận|Huyện|Thị xã|Thành phố)\s*/i, '')
        .replace(/^(Phường|Xã|Thị trấn)\s*/i, '')
        .trim();
};

/**
 * Find matching province from list
 * @param {string} provinceName - Province name from geocoding
 * @param {Array} provinces - List of provinces from API
 * @returns {Object|null} Matched province object or null
 */
export const findMatchingProvince = (provinceName, provinces) => {
    console.log('[locationService] findMatchingProvince: Tìm province:', provinceName, 'trong danh sách', provinces.length, 'tỉnh');
    if (!provinceName || !provinces || provinces.length === 0) {
        console.warn('[locationService] findMatchingProvince: Không có dữ liệu để match');
        return null;
    }

    const normalized = normalizeAddressName(provinceName);
    console.log('[locationService] findMatchingProvince: Normalized name:', normalized);
    
    // Try exact match first
    let matched = provinces.find(p => 
        p.name.toLowerCase() === normalized.toLowerCase() ||
        p.name.toLowerCase() === provinceName.toLowerCase()
    );

    if (matched) {
        console.log('[locationService] findMatchingProvince: Tìm thấy exact match:', matched);
        return matched;
    }

    // Try partial match
    matched = provinces.find(p => 
        p.name.toLowerCase().includes(normalized.toLowerCase()) ||
        normalized.toLowerCase().includes(p.name.toLowerCase())
    );

    if (matched) {
        console.log('[locationService] findMatchingProvince: Tìm thấy partial match:', matched);
    } else {
        console.warn('[locationService] findMatchingProvince: Không tìm thấy match');
    }
    return matched || null;
};

/**
 * Find matching district from list
 * @param {string} districtName - District name from geocoding
 * @param {Array} districts - List of districts from API
 * @returns {Object|null} Matched district object or null
 */
export const findMatchingDistrict = (districtName, districts) => {
    console.log('[locationService] findMatchingDistrict: Tìm district:', districtName, 'trong danh sách', districts.length, 'quận/huyện');
    if (!districtName || !districts || districts.length === 0) {
        console.warn('[locationService] findMatchingDistrict: Không có dữ liệu để match');
        return null;
    }

    const normalized = normalizeAddressName(districtName);
    console.log('[locationService] findMatchingDistrict: Normalized name:', normalized);
    
    // Try exact match first
    let matched = districts.find(d => 
        d.name.toLowerCase() === normalized.toLowerCase() ||
        d.name.toLowerCase() === districtName.toLowerCase()
    );

    if (matched) {
        console.log('[locationService] findMatchingDistrict: Tìm thấy exact match:', matched);
        return matched;
    }

    // Try partial match
    matched = districts.find(d => 
        d.name.toLowerCase().includes(normalized.toLowerCase()) ||
        normalized.toLowerCase().includes(d.name.toLowerCase())
    );

    if (matched) {
        console.log('[locationService] findMatchingDistrict: Tìm thấy partial match:', matched);
    } else {
        console.warn('[locationService] findMatchingDistrict: Không tìm thấy match');
    }
    return matched || null;
};

/**
 * Find matching ward from list
 * @param {string} wardName - Ward name from geocoding
 * @param {Array} wards - List of wards from API
 * @returns {Object|null} Matched ward object or null
 */
export const findMatchingWard = (wardName, wards) => {
    console.log('[locationService] findMatchingWard: Tìm ward:', wardName, 'trong danh sách', wards.length, 'phường/xã');
    if (!wardName || !wards || wards.length === 0) {
        console.warn('[locationService] findMatchingWard: Không có dữ liệu để match');
        return null;
    }

    const normalized = normalizeAddressName(wardName);
    console.log('[locationService] findMatchingWard: Normalized name:', normalized);
    
    // Try exact match first
    let matched = wards.find(w => 
        w.name.toLowerCase() === normalized.toLowerCase() ||
        w.name.toLowerCase() === wardName.toLowerCase()
    );

    if (matched) {
        console.log('[locationService] findMatchingWard: Tìm thấy exact match:', matched);
        return matched;
    }

    // Try partial match
    matched = wards.find(w => 
        w.name.toLowerCase().includes(normalized.toLowerCase()) ||
        normalized.toLowerCase().includes(w.name.toLowerCase())
    );

    if (matched) {
        console.log('[locationService] findMatchingWard: Tìm thấy partial match:', matched);
    } else {
        console.warn('[locationService] findMatchingWard: Không tìm thấy match');
    }
    return matched || null;
};

/**
 * Get address from current location and parse to province/district/ward
 * @param {Array} provinces - List of provinces from API
 * @param {string} apiGateway - API Gateway URL
 * @param {Function} fetchDistricts - Function to fetch districts for a province
 * @param {Function} fetchWards - Function to fetch wards for a district
 * @returns {Promise<Object>} Object with matched province, district, ward
 */
export const getAddressFromCurrentLocation = async (provinces, apiGateway, fetchDistricts, fetchWards) => {
    console.log('[locationService] getAddressFromCurrentLocation: Bắt đầu quá trình lấy địa chỉ từ vị trí hiện tại');
    console.log('[locationService] getAddressFromCurrentLocation: Số lượng provinces:', provinces?.length);
    console.log('[locationService] getAddressFromCurrentLocation: API Gateway:', apiGateway);
    try {
        // Step 1: Get current position
        console.log('[locationService] getAddressFromCurrentLocation: Step 1 - Lấy vị trí GPS...');
        const position = await getCurrentPosition();
        console.log('[locationService] getAddressFromCurrentLocation: Step 1 - Đã lấy được vị trí:', position);
        
        // Step 2: Reverse geocode
        console.log('[locationService] getAddressFromCurrentLocation: Step 2 - Reverse geocode...');
        const addressData = await reverseGeocode(position.lat, position.lng);
        console.log('[locationService] getAddressFromCurrentLocation: Step 2 - Đã reverse geocode:', addressData);
        
        // Step 3: Find matching province
        console.log('[locationService] getAddressFromCurrentLocation: Step 3 - Tìm province phù hợp...');
        const matchedProvince = findMatchingProvince(addressData.province, provinces);
        
        if (!matchedProvince) {
            console.warn('[locationService] getAddressFromCurrentLocation: Không tìm thấy province phù hợp');
            return {
                success: false,
                message: 'Không tìm thấy tỉnh/thành phố phù hợp. Vui lòng chọn thủ công',
                province: null,
                district: null,
                ward: null
            };
        }
        console.log('[locationService] getAddressFromCurrentLocation: Step 3 - Đã tìm thấy province:', matchedProvince);

        // Step 4: Fetch districts
        console.log('[locationService] getAddressFromCurrentLocation: Step 4 - Fetch districts cho province:', matchedProvince.code);
        await fetchDistricts(matchedProvince.code);
        const districtsResponse = await fetch(`${apiGateway}/provinces/p/${matchedProvince.code}?depth=2`);
        const districtsData = await districtsResponse.json();
        const districts = districtsData.districts || [];
        console.log('[locationService] getAddressFromCurrentLocation: Step 4 - Đã fetch được', districts.length, 'districts');

        // Step 5: Find matching district
        console.log('[locationService] getAddressFromCurrentLocation: Step 5 - Tìm district phù hợp...');
        const matchedDistrict = findMatchingDistrict(addressData.district, districts);
        
        let matchedWard = null;
        if (matchedDistrict) {
            console.log('[locationService] getAddressFromCurrentLocation: Step 5 - Đã tìm thấy district:', matchedDistrict);
            // Step 6: Fetch wards
            console.log('[locationService] getAddressFromCurrentLocation: Step 6 - Fetch wards cho district:', matchedDistrict.code);
            await fetchWards(matchedDistrict.code);
            const wardsResponse = await fetch(`${apiGateway}/provinces/d/${matchedDistrict.code}?depth=2`);
            const wardsData = await wardsResponse.json();
            const wards = wardsData.wards || [];
            console.log('[locationService] getAddressFromCurrentLocation: Step 6 - Đã fetch được', wards.length, 'wards');

            // Step 7: Find matching ward
            console.log('[locationService] getAddressFromCurrentLocation: Step 7 - Tìm ward phù hợp...');
            matchedWard = findMatchingWard(addressData.ward, wards);
            if (matchedWard) {
                console.log('[locationService] getAddressFromCurrentLocation: Step 7 - Đã tìm thấy ward:', matchedWard);
            }
        } else {
            console.warn('[locationService] getAddressFromCurrentLocation: Không tìm thấy district phù hợp');
        }

        const result = {
            success: true,
            province: matchedProvince,
            district: matchedDistrict,
            ward: matchedWard,
            streetAddress: addressData.streetAddress,
            fullAddress: addressData.fullAddress,
            coordinates: addressData.coordinates, // Thêm coordinates để kiểm tra khoảng cách
            message: matchedWard 
                ? 'Đã lấy địa chỉ từ vị trí hiện tại thành công!' 
                : matchedDistrict 
                    ? 'Đã lấy tỉnh và quận/huyện, vui lòng chọn phường/xã'
                    : 'Đã lấy tỉnh, vui lòng chọn quận/huyện và phường/xã'
        };
        console.log('[locationService] getAddressFromCurrentLocation: Kết quả cuối cùng:', result);
        return result;
    } catch (error) {
        console.error('Error in getAddressFromCurrentLocation:', error);
        return {
            success: false,
            message: error.message || 'Lỗi khi lấy địa chỉ từ vị trí',
            province: null,
            district: null,
            ward: null
        };
    }
};
