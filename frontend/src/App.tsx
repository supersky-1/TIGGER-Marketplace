import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Marketplace from "./pages/Marketplace";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import SellerDashboard from "./pages/seller/SellerDashboard";
import AddProduct from "./pages/seller/AddProduct";
import SellerPayouts from "./pages/seller/SellerPayouts";
import SellerVerification from "./pages/seller/SellerVerification";
import ProductDetail from "./pages/ProductDetail";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLedger from "./pages/admin/AdminLedger";
import OrderHistory from "./pages/OrderHistory";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";

function App() {
  useEffect(() => {
    const splashScreen = document.getElementById("startup-screen");
    if (!splashScreen) return;

    let animationFrame = 0;
    let removalTimer = 0;
    const minimumDisplayTimer = window.setTimeout(() => {
      animationFrame = window.requestAnimationFrame(() => {
        splashScreen.classList.add("startup-screen--leaving");
      });
      removalTimer = window.setTimeout(() => splashScreen.remove(), 450);
    }, 3800);

    return () => {
      window.clearTimeout(minimumDisplayTimer);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      if (removalTimer) window.clearTimeout(removalTimer);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="product/:id" element={<ProductDetail />} />

          {/* Buyer routes */}
          <Route path="cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="orders" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
          <Route path="messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* Seller routes */}
          <Route
            path="seller/verification"
            element={
              <ProtectedRoute requiredRole="seller">
                <SellerVerification />
              </ProtectedRoute>
            }
          />
          <Route
            path="seller/dashboard"
            element={
              <ProtectedRoute requiredRole="seller" requireVerified>
                <SellerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="seller/add-product"
            element={
              <ProtectedRoute requiredRole="seller" requireVerified>
                <AddProduct />
              </ProtectedRoute>
            }
          />
          <Route
            path="seller/payouts"
            element={
              <ProtectedRoute requiredRole="seller" requireVerified>
                <SellerPayouts />
              </ProtectedRoute>
            }
          />

          {/* Admin */}
          <Route
            path="admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/ledger"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLedger />
              </ProtectedRoute>
            }
          />

          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
