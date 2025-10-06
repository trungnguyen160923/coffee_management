package orderservice.order_service.util;

import lombok.extern.slf4j.Slf4j;

import java.text.Normalizer;

/**
 * Utility class để chuẩn hóa địa chỉ tiếng Việt
 * Loại bỏ dấu để cải thiện khả năng geocoding
 */
@Slf4j
public class VietnameseNormalizer {

    /**
     * Chuẩn hóa địa chỉ tiếng Việt bằng cách loại bỏ dấu
     * 
     * @param input Địa chỉ tiếng Việt có dấu
     * @return Địa chỉ đã được chuẩn hóa (không dấu)
     */
    public static String normalizeVietnameseAddress(String input) {
        if (input == null || input.trim().isEmpty()) {
            return input;
        }

        log.debug("🔄 Chuẩn hóa địa chỉ: {}", input);

        try {
            // Bỏ dấu bằng cách chuẩn hóa rồi loại bỏ ký tự tổ hợp
            String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);

            // Xóa các ký tự dấu (accent)
            normalized = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");

            // Thay Đ/đ bằng D/d
            normalized = normalized.replaceAll("Đ", "D").replaceAll("đ", "d");

            // Loại bỏ khoảng trắng thừa
            normalized = normalized.trim().replaceAll("\\s+", " ");

            log.debug("✅ Địa chỉ đã chuẩn hóa: {} → {}", input, normalized);
            return normalized;

        } catch (Exception e) {
            log.warn("⚠️ Lỗi khi chuẩn hóa địa chỉ '{}': {}", input, e.getMessage());
            return input; // Trả về địa chỉ gốc nếu có lỗi
        }
    }

    /**
     * Chuẩn hóa địa chỉ với các tùy chọn bổ sung
     * 
     * @param input        Địa chỉ tiếng Việt có dấu
     * @param removeSpaces Có loại bỏ khoảng trắng không
     * @param toLowerCase  Có chuyển về chữ thường không
     * @return Địa chỉ đã được chuẩn hóa
     */
    public static String normalizeVietnameseAddress(String input, boolean removeSpaces, boolean toLowerCase) {
        String normalized = normalizeVietnameseAddress(input);

        if (removeSpaces) {
            normalized = normalized.replaceAll("\\s+", "");
        }

        if (toLowerCase) {
            normalized = normalized.toLowerCase();
        }

        return normalized;
    }

    /**
     * Kiểm tra xem địa chỉ có chứa ký tự tiếng Việt có dấu không
     * 
     * @param input Địa chỉ cần kiểm tra
     * @return true nếu có ký tự tiếng Việt có dấu
     */
    public static boolean containsVietnameseAccents(String input) {
        if (input == null || input.trim().isEmpty()) {
            return false;
        }

        // Kiểm tra các ký tự tiếng Việt có dấu phổ biến
        return input.matches(".*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ].*");
    }

    /**
     * Test method để kiểm tra chức năng chuẩn hóa
     */
    public static void main(String[] args) {
        String[] testAddresses = {
                "Quận 3, Thành Phố Hồ Chí Minh, Việt Nam",
                "Phường Bến Nghé, Quận 1, TP.HCM",
                "Đường Nguyễn Huệ, Quận 1, Thành phố Hồ Chí Minh",
                "123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM",
                "Café ABC, Đường Điện Biên Phủ, Quận Bình Thạnh"
        };

        System.out.println("🧪 Test Vietnamese Address Normalization:");
        System.out.println("=".repeat(60));

        for (String address : testAddresses) {
            String normalized = normalizeVietnameseAddress(address);
            System.out.printf("📝 Original: %s%n", address);
            System.out.printf("✅ Normalized: %s%n", normalized);
            System.out.printf("🔍 Contains accents: %s%n", containsVietnameseAccents(address));
            System.out.println("-".repeat(60));
        }
    }
}
