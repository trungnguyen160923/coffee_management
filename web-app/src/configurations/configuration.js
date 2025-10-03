export const CONFIG = {
  API_GATEWAY: "http://localhost:8000/api",
};

export const API = {
  LOGIN: "/auth-service/auth/token",
  MY_INFO: "/profile/users/my-profile",
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
  // Catalog-service (via API Gateway)
  GET_PRODUCTS: "/catalogs/products",
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
  GET_ORDERS_BY_CUSTOMER: "/order-service/api/orders/customer",
};
