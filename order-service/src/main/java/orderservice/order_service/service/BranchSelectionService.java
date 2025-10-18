package orderservice.order_service.service;

import lombok.extern.slf4j.Slf4j;
import orderservice.order_service.entity.Branch;
import orderservice.order_service.repository.BranchRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Slf4j
public class BranchSelectionService {

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private GeocodingService geocodingService;

    /**
     * Tìm chi nhánh gần nhất dựa trên địa chỉ khách hàng
     */
    public Branch findNearestBranch(String customerAddress) {
        try {

            // 1️⃣ Geocoding địa chỉ khách hàng
            GeocodingService.Coordinates customerLocation = geocodingService.geocodeAddress(customerAddress);

            // 2️⃣ Lấy danh sách chi nhánh, sắp xếp theo branch_id để đảm bảo kết quả ổn
            // định
            List<Branch> allBranches = branchRepository.findAll()
                    .stream()
                    .filter(b -> b.getLatitude() != null && b.getLongitude() != null)
                    .sorted((a, b) -> a.getBranchId().compareTo(b.getBranchId()))
                    .toList();

            if (allBranches.isEmpty()) {
                return null;
            }

            // 3️⃣ Tìm chi nhánh gần nhất (ưu tiên branch_id nhỏ nếu khoảng cách bằng nhau)
            Branch nearestBranch = null;
            double minDistance = Double.MAX_VALUE;

            for (Branch branch : allBranches) {
                GeocodingService.Coordinates branchLocation = new GeocodingService.Coordinates(
                        branch.getLatitude().doubleValue(),
                        branch.getLongitude().doubleValue());

                double distance = geocodingService.calculateDistance(customerLocation, branchLocation);

                // So sánh ổn định: khoảng cách nhỏ hơn, hoặc bằng nhưng ID nhỏ hơn
                if (distance < minDistance - 0.05 ||
                        (Math.abs(distance - minDistance) < 0.05
                                && branch.getBranchId() < nearestBranch.getBranchId())) {
                    minDistance = distance;
                    nearestBranch = branch;
                }
            }

            if (nearestBranch == null) {
                nearestBranch = allBranches.get(0);
            }

            return nearestBranch;

        } catch (Exception e) {

            // Fallback: chọn chi nhánh đầu tiên có tọa độ (sau khi sắp xếp)
            List<Branch> allBranches = branchRepository.findAll()
                    .stream()
                    .filter(b -> b.getLatitude() != null && b.getLongitude() != null)
                    .sorted((a, b) -> a.getBranchId().compareTo(b.getBranchId()))
                    .toList();

            if (!allBranches.isEmpty()) {
                Branch fallback = allBranches.get(0);
                return fallback;
            }

            throw new RuntimeException("No branches available and geocoding failed");
        }
    }

    /**
     * Tìm chi nhánh gần nhất với giới hạn khoảng cách tối đa
     */
    public Branch findNearestBranchWithinDistance(String customerAddress, double maxDistanceKm) {
        Branch nearestBranch = findNearestBranch(customerAddress);

        if (nearestBranch != null) {
            try {
                GeocodingService.Coordinates customerLocation = geocodingService.geocodeAddress(customerAddress);
                GeocodingService.Coordinates branchLocation = new GeocodingService.Coordinates(
                        nearestBranch.getLatitude().doubleValue(),
                        nearestBranch.getLongitude().doubleValue());

                double distance = geocodingService.calculateDistance(customerLocation, branchLocation);

                if (distance > maxDistanceKm) {
                    return null; // Không có chi nhánh trong phạm vi
                }
            } catch (Exception e) {
                // Error calculating distance for branch selection
            }
        }

        return nearestBranch;
    }

    /**
     * Tìm n chi nhánh gần nhất dựa trên địa chỉ khách hàng
     * @param customerAddress - Địa chỉ khách hàng
     * @param limit - Số lượng chi nhánh cần lấy
     * @return Danh sách n chi nhánh gần nhất, sắp xếp theo khoảng cách
     */
    public List<Branch> findTopNearestBranches(String customerAddress, int limit) {
        try {
            // 1️⃣ Geocoding địa chỉ khách hàng
            GeocodingService.Coordinates customerLocation = geocodingService.geocodeAddress(customerAddress);

            // 2️⃣ Lấy danh sách chi nhánh, sắp xếp theo branch_id để đảm bảo kết quả ổn định
            List<Branch> allBranches = branchRepository.findAll()
                    .stream()
                    .filter(b -> b.getLatitude() != null && b.getLongitude() != null)
                    .sorted((a, b) -> a.getBranchId().compareTo(b.getBranchId()))
                    .toList();

            if (allBranches.isEmpty()) {
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
            log.error("Error finding top nearest branches: {}", e.getMessage());
            
            // Fallback: trả về n chi nhánh đầu tiên có tọa độ
            List<Branch> allBranches = branchRepository.findAll()
                    .stream()
                    .filter(b -> b.getLatitude() != null && b.getLongitude() != null)
                    .sorted((a, b) -> a.getBranchId().compareTo(b.getBranchId()))
                    .limit(limit)
                    .toList();

            return allBranches;
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
