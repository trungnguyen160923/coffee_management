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
import OrdersPage from "../components/pages/users/OrdersPage";
import BookingsPage from "../components/pages/users/BookingsPage";
import AddressManagement from "../components/pages/users/AddressManagement";
import AccountSettingsPage from "../components/pages/users/AccountSettingsPage";
import ProtectedRoute from "../components/common/ProtectedRoute";


const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/coffee" element={<HomePage />} />
      <Route path="/coffee/about" element={<AboutPage />} />
      <Route path="/coffee/menu" element={<MenuPage />} />
      <Route path="/coffee/services" element={<ServicesPage />} />
      <Route path="/coffee/contact" element={<ContactPage />} />
      <Route path="/coffee/products/:id" element={<ProductDetail />} />
      <Route path="/coffee/guest-checkout" element={<GuestCheckout />} />

      {/* Auth routes */}
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />

      {/* Cart route - accessible for both authenticated and guest users */}
      <Route path="/coffee/cart" element={<CartPage />} />

      {/* Protected routes - require authentication */}
      <Route path="/coffee/checkout" element={
        <ProtectedRoute>
          <CheckoutPage />
        </ProtectedRoute>
      } />
      <Route path="/coffee/checkout/:id" element={
        <ProtectedRoute>
          <CheckoutPage />
        </ProtectedRoute>
      } />
      <Route path="/users/orders" element={
        <ProtectedRoute>
          <OrdersPage />
        </ProtectedRoute>
      } />
      <Route path="/users/bookings" element={
        <ProtectedRoute>
          <BookingsPage />
        </ProtectedRoute>
      } />
      <Route path="/users/addresses" element={
        <ProtectedRoute>
          <AddressManagement />
        </ProtectedRoute>
      } />
      <Route path="/users/account" element={
        <ProtectedRoute>
          <AccountSettingsPage />
        </ProtectedRoute>
      } />
    </Routes>
  );
};

export default AppRoutes;
