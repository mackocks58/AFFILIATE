import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

function linkCls({ isActive }: { isActive: boolean }) {
  return isActive ? "active" : undefined;
}

export function Navbar() {
  const { user, loading, isAdmin, logout } = useAuth();

  return (
    <nav className="nav">
      <Link to="/" className="brand">
        <span className="brand-mark" aria-hidden />
        <span>Betslips</span>
      </Link>
      <div className="nav-links">
        <NavLink to="/" className={linkCls} end>
          Browse
        </NavLink>
        {user && (
          <>
            <NavLink to="/chat" className={linkCls}>
              Chat
            </NavLink>
            <NavLink to="/payments" className={linkCls}>
              Payments
            </NavLink>
            <NavLink to="/support" className={linkCls}>
              Support
            </NavLink>
            <NavLink to="/account" className={linkCls}>
              Account
            </NavLink>
          </>
        )}
        {user && isAdmin && (
          <NavLink to="/admin" className={linkCls}>
            Admin
          </NavLink>
        )}
        {!loading && !user && (
          <>
            <NavLink to="/login" className={linkCls}>
              Log in
            </NavLink>
            <NavLink to="/register" className={linkCls}>
              Register
            </NavLink>
          </>
        )}
        {user && (
          <button type="button" onClick={() => void logout()}>
            Sign out
          </button>
        )}
      </div>
    </nav>
  );
}
