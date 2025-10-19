import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import AppRoutes from "./routes/AppRoutes";
import SimpleTrackReservation from './components/pages/SimpleTrackReservation';
import SimpleTrackOrder from './components/pages/SimpleTrackOrder';

function App() {
  return (
    <Router>
      <Routes>
        {/* Route riêng cho trang theo dõi đặt bàn - không có Layout */}
        <Route path="/track-reservation/:reservationId" element={<SimpleTrackReservation />} />

        {/* Route riêng cho trang theo dõi đơn hàng - không có Layout */}
        <Route path="/track-order/:orderId" element={<SimpleTrackOrder />} />

        {/* Các route khác sử dụng Layout */}
        <Route path="/*" element={
          <Layout pageTitle="Smart Cafe | Delicious Taste">
            <AppRoutes />
          </Layout>
        } />
      </Routes>
    </Router>
  );
}

export default App;
