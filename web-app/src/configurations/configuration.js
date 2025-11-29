export const CONFIG = {
  API_GATEWAY: process.env.REACT_APP_API_GATEWAY || "http://localhost:8000/api",
};

export const API = {
  LOGIN: "/auth-service/auth/token",
  MY_INFO: "/profile/users/my-profile",
  GET_ME: "/auth-service/users/me",
  GET_USER_BY_ID: "/auth-service/users",
  CREATE_CUSTOMER: "/auth-service/users-v2/create-customer",
  MY_POST: "/post/my-posts",
  CREATE_POST: "/post/create",
  UPDATE_PROFILE: "/profile/users/my-profile",
  UPDATE_AVATAR: "/profile/users/avatar",
  SEARCH_USER: "/profile/users/search",
  MY_CONVERSATIONS: "/chat/conversations/my-conversations",
  CREATE_CONVERSATION: "/chat/conversations/create",
  CREATE_MESSAGE: "/chat/messages/create",
  GET_CONVERSATION_MESSAGES: "/chat/messages",
  LOGOUT: "/auth-service/auth/logout",
  // Reservation APIs
  CREATE_RESERVATION: "/order-service/api/reservations",
  GET_BRANCHES: "/order-service/api/branches",
  GET_RESERVATIONS_BY_CUSTOMER: "/order-service/api/reservations/customer",
  CANCEL_RESERVATION: "/order-service/api/reservations",
  GET_RESERVATION_BY_ID_PUBLIC: "/order-service/api/reservations/public",
  CANCEL_RESERVATION_PUBLIC: "/order-service/api/reservations/public",
  GET_ORDER_BY_ID_PUBLIC: "/order-service/api/orders/public",
  CANCEL_ORDER_PUBLIC: "/order-service/api/orders/public",
  // Catalog-service (via API Gateway)
  GET_PRODUCTS: "/catalogs/products",
  GET_PRODUCTS_CAN_SELL: "/catalogs/products/can-sell",
  GET_PRODUCT_BY_ID: "/catalogs/products",
  GET_PRODUCT_DETAIL_BY_ID: "/catalogs/products/detail",
  GET_CATEGORIES: "/catalogs/categories",
  FILE_IMAGE_PRODUCTS: "/catalogs/files/images/products",
  // Order-service cart (via API Gateway)
  ORDER_CART_BASE: "/order-service/api/cart",
  GET_CART: "/order-service/api/cart",
  ADD_TO_CART: "/order-service/api/cart",
  UPDATE_CART_ITEM: "/order-service/api/cart",
  REMOVE_FROM_CART: "/order-service/api/cart",
  CLEAR_CART: "/order-service/api/cart",
  GET_CART_TOTAL: "/order-service/api/cart/total",
  // Order-service orders (via API Gateway)
  CREATE_ORDER: "/order-service/api/orders",
  CREATE_GUEST_ORDER: "/order-service/api/orders/guest",
  GET_ORDERS_BY_CUSTOMER: "/order-service/api/orders/customer",
  CANCEL_ORDER: "/order-service/api/orders",
  // Email service
  SEND_ORDER_CONFIRMATION_EMAIL: "/order-service/api/email/send-order-confirmation",
  // Discount APIs (via API Gateway)
  VALIDATE_DISCOUNT: "/order-service/api/discounts/validate",
  APPLY_DISCOUNT: "/order-service/api/discounts/apply",
  GET_AVAILABLE_DISCOUNTS: "/order-service/api/discounts/available",
  // Address APIs (via API Gateway)
  CREATE_ADDRESS: "/profiles/addresses",
  GET_CUSTOMER_ADDRESSES: "/profiles/customer-addresses",
  UPDATE_CUSTOMER_ADDRESS: "/profiles/customer-addresses",
  DELETE_CUSTOMER_ADDRESS: "/profiles/customer-addresses",
  // Catalog API base
  CATALOG_API: "/catalogs",
  // Stock reservation APIs
  CLEAR_RESERVATIONS: "/catalogs/stocks/clear-reservations",
  NOTIFY_ORDER_CREATED: "/notifications/orders",
  NOTIFY_RESERVATION_CREATED: "/notifications/reservations",
};
