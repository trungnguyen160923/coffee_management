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
            log.info("Finding nearest branch for address: {}", customerAddress);

            // 1️⃣ Geocoding địa chỉ khách hàng
            GeocodingService.Coordinates customerLocation = geocodingService.geocodeAddress(customerAddress);
            log.info("Customer location: {}", customerLocation);

            // 2️⃣ Lấy danh sách chi nhánh, sắp xếp theo branch_id để đảm bảo kết quả ổn
            // định
            List<Branch> allBranches = branchRepository.findAll()
                    .stream()
                    .filter(b -> b.getLatitude() != null && b.getLongitude() != null)
                    .sorted((a, b) -> a.getBranchId().compareTo(b.getBranchId()))
                    .toList();

            if (allBranches.isEmpty()) {
                log.error("No branches with coordinates found in database");
                return null;
            }

            log.info("Found {} branches with coordinates", allBranches.size());

            // 3️⃣ Tìm chi nhánh gần nhất (ưu tiên branch_id nhỏ nếu khoảng cách bằng nhau)
            Branch nearestBranch = null;
            double minDistance = Double.MAX_VALUE;

            for (Branch branch : allBranches) {
                GeocodingService.Coordinates branchLocation = new GeocodingService.Coordinates(
                        branch.getLatitude().doubleValue(),
                        branch.getLongitude().doubleValue());

                double distance = geocodingService.calculateDistance(customerLocation, branchLocation);
                log.info("Branch {} (ID={}): distance = {} km", branch.getName(), branch.getBranchId(), distance);

                // So sánh ổn định: khoảng cách nhỏ hơn, hoặc bằng nhưng ID nhỏ hơn
                if (distance < minDistance - 0.05 ||
                        (Math.abs(distance - minDistance) < 0.05
                                && branch.getBranchId() < nearestBranch.getBranchId())) {
                    minDistance = distance;
                    nearestBranch = branch;
                }
            }

            if (nearestBranch != null) {
                log.info("✅ Selected branch: {} (ID={}) - distance: {} km",
                        nearestBranch.getName(), nearestBranch.getBranchId(), minDistance);
            } else {
                log.warn("No suitable branch found, returning first available");
                nearestBranch = allBranches.get(0);
            }

            return nearestBranch;

        } catch (Exception e) {
            log.error("Error finding nearest branch for address: {}", customerAddress, e);

            // Fallback: chọn chi nhánh đầu tiên có tọa độ (sau khi sắp xếp)
            List<Branch> allBranches = branchRepository.findAll()
                    .stream()
                    .filter(b -> b.getLatitude() != null && b.getLongitude() != null)
                    .sorted((a, b) -> a.getBranchId().compareTo(b.getBranchId()))
                    .toList();

            if (!allBranches.isEmpty()) {
                Branch fallback = allBranches.get(0);
                log.warn("Fallback to branch: {} (ID={})", fallback.getName(), fallback.getBranchId());
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
                    log.warn("Nearest branch is {} km away, exceeds limit of {} km", distance, maxDistanceKm);
                    return null; // Không có chi nhánh trong phạm vi
                }
            } catch (Exception e) {
                log.error("Error calculating distance for branch selection", e);
            }
        }

        return nearestBranch;
    }
}
