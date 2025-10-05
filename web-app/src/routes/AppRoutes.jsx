import { Route, Routes } from "react-router-dom";
import HomePage from "../components/pages/HomePage";
import AboutPage from "../components/pages/AboutPage";
import MenuPage from "../components/pages/MenuPage";
import ServicesPage from "../components/pages/ServicesPage";
import ContactPage from "../components/pages/ContactPage";
import ProductDetail from "../components/pages/ProductDetail";
import CheckoutPage from "../components/pages/CheckoutPage";
import GuestCheckout from "../components/pages/GuestCheckout";
import CartPage from "../components/pages/CartPage";
import LoginPage from "../components/pages/auth/LoginPage";
import RegisterPage from "../components/pages/auth/RegisterPage";
import ForgotPasswordPage from "../components/pages/auth/ForgotPasswordPage";
import UserDashboard from "../components/pages/users/UserDashboard";
import OrdersPage from "../components/pages/users/OrdersPage";
import BookingsPage from "../components/pages/users/BookingsPage";


const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/coffee" element={<HomePage />} />
      <Route path="/coffee/about" element={<AboutPage />} />
      <Route path="/coffee/menu" element={<MenuPage />} />
      <Route path="/coffee/services" element={<ServicesPage />} />
      <Route path="/coffee/contact" element={<ContactPage />} />
      <Route path="/coffee/products/:id" element={<ProductDetail />} />
      <Route path="/coffee/cart" element={<CartPage />} />
      <Route path="/coffee/checkout" element={<CheckoutPage />} />
      <Route path="/coffee/checkout/:id" element={<CheckoutPage />} />
      <Route path="/coffee/guest-checkout" element={<GuestCheckout />} />

      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />

      <Route path="/users" element={<UserDashboard />} />
      <Route path="/users/orders" element={<OrdersPage />} />
      <Route path="/users/bookings" element={<BookingsPage />} />
    </Routes>
  );
};

export default AppRoutes;
