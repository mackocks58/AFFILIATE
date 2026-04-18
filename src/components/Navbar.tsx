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
