# Chi Tiết Chức Năng CUSTOMER

## 📋 Tổng Quan
Tài liệu này mô tả chi tiết các chức năng của Customer, bao gồm file liên quan, hàm xử lý, logic nghiệp vụ và cách bắt lỗi.

---

## 1. Trang Chủ (`/coffee`)

### Frontend Files
- `web-app/src/components/pages/HomePage.jsx`
- `web-app/src/services/branchService.js`

### Backend Files
- `order-service/src/main/java/orderservice/order_service/controller/BranchController.java`
- `order-service/src/main/java/orderservice/order_service/service/BranchService.java`
- `order-service/src/main/java/orderservice/order_service/service/BranchSelectionService.java`

### Hàm Chính

#### Frontend
- `findNearestBranch(address)` - Tìm chi nhánh gần nhất
- `findTop5NearestBranches(address)` - Tìm 5 chi nhánh gần nhất
- `findTopNearestBranchesWithDistance(address, limit)` - Tìm chi nhánh với khoảng cách

#### Backend
- `BranchController.getAllBranches()` - Lấy tất cả chi nhánh
- `BranchController.findNearestBranch(address)` - Tìm chi nhánh gần nhất
- `BranchSelectionService.findNearestBranch(address)` - Logic chọn chi nhánh
- `BranchSelectionService.calculateDistance()` - Tính khoảng cách

### Logic Nghiệp Vụ
1. Lấy danh sách tất cả chi nhánh
2. Tính khoảng cách từ địa chỉ khách hàng đến từng chi nhánh
3. Sắp xếp theo khoảng cách tăng dần
4. Trả về chi nhánh gần nhất hoặc top N chi nhánh

### Xử Lý Lỗi
- **BRANCH_NOT_FOUND** - Không tìm thấy chi nhánh
- **INVALID_ADDRESS** - Địa chỉ không hợp lệ
- **MAX_DELIVERY_DISTANCE_EXCEEDED** - Vượt quá khoảng cách giao hàng tối đa (20km)

---

## 2. Menu (`/coffee/menu`)

### Frontend Files
- `web-app/src/components/pages/MenuPage.jsx`
- `web-app/src/services/productService.js`

### Backend Files
- `catalog-service/src/main/java/com/service/catalog/controller/ProductController.java`
- `catalog-service/src/main/java/com/service/catalog/service/ProductService.java`
- `catalog-service/src/main/java/com/service/catalog/controller/CategoryController.java`

### Hàm Chính

#### Frontend
- `getAllProducts()` - Lấy tất cả sản phẩm
- `getProductsCanSell()` - Lấy sản phẩm có thể bán
- `getCategories()` - Lấy danh mục
- `searchProducts(request)` - Tìm kiếm sản phẩm

#### Backend
- `ProductController.getAllProductsCanSell()` - Lấy sản phẩm có thể bán
- `ProductService.getAllProductsCanSell()` - Logic lọc sản phẩm active
- `ProductService.searchProductsForPublic(request)` - Tìm kiếm công khai
- `CategoryController.getAllCategories()` - Lấy danh mục

### Logic Nghiệp Vụ
1. Lọc sản phẩm có `isActive = true` và `productDetails` có `isActive = true`
2. Lọc theo danh mục (nếu có)
3. Tìm kiếm theo tên (nếu có)
4. Phân trang kết quả
5. Sắp xếp theo tiêu chí (giá, tên, mới nhất)

### Xử Lý Lỗi
- **PRODUCT_NOT_FOUND** - Không tìm thấy sản phẩm
- **CATEGORY_NOT_FOUND** - Không tìm thấy danh mục
- **VALIDATION_FAILED** - Lỗi validation request (page, size, sortBy)

---

## 3. Chi Tiết Sản Phẩm (`/coffee/products/:id`)

### Frontend Files
- `web-app/src/components/pages/ProductDetail.jsx`
- `web-app/src/services/productService.js`

### Backend Files
- `catalog-service/src/main/java/com/service/catalog/controller/ProductController.java`
- `catalog-service/src/main/java/com/service/catalog/service/ProductService.java`

### Hàm Chính

#### Frontend
- `getProductById(id)` - Lấy chi tiết sản phẩm
- `getProductDetailById(detailId)` - Lấy chi tiết size/giá
- `addToCart(item)` - Thêm vào giỏ hàng

#### Backend
- `ProductController.getProductByIdForPublic(id)` - Lấy sản phẩm công khai
- `ProductService.getProductByIdForPublic(id)` - Logic lấy sản phẩm
- `ProductService.getProductDetailById(detailId)` - Lấy chi tiết size

### Logic Nghiệp Vụ
1. Lấy thông tin sản phẩm theo ID
2. Chỉ trả về sản phẩm active
3. Lấy danh sách sizes và giá
4. Validate sản phẩm có thể bán

### Xử Lý Lỗi
- **PRODUCT_NOT_FOUND** - Sản phẩm không tồn tại hoặc không active
- **PRODUCT_DETAIL_NOT_FOUND** - Size không tồn tại
- **PRODUCT_OUT_OF_STOCK** - Hết hàng

---

## 4. Giỏ Hàng (`/coffee/cart`)

### Frontend Files
- `web-app/src/components/pages/CartPage.jsx`
- `web-app/src/services/cartService.js`

### Backend Files
- `order-service/src/main/java/orderservice/order_service/controller/CartController.java`
- `order-service/src/main/java/orderservice/order_service/service/CartService.java`

### Hàm Chính

#### Frontend
- `getCart()` - Lấy giỏ hàng
- `addToCart(request)` - Thêm sản phẩm
- `updateCartItem(itemId, request)` - Cập nhật số lượng
- `removeFromCart(itemId)` - Xóa sản phẩm
- `clearCart()` - Xóa toàn bộ giỏ hàng
- `getCartTotal()` - Tính tổng tiền

#### Backend
- `CartController.getCart(userId)` - Lấy giỏ hàng
- `CartController.addToCart(userId, request)` - Thêm vào giỏ
- `CartController.updateCartItem(userId, itemId, request)` - Cập nhật
- `CartController.removeFromCart(userId, itemId)` - Xóa
- `CartController.clearCart(userId)` - Xóa toàn bộ
- `CartController.getCartTotal(userId)` - Tính tổng
- `CartService.getOrCreateCart(userId)` - Lấy hoặc tạo cart
- `CartService.addToCart(userId, request)` - Logic thêm
- `CartService.updateCartItem(userId, itemId, request)` - Logic cập nhật

### Logic Nghiệp Vụ
1. **Thêm vào giỏ:**
   - Validate product detail tồn tại và active
   - Kiểm tra sản phẩm đã có trong giỏ chưa
   - Nếu có: cộng dồn số lượng
   - Nếu chưa: tạo mới cart item
   - Tính lại total price

2. **Cập nhật:**
   - Validate số lượng > 0
   - Cập nhật quantity và total price

3. **Xóa:**
   - Xóa cart item
   - Nếu cart rỗng, có thể xóa cart

4. **Tính tổng:**
   - Tính tổng tất cả items
   - Áp dụng giảm giá (nếu có)

### Xử Lý Lỗi
- **PRODUCT_NOT_FOUND** - Sản phẩm không tồn tại
- **PRODUCT_DETAIL_NOT_FOUND** - Size không tồn tại
- **PRODUCT_OUT_OF_STOCK** - Hết hàng
- **INVALID_QUANTITY** - Số lượng không hợp lệ (<= 0)
- **CART_ITEM_NOT_FOUND** - Item không tồn tại trong giỏ
- **VALIDATION_FAILED** - Lỗi validation request

---

## 5. Thanh Toán (`/coffee/checkout`)

### Frontend Files
- `web-app/src/components/pages/CheckoutPage.jsx`
- `web-app/src/services/orderService.js`
- `web-app/src/services/discountService.js`

### Backend Files
- `order-service/src/main/java/orderservice/order_service/controller/OrderController.java`
- `order-service/src/main/java/orderservice/order_service/service/OrderService.java`
- `order-service/src/main/java/orderservice/order_service/service/DiscountService.java`
- `order-service/src/main/java/orderservice/order_service/service/BranchSelectionService.java`

### Hàm Chính

#### Frontend
- `createOrder(request)` - Tạo đơn hàng
- `applyDiscount(code)` - Áp dụng mã giảm giá
- `getCustomerAddresses()` - Lấy địa chỉ khách hàng

#### Backend
- `OrderController.createOrder(request)` - Endpoint tạo đơn
- `OrderService.createOrder(request, token)` - Logic tạo đơn
- `OrderService.validateBranchForOrder(branch, orderType)` - Validate chi nhánh
- `DiscountService.validateAndApplyDiscount(code, orderTotal)` - Validate và áp dụng giảm giá
- `BranchSelectionService.findNearestBranch(address)` - Chọn chi nhánh

### Logic Nghiệp Vụ
1. **Validate giỏ hàng:**
   - Kiểm tra cart không rỗng
   - Validate từng sản phẩm còn tồn tại và active
   - Kiểm tra số lượng còn đủ

2. **Chọn chi nhánh:**
   - Nếu có địa chỉ: tìm chi nhánh gần nhất
   - Validate khoảng cách <= 20km
   - Nếu không có địa chỉ: dùng chi nhánh mặc định

3. **Tính giá:**
   - Tính subtotal từ cart items
   - Áp dụng giảm giá (nếu có)
   - Tính phí giao hàng (nếu delivery)
   - Tính tổng cuối cùng

4. **Tạo đơn hàng:**
   - Tạo Order entity
   - Tạo OrderItem cho mỗi sản phẩm
   - Cập nhật trạng thái: CREATED -> PENDING
   - Xóa cart sau khi tạo đơn thành công
   - Gửi notification

5. **Validate trạng thái:**
   - Chỉ cho phép chuyển trạng thái hợp lệ
   - CREATED -> PENDING -> PREPARING -> READY -> COMPLETED
   - Có thể hủy ở PENDING hoặc PREPARING

### Xử Lý Lỗi
- **CART_EMPTY** - Giỏ hàng trống
- **PRODUCT_NOT_FOUND** - Sản phẩm không tồn tại
- **PRODUCT_OUT_OF_STOCK** - Hết hàng
- **BRANCH_NOT_FOUND** - Không tìm thấy chi nhánh
- **MAX_DELIVERY_DISTANCE_EXCEEDED** - Vượt quá khoảng cách giao hàng
- **BRANCH_CLOSED** - Chi nhánh đang đóng cửa
- **INVALID_DISCOUNT_CODE** - Mã giảm giá không hợp lệ
- **DISCOUNT_EXPIRED** - Mã giảm giá đã hết hạn
- **DISCOUNT_MIN_ORDER_NOT_MET** - Chưa đạt giá trị đơn hàng tối thiểu
- **VALIDATION_FAILED** - Lỗi validation request
- **INVALID_STATUS_TRANSITION** - Chuyển trạng thái không hợp lệ

---

## 6. Thanh Toán Khách (`/coffee/guest-checkout`)

### Frontend Files
- `web-app/src/components/pages/GuestCheckout.jsx`
- `web-app/src/services/orderService.js`

### Backend Files
- `order-service/src/main/java/orderservice/order_service/controller/OrderController.java`
- `order-service/src/main/java/orderservice/order_service/service/OrderService.java`

### Hàm Chính

#### Backend
- `OrderController.createGuestOrder(request)` - Endpoint tạo đơn khách
- `OrderService.createGuestOrder(request)` - Logic tạo đơn khách

### Logic Nghiệp Vụ
1. Tương tự như `createOrder` nhưng:
   - Không cần userId (guest)
   - Yêu cầu thông tin khách hàng (name, phone, email)
   - Không có địa chỉ lưu trữ
   - Không có lịch sử đơn hàng

2. Validate thông tin khách:
   - Name, phone, email bắt buộc
   - Email format hợp lệ
   - Phone format hợp lệ

### Xử Lý Lỗi
- Tương tự như `createOrder`
- **INVALID_EMAIL** - Email không hợp lệ
- **INVALID_PHONE** - Số điện thoại không hợp lệ
- **MISSING_CUSTOMER_INFO** - Thiếu thông tin khách hàng

---

## 7. Đơn Hàng Của Tôi (`/users/orders`)

### Frontend Files
- `web-app/src/components/pages/users/OrdersPage.jsx`
- `web-app/src/services/orderService.js`

### Backend Files
- `order-service/src/main/java/orderservice/order_service/controller/OrderController.java`
- `order-service/src/main/java/orderservice/order_service/service/OrderService.java`

### Hàm Chính

#### Frontend
- `getOrdersByCustomer()` - Lấy đơn hàng của khách
- `getOrderById(id)` - Lấy chi tiết đơn hàng
- `cancelOrder(id)` - Hủy đơn hàng

#### Backend
- `OrderController.getOrdersByCustomer(customerId)` - Lấy danh sách
- `OrderController.getOrderById(id)` - Lấy chi tiết
- `OrderController.cancelOrderByCustomer(id)` - Hủy đơn
- `OrderService.getOrdersByCustomer(customerId)` - Logic lấy danh sách
- `OrderService.getOrderById(id)` - Logic lấy chi tiết
- `OrderService.cancelOrderByCustomer(id)` - Logic hủy

### Logic Nghiệp Vụ
1. **Lấy danh sách:**
   - Lọc theo customerId
   - Sắp xếp theo ngày tạo (mới nhất trước)
   - Phân trang

2. **Hủy đơn hàng:**
   - Chỉ cho phép hủy khi status = PENDING hoặc PREPARING
   - Cập nhật status = CANCELLED
   - Gửi notification
   - Có thể hoàn tiền (nếu đã thanh toán)

3. **Xem chi tiết:**
   - Lấy thông tin đơn hàng
   - Lấy danh sách items
   - Lấy thông tin chi nhánh
   - Lấy lịch sử trạng thái

### Xử Lý Lỗi
- **ORDER_NOT_FOUND** - Đơn hàng không tồn tại
- **ORDER_NOT_OWNED_BY_CUSTOMER** - Đơn hàng không thuộc về khách hàng
- **ORDER_CANNOT_BE_CANCELLED** - Không thể hủy (đã COMPLETED hoặc CANCELLED)
- **INVALID_STATUS_TRANSITION** - Trạng thái không hợp lệ

---

## 8. Đặt Bàn Của Tôi (`/users/bookings`)

### Frontend Files
- `web-app/src/components/pages/users/BookingsPage.jsx`
- `web-app/src/services/reservationService.js`

### Backend Files
- `order-service/src/main/java/orderservice/order_service/controller/ReservationController.java`
- `order-service/src/main/java/orderservice/order_service/service/ReservationService.java`

### Hàm Chính

#### Frontend
- `getReservationsByCustomer()` - Lấy đặt bàn của khách
- `getReservationById(id)` - Lấy chi tiết đặt bàn
- `cancelReservation(id)` - Hủy đặt bàn

#### Backend
- `ReservationController.getReservationsByCustomer(customerId)` - Lấy danh sách
- `ReservationController.getReservationById(id)` - Lấy chi tiết
- `ReservationController.cancelReservation(id)` - Hủy đặt bàn
- `ReservationService.getReservationsByCustomer(customerId)` - Logic lấy danh sách
- `ReservationService.cancelReservation(id)` - Logic hủy
- `ReservationService.validateReservationRequest(request)` - Validate request
- `ReservationService.validateReservationTime(reservedAt)` - Validate thời gian

### Logic Nghiệp Vụ
1. **Tạo đặt bàn:**
   - Validate branch tồn tại
   - Validate thời gian đặt (không quá khứ, không quá xa)
   - Kiểm tra chi nhánh có đóng cửa không
   - Tìm bàn phù hợp (capacity >= partySize)
   - Kiểm tra bàn có trống không
   - Tạo reservation
   - Gán bàn cho reservation
   - Gửi notification

2. **Hủy đặt bàn:**
   - Chỉ cho phép hủy khi status = PENDING hoặc CONFIRMED
   - Cập nhật status = CANCELLED
   - Giải phóng bàn
   - Gửi notification

3. **Validate thời gian:**
   - Không được đặt quá khứ
   - Không được đặt quá xa (ví dụ: 30 ngày)
   - Phải trong giờ mở cửa của chi nhánh

### Xử Lý Lỗi
- **RESERVATION_NOT_FOUND** - Đặt bàn không tồn tại
- **RESERVATION_NOT_OWNED_BY_CUSTOMER** - Đặt bàn không thuộc về khách hàng
- **BRANCH_NOT_FOUND** - Chi nhánh không tồn tại
- **BRANCH_CLOSED_ON_DATE** - Chi nhánh đóng cửa vào ngày đặt
- **INVALID_RESERVATION_TIME** - Thời gian đặt không hợp lệ
- **RESERVATION_TIME_IN_PAST** - Thời gian đặt trong quá khứ
- **RESERVATION_TIME_TOO_FAR** - Thời gian đặt quá xa
- **NO_AVAILABLE_TABLE** - Không có bàn trống phù hợp
- **RESERVATION_CANNOT_BE_CANCELLED** - Không thể hủy (đã COMPLETED hoặc CANCELLED)
- **VALIDATION_FAILED** - Lỗi validation request

---

## 9. Quản Lý Địa Chỉ (`/users/addresses`)

### Frontend Files
- `web-app/src/components/pages/users/AddressManagement.jsx`
- `web-app/src/services/addressService.js`

### Backend Files
- `profile-service/src/main/java/com/service/profile/controller/CustomerAddressController.java`
- `profile-service/src/main/java/com/service/profile/service/CustomerProfileService.java`

### Hàm Chính

#### Frontend
- `getAddresses()` - Lấy danh sách địa chỉ
- `createAddress(request)` - Tạo địa chỉ mới
- `updateAddress(id, request)` - Cập nhật địa chỉ
- `deleteAddress(id)` - Xóa địa chỉ
- `setDefaultAddress(id)` - Đặt địa chỉ mặc định

#### Backend
- `CustomerAddressController.getAddresses(customerId)` - Lấy danh sách
- `CustomerAddressController.createAddress(customerId, request)` - Tạo mới
- `CustomerAddressController.updateAddress(id, request)` - Cập nhật
- `CustomerAddressController.deleteAddress(id)` - Xóa
- `CustomerAddressController.setDefaultAddress(id)` - Đặt mặc định

### Logic Nghiệp Vụ
1. **Tạo địa chỉ:**
   - Validate thông tin (street, ward, district, province)
   - Nếu là địa chỉ đầu tiên: tự động set làm mặc định
   - Lưu vào database

2. **Cập nhật:**
   - Validate địa chỉ thuộc về customer
   - Cập nhật thông tin
   - Nếu set làm mặc định: bỏ mặc định của địa chỉ khác

3. **Xóa:**
   - Không cho phép xóa địa chỉ mặc định (phải set địa chỉ khác làm mặc định trước)
   - Xóa địa chỉ

4. **Đặt mặc định:**
   - Bỏ mặc định của địa chỉ hiện tại
   - Set địa chỉ mới làm mặc định

### Xử Lý Lỗi
- **ADDRESS_NOT_FOUND** - Địa chỉ không tồn tại
- **ADDRESS_NOT_OWNED_BY_CUSTOMER** - Địa chỉ không thuộc về khách hàng
- **CANNOT_DELETE_DEFAULT_ADDRESS** - Không thể xóa địa chỉ mặc định
- **INVALID_ADDRESS** - Địa chỉ không hợp lệ
- **VALIDATION_FAILED** - Lỗi validation request

---

## 10. Cài Đặt Tài Khoản (`/users/account`)

### Frontend Files
- `web-app/src/components/pages/users/AccountSettingsPage.jsx`
- `web-app/src/services/authService.js`
- `web-app/src/services/profileService.js`

### Backend Files
- `auth/src/main/java/com/service/auth/controller/AuthenticationController.java`
- `auth/src/main/java/com/service/auth/service/AuthenticationService.java`
- `profile-service/src/main/java/com/service/profile/controller/CustomerProfileController.java`
- `profile-service/src/main/java/com/service/profile/service/CustomerProfileService.java`

### Hàm Chính

#### Frontend
- `getMyProfile()` - Lấy thông tin cá nhân
- `updateProfile(request)` - Cập nhật thông tin
- `changePassword(request)` - Đổi mật khẩu
- `updateAvatar(file)` - Cập nhật avatar

#### Backend
- `CustomerProfileController.getMyProfile()` - Lấy thông tin
- `CustomerProfileController.updateProfile(request)` - Cập nhật
- `AuthenticationController.changePassword(request)` - Đổi mật khẩu
- `CustomerProfileController.updateAvatar(file)` - Cập nhật avatar
- `CustomerProfileService.updateProfile(userId, request)` - Logic cập nhật
- `AuthenticationService.changePassword(userId, request)` - Logic đổi mật khẩu

### Logic Nghiệp Vụ
1. **Cập nhật thông tin:**
   - Cho phép cập nhật: fullname, phone, dob, bio
   - Email không thể thay đổi (read-only)
   - Validate format (phone, email)
   - Cập nhật vào customer_profile

2. **Đổi mật khẩu:**
   - Validate mật khẩu cũ đúng
   - Validate mật khẩu mới (độ dài, độ mạnh)
   - Validate mật khẩu mới != mật khẩu cũ
   - Hash mật khẩu mới
   - Cập nhật vào users table

3. **Cập nhật avatar:**
   - Upload file ảnh
   - Validate file type (jpg, png)
   - Validate file size
   - Lưu file và cập nhật URL

### Xử Lý Lỗi
- **USER_NOT_FOUND** - Người dùng không tồn tại
- **INVALID_OLD_PASSWORD** - Mật khẩu cũ không đúng
- **WEAK_PASSWORD** - Mật khẩu mới không đủ mạnh
- **PASSWORD_SAME_AS_OLD** - Mật khẩu mới trùng với mật khẩu cũ
- **INVALID_PHONE** - Số điện thoại không hợp lệ
- **INVALID_FILE_TYPE** - File không đúng định dạng
- **FILE_TOO_LARGE** - File quá lớn
- **VALIDATION_FAILED** - Lỗi validation request

---

## 11. Theo Dõi Đơn Hàng (Công Khai) (`/track-order/:orderId`)

### Frontend Files
- `web-app/src/components/pages/SimpleTrackOrder.jsx`
- `web-app/src/services/orderService.js`

### Backend Files
- `order-service/src/main/java/orderservice/order_service/controller/OrderController.java`
- `order-service/src/main/java/orderservice/order_service/service/OrderService.java`

### Hàm Chính

#### Backend
- `OrderController.getOrderByIdPublic(orderId)` - Lấy đơn hàng công khai
- `OrderController.cancelOrderPublic(orderId, request)` - Hủy đơn công khai
- `OrderService.getOrderByIdPublic(orderId)` - Logic lấy đơn

### Logic Nghiệp Vụ
1. Lấy đơn hàng theo ID (không cần authentication)
2. Yêu cầu thông tin xác thực (phone hoặc email) để xem
3. Validate thông tin khớp với đơn hàng
4. Hiển thị trạng thái đơn hàng

### Xử Lý Lỗi
- **ORDER_NOT_FOUND** - Đơn hàng không tồn tại
- **UNAUTHORIZED_TRACKING** - Thông tin xác thực không đúng
- **ORDER_CANNOT_BE_CANCELLED** - Không thể hủy

---

## 12. Theo Dõi Đặt Bàn (Công Khai) (`/track-reservation/:reservationId`)

### Frontend Files
- `web-app/src/components/pages/SimpleTrackReservation.jsx`
- `web-app/src/services/reservationService.js`

### Backend Files
- `order-service/src/main/java/orderservice/order_service/controller/ReservationController.java`
- `order-service/src/main/java/orderservice/order_service/service/ReservationService.java`

### Hàm Chính

#### Backend
- `ReservationController.getReservationByIdPublic(reservationId)` - Lấy đặt bàn công khai
- `ReservationController.cancelReservationPublic(reservationId, request)` - Hủy đặt bàn công khai

### Logic Nghiệp Vụ
1. Tương tự như theo dõi đơn hàng
2. Yêu cầu thông tin xác thực (phone hoặc email)
3. Hiển thị trạng thái đặt bàn

### Xử Lý Lỗi
- **RESERVATION_NOT_FOUND** - Đặt bàn không tồn tại
- **UNAUTHORIZED_TRACKING** - Thông tin xác thực không đúng
- **RESERVATION_CANNOT_BE_CANCELLED** - Không thể hủy

---

## 13. Xác Thực

### Đăng Nhập (`/auth/login`)

#### Backend Files
- `auth/src/main/java/com/service/auth/controller/AuthenticationController.java`
- `auth/src/main/java/com/service/auth/service/AuthenticationService.java`

#### Hàm Chính
- `AuthenticationController.login(request)` - Endpoint đăng nhập
- `AuthenticationService.authenticate(email, password)` - Logic xác thực
- `AuthenticationService.generateToken(user)` - Tạo JWT token

#### Logic Nghiệp Vụ
1. Validate email và password
2. Tìm user theo email
3. Verify password (BCrypt)
4. Tạo JWT token
5. Trả về token và thông tin user

#### Xử Lý Lỗi
- **INVALID_CREDENTIALS** - Email hoặc mật khẩu sai
- **USER_NOT_FOUND** - Người dùng không tồn tại
- **ACCOUNT_LOCKED** - Tài khoản bị khóa
- **VALIDATION_FAILED** - Lỗi validation request

### Đăng Ký (`/auth/register`)

#### Backend Files
- `auth/src/main/java/com/service/auth/controller/UserV2Controller.java`
- `auth/src/main/java/com/service/auth/service/UserV2Service.java`

#### Hàm Chính
- `UserV2Controller.createCustomer(request)` - Tạo tài khoản customer
- `UserV2Service.createCustomer(request)` - Logic tạo customer

#### Logic Nghiệp Vụ
1. Validate thông tin (email, password, fullname, phone)
2. Kiểm tra email đã tồn tại chưa
3. Hash password
4. Tạo user với role CUSTOMER
5. Tạo customer_profile
6. Trả về thông tin user

#### Xử Lý Lỗi
- **EMAIL_ALREADY_EXISTS** - Email đã tồn tại
- **WEAK_PASSWORD** - Mật khẩu không đủ mạnh
- **INVALID_EMAIL** - Email không hợp lệ
- **VALIDATION_FAILED** - Lỗi validation request

### Quên Mật Khẩu (`/auth/forgot-password`)

#### Backend Files
- `auth/src/main/java/com/service/auth/controller/AuthenticationController.java`
- `auth/src/main/java/com/service/auth/service/AuthenticationService.java`

#### Hàm Chính
- `AuthenticationController.forgotPassword(request)` - Gửi email reset
- `AuthenticationController.resetPassword(request)` - Reset mật khẩu

#### Logic Nghiệp Vụ
1. Validate email
2. Tìm user theo email
3. Tạo reset token
4. Gửi email chứa link reset
5. Validate reset token
6. Cập nhật mật khẩu mới

#### Xử Lý Lỗi
- **USER_NOT_FOUND** - Email không tồn tại
- **INVALID_RESET_TOKEN** - Token không hợp lệ hoặc hết hạn
- **RESET_TOKEN_EXPIRED** - Token đã hết hạn
- **VALIDATION_FAILED** - Lỗi validation request

---

## 📝 Tổng Kết Xử Lý Lỗi

### ErrorCode Enum
Tất cả các service sử dụng `ErrorCode` enum để định nghĩa mã lỗi:
- `ErrorCode.PRODUCT_NOT_FOUND`
- `ErrorCode.ORDER_NOT_FOUND`
- `ErrorCode.VALIDATION_FAILED`
- `ErrorCode.UNAUTHORIZED`
- v.v.

### AppException
Tất cả lỗi nghiệp vụ được throw dưới dạng `AppException`:
```java
throw new AppException(ErrorCode.PRODUCT_NOT_FOUND);
throw new AppException(ErrorCode.VALIDATION_FAILED, "Custom message");
```

### GlobalExceptionHandler
Tất cả các service có `GlobalExceptionHandler` để:
- Bắt `AppException` và trả về `ApiResponse` với mã lỗi
- Bắt `MethodArgumentNotValidException` (validation) và format lỗi
- Bắt các exception khác và trả về lỗi generic

### Validation
- Sử dụng `@Valid` annotation trên request DTOs
- Sử dụng Bean Validation annotations (`@NotNull`, `@NotBlank`, `@Min`, `@Max`, etc.)
- Custom validators cho logic phức tạp


