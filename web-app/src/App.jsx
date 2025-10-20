import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import Context
import { AuthProvider } from './context/AuthContext';

// Import Components
// Thay vì import AppContent, ta sẽ đặt logic của nó vào một Route
import AppContent from './components/AppContent'; 
import SimpleTrackReservation from './components/pages/SimpleTrackReservation';
import SimpleTrackOrder from './components/pages/SimpleTrackOrder';

function App() {
  const pageTitle = "Smart Cafe | Delicious Taste";

  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Route 1: Trang theo dõi đặt bàn - KHÔNG CÓ Layout */}
          <Route 
            path="/track-reservation/:reservationId" 
            element={<SimpleTrackReservation />} 
          />

          {/* Route 2: Trang theo dõi đơn hàng - KHÔNG CÓ Layout */}
          <Route 
            path="/track-order/:orderId" 
            element={<SimpleTrackOrder />} 
          />

          {/* Route 3: Các Route còn lại - SỬ DỤNG AppContent (bao gồm useTokenCheck và Layout) */}
          {/* Tất cả các path khác (/*) sẽ được xử lý bởi AppContent */}
          <Route 
            path="/*" 
            element={<AppContent pageTitle={pageTitle} />} 
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;