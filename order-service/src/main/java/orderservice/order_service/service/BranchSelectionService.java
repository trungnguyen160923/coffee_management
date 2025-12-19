package orderservice.order_service.service;

import lombok.extern.slf4j.Slf4j;
import orderservice.order_service.entity.Branch;
import orderservice.order_service.repository.BranchRepository;
import orderservice.order_service.mapper.BranchMapper;
import orderservice.order_service.dto.response.BranchResponse;
import orderservice.order_service.dto.response.BranchWithDistanceResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Slf4j
public class BranchSelectionService {

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private GeocodingService geocodingService;

    @Autowired
    private BranchClosureService branchClosureService;

    @Autowired
    private BranchMapper branchMapper;

    @Value("${delivery.max-distance-km:20}")
    private double maxDeliveryDistanceKm;

    /**
     * Kiểm tra chi nhánh có đang trong giờ làm việc không
     * @param branch - Chi nhánh cần kiểm tra
     * @return true nếu đang trong giờ làm việc, false nếu không
     */
    private boolean isBranchWithinWorkingHours(Branch branch) {
        if (branch.getOpenHours() == null || branch.getEndHours() == null) {
            // Nếu không có giờ làm việc, coi như luôn mở
            return true;
        }
        
        java.time.LocalTime currentTime = java.time.LocalTime.now();
        
        if (branch.getEndHours().isAfter(branch.getOpenHours())) {
            // Normal same-day window (e.g., 08:00 - 22:00)
            return !currentTime.isBefore(branch.getOpenHours()) 
                    && !currentTime.isAfter(branch.getEndHours());
        } else {
            // Overnight window (e.g., 22:00 - 06:00)
            return !currentTime.isBefore(branch.getOpenHours()) 
                    || !currentTime.isAfter(branch.getEndHours());
        }
    }

    /**
     * Tìm chi nhánh gần nhất dựa trên địa chỉ khách hàng
     * Chỉ trả về chi nhánh đang hoạt động (không nghỉ, có trong openDays, và trong giờ làm việc)
     * QUAN TRỌNG: Tự động lọc theo khoảng cách tối đa (maxDeliveryDistanceKm)
     */
    public Branch findNearestBranch(String customerAddress) {
        try {

            // 1️⃣ Geocoding địa chỉ khách hàng
            GeocodingService.Coordinates customerLocation = geocodingService.geocodeAddress(customerAddress);

            // 2️⃣ Lấy danh sách chi nhánh, lọc các chi nhánh đang hoạt động
            java.time.LocalDate today = java.time.LocalDate.now();
            List<Branch> allBranches = branchRepository.findAll()
                    .stream()
                    .filter(b -> b.getLatitude() != null && b.getLongitude() != null)
                    // Lọc chi nhánh đang nghỉ (branch closure)
                    .filter(b -> !branchClosureService.isBranchClosedOnDate(b.getBranchId(), today))
                    // Lọc chi nhánh không hoạt động vào ngày hôm nay (openDays)
                    .filter(b -> branchClosureService.isBranchOperatingOnDate(b, today))
                    .filter(b -> isBranchWithinWorkingHours(b))
                    .sorted((a, b) -> a.getBranchId().compareTo(b.getBranchId()))
                    .toList();

            if (allBranches.isEmpty()) {
                log.warn("No active branches available for order on {}", today);
                return null;
            }

            // 3️⃣ Tìm chi nhánh gần nhất trong phạm vi cho phép (ưu tiên branch_id nhỏ nếu khoảng cách bằng nhau)
            Branch nearestBranch = null;
            double minDistance = Double.MAX_VALUE;

            for (Branch branch : allBranches) {
                GeocodingService.Coordinates branchLocation = new GeocodingService.Coordinates(
                        branch.getLatitude().doubleValue(),
                        branch.getLongitude().doubleValue());

                double distance = geocodingService.calculateDistance(customerLocation, branchLocation);

                // QUAN TRỌNG: Chỉ xem xét chi nhánh trong phạm vi cho phép
                if (distance > maxDeliveryDistanceKm) {
                    log.debug("Branch {} is {} km away, exceeds max distance {} km, skipping", 
                            branch.getBranchId(), distance, maxDeliveryDistanceKm);
                    continue; // Bỏ qua chi nhánh quá xa
                }

                // So sánh ổn định: khoảng cách nhỏ hơn, hoặc bằng nhưng ID nhỏ hơn
                if (distance < minDistance - 0.05 ||
                        (Math.abs(distance - minDistance) < 0.05
                                && (nearestBranch == null || branch.getBranchId() < nearestBranch.getBranchId()))) {
                    minDistance = distance;
                    nearestBranch = branch;
                }
            }

            if (nearestBranch == null) {
                log.warn("No branches found within {} km from address: {}", maxDeliveryDistanceKm, customerAddress);
                return null; // Không có chi nhánh trong phạm vi
            }

            log.info("Selected nearest active branch: {} (ID: {}) at {} km from address: {} (within {} km limit)", 
                    nearestBranch.getName(), nearestBranch.getBranchId(), minDistance, customerAddress, maxDeliveryDistanceKm);
            return nearestBranch;

        } catch (Exception e) {
            log.error("Error finding nearest branch: {}", e.getMessage(), e);

            // Fallback: chọn chi nhánh đầu tiên có tọa độ và đang hoạt động (sau khi sắp xếp)
            java.time.LocalDate today = java.time.LocalDate.now();
            List<Branch> allBranches = branchRepository.findAll()
                    .stream()
                    .filter(b -> b.getLatitude() != null && b.getLongitude() != null)
                    .filter(b -> !branchClosureService.isBranchClosedOnDate(b.getBranchId(), today))
                    .filter(b -> branchClosureService.isBranchOperatingOnDate(b, today))
                    .filter(b -> isBranchWithinWorkingHours(b))
                    .sorted((a, b) -> a.getBranchId().compareTo(b.getBranchId()))
                    .toList();

            if (!allBranches.isEmpty()) {
                Branch fallback = allBranches.get(0);
                log.info("Fallback: Selected first active branch: {} (ID: {})", 
                        fallback.getName(), fallback.getBranchId());
                return fallback;
            }

            throw new RuntimeException("No active branches available and geocoding failed");
        }
    }

    /**
     * Tính khoảng cách từ địa chỉ đến chi nhánh
     * @param customerAddress - Địa chỉ khách hàng
     * @param branch - Chi nhánh
     * @return Khoảng cách (km)
     */
    public double calculateDistanceFromAddress(String customerAddress, Branch branch) {
        try {
            GeocodingService.Coordinates customerLocation = geocodingService.geocodeAddress(customerAddress);
            GeocodingService.Coordinates branchLocation = new GeocodingService.Coordinates(
                    branch.getLatitude().doubleValue(),
                    branch.getLongitude().doubleValue());
            
            return geocodingService.calculateDistance(customerLocation, branchLocation);
        } catch (Exception e) {
            log.error("Error calculating distance from address '{}' to branch {}: {}", 
                    customerAddress, branch.getBranchId(), e.getMessage());
            throw new RuntimeException("Failed to calculate distance", e);
        }
    }

    /**
     * Tìm chi nhánh gần nhất với giới hạn khoảng cách tối đa
     * Chỉ trả về chi nhánh đang hoạt động (không nghỉ và có trong openDays)
     */
    public Branch findNearestBranchWithinDistance(String customerAddress, double maxDistanceKm) {
        // findNearestBranch đã tự động lọc các chi nhánh đang hoạt động
        Branch nearestBranch = findNearestBranch(customerAddress);

        if (nearestBranch != null) {
            try {
                double distance = calculateDistanceFromAddress(customerAddress, nearestBranch);

                if (distance > maxDistanceKm) {
                    log.debug("Nearest active branch {} is {} km away, exceeds max distance {} km", 
                            nearestBranch.getBranchId(), distance, maxDistanceKm);
                    return null; // Không có chi nhánh trong phạm vi
                }
            } catch (Exception e) {
                log.error("Error calculating distance for branch selection: {}", e.getMessage());
                // Error calculating distance for branch selection
            }
        }

        return nearestBranch;
    }

    /**
     * Tìm n chi nhánh gần nhất dựa trên địa chỉ khách hàng
     * Chỉ trả về các chi nhánh đang hoạt động (không nghỉ và có trong openDays)
     * QUAN TRỌNG: Tự động lọc theo khoảng cách tối đa (maxDeliveryDistanceKm)
     * @param customerAddress - Địa chỉ khách hàng
     * @param limit - Số lượng chi nhánh cần lấy
     * @return Danh sách n chi nhánh gần nhất trong phạm vi cho phép, sắp xếp theo khoảng cách
     */
    public List<Branch> findTopNearestBranches(String customerAddress, int limit) {
        // Tự động filter theo khoảng cách tối đa
        return findTopNearestBranches(customerAddress, limit, maxDeliveryDistanceKm);
    }

    /**
     * Tìm n chi nhánh gần nhất dựa trên địa chỉ khách hàng với giới hạn khoảng cách
     * Chỉ trả về các chi nhánh đang hoạt động (không nghỉ và có trong openDays)
     * @param customerAddress - Địa chỉ khách hàng
     * @param limit - Số lượng chi nhánh cần lấy
     * @param maxDistanceKm - Khoảng cách tối đa (km), null nếu không giới hạn
     * @return Danh sách n chi nhánh gần nhất, sắp xếp theo khoảng cách
     */
    public List<Branch> findTopNearestBranches(String customerAddress, int limit, Double maxDistanceKm) {
        try {
            // 1️⃣ Geocoding địa chỉ khách hàng
            GeocodingService.Coordinates customerLocation = geocodingService.geocodeAddress(customerAddress);

            // 2️⃣ Lấy danh sách chi nhánh, lọc các chi nhánh đang hoạt động
            java.time.LocalDate today = java.time.LocalDate.now();
            List<Branch> allBranches = branchRepository.findAll()
                    .stream()
                    .filter(b -> b.getLatitude() != null && b.getLongitude() != null)
                    // Lọc chi nhánh đang nghỉ (branch closure)
                    .filter(b -> !branchClosureService.isBranchClosedOnDate(b.getBranchId(), today))
                    // Lọc chi nhánh không hoạt động vào ngày hôm nay (openDays)
                    .filter(b -> branchClosureService.isBranchOperatingOnDate(b, today))
                    .filter(b -> isBranchWithinWorkingHours(b))
                    .sorted((a, b) -> a.getBranchId().compareTo(b.getBranchId()))
                    .toList();

            if (allBranches.isEmpty()) {
                log.warn("No active branches available for order on {}", today);
                return List.of();
            }

            // 3️⃣ Tính khoảng cách cho tất cả chi nhánh và sắp xếp
            List<BranchWithDistance> branchesWithDistance = allBranches.stream()
                    .map(branch -> {
                        GeocodingService.Coordinates branchLocation = new GeocodingService.Coordinates(
                                branch.getLatitude().doubleValue(),
                                branch.getLongitude().doubleValue());
                        double distance = geocodingService.calculateDistance(customerLocation, branchLocation);
                        return new BranchWithDistance(branch, distance);
                    })
                    // QUAN TRỌNG: Lọc theo khoảng cách tối đa nếu có
                    .filter(branchWithDistance -> maxDistanceKm == null || branchWithDistance.distance <= maxDistanceKm)
                    .sorted((a, b) -> {
                        // Sắp xếp theo khoảng cách, nếu bằng nhau thì theo branch_id
                        int distanceComparison = Double.compare(a.distance, b.distance);
                        if (distanceComparison == 0) {
                            return a.branch.getBranchId().compareTo(b.branch.getBranchId());
                        }
                        return distanceComparison;
                    })
                    .toList();

            // 4️⃣ Lấy n chi nhánh gần nhất
            return branchesWithDistance.stream()
                    .limit(limit)
                    .map(branchWithDistance -> branchWithDistance.branch)
                    .toList();

        } catch (Exception e) {
            log.error("Error finding top nearest branches: {}", e.getMessage(), e);
            
            // Fallback: trả về n chi nhánh đầu tiên có tọa độ và đang hoạt động
            java.time.LocalDate today = java.time.LocalDate.now();
            List<Branch> allBranches = branchRepository.findAll()
                    .stream()
                    .filter(b -> b.getLatitude() != null && b.getLongitude() != null)
                    .filter(b -> !branchClosureService.isBranchClosedOnDate(b.getBranchId(), today))
                    .filter(b -> branchClosureService.isBranchOperatingOnDate(b, today))
                    .filter(b -> isBranchWithinWorkingHours(b))
                    .sorted((a, b) -> a.getBranchId().compareTo(b.getBranchId()))
                    .limit(limit)
                    .toList();

            return allBranches;
        }
    }

    /**
     * Tìm n chi nhánh gần nhất với khoảng cách và thời gian giao hàng ước tính
     * Tận dụng method findTopNearestBranches() có sẵn và thêm thông tin khoảng cách
     * QUAN TRỌNG: Tự động lọc theo khoảng cách tối đa (maxDeliveryDistanceKm)
     * @param customerAddress - Địa chỉ khách hàng
     * @param limit - Số lượng chi nhánh cần lấy
     * @return Danh sách chi nhánh với khoảng cách và thời gian giao hàng (chỉ trong phạm vi cho phép)
     */
    public List<BranchWithDistanceResponse> findTopNearestBranchesWithDistance(
            String customerAddress, int limit) {
        try {
            // Tận dụng method có sẵn để lấy danh sách chi nhánh gần nhất
            // QUAN TRỌNG: Lọc theo khoảng cách tối đa
            List<Branch> nearestBranches = findTopNearestBranches(customerAddress, limit, maxDeliveryDistanceKm);
            
            if (nearestBranches == null || nearestBranches.isEmpty()) {
                log.warn("No branches found for address: {}", customerAddress);
                return List.of();
            }

            // Geocoding địa chỉ khách hàng để tính khoảng cách
            GeocodingService.Coordinates customerLocation = geocodingService.geocodeAddress(customerAddress);

            // Tính khoảng cách và tạo response cho từng chi nhánh
            List<BranchWithDistanceResponse> branchesWithDistance = nearestBranches.stream()
                    .map(branch -> {
                        GeocodingService.Coordinates branchLocation = new GeocodingService.Coordinates(
                                branch.getLatitude().doubleValue(),
                                branch.getLongitude().doubleValue());
                        
                        double distance = geocodingService.calculateDistance(customerLocation, branchLocation);
                        
                        // Ước tính thời gian giao hàng: 5 phút/km (trung bình 12km/h)
                        int estimatedTime = (int) Math.ceil(distance * 5);
                        
                        // Map Branch to BranchResponse sử dụng mapper
                        BranchResponse branchResponse = branchMapper.toBranchResponse(branch);
                        
                        return BranchWithDistanceResponse.builder()
                                .branch(branchResponse)
                                .distance(Math.round(distance * 100.0) / 100.0) // Làm tròn 2 chữ số
                                .estimatedDeliveryTime(estimatedTime)
                                .build();
                    })
                    .toList();

            return branchesWithDistance;

        } catch (Exception e) {
            log.error("Error finding top nearest branches with distance: {}", e.getMessage(), e);
            return List.of();
        }
    }

    /**
     * Helper class để lưu trữ chi nhánh và khoảng cách
     */
    private static class BranchWithDistance {
        final Branch branch;
        final double distance;

        BranchWithDistance(Branch branch, double distance) {
            this.branch = branch;
            this.distance = distance;
        }
    }
}
