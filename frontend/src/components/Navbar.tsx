import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCartStore } from "../store/cartStore";
import NotificationBell from "./NotificationBell";

function Navbar() {
  const { user, logout } = useAuth();
  const totalItems = useCartStore((state) => state.totalItems);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleLogout = () => {
    closeMobileMenu();
    logout();
  };

  const mobileLinkClass = "block rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700";

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center min-h-16 gap-2">
          {/* Logo */}
          <Link to="/" onClick={closeMobileMenu} className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 bg-linear-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              TRIGGER
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-7">
            <Link to="/" className="text-gray-600 hover:text-blue-600 font-medium text-sm">
              Home
            </Link>
            <Link to="/marketplace" className="text-gray-600 hover:text-blue-600 font-medium text-sm">
              Shop
            </Link>

            {user && (
              <>
                <Link to="/cart" className="relative text-gray-600 hover:text-blue-600 font-medium text-sm">
                  Cart
                  {totalItems() > 0 && (
                    <span className="absolute -top-2 -right-4 bg-blue-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {totalItems()}
                    </span>
                  )}
                </Link>
                <Link to="/orders" className="text-gray-600 hover:text-blue-600 font-medium text-sm">
                  My Orders
                </Link>
                <Link to="/messages" className="text-gray-600 hover:text-blue-600 font-medium text-sm">
                  Messages
                </Link>
              </>
            )}

            {user?.role === "seller" && user.isVerified && (
              <Link to="/seller/dashboard" className="text-gray-600 hover:text-blue-600 font-medium text-sm">
                Dashboard
              </Link>
            )}

            {user?.role === "admin" && (
              <>
                <Link to="/admin" className="text-gray-600 hover:text-blue-600 font-medium text-sm">
                  Admin
                </Link>
                <Link to="/admin/ledger" className="text-gray-600 hover:text-blue-600 font-medium text-sm">
                  Ledger
                </Link>
              </>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1 sm:gap-3">
            {user ? (
              <>
                <NotificationBell />

                <div className="hidden sm:flex items-center gap-2.5 pl-2">
                  <div className="w-8 h-8 bg-linear-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="leading-tight">
                    <p className="text-sm font-medium text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="text-xs sm:text-sm font-medium text-red-600 hover:text-red-700 px-2 sm:px-3 py-2 rounded-lg hover:bg-red-50 transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden md:inline-flex text-sm font-medium text-gray-600 hover:text-blue-600 px-2 sm:px-3 py-1.5"
                  onClick={closeMobileMenu}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={closeMobileMenu}
                  className="hidden md:inline-flex text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm transition"
                >
                  Sign Up
                </Link>
              </>
            )}

            <button
              type="button"
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 6 12 12M18 6 6 18" />
                </svg>
              ) : (
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div id="mobile-navigation" className="md:hidden border-t border-gray-100 py-2 pb-4">
            <div className="grid gap-1">
              <Link to="/" onClick={closeMobileMenu} aria-current={location.pathname === "/" ? "page" : undefined} className={mobileLinkClass}>Home</Link>
              <Link to="/marketplace" onClick={closeMobileMenu} className={mobileLinkClass}>Shop</Link>
              {user && <>
                <Link to="/cart" onClick={closeMobileMenu} className={mobileLinkClass}>Cart{totalItems() > 0 ? ` (${totalItems()})` : ""}</Link>
                <Link to="/orders" onClick={closeMobileMenu} className={mobileLinkClass}>My Orders</Link>
                <Link to="/messages" onClick={closeMobileMenu} className={mobileLinkClass}>Messages</Link>
                <Link to="/profile" onClick={closeMobileMenu} className={mobileLinkClass}>Profile</Link>
              </>}
              {user?.role === "seller" && <>
                {!user.isVerified && <Link to="/seller/verification" onClick={closeMobileMenu} className={mobileLinkClass}>Seller Verification</Link>}
                {user.isVerified && <>
                  <Link to="/seller/dashboard" onClick={closeMobileMenu} className={mobileLinkClass}>Seller Dashboard</Link>
                  <Link to="/seller/add-product" onClick={closeMobileMenu} className={mobileLinkClass}>Add Product</Link>
                  <Link to="/seller/payouts" onClick={closeMobileMenu} className={mobileLinkClass}>Payouts</Link>
                </>}
              </>}
              {user?.role === "admin" && <>
                <Link to="/admin" onClick={closeMobileMenu} className={mobileLinkClass}>Admin Dashboard</Link>
                <Link to="/admin/ledger" onClick={closeMobileMenu} className={mobileLinkClass}>System Ledger</Link>
              </>}
              {!user && <>
                <Link to="/login" onClick={closeMobileMenu} className={mobileLinkClass}>Login</Link>
                <Link to="/register" onClick={closeMobileMenu} className={mobileLinkClass}>Create an account</Link>
              </>}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
