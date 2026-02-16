import React from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
    LogOut,
    Home,
    Box,
    Users,
    FileText,
    Package,
    ArrowRightLeft,
    UserPlus,
    Warehouse,
    AlertTriangle,
    BarChart3,
} from "lucide-react";
import RightSideDrawer from "../components/RightSideDrawer";
import "../styles/layout.css";

const DashboardLayout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();

    const isActive = (path) => {
        return location.pathname === path || location.pathname.startsWith(path + "/");
    };

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                {/* Fixed Header: Logo + User Info */}
                <div className="sidebar-header">
                    <div
                        className="logo"
                        style={{
                            padding: "20px",
                            marginBottom: "1rem",
                            background: "#19222D",
                            display: "flex",
                            justifyContent: "center",
                        }}
                    >
                        <img
                            src="/logo.png"
                            alt="Nexus Inventory Logo"
                            style={{
                                maxWidth: "100%",
                                height: "auto",
                                maxHeight: "60px",
                                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                            }}
                        />
                    </div>

                    <div
                        className="user-info"
                        style={{
                            padding: "0 16px 24px 16px",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                        }}
                    >
                        <Link
                            to="/profile"
                            style={{
                                textDecoration: "none",
                                color: "inherit",
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                            }}
                        >
                            {user?.profile?.profile_image ? (
                                <img
                                    src={user.profile.profile_image}
                                    alt="Profile"
                                    style={{
                                        width: "32px",
                                        height: "32px",
                                        borderRadius: "50%",
                                        objectFit: "cover",
                                    }}
                                />
                            ) : (
                                <div
                                    style={{
                                        width: "32px",
                                        height: "32px",
                                        borderRadius: "50%",
                                        background: "#2563eb",
                                        color: "white",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: "bold",
                                        fontSize: "14px",
                                    }}
                                >
                                    {(user?.username || "U").charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "#fff" }}>
                                    {user?.username}
                                </span>
                                <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                                    {user?.role}
                                </span>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Scrollable Navigation */}
                <nav className="sidebar-nav">
                    <Link to="/" className={`nav-link ${isActive("/") && location.pathname === "/" ? "active" : ""}`}>
                        <Home size={18} /> <span>Dashboard</span>
                    </Link>

                    {/* INVENTORY GROUP */}
                    <div className="nav-group">
                        <div className="nav-group-title">INVENTORY</div>
                        <Link to="/products" className={`nav-link ${isActive("/products") ? "active" : ""}`}>
                            <Box size={18} /> <span>Products</span>
                        </Link>
                        {(user?.role === "ADMIN" ||
                            user?.role === "MANAGER" ||
                            user?.role === "STAFF") && (
                                <Link to="/stocks" className={`nav-link ${isActive("/stocks") ? "active" : ""}`}>
                                    <Package size={18} /> <span>Stock Levels</span>
                                </Link>
                            )}
                    </div>

                    {/* OPERATIONS GROUP */}
                    {(user?.role === "ADMIN" ||
                        user?.role === "MANAGER" ||
                        user?.role === "STAFF") && (
                            <div className="nav-group">
                                <div className="nav-group-title">OPERATIONS</div>
                                <Link
                                    to="/purchase-requests"
                                    className={`nav-link ${isActive("/purchase-requests") ? "active" : ""}`}
                                >
                                    <FileText size={18} /> <span>Purchase Requests</span>
                                </Link>
                                {(user?.role === "ADMIN" || user?.role === "MANAGER") && (
                                    <Link
                                        to="/transfer-requests"
                                        className={`nav-link ${isActive("/transfer-requests") ? "active" : ""}`}
                                    >
                                        <ArrowRightLeft size={18} /> <span>Transfers</span>
                                    </Link>
                                )}
                            </div>
                        )}

                    {/* VIEWER - My Requests */}
                    {user?.role === "VIEWER" && (
                        <div className="nav-group">
                            <div className="nav-group-title">MY ACTIVITY</div>
                            <Link
                                to="/my-requests"
                                className={`nav-link ${isActive("/my-requests") ? "active" : ""}`}
                            >
                                <FileText size={18} /> <span>My Requests</span>
                            </Link>
                        </div>
                    )}

                    {/* PEOPLE GROUP */}
                    {(user?.role === "ADMIN" || user?.role === "MANAGER") && (
                        <div className="nav-group">
                            <div className="nav-group-title">PEOPLE</div>
                            <Link to="/users" className={`nav-link ${isActive("/users") ? "active" : ""}`}>
                                <Users size={18} /> <span>Users</span>
                            </Link>
                            {user?.role === "MANAGER" && (
                                <Link
                                    to="/promotions"
                                    className={`nav-link ${isActive("/promotions") ? "active" : ""}`}
                                >
                                    <UserPlus size={18} /> <span>Promotions</span>
                                </Link>
                            )}
                            {user?.role === "ADMIN" && (
                                <Link
                                    to="/admin/promotions"
                                    className={`nav-link ${isActive("/admin/promotions") ? "active" : ""}`}
                                >
                                    <UserPlus size={18} /> <span>Promotions</span>
                                </Link>
                            )}
                        </div>
                    )}

                    {/* SYSTEM GROUP */}
                    {(user?.role === "ADMIN" || user?.role === "MANAGER") && (
                        <div className="nav-group">
                            <div className="nav-group-title">SYSTEM</div>
                            {user?.role === "ADMIN" && (
                                <Link
                                    to="/warehouses"
                                    className={`nav-link ${isActive("/warehouses") ? "active" : ""}`}
                                >
                                    <Warehouse size={18} /> <span>Warehouses</span>
                                </Link>
                            )}
                            {(user?.role === "ADMIN" || user?.role === "MANAGER") && (
                                <Link
                                    to="/thresholds"
                                    className={`nav-link ${isActive("/thresholds") ? "active" : ""}`}
                                >
                                    <AlertTriangle size={18} /> <span>Thresholds</span>
                                </Link>
                            )}
                            {user?.role === "ADMIN" && (
                                <Link to="/reports" className={`nav-link ${isActive("/reports") ? "active" : ""}`}>
                                    <BarChart3 size={18} /> <span>Reports</span>
                                </Link>
                            )}
                        </div>
                    )}
                </nav>

                {/* Fixed Footer: Logout Button */}
                <div className="sidebar-footer">
                    <button onClick={logout} className="logout-btn">
                        <LogOut size={18} /> <span>Logout</span>
                    </button>
                </div>
            </aside>

            <main className="content">
                <Outlet />
            </main>

            <RightSideDrawer />
        </div>
    );
};

export default DashboardLayout;
